import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Mission {
  id: string;
  name: string;
  target: string;
  scope: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  mission_id: string;
  title: string;
  created_at: string;
}

export interface DBMessage {
  id: string;
  conversation_id: string;
  role: "user" | "manager" | "lead" | "raider";
  sender_name: string;
  content: string;
  metadata: any;
  created_at: string;
}

export function useMission() {
  const { user } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    initMission();
  }, [user]);

  async function initMission() {
    if (!user) return;
    // Get or create active mission
    let { data: missions } = await supabase
      .from("missions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);

    let m = missions?.[0];
    if (!m) {
      const { data } = await supabase
        .from("missions")
        .insert({ user_id: user.id, name: "Mission Alpha", target: "target.com", status: "active" })
        .select()
        .single();
      m = data;
    }
    setMission(m);

    // Get or create conversation
    if (m) {
      let { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .eq("mission_id", m.id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      let c = convos?.[0];
      if (!c) {
        const { data } = await supabase
          .from("conversations")
          .insert({ mission_id: m.id, user_id: user.id, title: "Main Channel" })
          .select()
          .single();
        c = data;
      }
      setConversation(c);
    }
    setLoading(false);
  }

  async function updateTarget(target: string) {
    if (!mission) return;
    const { data, error } = await supabase
      .from("missions")
      .update({ target })
      .eq("id", mission.id)
      .select()
      .single();
    if (data && !error) setMission(data);
    return data;
  }

  return { mission, conversation, loading, updateTarget };
}

export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId || !user) return;
    loadMessages();

    // Realtime subscription so agent replies stream in instantly
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as DBMessage;
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as DBMessage;
          setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const oldMsg = payload.old as { id: string };
          setMessages(prev => prev.filter(m => m.id !== oldMsg.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, user]);

  async function loadMessages() {
    if (!conversationId) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    setMessages((data as DBMessage[]) || []);
    setLoading(false);
  }

  async function sendMessage(content: string) {
    if (!conversationId || !user) return;
    const { data, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "user" as const,
        sender_name: "You",
        content,
      })
      .select()
      .single();

    if (data && !error) {
      setMessages(prev => [...prev, data as DBMessage]);
    }
    return data;
  }

  return { messages, loading, sendMessage, refresh: loadMessages };
}
