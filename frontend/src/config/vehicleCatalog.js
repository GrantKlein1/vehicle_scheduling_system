export const VEHICLE_CATEGORIES = ["Golf Cart", "Truck", "Car", "Van"];

export const AREA_OPTIONS = ["Athletics", "Support Central", "Maintenance"];

export const SERVICE_OPTIONS = [
  "Repair",
  "Oil change",
  "Tire replacement",
  "Tire rotation",
  "Brake service",
  "Battery replacement",
  "Inspection",
  "Air filter replacement",
  "Wheel alignment",
  "Wiper replacement",
];

export const EXPIRATION_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const STANDARD_MAKES = [
  { category: "Golf Cart", make: "Club Car", models: ["Onward", "Villager"] },
  { category: "Golf Cart", make: "EZ-GO", models: ["Liberty", "Express"] },
  { category: "Golf Cart", make: "Yamaha", models: ["Drive2", "Concierge"] },
  { category: "Truck", make: "Ford", models: ["F-150", "Ranger"] },
  { category: "Truck", make: "Chevrolet", models: ["Silverado", "Colorado"] },
  { category: "Truck", make: "Ram", models: ["1500"] },
  { category: "Truck", make: "Toyota", models: ["Tacoma", "Tundra"] },
  { category: "Car", make: "Toyota", models: ["Camry", "Corolla"] },
  { category: "Car", make: "Honda", models: ["Civic", "Accord"] },
  { category: "Car", make: "Chevrolet", models: ["Malibu"] },
  { category: "Car", make: "Ford", models: ["Fusion"] },
  { category: "Van", make: "Ford", models: ["Transit", "E-Series"] },
  { category: "Van", make: "Chevrolet", models: ["Express"] },
  { category: "Van", make: "Honda", models: ["Odyssey"] },
  { category: "Van", make: "Ram", models: ["ProMaster"] },
];

export function makesForCategory(category) {
  return STANDARD_MAKES.filter((row) => row.category === category).map((row) => row.make);
}

export function modelsForMake(category, make) {
  const row = STANDARD_MAKES.find((item) => item.category === category && item.make === make);
  return row ? row.models : [];
}
