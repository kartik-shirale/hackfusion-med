import {
  convertToModelMessages,
  streamText,
  UIMessage,
  stepCountIs,
} from "ai";
import { google } from "@ai-sdk/google";
import { agentTools } from "@/agents";
import {
  getChatSystemPrompt,
  getVoiceSystemPrompt,
} from "@/agents/system-prompt";
import prisma from "@/lib/prisma/client";
import { auth } from "@clerk/nextjs/server";
import { utapi } from "@/lib/uploadthing";
import { UTFile } from "uploadthing/server";

export const maxDuration = 60;

export const POST = async (req: Request) => {
  try {
    const {
      messages,
      chatId: incomingChatId,
      mode,
      userId: bodyUserId,
      language,
    }: {
      messages: UIMessage[];
      chatId?: string;
      mode?: "chat" | "voice";
      userId?: string;
      language?: string;
    } = await req.json();

    // Server-side auth as primary, fallback to client-sent userId
    const { userId: serverUserId } = await auth();
    const userId = serverUserId ?? bodyUserId;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED", status: 401 }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Auto-create chat if none provided
    let chatId = incomingChatId;
    if (!chatId) {
      const firstUserText =
        messages
          .find((m) => m.role === "user")
          ?.parts?.filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join(" ")
          .slice(0, 100) ?? "New Chat";

      const chat = await prisma.chat.create({
        data: {
          userId,
          title: firstUserText,
        },
      });
      chatId = chat.id;
    } else {
      // Touch updatedAt
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }).catch(() => {});
    }

    const systemPrompt =
      mode === "voice" ? getVoiceSystemPrompt(language) : getChatSystemPrompt(language);

    // Fetch current cart items to inject as context
    const cartItems = await prisma.cartItem.findMany({
      where: { userId, chatId: chatId ?? undefined },
      include: {
        medicine: {
          select: { name: true, strength: true, brand: true },
        },
      },
    });

    const cartContext =
      cartItems.length > 0
        ? `\n\n[CURRENT CART - ${cartItems.length} item(s)]\n${cartItems
            .map(
              (item) =>
                `- ${item.medicine.name}${item.medicine.strength ? ` ${item.medicine.strength}` : ""}${item.medicine.brand ? ` (${item.medicine.brand})` : ""} × ${item.quantity}`
            )
            .join("\n")}\nIMPORTANT: The user already has these items in their cart. Do NOT ask them to add these again or confirm quantities for items already in the cart. If they want to add more of the same medicine, increment the quantity.`
        : "\n\n[CURRENT CART]\nCart is empty.";

    // Inject userId, chatId, and cart contents into the system prompt
    const contextPrompt = `${systemPrompt}\n\n[CONTEXT]\nuserId: ${userId}\nchatId: ${chatId}\nAlways pass userId and chatId when calling tools that require them (cartManager, orderManager, medicineSearch, etc.).${cartContext}`;

    // Collect file info from the LAST user message only (for prescription context)
    // We pass data URLs directly to Gemini — it handles them natively without upload.
    // UploadThing upload happens in the background after streaming starts.
    let uploadedFileInfo = "";
    const filesToUploadInBackground: Array<{ msgIdx: number; partIdx: number; mimeType: string; base64: string; fileName: string }> = [];

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg?.parts) {
      for (let i = 0; i < lastUserMsg.parts.length; i++) {
        const part = lastUserMsg.parts[i] as any;
        if (part.type === "file" && part.url?.startsWith("data:")) {
          const match = part.url.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const ext = mimeType.split("/")[1]?.split("+")[0] || "bin";
            const fileName = part.filename || `upload-${Date.now()}.${ext}`;
            const msgIdx = messages.indexOf(lastUserMsg);
            filesToUploadInBackground.push({ msgIdx, partIdx: i, mimeType, base64: match[2], fileName });
            // Placeholder — will be replaced by real URL after background upload
            uploadedFileInfo += `\nPendingUpload: name=${fileName} mimeType=${mimeType}`;
          }
        }
      }
    }

    const finalPrompt = uploadedFileInfo
      ? `${contextPrompt}\n\n[UPLOADED FILES]${uploadedFileInfo}\nThese images were sent by the user. If a prescription image was uploaded, call prescriptionHandler with action="submit". The imageUrl and fileKey will be available shortly — use the image content you can see to extract medicine data.`
      : contextPrompt;

    // Fire background upload (non-blocking) — results stored in DB after stream
    if (filesToUploadInBackground.length > 0) {
      Promise.all(
        filesToUploadInBackground.map(async ({ mimeType, base64, fileName }) => {
          try {
            const buffer = Buffer.from(base64, "base64");
            const utFile = new UTFile([buffer], fileName, { type: mimeType });
            const result = await utapi.uploadFiles(utFile);
            if (result.data) {
              console.log(`[Chat] Background upload complete: ${result.data.ufsUrl}`);

              // Store FileUpload record in DB so it appears in /files route
              await prisma.fileUpload.create({
                data: {
                  userId,
                  fileName,
                  mimeType,
                  fileUrl: result.data.ufsUrl,
                  fileKey: result.data.key,
                  size: buffer.length,
                },
              });

              // Update saved message in DB: replace base64 data URL with persistent UploadThing URL
              // This prevents DB bloat and ensures images render after refresh
              if (chatId) {
                const msgs = await prisma.message.findMany({
                  where: { chatId },
                  orderBy: { createdAt: "desc" },
                  take: 5,
                });
                for (const msg of msgs) {
                  const metadata = msg.metadata as any;
                  if (metadata?.parts) {
                    let updated = false;
                    const updatedParts = metadata.parts.map((p: any) => {
                      if (p.type === "file" && p.url?.startsWith("data:") && p.filename === fileName) {
                        updated = true;
                        return { ...p, url: result.data!.ufsUrl };
                      }
                      return p;
                    });
                    if (updated) {
                      await prisma.message.update({
                        where: { id: msg.id },
                        data: { metadata: { ...metadata, parts: updatedParts } },
                      });
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error("[Chat] Background upload failed (non-fatal):", err);
          }
        })
      ).catch(() => {}); // suppress unhandled promise
    }


    // Message persistence is handled client-side via saveMessages action.
    // The client has the complete UIMessages with tool outputs after streaming.

    // Sanitize messages: keep only parts that convertToModelMessages understands.
    // text, file, and tool-invocation (with result) are valid. Custom tool-* types are not.
    const sanitizedMessages = messages
      .map((msg: UIMessage) => ({
        ...msg,
        parts: msg.parts
          .filter((part: any) => {
            const t = part.type;
            if (t === "text" || t === "file") return true;
            // Keep tool-invocation parts only if they have required fields
            if (t === "tool-invocation") {
              return !!part.toolCallId && !!part.toolName;
            }
            // Drop everything else (custom tool-* like tool-medicineSearch, etc.)
            return false;
          })
          .map((part: any) => {
            // Normalize tool-invocation parts for SDK compatibility
            // The SDK's convertToModelMessages expects:
            //   state: "call" | "partial-call" | "result"
            //   args: object (tool arguments)
            //   result: unknown (tool output) — only for state "result"
            // But DB-stored parts use: state: "output-available", input/output fields
            if (part.type === "tool-invocation") {
              // Map UI state to SDK state
              const sdkState =
                part.state === "output-available" ? "result" :
                part.state === "result" ? "result" :
                part.state === "partial-call" ? "partial-call" :
                "call";

              const normalized: any = {
                type: "tool-invocation" as const,
                toolCallId: part.toolCallId,
                toolName: part.toolName,
                state: sdkState,
                args: part.args ?? part.input ?? {},
              };

              // Only include result for completed tool calls
              if (sdkState === "result") {
                normalized.result = part.result ?? part.output ?? null;
              }

              return normalized;
            }
            return part;
          }),
      }))
      .filter((msg) => msg.parts.length > 0);

    // Convert with error recovery — if tool parts still cause issues, strip them
    let modelMessages;
    try {
      modelMessages = await convertToModelMessages(sanitizedMessages, {
        ignoreIncompleteToolCalls: true,
      });
    } catch (conversionError) {
      console.error("Message conversion error, retrying without tool parts:", conversionError);
      // Fallback: strip all tool parts and convert text-only
      const textOnlyMessages = sanitizedMessages
        .map((msg) => ({
          ...msg,
          parts: msg.parts.filter((p: any) => p.type === "text" || p.type === "file"),
        }))
        .filter((msg) => msg.parts.length > 0);
      modelMessages = await convertToModelMessages(textOnlyMessages, {
        ignoreIncompleteToolCalls: true,
      });
    }

    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: finalPrompt,
      messages: modelMessages,
      tools: agentTools,
      stopWhen: stepCountIs(10),
      experimental_telemetry: { isEnabled: true },
      onError: ({ error }) => {
        console.error("Stream error:", error);
      },
    });

    const response = result.toUIMessageStreamResponse();

    // Expose chatId so client can redirect for new chats
    response.headers.set("X-Chat-Id", chatId);

    return response;
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", status: 500 }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
