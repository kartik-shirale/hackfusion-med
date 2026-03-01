import { NextResponse } from "next/server";

export const POST = async (req: Request) => {
  try {
    const { text, voiceId, languageCode } = await req.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY;

    if (!apiKey) {
      // Fallback: return text for browser speechSynthesis
      return NextResponse.json({
        success: true,
        fallback: true,
        text,
        message: "No SARVAM_API_KEY configured. Use browser speechSynthesis.",
      });
    }

    // Sarvam.ai Bulbul v3 TTS API
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        target_language_code: languageCode ?? "en-IN",
        speaker: (voiceId ?? "priya").toLowerCase(),
        model: "bulbul:v3",
        audio_format: "mp3",
        sample_rate: 24000,
        pace: 1.0,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Sarvam TTS API error:", err);
      // Fall back to browser TTS
      return NextResponse.json({
        success: true,
        fallback: true,
        text,
      });
    }

    const data = await response.json();

    if (data.audios && data.audios.length > 0) {
      return NextResponse.json({
        success: true,
        audioContent: data.audios[0],
      });
    }

    return NextResponse.json({
      success: true,
      fallback: true,
      text,
    });
  } catch (error) {
    console.error("TTS error:", error);
    return NextResponse.json(
      { error: "TTS failed", status: 500 },
      { status: 500 }
    );
  }
};
