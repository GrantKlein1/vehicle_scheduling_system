// Paint names a vehicle can be stored as, with the hex used for its icon.
const VEHICLE_COLOR_ENTRIES = [
  ["Amber", "#FFBF00"],
  ["Aqua", "#00CED1"],
  ["Ash", "#B2BEB5"],
  ["Baby Blue", "#89CFF0"],
  ["Beige", "#F5F5DC"],
  ["Black", "#1A1A1A"],
  ["Blue", "#1565C0"],
  ["Brick", "#8B4513"],
  ["Bronze", "#CD7F32"],
  ["Brown", "#6D4C41"],
  ["Burgundy", "#800020"],
  ["Camel", "#C19A6B"],
  ["Champagne", "#F7E7CE"],
  ["Charcoal", "#36454F"],
  ["Cherry", "#DE3163"],
  ["Chocolate", "#5C3317"],
  ["Cobalt", "#0047AB"],
  ["Coffee", "#6F4E37"],
  ["Copper", "#B87333"],
  ["Coral", "#FF7F50"],
  ["Cream", "#FFFDD0"],
  ["Crimson", "#DC143C"],
  ["Cyan", "#00BCD4"],
  ["Dark Blue", "#0D47A1"],
  ["Dark Green", "#1B5E20"],
  ["Dark Yellow", "#C6A700"],
  ["Eggplant", "#614051"],
  ["Emerald", "#2E8B57"],
  ["Forest Green", "#228B22"],
  ["Garnet", "#733635"],
  ["Gold", "#D4AF37"],
  ["Graphite", "#383838"],
  ["Gray", "#808080"],
  ["Green", "#2E7D32"],
  ["Grey", "#808080"],
  ["Gunmetal", "#2C3539"],
  ["Hot Pink", "#FF69B4"],
  ["Hunter Green", "#355E3B"],
  ["Ice Blue", "#D6F1FF"],
  ["Indigo", "#3F51B5"],
  ["Ivory", "#FFFFF0"],
  ["Jet Black", "#0A0A0A"],
  ["Khaki", "#C3B091"],
  ["Lavender", "#E6E6FA"],
  ["Lemon", "#FFF44F"],
  ["Light Blue", "#90CAF9"],
  ["Light Green", "#A5D6A7"],
  ["Lime", "#C6FF00"],
  ["Linen", "#FAF0E6"],
  ["Magenta", "#C2185B"],
  ["Mahogany", "#C04000"],
  ["Maroon", "#800000"],
  ["Midnight Blue", "#191970"],
  ["Mint", "#98FF98"],
  ["Mocha", "#6B4423"],
  ["Mustard", "#FFDB58"],
  ["Navy", "#001F5B"],
  ["Off White", "#F8F4E8"],
  ["Olive", "#808000"],
  ["Onyx", "#111111"],
  ["Orange", "#F57C00"],
  ["Peach", "#FFCBA4"],
  ["Pearl", "#F8F6F0"],
  ["Pewter", "#8E8E8E"],
  ["Pink", "#F48FB1"],
  ["Platinum", "#E5E4E2"],
  ["Plum", "#8E4585"],
  ["Powder Blue", "#B0E0E6"],
  ["Purple", "#6A1B9A"],
  ["Red", "#D32F2F"],
  ["Rose", "#E91E63"],
  ["Royal Blue", "#4169E1"],
  ["Ruby", "#9B111E"],
  ["Rust", "#B7410E"],
  ["Sage", "#9CAF88"],
  ["Salmon", "#FA8072"],
  ["Sand", "#C2B280"],
  ["Scarlet", "#FF2400"],
  ["Sea Green", "#2E8B57"],
  ["Silver", "#C0C0C0"],
  ["Sky Blue", "#87CEEB"],
  ["Slate", "#708090"],
  ["Snow", "#FFFAFA"],
  ["Steel", "#7A8B99"],
  ["Steel Blue", "#4682B4"],
  ["Tan", "#D2B48C"],
  ["Tangerine", "#FF9966"],
  ["Taupe", "#8B7D6B"],
  ["Teal", "#008080"],
  ["Turquoise", "#40E0D0"],
  ["Violet", "#7F00FF"],
  ["Walnut", "#5C4033"],
  ["White", "#F4F4F4"],
  ["Wine", "#722F37"],
  ["Yellow", "#FBC02D"],
];

export const VEHICLE_COLORS = VEHICLE_COLOR_ENTRIES.map(([name, hex]) => ({ name, hex }));

const BY_NAME = new Map(VEHICLE_COLORS.map((color) => [color.name.toLowerCase(), color]));

export const VEHICLE_COLOR_NAMES = [...VEHICLE_COLORS.map((color) => color.name)].sort((left, right) =>
  left.localeCompare(right)
);

export function canonicalVehicleColor(value) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) {
    return null;
  }
  return BY_NAME.get(text)?.name ?? null;
}

export function vehicleColorHex(value) {
  const text = String(value ?? "").trim().toLowerCase();
  return BY_NAME.get(text)?.hex ?? null;
}
