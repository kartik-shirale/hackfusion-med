"use client";

import { cn } from "@/lib/utils";
import { ChatSidebar } from "./chat-sidebar";
import { CartSheet } from "./cart-sheet";
import { useChatStore } from "@/stores/chat-store";
import { Button } from "@/components/ui/button";
import { CiMenuBurger, CiCirclePlus, CiPillsBottle1 } from "react-icons/ci";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createChat } from "@/actions/chat.action";
import { useCallback } from "react";
import { PWAInstall } from "@/components/pwa/pwa-install";
import type { ReactNode } from "react";

export const ChatLayout = ({
  children,
  className,
  showChatSidebar = false,
  showCart = false,
}: {
  children: ReactNode;
  className?: string;
  showChatSidebar?: boolean;
  showCart?: boolean;
}) => {
  const { historyOpen, toggleHistory, mode, toggleMode } = useChatStore();
  const router = useRouter();
  const { user } = useUser();

  const handleNewChat = useCallback(async () => {
    const result = await createChat();
    if (result.success && result.chatId) {
      router.push(`/chat/${result.chatId}`);
    }
  }, [router]);

  return (
    <div className={cn("relative flex flex-1 flex-col md:flex-row overflow-hidden p-0 md:p-3 md:gap-3", className)}>
      {/* Mobile header — visible only on small screens */}
      <div className="flex md:hidden items-center justify-between px-3 py-2 border-b border-slate-200/40 bg-white/60 backdrop-blur-sm safe-top">
        {mode === "voice" ? (
          <button
            className="flex items-center gap-1.5"
            onClick={toggleMode}
          >
            <ChevronLeft className="size-5 text-[#1A1A2F]" />
            <span className="text-base font-semibold text-[#1A1A2F]">Go back</span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <CiPillsBottle1 className="size-5 text-[#1A1A2F]" />
            <span className="text-base font-semibold text-[#1A1A2F]">PharmaCare</span>
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-white/50"
            onClick={handleNewChat}
          >
            <CiCirclePlus className="size-5" />
          </Button>
          {showChatSidebar && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-white/50"
              onClick={toggleHistory}
            >
              <CiMenuBurger className="size-4" />
            </Button>
          )}
          <button
            className="rounded-full ring-2 ring-transparent transition-all hover:ring-[#1A1A2F]/30"
            onClick={() => router.push("/profile")}
          >
            <Avatar className="size-7">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-[#1A1A2F]/10 text-[#1A1A2F] text-xs font-semibold">
                {user?.firstName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      {/* PWA install banner — mobile only */}
      <PWAInstall />

      {/* Main chat area */}
      <div className="relative flex flex-1 flex-col rounded-none md:rounded-2xl shadow-none md:shadow-lg">
        {/* Warm lavender base */}
        <div className="absolute inset-0 md:rounded-2xl bg-[#ece5f3]" />

        {/* Color blob 1 — violet (top-left) */}
        <div className="absolute top-0 left-0 h-60 w-72 rounded-full bg-[#c4b1e1] opacity-60 blur-[60px]" />

        {/* Color blob 2 — cyan/blue (bottom-center) */}
        <div className="absolute bottom-0 left-[20%] h-52 w-72 rounded-full bg-[#a8cde0] opacity-50 blur-[60px]" />

        {/* Color blob 3 — pink/rose (right) */}
        <div className="absolute top-[20%] right-0 h-60 w-72 rounded-full bg-[#e0b4c8] opacity-50 blur-[60px]" />

        {/* Frosted glass overlay */}
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-none md:rounded-2xl border-0 md:border border-white/50 bg-white/60 backdrop-blur-xl">
          <div className="flex flex-1 flex-col overflow-y-auto w-full">
            {children}
          </div>
        </div>
      </div>

      {/* Right chat history sidebar */}
      {showChatSidebar && <ChatSidebar />}

      {/* Toggle button when sidebar is closed — desktop only */}
      {showChatSidebar && !historyOpen && (
        <button
          className="absolute right-10 top-5 z-10 hidden md:flex size-7 items-center border border-black/50 justify-center rounded-full text-foreground shadow-sm transition-all shadow-md"
          onClick={toggleHistory}
        >
          <CiMenuBurger className="size-3" />
        </button>
      )}


      {/* Floating cart */}
      {showCart && <CartSheet />}
    </div>
  );
};

