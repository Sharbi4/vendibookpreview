import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const QUEUE_KEY = "vendibook:offline-message-queue";

type QueuedMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  queued_at: number;
};

function readQueue(): QueuedMessage[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}
function writeQueue(q: QueuedMessage[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function queueOfflineMessage(
  m: Omit<QueuedMessage, "id" | "queued_at">,
) {
  const q = readQueue();
  q.push({
    ...m,
    id: crypto.randomUUID(),
    queued_at: Date.now(),
  });
  writeQueue(q);
}

/**
 * Drains the offline message queue when the browser comes back online.
 * Mounted globally in App.tsx.
 */
export function useOfflineQueueSync() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const flush = async () => {
      const q = readQueue();
      if (q.length === 0) return;
      const remaining: QueuedMessage[] = [];
      let sent = 0;
      for (const m of q) {
        try {
          const { error } = await supabase.from("conversation_messages").insert({
            conversation_id: m.conversation_id,
            sender_id: m.sender_id,
            message: m.message,
          });
          if (error) {
            remaining.push(m);
          } else {
            sent++;
          }
        } catch {
          remaining.push(m);
        }
      }
      writeQueue(remaining);
      if (sent > 0) {
        toast.success(
          `Sent ${sent} queued message${sent > 1 ? "s" : ""} now that you're back online.`,
        );
        setTick((t) => t + 1);
      }
    };

    const onOnline = () => {
      flush();
    };
    window.addEventListener("online", onOnline);
    // Try once on mount in case we came back online before listener attached
    if (navigator.onLine) flush();

    return () => window.removeEventListener("online", onOnline);
  }, []);
}

export function useOfflineStatus() {
  const [online, setOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
