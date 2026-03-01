"use client";

import { useCallback, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";

interface UseGeminiSTTReturn {
  transcript: string;
  isListening: boolean;
  start: () => void;
  stop: () => void;
}

export const useGeminiSTT = (): UseGeminiSTTReturn => {
  const { setIsListening } = useChatStore();
  const [transcript, setTranscript] = useState("");
  const [isListening, setLocalListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const start = useCallback(() => {
    // Use browser Web Speech API as primary STT
    // WIP: Replace with Gemini STT streaming when available
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.error("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setTranscript(finalTranscript);
      }
    };

    recognition.onstart = () => {
      setLocalListening(true);
      setIsListening(true);
    };

    recognition.onend = () => {
      setLocalListening(false);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("STT error:", event.error);
      setLocalListening(false);
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [setIsListening]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setLocalListening(false);
    setIsListening(false);
  }, [setIsListening]);

  return { transcript, isListening, start, stop };
};
