"use server";
import prisma from "@/lib/prisma/client";
import { auth } from "@clerk/nextjs/server";

export const createChat = async () => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "UNAUTHORIZED", status: 401 };
    }

    const chat = await prisma.chat.create({
      data: {
        userId,
        title: "New Chat",
      },
    });

    return { success: true, chatId: chat.id };
  } catch (error) {
    return { error: "Failed to create chat", status: 500 };
  }
};

export const getChatHistory = async () => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "UNAUTHORIZED", status: 401 };
    }

    const chats = await prisma.chat.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
      take: 50,
    });

    return {
      success: true,
      chats: chats.map((c) => ({
        id: c.id,
        title: c.title,
        updatedAt: c.updatedAt.toISOString(),
        messageCount: c._count.messages,
      })),
    };
  } catch (error) {
    return { error: "Failed to fetch chat history", status: 500 };
  }
};

// Save complete UIMessages from the client (with full parts including tool outputs)
export const saveMessages = async (
  chatId: string,
  messages: {
    id: string;
    role: "user" | "assistant";
    parts: any[];
    createdAt?: string;
  }[]
) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });
    if (!chat) return { error: "Chat not found", status: 404 };

    for (const msg of messages) {
      // Dedup by message ID
      const exists = await prisma.message.findUnique({
        where: { id: msg.id },
      });
      if (exists) continue;

      // Extract text from parts
      const textContent = msg.parts
        .filter((p: any) => p.type === "text")
        .map((p: any) => p.text)
        .join("\n");

      // Extract tool parts (everything that isn't text)
      const toolParts = msg.parts.filter((p: any) => p.type !== "text");

      await prisma.message.create({
        data: {
          id: msg.id,
          chatId,
          role: msg.role === "user" ? "USER" : "SYSTEM",
          content: textContent,
          contentType: "TEXT",
          toolCalls: toolParts.length > 0
            ? JSON.parse(JSON.stringify(toolParts))
            : undefined,
          metadata: {
            parts: JSON.parse(JSON.stringify(msg.parts)),
          },
        },
      });
    }

    // Auto-title from first user message
    if (chat.title === "New Chat" || !chat.title) {
      const firstUser = messages.find((m) => m.role === "user");
      if (firstUser) {
        const title = firstUser.parts
          .filter((p: any) => p.type === "text")
          .map((p: any) => p.text)
          .join(" ")
          .slice(0, 100);
        if (title) {
          await prisma.chat.update({
            where: { id: chatId },
            data: { title },
          });
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to save messages:", error);
    return { error: "Failed to save messages", status: 500 };
  }
};

export const getChatMessages = async (chatId: string) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "UNAUTHORIZED", status: 401 };
    }

    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId },
    });

    if (!chat) {
      return { error: "Chat not found", status: 404 };
    }

    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: "asc" },
    });

    // Convert DB messages to AI SDK UIMessage format
    const uiMessages = messages.map((m) => {
      const role = m.role === "USER" ? ("user" as const) : ("assistant" as const);
      const meta = m.metadata as any;

      // Get raw parts from metadata or reconstruct
      let rawParts: any[] = [];

      if (meta?.parts && Array.isArray(meta.parts)) {
        rawParts = meta.parts;
      } else {
        // Fallback: reconstruct from content + toolCalls
        if (m.content) {
          rawParts.push({ type: "text", text: m.content });
        }
        if (m.toolCalls && Array.isArray(m.toolCalls)) {
          for (const tc of m.toolCalls as any[]) {
            rawParts.push({
              type: tc.type ?? `tool-${tc.toolName}`,
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              state: tc.state ?? "output-available",
              input: tc.input ?? tc.args,
              output: tc.output ?? tc.result,
            });
          }
        }
      }

      // Sanitize parts to conform to SDK UIMessage schema.
      // The SDK validates parts client-side with strict Zod schemas.
      // Tool parts (type starting with "tool-") MUST have toolCallId & state.
      // Parts missing required fields will cause validation failures.
      const sanitizedParts = rawParts.filter((part: any) => {
        const t = part.type as string;
        if (!t) return false;

        // text, file, step-start — always valid
        if (t === "text" || t === "file" || t === "step-start") return true;

        // tool-invocation or tool-* (e.g. tool-medicineSearch) — needs toolCallId + state
        if (t.startsWith("tool-")) {
          return !!part.toolCallId && !!part.state;
        }

        // reasoning, source-url, source-document, data-* — pass through
        if (t === "reasoning" || t.startsWith("source-") || t.startsWith("data-")) return true;

        // dynamic-tool — needs toolCallId + state
        if (t === "dynamic-tool") {
          return !!part.toolCallId && !!part.state;
        }

        // Unknown part type — drop it
        return false;
      });

      return {
        id: m.id,
        role,
        parts: sanitizedParts,
        createdAt: m.createdAt,
      };
    }).filter((msg) => msg.parts.length > 0);

    return { success: true, messages: uiMessages };
  } catch (error) {
    return { error: "Failed to fetch messages", status: 500 };
  }
};

export const deleteChat = async (chatId: string) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "UNAUTHORIZED", status: 401 };
    }

    await prisma.chat.delete({
      where: { id: chatId, userId },
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to delete chat", status: 500 };
  }
};

export const updateChatTitle = async (chatId: string, title: string) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "UNAUTHORIZED", status: 401 };
    }

    await prisma.chat.update({
      where: { id: chatId, userId },
      data: { title },
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to update chat title", status: 500 };
  }
};

// Update a tool part's output inside a stored message (to persist component state)
export const updateMessageToolOutput = async (
  messageId: string,
  partIndex: number,
  outputPatch: Record<string, any>
) => {
  try {
    const { userId } = await auth();
    if (!userId) return { error: "UNAUTHORIZED", status: 401 };

    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      select: { metadata: true, chatId: true },
    });

    if (!msg) return { error: "Message not found", status: 404 };

    // Verify ownership
    const chat = await prisma.chat.findFirst({
      where: { id: msg.chatId, userId },
    });
    if (!chat) return { error: "UNAUTHORIZED", status: 401 };

    const meta = (msg.metadata as any) ?? {};
    const parts = meta.parts ?? [];

    if (partIndex < 0 || partIndex >= parts.length) {
      return { error: "Invalid part index", status: 400 };
    }

    // Merge the patch into the part's output
    const part = parts[partIndex];
    part.output = { ...(part.output ?? {}), ...outputPatch };
    parts[partIndex] = part;

    await prisma.message.update({
      where: { id: messageId },
      data: {
        metadata: { ...meta, parts },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to update tool output:", error);
    return { error: "Failed to update", status: 500 };
  }
};
