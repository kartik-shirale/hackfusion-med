import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";
import { getVoiceSystemPrompt } from "@/agents/system-prompt";
import { agentTools } from "@/agents";

export const POST = async (req: Request) => {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
    }

    const { chatId, language } = await req.json();

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "No API key" }, { status: 500 });
    }

    // Build tool declarations for Gemini Live from our agent tools
    const toolDeclarations = Object.entries(agentTools).map(
      ([name, tool]: [string, any]) => {
        const schema = tool.parameters;
        // Convert Zod schema to JSON Schema for Gemini
        const jsonSchema = zodToGeminiSchema(schema);
        return {
          name,
          description: tool.description ?? "",
          parameters: jsonSchema,
        };
      }
    );

    const ai = new GoogleGenAI({ apiKey });

    const systemPrompt = getVoiceSystemPrompt(language);
    const contextPrompt = `${systemPrompt}\n\n[CONTEXT]\nuserId: ${userId}\nchatId: ${chatId ?? "new"}\nAlways pass userId and chatId when calling tools that require them.`;

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        liveConnectConstraints: {
          model: "gemini-2.5-flash-native-audio-preview-12-2025",
          config: {
            sessionResumption: {},
            temperature: 0.7,
            responseModalities: ["AUDIO" as any],
            systemInstruction: contextPrompt,
            tools: [{ functionDeclarations: toolDeclarations }],
          },
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    return NextResponse.json({
      token: token.name,
      model: "gemini-2.5-flash-native-audio-preview-12-2025",
    });
  } catch (error) {
    console.error("Voice token error:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
};

// Convert Zod schema to Gemini-compatible JSON Schema
// Gemini Live needs plain JSON Schema, not Zod objects
function zodToGeminiSchema(zodSchema: any): any {
  if (!zodSchema) return { type: "object", properties: {} };

  try {
    // If schema has _def, it's a Zod schema
    if (zodSchema._def) {
      return convertZodDef(zodSchema._def);
    }
    // If it's already JSON Schema-like
    if (zodSchema.type) return zodSchema;
    return { type: "object", properties: {} };
  } catch {
    return { type: "object", properties: {} };
  }
}

function convertZodDef(def: any): any {
  if (!def) return { type: "string" };

  const typeName = def.typeName;

  if (typeName === "ZodObject") {
    const properties: any = {};
    const required: string[] = [];

    if (def.shape) {
      const shape = typeof def.shape === "function" ? def.shape() : def.shape;
      for (const [key, value] of Object.entries(shape)) {
        const fieldDef = (value as any)?._def;
        properties[key] = convertZodDef(fieldDef);

        // Check if field is required (not optional)
        if (fieldDef?.typeName !== "ZodOptional" && fieldDef?.typeName !== "ZodDefault") {
          required.push(key);
        }
      }
    }

    return {
      type: "object",
      properties,
      ...(required.length > 0 ? { required } : {}),
    };
  }

  if (typeName === "ZodString") return { type: "string" };
  if (typeName === "ZodNumber") return { type: "number" };
  if (typeName === "ZodBoolean") return { type: "boolean" };
  if (typeName === "ZodEnum") {
    return { type: "string", enum: def.values };
  }
  if (typeName === "ZodArray") {
    return { type: "array", items: convertZodDef(def.type?._def) };
  }
  if (typeName === "ZodOptional") {
    return convertZodDef(def.innerType?._def);
  }
  if (typeName === "ZodDefault") {
    return convertZodDef(def.innerType?._def);
  }

  return { type: "string" };
}
