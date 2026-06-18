import { useState } from "react";
import { Outlet } from "react-router-dom";
import LeftSidebar from "./LeftSidebar";

export default function Shell() {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <LeftSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
