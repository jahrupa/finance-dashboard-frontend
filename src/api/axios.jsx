import axios from "axios";
import { decryptData } from "../utils/encrypt";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const API = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache",
  },
});

// Request interceptor — attach Bearer token from localStorage
API.interceptors.request.use(
  (config) => {
    // Get encrypted token from localStorage
    const encryptedToken = localStorage.getItem("authToken");

    // Decrypt token
    const token = decryptData(encryptedToken);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);
// Response interceptor — ONLY redirect on explicit auth rejection (401/403)
// Never redirect on network errors or 5xx — that would log users out unfairly
API.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message;

    // Only 401 (invalid/expired token) clears the session.
    // 403 = permission denied — user is still authenticated, do NOT log them out.
    const isTokenInvalid =
      status === 401 ||
      message === "Token expired or invalid";

    if (isTokenInvalid) {
      localStorage.removeItem("authToken");
      if (window.location.pathname !== "/") {
        window.location.href = "/"; // Redirect to login page
      }
    }

    return Promise.reject(error);
  },
);

export default API;