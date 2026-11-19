import { apiClient } from "./services.js";

export function listReservations() {
  return apiClient.get("reservations");
}

export function getReservation(id) {
  return apiClient.get(`reservations/${id}`);
}

export function createReservation(payload) {
  return apiClient.post("reservations", payload);
}

export function approveReservation(id) {
  return apiClient.post(`reservations/${id}/approve`);
}

export function denyReservation(id, payload) {
  return apiClient.post(`reservations/${id}/deny`, payload);
}

export function cancelReservation(id) {
  return apiClient.post(`reservations/${id}/cancel`);
}

