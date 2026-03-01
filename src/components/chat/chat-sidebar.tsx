"use client";

import { cn } from "@/lib/utils";
import { useRouter, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getChatHistory, createChat, deleteChat } from "@/actions/chat.action";
import { useChatStore } from "@/stores/chat-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CiChat1,
  CiCirclePlus,
  CiTrash,
  CiMenuKebab,
  CiEdit,
  CiShare2,
  CiClock2,
} from "react-icons/ci";

interface ChatItem {
  id: string;
  title: string | null;
  updatedAt: string;
  messageCount: number;
}

interface GroupedChats {
  today: ChatItem[];
  yesterday: ChatItem[];
  previous: ChatItem[];
}

const groupChatsByDate = (chats: ChatItem[]): GroupedChats => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups: GroupedChats = { today: [], yesterday: [], previous: [] };

  for (const chat of chats) {
    const chatDate = new Date(chat.updatedAt);
    if (chatDate >= today) {
      groups.today.push(chat);
    } else if (chatDate >= yesterday) {
      groups.yesterday.push(chat);
    } else {
      groups.previous.push(chat);
    }
  }

  return groups;
};

export const ChatSidebar = () => {
  const router = useRouter();
  const params = useParams();
  const currentChatId = params?.id as string;
  const { historyOpen, toggleHistory } = useChatStore();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadChats = useCallback(async () => {
    const result = await getChatHistory();
    if (result.success && result.chats) {
      setChats(result.chats);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const handleNewChat = useCallback(async () => {
    const result = await createChat();
    if (result.success && result.chatId) {
      router.push(`/chat/${result.chatId}`);
      loadChats();
    }
  }, [router, loadChats]);

  const handleDelete = useCallback(
    async (chatId: string) => {
      await deleteChat(chatId);
      loadChats();
      if (currentChatId === chatId) {
        router.push("/chat/new");
      }
    },
    [currentChatId, router, loadChats],
  );

  const recentChats = chats.slice(0, 10);
  const grouped = groupChatsByDate(recentChats);

  const renderSection = (title: string, items: ChatItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-1">
        <p className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground/80 uppercase tracking-widest">
          {title}
        </p>
        {items.map((chat) => (
          <button
            key={chat.id}
            onClick={() => router.push(`/chat/${chat.id}`)}
            className={cn(
              "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors border border-transparent",
              "hover:bg-white/50 hover:border-slate-200/60",
              currentChatId === chat.id &&
              "bg-white/60 font-medium shadow-sm border-slate-200/60",
            )}
          >
            <CiChat1 className="size-3.5 shrink-0 text-foreground/60" />
            <span className="flex-1 truncate text-xs font-medium text-foreground/70">
              {chat.title || "New Chat"}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="hidden rounded p-0.5 hover:bg-slate-200/50 group-hover:block"
                  onClick={(e) => e.stopPropagation()}
                >
                  <CiMenuKebab className="size-3 text-foreground/50" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem className="text-xs gap-2">
                  <CiEdit className="size-3" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem className="text-xs gap-2">
                  <CiShare2 className="size-3" />
                  Share
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-xs gap-2 text-destructive focus:text-destructive"
                  onClick={() => handleDelete(chat.id)}
                >
                  <CiTrash className="size-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </button>
        ))}
      </div>
    );
  };

  return (
    <Sheet open={historyOpen} onOpenChange={toggleHistory}>
      <SheetContent
        side="right"
        className="w-72 rounded-2xl border-0 bg-white/70 backdrop-blur-xl p-0 m-3 h-[calc(100%-24px)] sm:max-w-none [&>button]:hidden shadow-xl"
      >
        {/* Header */}
        <SheetHeader className="flex-row items-center justify-between space-y-0 px-4 py-3">
          <SheetTitle className="text-sm">
            <Badge variant="outline" className="text-[10px] font-normal border-slate-200/60 bg-white/50">
              PharmaCare v1.0
            </Badge>
          </SheetTitle>
          <Button
            size="icon"
            variant="ghost"
            className="size-7 rounded-lg text-muted-foreground/60 hover:bg-white/50"
            onClick={handleNewChat}
          >
            <CiCirclePlus className="size-4" />
          </Button>
        </SheetHeader>

        {/* Chat List */}
        <ScrollArea className="flex-1 min-h-0 overflow-hidden">
          <div className="space-y-3 px-1 py-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <span className="text-xs text-muted-foreground/50">Loading...</span>
              </div>
            ) : chats.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <CiChat1 className="size-8 text-muted-foreground/30" />
                <span className="text-xs text-muted-foreground/50">
                  No conversations yet
                </span>
              </div>
            ) : (
              <>
                {renderSection("Today", grouped.today)}
                {renderSection("Yesterday", grouped.yesterday)}
                {renderSection("Previous 7 Days", grouped.previous)}
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <SheetFooter className="border-t border-slate-200/40 px-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full gap-2 text-xs text-muted-foreground/60 hover:bg-white/50 hover:text-foreground"
            onClick={() => {
              router.push("/chat/history");
              toggleHistory();
            }}
          >
            <CiClock2 className="size-3.5" />
            All Chats
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
