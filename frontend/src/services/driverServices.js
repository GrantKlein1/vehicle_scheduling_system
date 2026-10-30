import { apiClient } from "./services.js";

export function listDrivers() {
  return apiClient.get("driver/drivers");
}

export function createDriver(driver) {
  return apiClient.post("driver/drivers", driver);
}

export function updateDriver(driverId, driver) {
  return apiClient.put(`driver/drivers/${driverId}`, driver);
}

export function deleteDriver(driverId) {
  return apiClient.delete(`driver/drivers/${driverId}`);
}
