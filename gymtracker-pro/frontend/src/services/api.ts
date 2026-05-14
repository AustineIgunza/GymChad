import axios from "axios";
import { useAuthStore } from "../stores/useAuthStore";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "/api/v1",
});

api.interceptors.request.use((config) => {
  const { userId } = useAuthStore.getState();
  config.headers["x-user-id"] = userId;
  return config;
});

export default api;
