"use client";

import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { Persona, type PersonaState } from "@/components/ai-elements/persona";
import { Button } from "@/components/ui/button";
import { isToolUIPart, getToolName } from "ai";
import { MedicineCard } from "./tools/medicine-card";
import { PrescriptionUpload } from "./tools/prescription-upload";
import { CartView } from "./tools/cart-view";
import { PaymentCard } from "./tools/payment-card";
import { OrderConfirmation } from "./tools/order-confirmation";
import { OrderHistoryView } from "./tools/order-history-view";
import { RefillPlan } from "./tools/refill-plan";
import { OrderTrackerView } from "./tools/order-tracker-view";
import { useRealtimeSTT } from "@/hooks/voice/use-realtime-stt";
import { CiCircleChevLeft } from "react-icons/ci";
import { useCallback, useEffect, useRef } from "react";
import type { UIMessage } from "ai";
import { ChevronLast, ChevronLeft } from "lucide-react";

// Same tool map as chat-messages
const toolUIMap: Record<
  string,
  React.ComponentType<{
    data: any;
    messageId?: string;
    partIndex?: number;
    [key: string]: any;
  }>
> = {
  medicineSearch: MedicineCard,
  prescriptionHandler: PrescriptionUpload,
  cartManager: CartView,
  orderManager: PaymentCard,
  orderHistory: OrderHistoryView,
  refillManager: RefillPlan,
  billGenerator: OrderConfirmation,
  orderTracker: OrderTrackerView,
};

interface VoiceModeProps {
  onSend: (text: string) => void;
  status: string;
  messages: UIMessage[];
  className?: string;
}

export const VoiceMode = ({
  onSend,
  status,
  messages,
  className,
}: VoiceModeProps) => {
  const { isSpeaking, language, toggleMode, setIsListening } = useChatStore();
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTextRef = useRef("");

  // Auto-send after silence
  const handleFinalTranscript = useCallback(
    (text: string) => {
      pendingTextRef.current += " " + text;

      // Reset silence timer
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);

      silenceTimerRef.current = setTimeout(() => {
        const toSend = pendingTextRef.current.trim();
        if (toSend) {
          onSend(toSend);
          pendingTextRef.current = "";
        }
      }, 2000); // 2s silence → auto-send
    },
    [onSend],
  );

  const { isListening, interimText, transcript, start, pause, resume, clear } =
    useRealtimeSTT({
      continuous: true,
      lang: language,
      onFinalTranscript: handleFinalTranscript,
    });

  // Sync listening state with store
  useEffect(() => {
    setIsListening(isListening);
  }, [isListening, setIsListening]);

  // Auto-start mic when entering voice mode
  useEffect(() => {
    const timer = setTimeout(() => start(), 300);
    return () => {
      clearTimeout(timer);
      pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pause mic during TTS playback, resume after
  useEffect(() => {
    if (isSpeaking) {
      pause();
    } else {
      // Resume after TTS finishes (with small delay for audio cleanup)
      const timer = setTimeout(() => {
        clear();
        resume();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, pause, resume, clear]);

  // Pause mic while AI is streaming
  useEffect(() => {
    if (status === "streaming") {
      pause();
    }
  }, [status, pause]);

  // Get persona state
  const getPersonaState = (): PersonaState => {
    if (isListening) return "listening";
    if (status === "streaming") return "thinking";
    if (isSpeaking) return "speaking";
    return "idle";
  };

  // Get the latest assistant message for tool rendering
  const latestAssistantMsg = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");

  // Extract text and tool parts from latest message
  const latestText = latestAssistantMsg?.parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join(" ")
    .trim();

  const toolParts =
    latestAssistantMsg?.parts
      .map((part, index) => ({ part, index }))
      .filter(({ part }) => isToolUIPart(part as any)) ?? [];

  // Display text: live transcript or last assistant text
  const liveText = (transcript + " " + interimText).trim();

  // Status text when nothing else to show
  const statusText = isListening
    ? "Listening..."
    : status === "streaming"
      ? "Thinking..."
      : isSpeaking
        ? "Speaking..."
        : "Tap to speak";

  return (
    <div
      className={cn(
        "absolute inset-0 z-40 flex flex-col bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 backdrop-blur-xl",
        className,
      )}
    >
      {/* Desktop top bar */}
      <div className="hidden md:flex items-center px-4 py-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-xs text-foreground/80 hover:text-foreground"
          onClick={toggleMode}
        >
          <div className="flex size-7 items-center justify-center rounded-full bg-[#1A1A2F] text-white">
            <CiCircleChevLeft className="size-4" />
          </div>
          Back to Chat
        </Button>
      </div>

      {/* === Content area: transcript top → components middle → persona bottom === */}
      <div className="flex flex-1 flex-col items-center min-h-0">
        {/* Top section: Live transcript / voice context */}
        <div className="flex flex-col items-center justify-center px-6 pt-4 pb-2 shrink-0 w-full max-w-2xl">
          {liveText ? (
            <p className="text-xl md:text-xl font-semibold text-center text-foreground leading-relaxed animate-in fade-in duration-300">
              {liveText}
              {interimText && (
                <span className="ml-1.5 inline-block size-2 animate-pulse rounded-full bg-[#1A1A2F] align-middle" />
              )}
            </p>
          ) : latestText && !isSpeaking ? (
            <p className="text-xl md:text-xl font-bold text-center text-foreground/80 leading-relaxed">
              {latestText.length > 150
                ? latestText.slice(0, 150) + "..."
                : latestText}
            </p>
          ) : (
            <p className="text-lg text-muted-foreground/50 font-semibold">
              {statusText}
            </p>
          )}
        </div>

        {/* Middle section: Tool components — centered and scrollable */}
        <div className="flex-1 flex flex-col items-center justify-center w-full min-h-0 overflow-y-auto px-4">
          {toolParts.length > 0 && latestAssistantMsg && (
            <div className="w-full max-w-xl space-y-3 py-4">
              {toolParts.map(({ part, index }) => {
                const toolName = getToolName(part as any);
                const CustomUI = toolUIMap[toolName];
                const toolPart = part as any;

                if (CustomUI && toolPart.state === "output-available") {
                  const extraProps: Record<string, any> = {};
                  if (toolName === "orderManager") {
                    extraProps.onPaymentSuccess = (orderId: string) => {
                      onSend(
                        `Payment successful for order ${orderId}. Please generate my bill.`,
                      );
                    };
                  }

                  return (
                    <CustomUI
                      key={index}
                      data={toolPart.output}
                      messageId={latestAssistantMsg.id}
                      partIndex={index}
                      {...extraProps}
                    />
                  );
                }

                return null;
              })}
            </div>
          )}
        </div>

        {/* Bottom section: Persona orb — always at bottom center */}
        <div className="flex flex-col items-center gap-2 pb-8 pt-4 shrink-0">
          <button
            type="button"
            className="relative focus:outline-none transition-transform active:scale-95"
            onClick={() => {
              if (isListening) {
                pause();
              } else {
                clear();
                resume();
              }
            }}
          >
            {/* Ambient glow ring */}
            <div
              className={cn(
                "absolute inset-0 -m-4 rounded-full opacity-60 blur-3xl transition-all duration-700",
                (isListening || isSpeaking) && "opacity-80 -m-6 blur-3xl",
              )}
              style={{
                background:
                  "conic-gradient(from 0deg, #6366f1, #a855f7, #ec4899, #06b6d4, #6366f1)",
                animation: `spin ${isListening || isSpeaking ? "3s" : "8s"} linear infinite`,
              }}
            />
            <div
              className={cn(
                "absolute inset-0 -m-3 rounded-full opacity-40 blur-xl transition-all duration-700",
                (isListening || isSpeaking) && "opacity-60 -m-5 blur-3xl",
              )}
              style={{
                background:
                  "conic-gradient(from 180deg, #818cf8, #c084fc, #f472b6, #22d3ee, #818cf8)",
                animation: `spin ${isListening || isSpeaking ? "4s" : "12s"} linear infinite reverse`,
              }}
            />
            {/* Persona orb */}
            <div className="relative">
              <Persona
                state={getPersonaState()}
                className="size-28"
                variant="opal"
              />
            </div>
          </button>
          <span className="text-[10px] text-muted-foreground/50">
            {isListening ? "Tap to mute" : "Tap to speak"}
          </span>
        </div>
      </div>
    </div>
  );
};
