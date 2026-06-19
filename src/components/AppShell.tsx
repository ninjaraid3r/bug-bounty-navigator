import { useState } from "react";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";

/**
 * Persistent app shell. Mounts LeftSidebar exactly once so route changes
 * don't unmount/remount it — eliminates the navigation flicker.
 */
export default function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <LeftSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
