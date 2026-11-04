import { Outlet } from "react-router-dom";

export function AdminIntegrationsLayout() {
  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <Outlet />
    </div>
  );
}

export default AdminIntegrationsLayout;
