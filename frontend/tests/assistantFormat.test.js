import { describe, expect, it } from "vitest";
import { assistantMessageIsWide, parseAssistantMessage } from "../src/config/assistantFormat.js";

const VEHICLE_REPLY = [
  "Here are the vehicles currently marked **available**:",
  "",
  "- EZ\u2011GO Liberty golf cart (orange, 4\u2011passenger) \u2013 ID\u202f4, Support Central",
  "- 2023 Honda Accord (sea\u2011green, 3\u2011passenger) \u2013 ID\u202f11, Maintenance",
  "- 1975 Honda Civic (yellow, 4\u2011passenger) \u2013 ID\u202f7, Support Central",
  "- 2022 Honda Odyssey van (blue, 2\u2011passenger) \u2013 ID\u202f3, Support Central",
  "- 2021 Honda Odyssey van (onyx, 8\u2011passenger) \u2013 ID\u202f12, Maintenance",
  "- 2021 Ram Colorado truck (taupe, 5\u2011passenger) \u2013 ID\u202f6, Maintenance",
].join("\n");

describe("assistant answer formatting", () => {
  it("turns a vehicle bullet list into a table and keeps the intro", () => {
    const blocks = parseAssistantMessage(VEHICLE_REPLY);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({
      type: "paragraph",
      inlines: [
        { text: "Here are the vehicles currently marked " },
        { text: "available", strong: true },
        { text: ":" },
      ],
    });
    expect(blocks[1].type).toBe("table");
    expect(blocks[1].headers).toEqual(["Vehicle", "Color", "Passengers", "Area"]);
    expect(blocks[1].rows).toHaveLength(6);
    expect(blocks[1].rows[0]).toEqual(["EZ-GO Liberty golf cart", "orange", "4", "Support Central"]);
    expect(blocks[1].rows[1]).toEqual(["2023 Honda Accord", "sea-green", "3", "Maintenance"]);
    expect(blocks[1].align).toEqual(["start", "start", "end", "start"]);
    expect(assistantMessageIsWide(VEHICLE_REPLY)).toBe(true);
  });

  it("leaves a short answer as one sentence", () => {
    const reply = "Six vehicles are available.";
    expect(parseAssistantMessage(reply)).toEqual([
      { type: "paragraph", inlines: [{ text: reply }] },
    ]);
    expect(assistantMessageIsWide(reply)).toBe(false);
  });

  it("keeps a short note as a list", () => {
    const blocks = parseAssistantMessage("- Bring the keys\n- Log the mileage");
    expect(blocks).toEqual([
      {
        type: "list",
        ordered: false,
        items: [[{ text: "Bring the keys" }], [{ text: "Log the mileage" }]],
      },
    ]);
    expect(assistantMessageIsWide("- Bring the keys\n- Log the mileage")).toBe(false);
  });

  it("renders a markdown table", () => {
    const blocks = parseAssistantMessage(
      [
        "Two reservations are pending.",
        "",
        "| ID | Vehicle | Destination |",
        "| --- | --- | --- |",
        "| 12 | 2021 Honda Odyssey | Edmond |",
        "| 9 | 2022 Honda Odyssey | Library |",
      ].join("\n")
    );

    expect(blocks[0].type).toBe("paragraph");
    expect(blocks[1]).toMatchObject({
      type: "table",
      headers: ["Vehicle", "Destination"],
      rows: [
        ["2021 Honda Odyssey", "Edmond"],
        ["2022 Honda Odyssey", "Library"],
      ],
    });
  });

  it("renders a count comparison as a chart", () => {
    const blocks = parseAssistantMessage(
      ["Pending and approved:", "", "```chart", "Pending | 4", "Approved | 2", "```"].join("\n")
    );

    expect(blocks[1]).toEqual({
      type: "chart",
      bars: [
        { label: "Pending", value: 4, width: 100 },
        { label: "Approved", value: 2, width: 50 },
      ],
    });
  });

  it("keeps markup as text", () => {
    const blocks = parseAssistantMessage("See <img src=x onerror=alert(1)>.");
    expect(blocks[0].inlines[0].text).toBe("See <img src=x onerror=alert(1)>.");
  });
});
