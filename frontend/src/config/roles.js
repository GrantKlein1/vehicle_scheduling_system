/**
 * Role checks for the signed-in user stored in the session.
 * Keep the predicates in sync with backend/app/authorization/roles.js.
 */

export const ROLES = Object.freeze({
  REQUESTOR: "requestor",
  SYSTEM_ADMIN: "system_admin",
  AREA_ADMIN: "area_admin",
  MAINTENANCE: "maintenance",
  LEGACY_ADMIN: "admin",
});

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

export function formatRoleLabel(user) {
  if (!user?.role) {
    return "";
  }
  if (isSystemAdmin(user)) {
    return "System Admin";
  }
  if (isAreaAdmin(user)) {
    const areaName = normalizeName(user.areaName);
    return areaName ? `Area Admin · ${areaName}` : "Area Admin";
  }
  if (user.role === ROLES.MAINTENANCE) {
    return "Maintenance";
  }
  if (user.role === ROLES.REQUESTOR) {
    return "Requestor";
  }
  return user.role;
}

/**
 * Nav items that list `admin` or `system_admin` are the old full-access items:
 * system admins see them, area admins do not. List `area_admin` for area-admin items.
 */
export function roleMatchesNav(user, allowedRoles = []) {
  if (!user?.role || !Array.isArray(allowedRoles)) {
    return false;
  }
  return allowedRoles.some((allowed) => {
    if (allowed === ROLES.LEGACY_ADMIN || allowed === ROLES.SYSTEM_ADMIN) {
      return isSystemAdmin(user);
    }
    if (allowed === ROLES.AREA_ADMIN) {
      return isAreaAdmin(user);
    }
    return user.role === allowed;
  });
}
