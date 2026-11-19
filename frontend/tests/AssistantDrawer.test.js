/**
 * Feature 9 — AI Assistant
 * Spec: features/feature-9-ai-assistant.md
 */
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../src/App.vue";
import { assistantOpen } from "../src/config/assistantState.js";
import { clearCurrentUser, setCurrentUser } from "../src/config/session.js";
import { chat, planTrip } from "../src/services/assistantServices.js";
import { listDestinations } from "../src/services/destinationServices.js";
import { createReservation } from "../src/services/reservationServices.js";
import { createTestRouter, mountWithPlugins } from "./testUtils.js";

vi.mock("../src/services/assistantServices.js", () => ({
  chat: vi.fn(),
  planTrip: vi.fn(),
}));

vi.mock("../src/services/destinationServices.js", () => ({
  listDestinations: vi.fn(),
}));

vi.mock("../src/services/reservationServices.js", () => ({
  listReservations: vi.fn(),
  getReservation: vi.fn(),
  createReservation: vi.fn(),
  approveReservation: vi.fn(),
  denyReservation: vi.fn(),
  cancelReservation: vi.fn(),
}));

const maintenance = {
  userId: 8,
  email: "mike@eagles.oc.edu",
  fName: "Mike",
  lName: "Lee",
  role: "maintenance",
  areaId: null,
  areaName: null,
  token: "session-token",
};

const requestor = {
  userId: 7,
  email: "jane@eagles.oc.edu",
  fName: "Jane",
  lName: "Doe",
  role: "requestor",
  areaId: null,
  areaName: null,
  token: "session-token",
};

const validDraft = {
  vehicleId: 1,
  vehicleName: "2020 Ford Transit",
  destinationName: "Edmond High School",
  start: "2026-11-20T14:00:00.000Z",
  end: "2026-11-20T18:00:00.000Z",
  areaName: "Athletics",
  passengers: 1,
  driverName: null,
  driverEmail: null,
  purpose: null,
  notes: null,
};

function reservationPayload(draft) {
  return {
    vehicleId: draft.vehicleId,
    destinationName: draft.destinationName,
    start: draft.start,
    end: draft.end,
    areaName: draft.areaName,
    passengers: draft.passengers,
    driverName: draft.driverName,
    driverEmail: draft.driverEmail,
    purpose: draft.purpose,
    notes: draft.notes,
  };
}

function buttonByText(wrapper, label) {
  return wrapper.findAll("button").find((node) => node.text().trim() === label);
}

function messageTextarea() {
  return [...document.querySelectorAll("textarea")].find((node) => {
    if (node.classList.contains("v-textarea__sizer")) return false;
    const labelId = node.getAttribute("aria-labelledby");
    const label = labelId ? document.getElementById(labelId) : null;
    return Boolean(label?.textContent?.includes("Message"));
  });
}

async function setMessage(wrapper, value) {
  const field = wrapper
    .findAllComponents({ name: "VTextarea" })
    .find((item) => item.props("label") === "Message");
  if (!field) {
    throw new Error("Missing Message field");
  }
  await field.find("textarea").setValue(value);
  await flushPromises();
}

async function mountApp({ user = null, history = null, open = false } = {}) {
  clearCurrentUser();
  if (history) {
    sessionStorage.setItem("assistantHistory", JSON.stringify(history));
  }
  if (user) {
    setCurrentUser(user);
  }
  assistantOpen.value = open;
  const router = await createTestRouter("/");
  const mounted = await mountWithPlugins(App, {
    router,
    attachTo: document.body,
  });
  await flushPromises();
  return mounted.wrapper;
}

describe("Feature 9 — AI Assistant", () => {
  let wrapper;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    clearCurrentUser();
    assistantOpen.value = false;
    vi.clearAllMocks();
    listDestinations.mockResolvedValue({
      data: [{ name: "Edmond High School" }, { name: "Memorial Road" }],
    });
  });

  afterEach(() => {
    wrapper?.unmount();
    wrapper = null;
  });

  describe("US-9.4", () => {
    it("Confirm creates a pending reservation via POST /reservations", async () => {
      createReservation.mockResolvedValue({
        data: { id: 42, status: "pending", requestorId: requestor.userId },
      });
      wrapper = await mountApp({
        user: requestor,
        open: true,
        history: { messages: [], draft: validDraft },
      });

      await buttonByText(wrapper, "Confirm").trigger("click");
      await flushPromises();

      expect(createReservation).toHaveBeenCalledTimes(1);
      expect(createReservation).toHaveBeenCalledWith(reservationPayload(validDraft));
      expect(wrapper.text()).toContain("Reservation 42 is pending.");
      expect(buttonByText(wrapper, "Confirm")).toBeUndefined();

      const stored = JSON.parse(sessionStorage.getItem("assistantHistory"));
      expect(stored.draft.confirmedId).toBe(42);
      expect(stored.draft.confirmedStatus).toBe("pending");

      wrapper.unmount();
      assistantOpen.value = true;
      const router = await createTestRouter("/");
      const remounted = await mountWithPlugins(App, { router, attachTo: document.body });
      await flushPromises();
      wrapper = remounted.wrapper;
      expect(wrapper.text()).toContain("Reservation 42 is pending.");
      expect(buttonByText(wrapper, "Confirm")).toBeUndefined();
    });

    it("Confirm shows the reservation API message", async () => {
      createReservation.mockRejectedValue({
        response: {
          status: 400,
          data: { message: "The requested vehicle is not available for the selected dates." },
        },
      });
      wrapper = await mountApp({
        user: requestor,
        open: true,
        history: { messages: [], draft: validDraft },
      });

      await buttonByText(wrapper, "Confirm").trigger("click");
      await flushPromises();

      expect(createReservation).toHaveBeenCalledTimes(1);
      expect(wrapper.text()).toContain("The requested vehicle is not available for the selected dates.");
      expect(wrapper.text()).toContain("2020 Ford Transit");
      expect(buttonByText(wrapper, "Confirm")).toBeTruthy();
      expect(buttonByText(wrapper, "Edit")).toBeTruthy();
      expect(buttonByText(wrapper, "Discard")).toBeTruthy();
      expect(wrapper.text()).not.toContain("Reservation 42 is pending.");
    });

    it("Edit focuses the chat input", async () => {
      wrapper = await mountApp({
        user: requestor,
        open: true,
        history: { messages: [], draft: validDraft },
      });

      await buttonByText(wrapper, "Edit").trigger("click");
      await flushPromises();
      await nextTick();

      const field = messageTextarea();
      expect(field).toBeTruthy();
      expect(document.activeElement).toBe(field);
      expect(wrapper.text()).toContain("2020 Ford Transit");
      expect(buttonByText(wrapper, "Confirm")).toBeTruthy();
    });

    it("Discard removes the draft card", async () => {
      wrapper = await mountApp({
        user: requestor,
        open: true,
        history: { messages: [], draft: validDraft },
      });

      await buttonByText(wrapper, "Discard").trigger("click");
      await flushPromises();

      expect(createReservation).not.toHaveBeenCalled();
      expect(wrapper.text()).not.toContain("2020 Ford Transit");
      expect(buttonByText(wrapper, "Confirm")).toBeUndefined();
      expect(buttonByText(wrapper, "Discard")).toBeUndefined();
    });
  });

  describe("US-9.6", () => {
    it("Signed-in user opens the assistant drawer", async () => {
      wrapper = await mountApp({ user: requestor, open: false });

      const drawer = wrapper.get(".assistant-drawer");
      expect(drawer.classes()).toContain("v-navigation-drawer--right");
      expect(drawer.classes()).not.toContain("v-navigation-drawer--active");

      await wrapper.get("[aria-label='Open assistant']").trigger("click");
      await flushPromises();

      const opened = wrapper.get(".assistant-drawer");
      expect(opened.classes()).toContain("v-navigation-drawer--right");
      expect(opened.classes()).toContain("v-navigation-drawer--active");
      expect(buttonByText(wrapper, "Send").element.disabled).toBe(true);

      const navLabels = wrapper
        .findAll(".menu-bar__nav .menu-bar__item")
        .map((node) => node.text().trim());
      expect(navLabels).not.toContain("Assistant");
      expect(wrapper.find(".menu-bar__nav").text()).not.toContain("Assistant");
    });

    it("Drawer hidden when signed out", async () => {
      wrapper = await mountApp({ user: null, open: true });

      expect(wrapper.find(".assistant-drawer").exists()).toBe(false);
      expect(wrapper.find(".v-navigation-drawer").exists()).toBe(false);
      expect(wrapper.find("[aria-label='Open assistant']").exists()).toBe(false);
    });

    it("History persists for the browser session", async () => {
      const history = {
        messages: [
          { role: "user", content: "Which of my reservations are still pending?" },
          { role: "assistant", content: "You have one pending reservation." },
        ],
        draft: null,
      };
      chat.mockResolvedValue({ data: { reply: "Friday looks open.", draft: null } });
      wrapper = await mountApp({ user: requestor, open: true, history });

      expect(wrapper.text()).toContain("Which of my reservations are still pending?");
      expect(wrapper.text()).toContain("You have one pending reservation.");
      expect(JSON.parse(sessionStorage.getItem("assistantHistory")).messages).toEqual(history.messages);

      await setMessage(wrapper, "Book a van for Friday");
      await buttonByText(wrapper, "Send").trigger("click");
      await flushPromises();

      expect(chat).toHaveBeenCalledWith([
        { role: "user", content: "Which of my reservations are still pending?" },
        { role: "assistant", content: "You have one pending reservation." },
        { role: "user", content: "Book a van for Friday" },
      ]);
      expect(wrapper.text()).toContain("Friday looks open.");
      expect(JSON.parse(sessionStorage.getItem("assistantHistory")).messages).toEqual([
        ...history.messages,
        { role: "user", content: "Book a van for Friday" },
        { role: "assistant", content: "Friday looks open." },
      ]);
    });
  });

  describe("US-9.6 suggestions", () => {
    it("Suggestion sends a user message", async () => {
      chat.mockResolvedValue({ data: { reply: "You have one pending reservation.", draft: null } });
      wrapper = await mountApp({ user: requestor, open: true });

      expect(buttonByText(wrapper, "I want to make a reservation")).toBeTruthy();
      expect(buttonByText(wrapper, "What's free tomorrow from 8am to noon?")).toBeTruthy();

      await buttonByText(wrapper, "What's still pending?").trigger("click");
      await flushPromises();

      expect(chat).toHaveBeenCalledWith([
        { role: "user", content: "What's still pending?" },
      ]);
      expect(wrapper.text()).toContain("You have one pending reservation.");
      expect(buttonByText(wrapper, "What's still pending?")).toBeUndefined();
    });

    it("Maintenance suggestions do not offer booking", async () => {
      wrapper = await mountApp({ user: maintenance, open: true });

      expect(buttonByText(wrapper, "I want to make a reservation")).toBeUndefined();
      expect(buttonByText(wrapper, "Which vehicles are available?")).toBeTruthy();
      expect(buttonByText(wrapper, "Which vehicles are in repair?")).toBeTruthy();
      expect(wrapper.find(".trip-form").exists()).toBe(false);
    });

    it("Area admin suggestions include the fleet and booking", async () => {
      wrapper = await mountApp({
        user: { ...requestor, role: "area_admin", areaId: 5, areaName: "Athletics" },
        open: true,
      });

      expect(buttonByText(wrapper, "Which vehicles are available?")).toBeTruthy();
      expect(buttonByText(wrapper, "Who can drive a van?")).toBeTruthy();
      expect(buttonByText(wrapper, "I want to make a reservation")).toBeTruthy();
      expect(buttonByText(wrapper, "What's free tomorrow from 8am to noon?")).toBeUndefined();
    });
  });

  describe("US-9.7", () => {
    it("Assistant disabled returns 503", async () => {
      chat.mockRejectedValue({
        response: {
          status: 503,
          data: { message: "The assistant is not available." },
        },
      });
      wrapper = await mountApp({ user: requestor, open: true });

      await setMessage(wrapper, "Hello");
      await buttonByText(wrapper, "Send").trigger("click");
      await flushPromises();

      expect(chat).toHaveBeenCalledWith([{ role: "user", content: "Hello" }]);
      expect(wrapper.text()).toContain("The assistant is not available.");
      expect(wrapper.text()).toContain("Hello");
      expect(wrapper.findAll(".assistant-drawer__bubble--user")).toHaveLength(1);
      expect(wrapper.findAll(".assistant-drawer__bubble--assistant")).toHaveLength(0);
    });

    it("Try again resends the last message", async () => {
      chat
        .mockRejectedValueOnce({
          response: {
            status: 502,
            data: { message: "The assistant could not answer right now. Please try again." },
          },
        })
        .mockResolvedValueOnce({ data: { reply: "You have one pending reservation.", draft: null } });
      wrapper = await mountApp({ user: requestor, open: true });

      await setMessage(wrapper, "Hello");
      await buttonByText(wrapper, "Send").trigger("click");
      await flushPromises();

      expect(wrapper.findAll(".assistant-drawer__bubble--user")).toHaveLength(1);
      await buttonByText(wrapper, "Try again").trigger("click");
      await flushPromises();

      expect(chat).toHaveBeenNthCalledWith(2, [{ role: "user", content: "Hello" }]);
      expect(wrapper.findAll(".assistant-drawer__bubble--user")).toHaveLength(1);
      expect(wrapper.findAll(".assistant-drawer__bubble--assistant")).toHaveLength(1);
      expect(wrapper.text()).toContain("You have one pending reservation.");
    });
  });

  describe("US-9.4 trip form", () => {
    function labeledSelect(label) {
      return wrapper.findAllComponents({ name: "VSelect" }).find((item) => item.props("label") === label);
    }

    async function choose(label, value) {
      const select = labeledSelect(label);
      select.vm.$emit("update:modelValue", value);
      await flushPromises();
    }

    async function fillTrip() {
      await choose("Destination", "Memorial Road");
      await choose("Vehicle type", "Van");
      const passengers = wrapper
        .findAllComponents({ name: "VTextField" })
        .find((item) => item.props("label") === "Passengers");
      await passengers.find("input").setValue("4");
      const start = wrapper
        .findAllComponents({ name: "VTextField" })
        .find((item) => item.props("label") === "Start");
      const end = wrapper
        .findAllComponents({ name: "VTextField" })
        .find((item) => item.props("label") === "End");
      await start.find("input").setValue("2027-08-19T08:00");
      await end.find("input").setValue("2027-08-19T12:00");
    }

    it("A chat reply does not fill in a destination", async () => {
      chat.mockResolvedValue({
        data: {
          reply: "Tell me the destination, vehicle type, and passengers in the trip form.",
          draft: validDraft,
        },
      });
      wrapper = await mountApp({ user: requestor, open: true });

      await setMessage(wrapper, "Please book a van");
      await buttonByText(wrapper, "Send").trigger("click");
      await flushPromises();

      expect(wrapper.text()).toContain("Tell me the destination, vehicle type, and passengers in the trip form.");
      expect(wrapper.text()).not.toContain("2020 Ford Transit");
      expect(buttonByText(wrapper, "Confirm")).toBeUndefined();
    });

    it("A question does not open the trip form", async () => {
      chat.mockResolvedValue({ data: { reply: "You have one pending reservation.", draft: null } });
      wrapper = await mountApp({ user: requestor, open: true });

      expect(wrapper.find(".trip-form").exists()).toBe(false);

      await setMessage(wrapper, "What reservations do I have?");
      await buttonByText(wrapper, "Send").trigger("click");
      await flushPromises();

      expect(wrapper.find(".trip-form").exists()).toBe(false);
      expect(listDestinations).not.toHaveBeenCalled();
    });

    it("The form requires destination, vehicle type, and passengers", async () => {
      wrapper = await mountApp({
        user: requestor,
        open: true,
        history: {
          messages: [{ role: "user", content: "I want to make a reservation" }],
          draft: null,
        },
      });

      expect(labeledSelect("Destination")).toBeTruthy();
      expect(labeledSelect("Vehicle type")).toBeTruthy();
      expect(wrapper.text()).toContain("Passengers");

      await buttonByText(wrapper, "Find vehicles").trigger("click");
      await flushPromises();

      expect(planTrip).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("Destination is required.");
      expect(wrapper.text()).toContain("Vehicle type is required.");
      expect(wrapper.text()).toContain("Passengers are required.");
    });

    it("Review draft uses the form values", async () => {
      planTrip
        .mockResolvedValueOnce({
          data: {
            vehicles: [
              {
                id: 4,
                name: "2020 Ford Transit",
                category: "Van",
                passengerCapacity: 8,
                areaAssigned: "Athletics",
              },
            ],
            draft: null,
          },
        })
        .mockResolvedValueOnce({
          data: {
            vehicles: [],
            draft: {
              ...validDraft,
              vehicleId: 4,
              destinationName: "Memorial Road",
              passengers: 4,
            },
          },
        });
      wrapper = await mountApp({
        user: requestor,
        open: true,
        history: {
          messages: [{ role: "user", content: "I want to make a reservation" }],
          draft: null,
        },
      });
      await flushPromises();
      await fillTrip();

      await buttonByText(wrapper, "Find vehicles").trigger("click");
      await flushPromises();

      expect(planTrip).toHaveBeenCalledWith({
        destinationName: "Memorial Road",
        category: "Van",
        passengers: 4,
        start: "2027-08-19T13:00:00.000Z",
        end: "2027-08-19T17:00:00.000Z",
      });
      expect(wrapper.text()).toContain("2020 Ford Transit");
      expect(buttonByText(wrapper, "Confirm")).toBeUndefined();

      const group = wrapper.findComponent({ name: "VRadioGroup" });
      group.vm.$emit("update:modelValue", 4);
      await flushPromises();
      await buttonByText(wrapper, "Review draft").trigger("click");
      await flushPromises();

      expect(planTrip).toHaveBeenLastCalledWith({
        destinationName: "Memorial Road",
        category: "Van",
        passengers: 4,
        start: "2027-08-19T13:00:00.000Z",
        end: "2027-08-19T17:00:00.000Z",
        vehicleId: 4,
      });
      expect(wrapper.text()).toContain("Memorial Road");
      expect(wrapper.text()).toContain("Reservation");
      expect(buttonByText(wrapper, "Confirm")).toBeTruthy();
    });

    it("Maintenance does not see the trip form", async () => {
      wrapper = await mountApp({
        user: maintenance,
        open: true,
        history: {
          messages: [{ role: "user", content: "I want to make a reservation" }],
          draft: null,
        },
      });

      expect(wrapper.find(".trip-form").exists()).toBe(false);
      expect(buttonByText(wrapper, "Find vehicles")).toBeUndefined();
      expect(listDestinations).not.toHaveBeenCalled();
    });
  });
});
