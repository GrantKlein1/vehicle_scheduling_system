import { apiClient } from "./services.js";

export function listDestinations() {
  return apiClient.get("vehicle/destinations");
}

export function createDestination(destination) {
  return apiClient.post("vehicle/destinations", destination);
}

export function updateDestination(destinationId, destination) {
  return apiClient.put(`vehicle/destinations/${destinationId}`, destination);
}

export function deleteDestination(destinationId) {
  return apiClient.delete(`vehicle/destinations/${destinationId}`);
}
