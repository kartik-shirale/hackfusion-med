"use client";

import { cn } from "@/lib/utils";
import { useChatStore } from "@/stores/chat-store";
import { useRouter, usePathname } from "next/navigation";
import { createChat } from "@/actions/chat.action";
import { useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CiCirclePlus,
  CiGrid41,
  CiFileOn,
  CiPlug1,
  CiClock2,
  CiGlobe,
} from "react-icons/ci";

interface NavItem {
  icon: React.ElementType;
  label: string;
  action: "newChat" | "dashboard" | "files" | "integrations" | "history";
  href?: string; // for active route detection
}

const navItems: NavItem[] = [
  { icon: CiCirclePlus, label: "New Chat", action: "newChat" },
  { icon: CiGrid41, label: "Dashboard", action: "dashboard", href: "/dashboard" },
  { icon: CiFileOn, label: "Files", action: "files", href: "/chat/files" },
  { icon: CiPlug1, label: "Integrations", action: "integrations", href: "/chat/integrations" },
  { icon: CiClock2, label: "History", action: "history", href: "/chat/history" },
];

export const NavSidebar = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const { navCollapsed, toggleNav } = useChatStore();

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  const isLanguageActive = pathname.startsWith("/chat/settings");

  const handleAction = useCallback(
    async (action: NavItem["action"]) => {
      switch (action) {
        case "newChat": {
          const result = await createChat();
          if (result.success && result.chatId) {
            router.push(`/chat/${result.chatId}`);
          }
          break;
        }
        case "dashboard":
          router.push("/dashboard");
          break;
        case "history":
          router.push("/chat/history");
          break;
        case "integrations":
          router.push("/chat/integrations");
          break;
        case "files":
          router.push("/chat/files");
          break;
      }
    },
    [router],
  );

  return (
    <aside
      className={cn(
        "relative z-10 flex h-full flex-col py-3 transition-all duration-200",
        navCollapsed ? "w-[60px]" : "w-[60px]",
      )}
    >
      {/* Nav items */}
      <div className="flex flex-1 flex-col items-center gap-1 pt-1">
        {navItems.map((item) => {
          const active = isActive(item.href);
          const isNewChat = item.action === "newChat";

          return (
            <Tooltip key={item.action} delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-10 rounded-full border border-transparent text-muted-foreground/70 transition-all hover:bg-white/50 hover:text-foreground",
                    isNewChat &&
                    "bg-[#1A1A2F] text-white border-[#1A1A2F] shadow-sm hover:bg-[#1A1A2F]/90 hover:text-white",
                    !isNewChat && active &&
                    "bg-white/70 text-[#1A1A2F] border-white/80 shadow-sm hover:bg-white/80 hover:text-[#1A1A2F]",
                  )}
                  onClick={() => handleAction(item.action)}
                >
                  <item.icon className="size-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={8}>
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* Language + Profile at bottom */}
      <div className="flex flex-col items-center gap-2 py-2">
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "size-10 rounded-full border border-transparent text-muted-foreground/70 transition-all hover:bg-white/50 hover:text-foreground",
                isLanguageActive &&
                "bg-white/70 text-[#1A1A2F] border-white/80 shadow-sm hover:bg-white/80 hover:text-[#1A1A2F]",
              )}
              onClick={() => router.push("/chat/settings")}
            >
              <CiGlobe className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            Language
          </TooltipContent>
        </Tooltip>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              className="rounded-full ring-2 ring-transparent transition-all hover:ring-[#1A1A2F]/30"
              onClick={() => router.push("/profile")}
            >
              <Avatar className="size-9">
                <AvatarImage src={user?.imageUrl} />
                <AvatarFallback className="bg-[#1A1A2F]/10 text-[#1A1A2F] text-xs font-semibold">
                  {user?.firstName?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {user?.fullName || "Profile"}
          </TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
};
