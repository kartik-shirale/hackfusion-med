"use client";

import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputActionMenu,
  PromptInputActionMenuTrigger,
  PromptInputActionMenuContent,
  PromptInputActionAddAttachments,
  PromptInputSubmit,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CiCirclePlus,
  CiPaperplane,
  CiMicrophoneOn,
  CiMicrophoneOff,
  CiSpeaker,
  CiChat1,
  CiFileOn,
  CiCircleRemove,
  CiLocationArrow1,
  CiStreamOn,
} from "react-icons/ci";
import { useCallback, useEffect, useRef } from "react";
import { useRealtimeSTT } from "@/hooks/voice/use-realtime-stt";

// Attachment preview thumbnails (must be inside PromptInput)
const AttachmentPreviews = () => {
  const { files, remove } = usePromptInputAttachments();

  if (!files.length) return null;

  return (
    <PromptInputHeader className="flex gap-2 px-4 pt-3">
      {files.map((file) => {
        const isImage = file.mediaType?.startsWith("image/");
        return (
          <div
            key={file.id}
            className="group relative flex items-center gap-2 rounded-sm border border-black/50 bg-white/50 backdrop-blur-sm"
          >
            {isImage ? (
              <img
                src={file.url}
                alt={file.filename ?? "attachment"}
                className="size-12 rounded-lg object-cover"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-lg bg-slate-100">
                <CiFileOn className="size-5 text-muted-foreground" />
              </div>
            )}
            {/* <span className="max-w-[100px] truncate text-xs text-muted-foreground">
              {file.filename}
            </span> */}
            <button
              type="button"
              onClick={() => remove(file.id)}
              className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-white opacity-0 transition-opacity group-hover:opacity-100"
            >
              <CiCircleRemove className="size-3.5" />
            </button>
          </div>
        );
      })}
    </PromptInputHeader>
  );
};

interface ChatInputProps {
  onSend: (message: { text: string; files?: any[] }) => void;
  disabled?: boolean;
  className?: string;
}

export const ChatInput = ({ onSend, disabled, className }: ChatInputProps) => {
  const { mode, toggleMode } = useChatStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFinalTranscript = useCallback(
    (text: string) => {
      if (text.trim()) {
        onSend({ text: text.trim() });
      }
    },
    [onSend],
  );

  const {
    isListening,
    interimText,
    toggle: toggleSTT,
  } = useRealtimeSTT({
    onFinalTranscript: handleFinalTranscript,
    continuous: false,
  });

  // Update textarea placeholder with interim text
  useEffect(() => {
    if (textareaRef.current && interimText) {
      textareaRef.current.value = interimText;
    }
    if (textareaRef.current && !interimText && !isListening) {
      textareaRef.current.value = "";
    }
  }, [interimText, isListening]);

  const handleSubmit = useCallback(
    (message: { text: string; files: any[] }) => {
      if (!message.text.trim() && !message.files.length) return;
      // Send immediately — Gemini handles data URLs natively.
      // UploadThing is used by the prescription-upload component separately.
      onSend(message);
    },
    [onSend],
  );

  return (
    <div className={cn("px-2 md:px-4 pb-3 md:pb-4 pt-1 md:pt-2", className)}>
      <div className="mx-auto max-w-3xl">
        <PromptInput
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 !border-none bg-transparent shadow-none p-0 ring-0 outline-none [&_[data-slot=input-group]]:border-none [&_[data-slot=input-group]]:shadow-none [&_[data-slot=input-group]]:bg-transparent"
          accept="image/*,.pdf"
          multiple
          maxFiles={5}
          maxFileSize={10 * 1024 * 1024}
        >
          {/* Attachment previews — floats above */}
          <AttachmentPreviews />

          {/* Input bar */}
          <PromptInputFooter
            className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-full border border-slate-200/60 bg-white/80 shadow-sm backdrop-blur-sm transition-all duration-300",
              "hover:shadow-md hover:border-slate-300/60",
              "focus-within:shadow-md focus-within:border-indigo-300/60",
              isListening && [
                "border-indigo-400 ring-2 ring-indigo-400/30",
                "shadow-[0_0_20px_rgba(99,102,241,0.15)]",
              ],
            )}
          >
            {/* Attachments — left side */}
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger tooltip="Add attachment">
                <CiCirclePlus className="size-5" />
              </PromptInputActionMenuTrigger>
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments label="Upload prescription or photo" />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>

            {/* Textarea — center */}
            <PromptInputTextarea
              ref={textareaRef}
              placeholder={
                isListening ? "🎙️ Listening..." : "Type your message..."
              }
              disabled={disabled}
              className={cn(
                "min-h-0 max-h-10 resize-none text-sm",
                isListening && "text-indigo-600",
              )}
            />

            {/* Mic button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleSTT}
                  className={cn(
                    "size-8 shrink-0 rounded-full p-0 text-muted-foreground/60 transition-all hover:text-foreground",
                    isListening && [
                      "bg-indigo-500/15 text-indigo-900",
                      "hover:bg-indigo-500/25",
                      "animate-pulse",
                    ],
                  )}
                >
                  {isListening ? (
                    <CiMicrophoneOff className="size-4" />
                  ) : (
                    <CiMicrophoneOn className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isListening ? "Stop listening" : "Voice input"}
              </TooltipContent>
            </Tooltip>

            {/* Mode Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleMode}
                  className={cn(
                    "size-8 shrink-0 rounded-full p-0 text-muted-foreground/60 hover:text-foreground",
                    mode === "voice" &&
                    "bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20",
                  )}
                >
                  {mode === "voice" ? (
                    <CiSpeaker className="size-4" />
                  ) : (
                    <CiStreamOn className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {mode === "voice"
                  ? "Switch to Chat Mode"
                  : "Switch to Voice Mode"}
              </TooltipContent>
            </Tooltip>

            {/* Send — right side, circular dark button */}
            <PromptInputSubmit
              aria-label="Send message"
              className="size-8 shrink-0 rounded-full bg-slate-800 text-white hover:bg-slate-900 shadow-sm"
              disabled={disabled}
            >
              <CiLocationArrow1 className="size-4" />
            </PromptInputSubmit>
          </PromptInputFooter>
        </PromptInput>

        {/* Listening indicator */}
        {isListening && (
          <div className="mt-2 flex items-center gap-2 px-4">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-indigo-500" />
            </span>
            <span className="text-xs text-indigo-600">
              {interimText || "Listening..."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
