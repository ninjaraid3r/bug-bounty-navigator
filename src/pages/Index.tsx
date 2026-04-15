import { useState } from "react";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import ConversationFeed from "@/components/ConversationFeed";

const Index = () => {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      <LeftSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(!leftCollapsed)} />
      <main className="flex-1 min-w-0 h-full">
        <ConversationFeed />
      </main>
      <RightSidebar collapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)} />
    </div>
  );
};

export default Index;
