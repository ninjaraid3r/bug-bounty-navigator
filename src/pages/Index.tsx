import { useState } from "react";
import RightSidebar from "@/components/RightSidebar";
import ConversationFeed from "@/components/ConversationFeed";

const Index = () => {
  const [rightCollapsed, setRightCollapsed] = useState(false);

  return (
    <div className="flex flex-1 min-w-0 h-full">
      <main className="flex-1 min-w-0 h-full">
        <ConversationFeed />
      </main>
      <RightSidebar collapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)} />
    </div>
  );
};

export default Index;
