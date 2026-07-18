import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { main_layout } from "./layouts/main_layout";
import { public_layout } from "./layouts/public_layout";

import { landing_page } from "./pages/landing_page";
import { login_page } from "./pages/login_page";
import { signup_page } from "./pages/signup_page";
import { forgot_password_page } from "./pages/forgot_password_page";
import { docs_page } from "./pages/docs_page";
import { api_platform_page } from "./pages/api_platform_page";
import { report_page } from "./pages/report_page";
import { status_page } from "./pages/status_page";

import { dashboard_page } from "./pages/dashboard/dashboard_page";
import { chat_page } from "./pages/chat_page";
import { models_page } from "./pages/models_page";
import { terminal_page } from "./pages/terminal_page";
import { settings_page } from "./pages/settings_page";
import { memory_page } from "./pages/memory_page";
import { knowledge_page } from "./pages/knowledge_page";
import { files_page } from "./pages/files_page";
import { agents_page } from "./pages/agents_page";
import { workflows_page } from "./pages/workflows_page";
import { tasks_page } from "./pages/tasks_page";
import { jobs_page } from "./pages/jobs_page";
import { queue_page } from "./pages/queue_page";
import { metrics_page } from "./pages/metrics_page";
import { analytics_page } from "./pages/analytics_page";
import { admin_page } from "./pages/admin_page";
import { plugins_page } from "./pages/plugins_page";
import { users_page } from "./pages/users_page";
import { audit_page } from "./pages/audit_page";
import { backups_page } from "./pages/backups_page";
import { ai_builder_page } from "./pages/ai_builder_page";
import { browser_page } from "./pages/browser_page";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("tu2pu_session_token"));
  }, []);

  return (
    <Routes>
      {/* Public Facing Pages Layout */}
      <Route element={public_layout()}>
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/dashboard" replace /> : landing_page()}
        />
        <Route path="/login" element={login_page()} />
        <Route path="/signup" element={signup_page()} />
        <Route path="/forgot-password" element={forgot_password_page()} />
        <Route path="/docs" element={docs_page()} />
        <Route path="/api" element={api_platform_page()} />
        <Route path="/report" element={report_page()} />
        <Route path="/status" element={status_page()} />
      </Route>

      {/* Authenticated Dashboard Layout */}
      <Route element={isLoggedIn ? main_layout() : <Navigate to="/login" replace />}>
        <Route path="/dashboard" element={dashboard_page()} />
        <Route path="/chat" element={chat_page()} />
        <Route path="/builder" element={ai_builder_page()} />
        <Route path="/browser" element={browser_page()} />
        <Route path="/models" element={models_page()} />
        <Route path="/terminal" element={terminal_page()} />
        <Route path="/backups" element={backups_page()} />
        <Route path="/audit" element={audit_page()} />
        <Route path="/users" element={users_page()} />
        <Route path="/plugins" element={plugins_page()} />
        <Route path="/admin" element={admin_page()} />
        <Route path="/analytics" element={analytics_page()} />
        <Route path="/metrics" element={metrics_page()} />
        <Route path="/queue" element={queue_page()} />
        <Route path="/jobs" element={jobs_page()} />
        <Route path="/tasks" element={tasks_page()} />
        <Route path="/workflows" element={workflows_page()} />
        <Route path="/agents" element={agents_page()} />
        <Route path="/files" element={files_page()} />
        <Route path="/knowledge" element={knowledge_page()} />
        <Route path="/memory" element={memory_page()} />
        <Route path="/settings" element={settings_page()} />
      </Route>

      {/* Catch All Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
