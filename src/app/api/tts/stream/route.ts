import { NextResponse } from "next/server";

// Streaming TTS route — returns audio as binary stream for low-latency playback
// English → Gemini API, Indian languages → Sarvam API

export const POST = async (req: Request) => {
  try {
    const { text, voiceId, languageCode } = await req.json();

    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const isEnglish = !languageCode || languageCode === "en-IN";

    if (isEnglish) {
      return await geminiTTS(text, voiceId);
    } else {
      return await sarvamTTS(text, voiceId, languageCode);
    }
  } catch (error) {
    console.error("Streaming TTS error:", error);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
};

// Gemini TTS — uses generativelanguage API with audio modality
const geminiTTS = async (text: string, voiceId?: string) => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No Gemini API key" }, { status: 500 });
  }

  const voice = voiceId || "Kore";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Say the following text exactly as written, with natural speech prosody. Do not add any extra words:\n\n${text.slice(0, 4000)}`,
              },
            ],
          },
        ],
        generationConfig: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: voice,
              },
            },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini TTS error:", err);
    return NextResponse.json({ error: "Gemini TTS failed" }, { status: 502 });
  }

  const data = await response.json();
  const audioPart = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

  if (!audioPart?.data) {
    return NextResponse.json({ error: "No audio in response" }, { status: 502 });
  }

  // Gemini returns base64 PCM 24kHz 16-bit mono — convert to WAV
  const pcmData = Buffer.from(audioPart.data, "base64");
  const wavBuffer = pcmToWav(pcmData, 24000, 16, 1);
  const wavArray = new Uint8Array(wavBuffer);

  return new Response(wavArray, {
    headers: {
      "Content-Type": "audio/wav",
      "Content-Length": wavArray.byteLength.toString(),
    },
  });
};

// Sarvam TTS — uses REST API for Indian languages
const sarvamTTS = async (
  text: string,
  voiceId?: string,
  languageCode?: string
) => {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No Sarvam API key" }, { status: 500 });
  }

  const response = await fetch("https://api.sarvam.ai/text-to-speech", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-subscription-key": apiKey,
    },
    body: JSON.stringify({
      text: text.slice(0, 2500),
      target_language_code: languageCode ?? "hi-IN",
      speaker: (voiceId ?? "priya").toLowerCase(),
      model: "bulbul:v3",
      audio_format: "mp3",
      sample_rate: 16000, // 16kHz — smaller payload, faster response
      pace: 1.15, // Slightly faster for conversational feel
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("Sarvam TTS error:", err);
    return NextResponse.json({ error: "Sarvam TTS failed" }, { status: 502 });
  }

  const data = await response.json();

  if (!data.audios?.[0]) {
    return NextResponse.json({ error: "No audio" }, { status: 502 });
  }

  // Sarvam returns base64 mp3
  const audioBytes = new Uint8Array(Buffer.from(data.audios[0], "base64"));

  return new Response(audioBytes, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": audioBytes.byteLength.toString(),
    },
  });
};

// Helper: wrap raw PCM data in a WAV header
const pcmToWav = (
  pcm: Buffer,
  sampleRate: number,
  bitsPerSample: number,
  channels: number
): Buffer => {
  const byteRate = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign = (channels * bitsPerSample) / 8;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);

  return Buffer.concat([header, pcm]);
};
