import { apiClient } from "./services.js";

export function listAreas() {
  return apiClient.get("area/areas");
}

export function getArea(areaId) {
  return apiClient.get(`area/areas/${areaId}`);
}

export function createArea(area) {
  return apiClient.post("area/areas", area);
}

export function updateArea(areaId, area) {
  return apiClient.put(`area/areas/${areaId}`, area);
}

export function deleteArea(areaId) {
  return apiClient.delete(`area/areas/${areaId}`);
}

export function listAreaAdmins(areaId) {
  return apiClient.get(`area/areas/${areaId}/admins`);
}

export function assignAreaAdmin(areaId, payload) {
  return apiClient.post(`area/areas/${areaId}/admins`, payload);
}

export function removeAreaAdmin(areaId, userId) {
  return apiClient.delete(`area/areas/${areaId}/admins/${userId}`);
}

