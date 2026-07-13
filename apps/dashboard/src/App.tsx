import { Routes,Route } from "react-router-dom";

import { main_layout } from "./layouts/main_layout";

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

export default function App(){

return(

<Routes>

<Route element={main_layout()}>

<Route
path="/"
element={dashboard_page()}
/>

<Route
path="/chat"
element={chat_page()}
/>

<Route
path="/builder"
element={ai_builder_page()}
/>

<Route
path="/browser"
element={browser_page()}
/>

<Route
path="/models"
element={models_page()}
/>

<Route
path="/terminal"
element={terminal_page()}
/>

<Route
path="/backups"
element={backups_page()}
/>

<Route
path="/audit"
element={audit_page()}
/>

<Route
path="/users"
element={users_page()}
/>

<Route
path="/plugins"
element={plugins_page()}
/>

<Route
path="/admin"
element={admin_page()}
/>

<Route
path="/analytics"
element={analytics_page()}
/>

<Route
path="/metrics"
element={metrics_page()}
/>

<Route
path="/queue"
element={queue_page()}
/>

<Route
path="/jobs"
element={jobs_page()}
/>

<Route
path="/tasks"
element={tasks_page()}
/>

<Route
path="/workflows"
element={workflows_page()}
/>

<Route
path="/agents"
element={agents_page()}
/>

<Route
path="/files"
element={files_page()}
/>

<Route
path="/knowledge"
element={knowledge_page()}
/>

<Route
path="/memory"
element={memory_page()}
/>

<Route
path="/settings"
element={settings_page()}
/>

</Route>

</Routes>

);

}
