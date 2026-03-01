"use client";

import { useCallback, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";

interface UseGeminiTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isPlaying: boolean;
}

export const useGeminiTTS = (): UseGeminiTTSReturn => {
  const { voiceId, language, setIsSpeaking } = useChatStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      try {
        setIsPlaying(true);
        setIsSpeaking(true);

        // Use streaming binary endpoint for lower latency
        const response = await fetch("/api/tts/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId, languageCode: language }),
        });

        if (!response.ok) {
          throw new Error(`TTS request failed: ${response.status}`);
        }

        // Response is binary audio (WAV or MP3) — play directly
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsPlaying(false);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.onerror = () => {
          setIsPlaying(false);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        audioRef.current = audio;
        await audio.play();
      } catch (error) {
        console.error("TTS playback error:", error);
        setIsPlaying(false);
        setIsSpeaking(false);
      }
    },
    [voiceId, language, setIsSpeaking]
  );

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setIsPlaying(false);
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  return { speak, stop, isPlaying };
};
