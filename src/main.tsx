import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import App from "./app/App";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./app/Dashboard";
import ProfilePage from "./app/ProfilePage";
import ProtectedRoute from "./app/components/ProtectedRoute";

import { ChatProvider } from "./context/ChatContext"; // ✅ ADD THIS

import "./styles/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* ✅ CONTEXT PROVIDER (NO UI CHANGE) */}
    <ChatProvider>
      <BrowserRouter>
        <Routes>
          {/* 🌍 APP (NESTED ROUTES LIVE HERE) */}
          <Route path="/*" element={<App />} />

          {/* 🔓 AUTH */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* 🔒 DASHBOARD */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          {/* 🔒 PROFILE */}
          <Route
            path="/profile/:id?"
            element={
              <ProtectedRoute>
                <ProfilePage />
              </ProtectedRoute>
            }
          />

          {/* ❌ FALLBACK */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ChatProvider>
  </React.StrictMode>
);
