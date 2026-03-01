import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { agentTools } from "@/agents";

export const maxDuration = 30;

// Server-side tool execution endpoint for Gemini Live voice mode
// The client holds the WebSocket session but tools need Prisma (server-side)
export const POST = async (req: Request) => {
  try {
    const { userId: serverUserId } = await auth();
    const { toolName, args, userId: bodyUserId } = await req.json();

    const userId = serverUserId ?? bodyUserId;
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    // Look up the tool
    const tool = (agentTools as Record<string, any>)[toolName];
    if (!tool) {
      return NextResponse.json(
        { error: `Unknown tool: ${toolName}` },
        { status: 400 }
      );
    }

    // Execute the tool's execute function with the provided args
    if (!tool.execute) {
      return NextResponse.json(
        { error: `Tool ${toolName} has no execute function` },
        { status: 400 }
      );
    }

    const result = await tool.execute(args, {
      toolCallId: `live-${Date.now()}`,
      messages: [],
    });

    return NextResponse.json({ result });
  } catch (error) {
    console.error("Voice tool execution error:", error);
    return NextResponse.json(
      { error: "Tool execution failed" },
      { status: 500 }
    );
  }
};
