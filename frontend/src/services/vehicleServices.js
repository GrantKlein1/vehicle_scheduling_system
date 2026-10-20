import { apiClient } from "./services.js";

export function listVehicles() {
  return apiClient.get("vehicle/vehicles");
}

export function getVehicle(vehicleId) {
  return apiClient.get(`vehicle/vehicles/${vehicleId}`);
}

export function createVehicle(vehicle) {
  return apiClient.post("vehicle/vehicles", vehicle);
}

export function updateVehicle(vehicleId, vehicle) {
  return apiClient.put(`vehicle/vehicles/${vehicleId}`, vehicle);
}

export function deleteVehicle(vehicleId) {
  return apiClient.delete(`vehicle/vehicles/${vehicleId}`);
}

export function logMileage(vehicleId, entry) {
  return apiClient.post(`vehicle/vehicles/${vehicleId}/mileage-logs`, entry);
}

export function logService(vehicleId, entry) {
  return apiClient.post(`vehicle/vehicles/${vehicleId}/service-logs`, entry);
}
