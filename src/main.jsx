import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import App from "./App.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes — wrapped by ProtectedRoute */}
          <Route element={<ProtectedRoute />}>
            <Route path="/kpi-dashboard" element={<App />} />
            <Route path="/invoice" element={<App />} />
            <Route path="/finance" element={<App />} />
            <Route path="/hod" element={<App />} />
            <Route path="/payment-approval" element={<App />} />
            <Route path="/payment-processing" element={<App />} />
            <Route path="/user-access" element={<App />} />
            {/* <Route path="/user-access/:id" element={<App />} /> */}
            <Route path="/user-list" element={<App />} />
            <Route path="/user-management" element={<App />} />
            <Route path="/activity-logs" element={<App />} />
            <Route path="/user-wise-data" element={<App />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
