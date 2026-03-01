"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useCallback, useState, useRef } from "react";
import { useAuth } from "@clerk/nextjs";
import { useChatStore } from "@/stores/chat-store";
import { ChatLayout } from "@/components/chat/chat-layout";
import { ChatMessages } from "@/components/chat/chat-messages";
import { ChatInput } from "@/components/chat/chat-input";
import { VoiceMode } from "@/components/chat/voice-mode";
import { getChatMessages, saveMessages } from "@/actions/chat.action";
import { useStreamingTTS } from "@/hooks/voice/use-streaming-tts";
import { CiPillsBottle1 } from "react-icons/ci";
import type { UIMessage } from "ai";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const paramChatId = params?.id as string;
  const isNewChat = paramChatId === "new";
  const { userId } = useAuth();
  const { mode, language, setChatId } = useChatStore();
  const { feedText, flush, reset, stop: stopTTS } = useStreamingTTS();

  // Track the actual chatId — starts as param, updated when API creates a new chat
  const [resolvedChatId, setResolvedChatId] = useState<string | undefined>(
    isNewChat ? undefined : paramChatId
  );
  const [loadingHistory, setLoadingHistory] = useState(!isNewChat);

  // Refs so customFetch & transport body read latest values without recreation
  const resolvedChatIdRef = useRef(resolvedChatId);
  const modeBodyRef = useRef(mode);
  const userIdRef = useRef(userId);
  const languageRef = useRef(language);
  useEffect(() => { resolvedChatIdRef.current = resolvedChatId; }, [resolvedChatId]);
  useEffect(() => { modeBodyRef.current = mode; }, [mode]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { languageRef.current = language; }, [language]);

  // Sync chatId with store
  useEffect(() => {
    if (resolvedChatId) {
      setChatId(resolvedChatId);
    }
  }, [resolvedChatId, setChatId]);

  // Stable custom fetch — uses refs so it never changes identity mid-stream
  const customFetch = useCallback(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      // Inject latest body values into the request
      if (init?.body && typeof init.body === "string") {
        try {
          const parsed = JSON.parse(init.body);
          parsed.chatId = resolvedChatIdRef.current;
          parsed.mode = modeBodyRef.current;
          parsed.userId = userIdRef.current;
          parsed.language = languageRef.current;
          init = { ...init, body: JSON.stringify(parsed) };
        } catch {
          // Not JSON body, pass through
        }
      }

      const response = await fetch(input, init);

      if (!resolvedChatIdRef.current) {
        const newChatId = response.headers.get("X-Chat-Id");
        if (newChatId) {
          resolvedChatIdRef.current = newChatId;
          setResolvedChatId(newChatId);
          router.replace(`/chat/${newChatId}`);
        }
      }

      return response;
    },
    // Only depends on router (stable) — refs handle the rest
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router]
  );

  // Transport is created ONCE and stays stable — body values are injected via customFetch
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          chatId: resolvedChatId,
          mode,
          userId,
          language,
        },
        fetch: customFetch,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [customFetch]
  );

  // Track which messages are already persisted
  const savedMsgIds = useRef<Set<string>>(new Set());
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const { messages, sendMessage, setMessages, status } = useChat({
    transport,
    id: resolvedChatId,
    onFinish: async ({ messages: finishedMessages }) => {
      // Save all unsaved messages to DB with full parts (including tool outputs)
      const chatIdToSave = resolvedChatId;
      if (!chatIdToSave || !finishedMessages?.length) return;

      const unsaved = finishedMessages.filter(
        (m) => !savedMsgIds.current.has(m.id)
      ).filter(
        // Skip auto-triggered messages (not user-typed)
        (m) => !(m.role === "user" && m.parts.some(
          (p: any) => p.type === "text" && typeof p.text === "string" && p.text.startsWith("__TRIGGER__")
        ))
      );
      if (unsaved.length === 0) return;

      const toSave = unsaved.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        parts: m.parts.map((p: any) => {
          if (p.type === "text") return { type: "text", text: p.text };
          if (p.type === "file") return { type: "file", url: p.url, mediaType: p.mediaType, filename: p.filename };
          return {
            type: p.type,
            toolCallId: p.toolCallId,
            toolName: p.toolName,
            state: p.state,
            input: p.input,
            output: p.output,
          };
        }),
      }));

      const result = await saveMessages(chatIdToSave, toSave);
      if (result.success) {
        unsaved.forEach((m) => savedMsgIds.current.add(m.id));
      }

      // Flush any remaining buffered text for TTS
      if (modeRef.current === "voice") {
        flush();
      }
    },
  });

  // Sentence-level streaming TTS: feed text as it streams in (voice mode only)
  useEffect(() => {
    if (mode !== "voice") return;
    if (status !== "streaming") return;

    // Get the latest assistant message being streamed
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role !== "assistant") return;

    const textParts = lastMsg.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text)
      .join(" ");

    if (textParts.trim()) {
      feedText(textParts);
    }
  }, [messages, mode, status, feedText]);

  // Reset streaming TTS when a new response starts
  useEffect(() => {
    if (status === "streaming" && mode === "voice") {
      reset();
    }
  }, [status, mode, reset]);

  // Load previous messages for existing chats, then inject via setMessages
  useEffect(() => {
    if (isNewChat || !paramChatId || paramChatId === "new") {
      setLoadingHistory(false);
      return;
    }

    const loadMessages = async () => {
      try {
        const result = await getChatMessages(paramChatId);
        if (result.success && result.messages && result.messages.length > 0) {
          setMessages(result.messages as UIMessage[]);
          // Mark loaded messages as already saved
          result.messages.forEach((m: any) => savedMsgIds.current.add(m.id));
        }
      } catch (err) {
        console.error("Failed to load chat messages:", err);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadMessages();
  }, [paramChatId, isNewChat, setMessages]);

  const handleSend = useCallback(
    async (message: { text: string; files?: any[] }) => {
      sendMessage({
        text: message.text,
        files: message.files,
      });
    },
    [sendMessage]
  );

  const handleVoiceSend = useCallback(
    (text: string) => {
      stopTTS(); // Stop any playing TTS before new request
      handleSend({ text });
    },
    [handleSend, stopTTS]
  );

  if (loadingHistory) {
    return (
      <ChatLayout showChatSidebar showCart>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="size-8 animate-spin rounded-full border-2 border-[#1A1A2F] border-t-transparent" />
            <span className="text-sm">Loading conversation...</span>
          </div>
        </div>
      </ChatLayout>
    );
  }

  return (
    <ChatLayout showChatSidebar showCart>
      {/* Voice mode overlay */}
      {mode === "voice" && (
        <VoiceMode onSend={handleVoiceSend} status={status} messages={messages} />
      )}

      {/* Chat messages area */}
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 md:gap-4 text-center px-4">
          <div className="rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 p-3 md:p-4 shadow-sm">
            <CiPillsBottle1 className="size-6 md:size-8 text-[#1A1A2F]" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-slate-800">PharmaCare AI</h2>
            <p className="mt-1 text-sm md:text-sm text-muted-foreground/70">
              Search medicines, upload prescriptions, manage orders
            </p>
          </div>
          <div className="mt-2 md:mt-4 flex flex-wrap justify-center gap-1.5 md:gap-2">
            {[
              "Search for paracetamol",
              "Upload a prescription",
              "Show my order history",
              "Set up auto-refill",
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => handleSend({ text: suggestion })}
                className="rounded-full border bg-card px-3 md:px-4 py-1 text-[11px] md:text-xs font-semibold transition-colors hover:bg-accent"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <ChatMessages messages={messages} status={status} onSendMessage={(msg) => handleSend(typeof msg === 'string' ? { text: msg } : msg)} />
      )}

      {/* Input area */}
      <ChatInput onSend={handleSend} disabled={status !== "ready"} />
    </ChatLayout>
  );
}
