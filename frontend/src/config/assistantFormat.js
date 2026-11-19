const LIST_LINE = /^\s*(?:[-*•]|\d+[.)])\s+\S/;
const ORDERED_LINE = /^\s*\d+[.)]\s+/;
const RULE_LINE = /^\s*([-*_])\1{2,}\s*$/;
const FENCE_LINE = /^```\s*([\w-]*)\s*$/;
const VEHICLE_ITEM = /^(.+?)\s+\(([^,)]+),\s*(\d+)\s*-?\s*passengers?\)\s*-\s*ID\s*(\d+)\s*,\s*(.+)$/i;

function parseInlines(text) {
  const parts = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let match = pattern.exec(text);
  while (match) {
    if (match.index > last) {
      parts.push({ text: text.slice(last, match.index) });
    }
    parts.push({ text: match[1], strong: true });
    last = match.index + match[0].length;
    match = pattern.exec(text);
  }
  if (last < text.length) {
    parts.push({ text: text.slice(last) });
  }
  return parts.length > 0 ? parts : [{ text: "" }];
}

function plain(text) {
  return String(text ?? "").replace(/\*\*/g, "").replace(/`/g, "").trim();
}

function normalizeLine(text) {
  return String(text ?? "")
    .replace(/[\u00a0\u202f\u2007\u2009\u200a]/g, " ")
    .replace(/[‑–—]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function splitRow(line) {
  const trimmed = String(line ?? "").trim();
  if (!trimmed.includes("|")) return null;
  return trimmed.replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function isSeparator(line) {
  const cells = splitRow(line);
  if (!cells || cells.length === 0) return false;
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")));
}

function isTableStart(lines, index) {
  const header = splitRow(lines[index]);
  if (!header || header.length < 2 || !isSeparator(lines[index + 1])) return false;
  const separator = splitRow(lines[index + 1]);
  return separator.length === header.length;
}

function isIdHeader(header) {
  return /^id$/i.test(String(header ?? "").trim());
}

function withoutIdColumns(headers, rows) {
  const keep = headers
    .map((header, index) => (isIdHeader(header) ? -1 : index))
    .filter((index) => index >= 0);
  if (keep.length === 0 || keep.length === headers.length) {
    return { headers, rows };
  }
  return {
    headers: keep.map((index) => headers[index]),
    rows: rows.map((row) => keep.map((index) => row[index] ?? "")),
  };
}

function alignments(rows) {
  if (rows.length === 0) return [];
  const width = rows[0].length;
  return Array.from({ length: width }, (_, index) => {
    const numeric = rows.every((row) => {
      const value = String(row[index] ?? "").trim();
      return value === "" || /^\d+(?:\.\d+)?$/.test(value);
    });
    return numeric ? "end" : "start";
  });
}

function readTable(lines, index) {
  const headers = splitRow(lines[index]).map(plain);
  let cursor = index + 2;
  const rows = [];
  while (cursor < lines.length && splitRow(lines[cursor]) && !isSeparator(lines[cursor])) {
    const cells = splitRow(lines[cursor]).map(plain);
    const row = headers.map((_, cellIndex) => cells[cellIndex] ?? "");
    if (row.some((cell) => cell !== "")) rows.push(row);
    cursor += 1;
  }
  if (rows.length === 0) return null;
  const visible = withoutIdColumns(headers, rows);
  return {
    next: cursor,
    block: {
      type: "table",
      headers: visible.headers,
      rows: visible.rows,
      align: alignments(visible.rows),
    },
  };
}

function listItemText(line) {
  return line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim();
}

function vehicleRow(text) {
  const match = normalizeLine(text).match(VEHICLE_ITEM);
  if (!match) return null;
  return [match[1].trim(), match[2].trim(), match[3], match[5].trim()];
}

function promoteVehicleList(block) {
  if (block.ordered || block.items.length < 2) return block;
  const rows = block.items.map((item) => vehicleRow(item.map((part) => part.text).join("")));
  if (rows.some((row) => row === null)) return block;
  return {
    type: "table",
    headers: ["Vehicle", "Color", "Passengers", "Area"],
    rows,
    align: alignments(rows),
  };
}

function readList(lines, index) {
  const ordered = ORDERED_LINE.test(lines[index]);
  const items = [];
  let cursor = index;
  while (cursor < lines.length && LIST_LINE.test(lines[cursor]) && ORDERED_LINE.test(lines[cursor]) === ordered) {
    items.push(parseInlines(listItemText(lines[cursor])));
    cursor += 1;
  }
  return {
    next: cursor,
    block: promoteVehicleList({ type: "list", ordered, items }),
  };
}

function chartValue(raw) {
  const cleaned = String(raw ?? "").replace(/,/g, "").trim();
  if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function readChart(body) {
  const bars = [];
  for (const line of body) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.includes("|")) continue;
    const [labelRaw, valueRaw] = trimmed.split("|");
    const label = plain(labelRaw);
    const value = chartValue(valueRaw);
    if (!label || value === null) continue;
    bars.push({ label, value });
  }
  if (bars.length === 0) return null;
  const max = Math.max(...bars.map((bar) => bar.value), 0);
  return {
    type: "chart",
    bars: bars.map((bar) => ({
      ...bar,
      width: max > 0 ? Math.max(4, Math.round((bar.value / max) * 100)) : 0,
    })),
  };
}

function readFence(lines, index) {
  const open = lines[index].trim().match(FENCE_LINE);
  if (!open) return null;
  const kind = open[1].toLowerCase();
  const body = [];
  let cursor = index + 1;
  while (cursor < lines.length && !/^```\s*$/.test(lines[cursor].trim())) {
    body.push(lines[cursor]);
    cursor += 1;
  }
  const next = cursor < lines.length ? cursor + 1 : cursor;
  if (kind === "chart") {
    const chart = readChart(body);
    if (chart) return { next, block: chart };
  }
  const text = body.join("\n").trim();
  if (!text) return { next, block: null };
  return { next, block: { type: "paragraph", inlines: parseInlines(text) } };
}

function readParagraph(lines, index) {
  const parts = [];
  let cursor = index;
  while (cursor < lines.length) {
    const line = lines[cursor];
    if (!line.trim() || RULE_LINE.test(line) || LIST_LINE.test(line) || FENCE_LINE.test(line.trim())) break;
    if (isTableStart(lines, cursor)) break;
    parts.push(line.replace(/^\s{0,3}#{1,6}\s+/, "").trimEnd());
    cursor += 1;
  }
  const text = parts.join(" ").replace(/\s+/g, " ").trim();
  return {
    next: Math.max(cursor, index + 1),
    block: text ? { type: "paragraph", inlines: parseInlines(text) } : null,
  };
}

export function parseAssistantMessage(source) {
  const text = String(source ?? "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const lines = text.split("\n");
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || RULE_LINE.test(line)) {
      index += 1;
      continue;
    }
    if (FENCE_LINE.test(line.trim())) {
      const fence = readFence(lines, index);
      if (!fence) {
        index += 1;
        continue;
      }
      if (fence.block) blocks.push(fence.block);
      index = fence.next;
      continue;
    }
    if (isTableStart(lines, index)) {
      const table = readTable(lines, index);
      if (table) {
        blocks.push(table.block);
        index = table.next;
        continue;
      }
    }
    if (LIST_LINE.test(line)) {
      const list = readList(lines, index);
      blocks.push(list.block);
      index = list.next;
      continue;
    }
    const paragraph = readParagraph(lines, index);
    if (paragraph.block) blocks.push(paragraph.block);
    index = paragraph.next;
  }
  return blocks;
}

export function assistantMessageIsWide(source) {
  return parseAssistantMessage(source).some((block) => block.type === "table" || block.type === "chart");
}
