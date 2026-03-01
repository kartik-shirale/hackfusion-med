"use client";

import type { UIMessage } from "ai";
import { isToolUIPart, getToolName, type FileUIPart } from "ai";
import { cn } from "@/lib/utils";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Suggestions, Suggestion } from "@/components/ai-elements/suggestion";
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentInfo,
} from "@/components/ai-elements/attachments";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import { MedicineCard } from "./tools/medicine-card";
import { PrescriptionUpload } from "./tools/prescription-upload";
import { CartView } from "./tools/cart-view";
import { OrderConfirmation } from "./tools/order-confirmation";
import { OrderHistoryView } from "./tools/order-history-view";
import { RefillPlan } from "./tools/refill-plan";
import { PaymentCard } from "./tools/payment-card";
import { OrderTrackerView } from "./tools/order-tracker-view";
import { CiPillsBottle1 } from "react-icons/ci";
import { useMemo } from "react";

// Map tool names to custom UI renderers
const toolUIMap: Record<
  string,
  React.ComponentType<{ data: any; messageId?: string; partIndex?: number }>
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

// Derive contextual suggestion chips from the last assistant message
const getSuggestions = (messages: UIMessage[]): string[] => {
  if (messages.length === 0) {
    return [
      "Search for medicines",
      "Upload a prescription",
      "View my orders",
      "Set up auto-refill",
    ];
  }

  const lastAssistant = [...messages]
    .reverse()
    .find((m) => m.role === "assistant");
  if (!lastAssistant) {
    return ["Search for medicines", "Upload a prescription"];
  }

  const toolNames = lastAssistant.parts.filter(isToolUIPart).map(getToolName);

  if (toolNames.includes("medicineSearch")) {
    return [
      "Checkout my order",
      "Add to cart",
      "Search for alternatives",
      "View my cart",
    ];
  }
  if (toolNames.includes("cartManager")) {
    return ["Place order", "Search more medicines", "Clear cart"];
  }
  if (
    toolNames.includes("orderManager") ||
    toolNames.includes("billGenerator")
  ) {
    return [
      "Track my order",
      "Set up auto-refill",
      "View my orders",
      "Search more medicines",
    ];
  }
  if (toolNames.includes("orderTracker")) {
    return ["Set up auto-refill", "View my orders", "Search more medicines"];
  }
  if (toolNames.includes("prescriptionHandler")) {
    return ["View my cart", "Search for medicines", "View my orders"];
  }
  if (toolNames.includes("refillManager")) {
    return ["View refill plan", "Modify refill", "View my orders"];
  }
  if (toolNames.includes("orderHistory")) {
    return ["Search for medicines", "Set up auto-refill", "Reorder last order"];
  }

  return [
    "Search for medicines",
    "View my cart",
    "My orders",
    "Upload prescription",
  ];
};

interface ChatMessagesProps {
  messages: UIMessage[];
  status: string;
  className?: string;
  onSendMessage?: (msg: string | { text: string; files?: any[] }) => void;
}

export const ChatMessages = ({
  messages,
  status,
  className,
  onSendMessage,
}: ChatMessagesProps) => {
  const isStreaming = status === "streaming";
  const isSubmitted = status === "submitted";
  const isIdle = status === "ready" || status === "error";

  const isTriggerMessage = (msg: UIMessage) =>
    msg.role === "user" &&
    msg.parts.some(
      (p) =>
        p.type === "text" &&
        typeof (p as any).text === "string" &&
        (p as any).text.startsWith("__TRIGGER__"),
    );

  const visibleMessages = messages.filter((m) => !isTriggerMessage(m));
  const lastAssistantIndex = visibleMessages.findLastIndex(
    (m) => m.role === "assistant",
  );

  const suggestions = useMemo(() => {
    if (!isIdle) return [];
    const last = visibleMessages[visibleMessages.length - 1];
    if (last && last.role !== "assistant" && visibleMessages.length > 0)
      return [];
    return getSuggestions(visibleMessages);
  }, [visibleMessages, isIdle]);

  return (
    <Conversation className={cn("flex-1", className)}>
      <ConversationContent className="mx-auto max-w-4xl gap-3 md:gap-4 px-2 md:px-4 py-3 md:py-6">
        {visibleMessages.map((message, messageIndex) => {
          const isLastAssistant =
            message.role === "assistant" && messageIndex === lastAssistantIndex;
          const isUser = message.role === "user";

          return (
            <Message key={message.id} from={message.role}>
              <MessageContent
                className={cn(isUser && "w-full flex-row-reverse")}
              >
                {/* Avatar — assistant only */}
                {!isUser && (
                  <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
                    <CiPillsBottle1 className="size-4 text-[#1A1A2F]" />
                  </div>
                )}

                {/* Message parts */}
                <div
                  className={cn(
                    "flex-1 space-y-3",
                    isUser && "flex flex-col items-end",
                  )}
                >
                  {message.parts.map((part, index) => {
                    // Text parts
                    if (part.type === "text" && part.text) {
                      if (isUser) {
                        return (
                          <div
                            key={index}
                            className="inline-block rounded-2xl rounded-br-sm bg-slate-800 px-3 md:px-4 py-2 md:py-2.5 text-sm text-white shadow-sm max-w-[92%] md:max-w-[85%]"
                          >
                            {part.text}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={index}
                          className="rounded-2xl rounded-bl-sm bg-white/80 px-3 md:px-4 py-2 md:py-2.5 shadow-sm border border-slate-100/50 max-w-[92%] md:max-w-[85%]"
                        >
                          <MessageResponse
                            animated
                            isAnimating={isLastAssistant && isStreaming}
                          >
                            {part.text}
                          </MessageResponse>
                        </div>
                      );
                    }

                    // Reasoning / thinking parts
                    if (part.type === "reasoning") {
                      const reasoningPart = part as any;
                      return (
                        <Reasoning
                          key={index}
                          isStreaming={isLastAssistant && isStreaming}
                        >
                          <ReasoningTrigger />
                          <ReasoningContent>
                            {reasoningPart.text ??
                              reasoningPart.reasoning ??
                              ""}
                          </ReasoningContent>
                        </Reasoning>
                      );
                    }

                    // File / image attachment parts
                    if (part.type === "file") {
                      const filePart = part as FileUIPart;
                      return (
                        <Attachments key={index} variant="grid">
                          <Attachment
                            data={{
                              ...filePart,
                              id: `file-${index}`,
                            }}
                          >
                            <AttachmentPreview />
                            <AttachmentInfo />
                          </Attachment>
                        </Attachments>
                      );
                    }

                    // Tool UI parts
                    if (isToolUIPart(part)) {
                      const toolName = getToolName(part);
                      const CustomUI = toolUIMap[toolName];
                      const toolPart = part as any;

                      if (CustomUI && toolPart.state === "output-available") {
                        const extraProps: Record<string, any> = {};
                        if (toolName === "orderManager" && onSendMessage) {
                          extraProps.onPaymentSuccess = (orderId: string) => {
                            onSendMessage(
                              `__TRIGGER__ Payment successful for order ${orderId}. Please generate my bill.`,
                            );
                          };
                        }
                        if (
                          (toolName === "medicineSearch" ||
                            toolName === "prescriptionHandler") &&
                          onSendMessage
                        ) {
                          extraProps.onSendMessage = onSendMessage;
                        }

                        return (
                          <div key={index} className="w-fit max-w-[95%] md:max-w-2xl">
                            <CustomUI
                              data={toolPart.output}
                              messageId={message.id}
                              partIndex={index}
                              {...extraProps}
                            />
                          </div>
                        );
                      }

                      // Default tool rendering
                      return (
                        <Tool key={index}>
                          <ToolHeader
                            title={toolName}
                            type={part.type as "dynamic-tool"}
                            state={toolPart.state}
                            toolName={toolName}
                          />
                          <ToolContent>
                            <ToolInput input={toolPart.input} />
                            {toolPart.state === "output-available" && (
                              <ToolOutput
                                output={toolPart.output}
                                errorText={undefined}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      );
                    }

                    return null;
                  })}
                </div>
              </MessageContent>

              {/* Timestamp */}
              <span
                className={cn(
                  "text-[10px] text-muted-foreground/40 px-2",
                  isUser ? "text-right" : "pl-9",
                )}
              >
                {new Date().toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </Message>
          );
        })}

        {/* Shimmer loading indicator */}
        {(isSubmitted ||
          (isStreaming &&
            visibleMessages[visibleMessages.length - 1]?.role === "user")) && (
            <Message from="assistant">
              <MessageContent>
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
                  <CiPillsBottle1 className="size-4 text-[#1A1A2F]" />
                </div>
                <div className="flex-1 rounded-2xl rounded-bl-sm bg-white/80 px-4 py-2.5 shadow-sm border border-slate-100/50">
                  <Shimmer duration={1.5}>
                    {isSubmitted ? "Processing..." : "Thinking..."}
                  </Shimmer>
                </div>
              </MessageContent>
            </Message>
          )}

        {/* Suggestion chips */}
        {suggestions.length > 0 && onSendMessage && (
          <div className="pb-2">
            <Suggestions>
              {suggestions.map((s) => (
                <Suggestion
                  key={s}
                  suggestion={s}
                  onClick={(text) => onSendMessage(text)}
                />
              ))}
            </Suggestions>
          </div>
        )}
      </ConversationContent>

      <ConversationScrollButton />
    </Conversation>
  );
};
