import { describe, expect, it } from "vitest";
import {
  canAccessArea,
  formatRoleLabel,
  isAnyAdmin,
  isSystemAdmin,
  roleMatchesNav,
} from "../src/config/roles.js";

const systemAdmin = { role: "system_admin", areaId: null, areaName: null };
const legacyAdmin = { role: "admin", areaId: null, areaName: null };
const areaAdmin = { role: "area_admin", areaId: 5, areaName: "Athletics" };
const requestor = { role: "requestor", areaId: null, areaName: null };

describe("admin role checks", () => {
  it("treats system admins and legacy admins as full admins", () => {
    expect(isSystemAdmin(systemAdmin)).toBe(true);
    expect(isSystemAdmin(legacyAdmin)).toBe(true);
    expect(isSystemAdmin(areaAdmin)).toBe(false);
    expect(isAnyAdmin(systemAdmin)).toBe(true);
    expect(isAnyAdmin(areaAdmin)).toBe(true);
    expect(isAnyAdmin(requestor)).toBe(false);
  });

  it("lets system admins into every area and area admins into their own area", () => {
    expect(canAccessArea(systemAdmin, "Biology")).toBe(true);
    expect(canAccessArea(systemAdmin, null)).toBe(true);
    expect(canAccessArea(legacyAdmin, { id: 9, name: "Biology" })).toBe(true);
    expect(canAccessArea(areaAdmin, " athletics ")).toBe(true);
    expect(canAccessArea(areaAdmin, 5)).toBe(true);
    expect(canAccessArea(areaAdmin, { id: 5, name: "Athletics" })).toBe(true);
    expect(canAccessArea(areaAdmin, { id: 5, name: "Biology" })).toBe(false);
    expect(canAccessArea(areaAdmin, "Biology")).toBe(false);
    expect(canAccessArea(areaAdmin, null)).toBe(false);
    expect(canAccessArea(requestor, "Athletics")).toBe(false);
  });

  it("keeps full-access nav items on system admins and shows area admin labels", () => {
    expect(roleMatchesNav(systemAdmin, ["admin", "maintenance"])).toBe(true);
    expect(roleMatchesNav(legacyAdmin, ["admin"])).toBe(true);
    expect(roleMatchesNav(areaAdmin, ["admin", "maintenance"])).toBe(false);
    expect(roleMatchesNav(areaAdmin, ["area_admin"])).toBe(true);
    expect(roleMatchesNav(systemAdmin, ["area_admin"])).toBe(false);
    expect(roleMatchesNav(requestor, ["requestor", "admin"])).toBe(true);
    expect(roleMatchesNav(areaAdmin, ["system_admin", "area_admin"])).toBe(true);

    expect(formatRoleLabel(systemAdmin)).toBe("System Admin");
    expect(formatRoleLabel(legacyAdmin)).toBe("System Admin");
    expect(formatRoleLabel(areaAdmin)).toBe("Area Admin · Athletics");
    expect(formatRoleLabel({ role: "area_admin", areaId: 1, areaName: "  " })).toBe("Area Admin");
    expect(formatRoleLabel(requestor)).toBe("Requestor");
    expect(formatRoleLabel({ role: "maintenance" })).toBe("Maintenance");
  });
});
