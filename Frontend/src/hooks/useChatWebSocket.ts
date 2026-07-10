import { useCallback, useEffect, useRef, useState } from "react";
import { getStoredTokens } from "@/lib/session";
import { toast } from "sonner";
import type { UIMessage } from "@/lib/adapters";

type WebSocketEvent =
  | { type: "message"; message: { id: string; sender?: { id: number }; content: string; created_at?: string } }
  | { type: "typing"; value: boolean; user_id: string }
  | { type: "reaction"; user_id: string; emoji: string; deleted: boolean }
  | { type: "read"; user_id: string };

export function useChatWebSocket({
  conversationId,
  currentUserId,
  onMessage,
  onRefresh,
  onReadReceipt,
}: {
  conversationId: string;
  currentUserId: string;
  onMessage: (msg: UIMessage) => void;
  onRefresh: () => void;
  onReadReceipt?: () => void;
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const [typingUserIds, setTypingUserIds] = useState<Set<string>>(new Set());
  const [reconnectTick, setReconnectTick] = useState(0);
  const typingTimeouts = useRef<Map<string, number>>(new Map());
  const onMessageRef = useRef(onMessage);
  const onRefreshRef = useRef(onRefresh);
  const onReadReceiptRef = useRef(onReadReceipt);

  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onRefreshRef.current = onRefresh; }, [onRefresh]);
  useEffect(() => { onReadReceiptRef.current = onReadReceipt; }, [onReadReceipt]);

  useEffect(() => {
    const token = getStoredTokens()?.access;
    if (!token) return;
    const apiBase = new URL(import.meta.env.VITE_API_URL ?? "http://localhost:8000");
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    let reconnectTimer: number | undefined;
    let connectTimer: number | undefined;
    let closedByUs = false;

    connectTimer = window.setTimeout(() => {
      if (closedByUs) return;
      const socket = new WebSocket(`${wsProtocol}://${apiBase.host}/ws/chat/${conversationId}/?token=${token}`);
      socketRef.current = socket;

      socket.onopen = () => {
        onReadReceiptRef.current?.();
        socket.send(JSON.stringify({ type: "read" }));
      };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as WebSocketEvent;
          if (payload.type === "message" && payload.message) {
            onMessageRef.current({
              id: payload.message.id,
              conversationId,
              senderId: String(payload.message.sender?.id ?? ""),
              content: payload.message.content ?? "",
              timestamp: new Date(payload.message.created_at ?? Date.now()),
              status: "sent",
            });
            onRefreshRef.current();
          } else if (payload.type === "typing") {
            const userId = payload.user_id;
            if (userId === currentUserId) return;
            const isTyping = Boolean(payload.value);

            if (isTyping) {
              setTypingUserIds((prev) => {
                const next = new Set(prev);
                next.add(userId);
                return next;
              });
              const existing = typingTimeouts.current.get(userId);
              if (existing) clearTimeout(existing);
              typingTimeouts.current.set(
                userId,
                window.setTimeout(() => {
                  setTypingUserIds((prev) => {
                    const next = new Set(prev);
                    next.delete(userId);
                    return next;
                  });
                  typingTimeouts.current.delete(userId);
                }, 4000),
              );
            } else {
              setTypingUserIds((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
              });
              const existing = typingTimeouts.current.get(userId);
              if (existing) {
                clearTimeout(existing);
                typingTimeouts.current.delete(userId);
              }
            }
          } else if (payload.type === "reaction") {
            onRefreshRef.current();
            if (payload.user_id && payload.user_id !== currentUserId && !payload.deleted) {
              toast("New reaction: " + (payload.emoji || ""));
            }
          } else if (payload.type === "read") {
            onRefreshRef.current();
          }
        } catch {
        }
      };
      socket.onclose = () => {
        socketRef.current = null;
        if (!closedByUs) {
          reconnectTimer = window.setTimeout(() => {
            setReconnectTick((value) => value + 1);
          }, 2000);
        }
      };
      socket.onerror = () => {
        toast.error("Realtime connection interrupted");
      };
    }, 0);

    return () => {
      closedByUs = true;
      socketRef.current = null;
      typingTimeouts.current.forEach((t) => clearTimeout(t));
      typingTimeouts.current.clear();
      if (connectTimer) window.clearTimeout(connectTimer);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
    };
  }, [conversationId, currentUserId, reconnectTick]);

  const sendMessage = useCallback((content: string) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "message", content }));
      return true;
    }
    return false;
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "typing", is_typing: isTyping }));
    }
  }, []);

  const sendRead = useCallback(() => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "read" }));
    }
  }, []);

  const remoteTyping = typingUserIds.size > 0;
  return { remoteTyping, sendMessage, sendTyping, sendRead };
}
