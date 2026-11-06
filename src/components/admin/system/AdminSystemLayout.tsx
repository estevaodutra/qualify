import { Outlet } from "react-router-dom";

export function AdminSystemLayout() {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto min-h-full bg-background">
      <Outlet />
    </div>
  );
}

export default AdminSystemLayout;
