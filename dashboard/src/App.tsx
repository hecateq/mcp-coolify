import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Overview } from "./pages/Overview";
import { Projects } from "./pages/Projects";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Resources } from "./pages/Resources";
import { ResourceDetail } from "./pages/ResourceDetail";
import { Deployments } from "./pages/Deployments";
import { DeploymentDetail } from "./pages/DeploymentDetail";
import { ScheduledTasks } from "./pages/ScheduledTasks";
import { Backups } from "./pages/Backups";
import { Servers } from "./pages/Servers";
import { ServerDetail } from "./pages/ServerDetail";
import { Tools } from "./pages/Tools";
import { AuditLog } from "./pages/AuditLog";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Overview />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:uuid" element={<ProjectDetail />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/resources/:uuid" element={<ResourceDetail />} />
          <Route path="/deployments" element={<Deployments />} />
          <Route path="/deployments/:uuid" element={<DeploymentDetail />} />
          <Route path="/scheduled-tasks" element={<ScheduledTasks />} />
          <Route path="/backups" element={<Backups />} />
          <Route path="/servers" element={<Servers />} />
          <Route path="/servers/:uuid" element={<ServerDetail />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/audit" element={<AuditLog />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
