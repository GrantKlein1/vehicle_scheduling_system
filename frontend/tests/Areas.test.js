import { describe, it, expect, beforeEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { vuetify } from "./testUtils.js";
import Areas from "../src/views/Areas.vue";
import * as areaServices from "../src/services/areaServices.js";

vi.mock("../src/services/areaServices.js", () => ({
  listAreas: vi.fn(),
  getArea: vi.fn(),
  createArea: vi.fn(),
  updateArea: vi.fn(),
  deleteArea: vi.fn(),
  listAreaAdmins: vi.fn(),
  assignAreaAdmin: vi.fn(),
  removeAreaAdmin: vi.fn(),
}));

describe("Feature 5 — Area Management Frontend", () => {
  const sampleAreas = [
    {
      id: 1,
      name: "Athletics",
      notificationEmail: "athletics@eagles.oc.edu",
      logo: "athletics.png",
      createdAt: "2026-10-27T12:00:00.000Z",
    },
    {
      id: 2,
      name: "Maintenance",
      notificationEmail: "maint@eagles.oc.edu",
      logo: null,
      createdAt: "2026-10-27T12:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    areaServices.listAreas.mockResolvedValue({ data: sampleAreas });
    areaServices.listAreaAdmins.mockResolvedValue({ data: [] });
  });

  function mountView() {
    return mount(Areas, {
      global: {
        plugins: [vuetify],
      },
      attachTo: document.body,
    });
  }

  it("Empty catalog displays empty state", async () => {
    areaServices.listAreas.mockResolvedValue({ data: [] });
    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.text()).toContain("No areas yet.");
  });

  it("Search filters area list", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.text()).toContain("Athletics");
    expect(wrapper.text()).toContain("Maintenance");

    const searchInput = wrapper.find("input[placeholder='Search areas']");
    await searchInput.setValue("ath");
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Athletics");
    expect(wrapper.text()).not.toContain("Maintenance");
  });

  it("Admin sees Edit and Delete action controls", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.text()).toContain("Edit area");
    expect(wrapper.text()).toContain("Delete area");
  });

  it("Cancel delete keeps area", async () => {
    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.vm.isDeleteDialogOpen).toBe(false);
    wrapper.vm.openDeleteDialog();
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.isDeleteDialogOpen).toBe(true);
    expect(document.body.textContent).toContain("Are you sure you want to delete Athletics?");

    wrapper.vm.isDeleteDialogOpen = false;
    await wrapper.vm.$nextTick();

    expect(areaServices.deleteArea).not.toHaveBeenCalled();
    expect(wrapper.vm.isDeleteDialogOpen).toBe(false);
  });

  it("Save new area calls createArea and refreshes", async () => {
    areaServices.createArea.mockResolvedValue({
      data: {
        id: 3,
        name: "Honors Program",
        notificationEmail: "honors@eagles.oc.edu",
        logo: "",
      },
    });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    wrapper.vm.openAddDialog();
    wrapper.vm.areaForm.name = "Honors Program";
    wrapper.vm.areaForm.notificationEmail = "honors@eagles.oc.edu";
    await wrapper.vm.handleCreateArea();

    expect(areaServices.createArea).toHaveBeenCalledWith({
      name: "Honors Program",
      notificationEmail: "honors@eagles.oc.edu",
      logo: "",
    });
    expect(wrapper.vm.isAddDialogOpen).toBe(false);
  });

  it("Save existing area calls updateArea", async () => {
    areaServices.updateArea.mockResolvedValue({
      data: {
        id: 1,
        name: "Athletics Dept",
        notificationEmail: "athletics@eagles.oc.edu",
        logo: "athletics.png",
      },
    });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    wrapper.vm.openEditDialog();
    wrapper.vm.areaForm.name = "Athletics Dept";
    await wrapper.vm.handleUpdateArea();

    expect(areaServices.updateArea).toHaveBeenCalledWith(1, {
      name: "Athletics Dept",
      notificationEmail: "athletics@eagles.oc.edu",
      logo: "athletics.png",
    });
    expect(wrapper.vm.isEditDialogOpen).toBe(false);
  });

  it("Confirming delete calls deleteArea", async () => {
    areaServices.deleteArea.mockResolvedValue({ data: {} });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    wrapper.vm.openDeleteDialog();
    await wrapper.vm.handleDeleteArea();

    expect(areaServices.deleteArea).toHaveBeenCalledWith(1);
    expect(wrapper.vm.isDeleteDialogOpen).toBe(false);
  });

  it("Displays area admins and assigns a new admin", async () => {
    areaServices.listAreaAdmins.mockResolvedValue({
      data: [
        {
          id: 10,
          fName: "Coach",
          lName: "Taylor",
          email: "taylor@eagles.oc.edu",
          role: "area_admin",
        },
      ],
    });
    areaServices.assignAreaAdmin.mockResolvedValue({ data: {} });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(wrapper.text()).toContain("Coach Taylor");

    wrapper.vm.openAssignAdminDialog();
    wrapper.vm.adminForm.email = "assistant@eagles.oc.edu";
    await wrapper.vm.handleAssignAdmin();

    expect(areaServices.assignAreaAdmin).toHaveBeenCalledWith(1, {
      email: "assistant@eagles.oc.edu",
    });
    expect(wrapper.vm.isAssignAdminDialogOpen).toBe(false);
  });

  it("Removes an area admin calls removeAreaAdmin", async () => {
    areaServices.listAreaAdmins.mockResolvedValue({
      data: [
        {
          id: 10,
          fName: "Coach",
          lName: "Taylor",
          email: "taylor@eagles.oc.edu",
          role: "area_admin",
        },
      ],
    });
    areaServices.removeAreaAdmin.mockResolvedValue({ data: {} });

    const wrapper = mountView();
    await wrapper.vm.$nextTick();
    await new Promise((resolve) => setTimeout(resolve, 50));

    wrapper.vm.promptRemoveAdmin({
      id: 10,
      fName: "Coach",
      lName: "Taylor",
    });
    await wrapper.vm.handleRemoveAdmin();

    expect(areaServices.removeAreaAdmin).toHaveBeenCalledWith(1, 10);
    expect(wrapper.vm.isRemoveAdminDialogOpen).toBe(false);
  });
});
