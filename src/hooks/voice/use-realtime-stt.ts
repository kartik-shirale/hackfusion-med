"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface UseRealtimeSTTOptions {
  lang?: string;
  onFinalTranscript?: (text: string) => void;
  continuous?: boolean;
  silenceTimeout?: number; // ms of silence after speech to auto-finalize
}

interface UseRealtimeSTTReturn {
  isListening: boolean;
  transcript: string;
  interimText: string;
  start: () => void;
  stop: () => void;
  toggle: () => void;
  pause: () => void;
  resume: () => void;
  clear: () => void;
}

export const useRealtimeSTT = (
  options: UseRealtimeSTTOptions = {}
): UseRealtimeSTTReturn => {
  const {
    lang = "en-US",
    onFinalTranscript,
    continuous = true,
    silenceTimeout,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);
  const isStoppingRef = useRef(false);
  const isPausedRef = useRef(false);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSpokenRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);

  // Keep callback ref in sync without re-creating recognition
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
  }, [onFinalTranscript]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      isStoppingRef.current = false;
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      // Clear any pending silence timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      if (final) {
        hasSpokenRef.current = true;
        setTranscript((prev) => prev + final);
        setInterimText("");
        onFinalTranscriptRef.current?.(final.trim());

        // Start silence timer after final result
        if (silenceTimeout) {
          silenceTimerRef.current = setTimeout(() => {
            // Silence detected after speech — caller handles via onFinalTranscript
          }, silenceTimeout);
        }
      } else {
        hasSpokenRef.current = true;
        setInterimText(interim);

        // Reset silence timer on interim speech
        if (silenceTimeout) {
          silenceTimerRef.current = setTimeout(() => {
            // Silence detected — if we have interim, it might finalize soon
          }, silenceTimeout);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error !== "no-speech" && event.error !== "aborted") {
        console.error("STT error:", event.error);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimText("");

      // Auto-restart if not intentionally stopped or paused
      if (!isStoppingRef.current && !isPausedRef.current && continuous) {
        try {
          recognition.start();
        } catch {
          // Already started or no permission
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isStoppingRef.current = true;
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
      try {
        recognition.stop();
      } catch {
        // Already stopped
      }
    };
  }, [lang, continuous, silenceTimeout]);

  const start = useCallback(() => {
    setTranscript("");
    setInterimText("");
    hasSpokenRef.current = false;
    isStoppingRef.current = false;
    isPausedRef.current = false;
    try {
      recognitionRef.current?.start();
    } catch {
      // Already started
    }
  }, []);

  const stop = useCallback(() => {
    isStoppingRef.current = true;
    isPausedRef.current = false;
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const pause = useCallback(() => {
    isPausedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped
    }
    setIsListening(false);
  }, []);

  const resume = useCallback(() => {
    isPausedRef.current = false;
    isStoppingRef.current = false;
    try {
      recognitionRef.current?.start();
    } catch {
      // Already started
    }
  }, []);

  const clear = useCallback(() => {
    setTranscript("");
    setInterimText("");
    hasSpokenRef.current = false;
  }, []);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  return {
    isListening,
    transcript,
    interimText,
    start,
    stop,
    toggle,
    pause,
    resume,
    clear,
  };
};
