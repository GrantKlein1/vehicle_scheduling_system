/**
 * Role checks shared by middleware and the login flow.
 * Keep the predicates in sync with frontend/src/config/roles.js.
 */

export const ROLES = Object.freeze({
  REQUESTOR: "requestor",
  SYSTEM_ADMIN: "system_admin",
  AREA_ADMIN: "area_admin",
  MAINTENANCE: "maintenance",
  /** Pre-split value. Reads as a system admin and is rewritten to system_admin on save. */
  LEGACY_ADMIN: "admin",
});

export const ASSIGNABLE_ROLES = Object.freeze([
  ROLES.REQUESTOR,
  ROLES.SYSTEM_ADMIN,
  ROLES.AREA_ADMIN,
  ROLES.MAINTENANCE,
]);

export function isSystemAdmin(user) {
  const role = user?.role;
  return role === ROLES.SYSTEM_ADMIN || role === ROLES.LEGACY_ADMIN;
}

export function isAreaAdmin(user) {
  return user?.role === ROLES.AREA_ADMIN;
}

export function isAnyAdmin(user) {
  return isSystemAdmin(user) || isAreaAdmin(user);
}

function normalizeId(value) {
  if (value == null || value === "") {
    return null;
  }
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(id)) {
    return null;
  }
  return id;
}

function normalizeName(value) {
  if (typeof value !== "string") {
    return null;
  }
  const name = value.trim();
  return name || null;
}

function namesMatch(left, right) {
  if (!left || !right) {
    return false;
  }
  return left.toLowerCase() === right.toLowerCase();
}

/**
 * An area argument is an id, a name, or an object with id/areaId and name/areaName.
 * A numeric string is an id. System admins pass for every area, including a missing one.
 * An area admin passes only when every identifier that was supplied matches their area.
 */
function identifyArea(area) {
  if (area == null) {
    return { id: null, name: null };
  }
  if (typeof area === "number") {
    return { id: normalizeId(area), name: null };
  }
  if (typeof area === "string") {
    const trimmed = area.trim();
    if (/^\d+$/.test(trimmed)) {
      return { id: Number(trimmed), name: null };
    }
    return { id: null, name: normalizeName(trimmed) };
  }
  if (typeof area === "object") {
    return {
      id: normalizeId(area.id ?? area.areaId),
      name: normalizeName(area.name ?? area.areaName),
    };
  }
  return { id: null, name: null };
}

export function canAccessArea(user, area) {
  if (isSystemAdmin(user)) {
    return true;
  }
  if (!isAreaAdmin(user)) {
    return false;
  }

  const target = identifyArea(area);
  if (target.id == null && target.name == null) {
    return false;
  }

  const userAreaId = normalizeId(user?.areaId);
  const userAreaName = normalizeName(user?.areaName ?? user?.area?.name);

  if (target.id != null && target.id !== userAreaId) {
    return false;
  }
  if (target.name != null && !namesMatch(target.name, userAreaName)) {
    return false;
  }
  return true;
}
