// session expired

import axios from "axios";
// import { decryptData } from "../page/utils/encrypt";
const baseURL = import.meta.env.VITE_API_BASE_URL;
const API = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
    },
    //  withCredentials: true, // <--- important for cookies
});

// Request interceptor - set Authorization header
API.interceptors.request.use(
    (config) => {
        localStorage.setItem("authToken", "faketoken123");
        const encryptedToken = localStorage.getItem("authToken");

        if (!encryptedToken) {
            return config; // no token found skip
        }

        let local_token;
        try {
            //   local_token = decryptData(encryptedToken);
            local_token = encryptedToken;
        } catch {
            return config; // decrypt error occurred, skip
        }

        if (local_token) {
            config.headers.Authorization = `Bearer ${local_token}`;
        }

        return config;
    },
    (error) => Promise.reject(error),
);

// Response interceptor - handle expired token
API.interceptors.response.use(
    (response) => response,
    (error) => {
        const response = error.response;

        if (
            response &&
            response.data &&
            response.data.message === "Token expired or invalid"
            // response.status === 401 // Unauthorized
        ) {
            localStorage.removeItem("authToken");
            window.location.href = "/"; // redirect to login
        }

        return Promise.reject(error);
    },
);

export default API;
