export const CATEGORY_ICONS = {
  "Golf Cart": "mdi-golf-cart",
  Truck: "mdi-truck",
  Car: "mdi-car",
  Van: "mdi-van-passenger",
};

export function vehicleTitle(vehicle) {
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

export function formatDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatMileage(value) {
  return `${Number(value).toLocaleString("en-US")} mi`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthName(month) {
  return MONTH_NAMES[Number(month) - 1] ?? "";
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
