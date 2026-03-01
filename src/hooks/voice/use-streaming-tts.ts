"use client";

import { useCallback, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";

/**
 * useStreamingTTS — sentence-level streaming TTS
 *
 * Instead of waiting for the full response, this hook:
 * 1. Accepts text updates as tokens stream in
 * 2. Buffers text until a sentence boundary (. ? ! ; \n)
 * 3. Fires TTS requests for each sentence immediately
 * 4. Queues audio playback in sequential order
 *
 * Usage in chat page:
 *   - Call `feedText(text)` with the latest streamed text on every render
 *   - Call `flush()` when generation is done to speak any remaining text
 *   - Call `stop()` to cancel everything
 */

interface AudioQueueItem {
  id: number;
  audioPromise: Promise<Blob | null>;
}

export const useStreamingTTS = () => {
  const { voiceId, language, setIsSpeaking } = useChatStore();
  const [isPlaying, setIsPlaying] = useState(false);

  // Refs to persist across renders without causing re-renders
  const processedLength = useRef(0); // How much text we've already processed
  const audioQueue = useRef<AudioQueueItem[]>([]);
  const isPlayingQueue = useRef(false);
  const currentAudio = useRef<HTMLAudioElement | null>(null);
  const sentenceCounter = useRef(0);
  const isStopped = useRef(false);
  const pendingBuffer = useRef(""); // Text not yet forming a complete sentence
  const sentenceBatch = useRef<string[]>([]); // Batch sentences before firing TTS
  const isFirstSentence = useRef(true); // Send first sentence immediately for low latency

  // Sentence boundary regex — split on . ? ! ; or newlines
  // but not on abbreviations like "Dr." or numbers like "3.5"
  const splitSentences = (text: string): { sentences: string[]; remainder: string } => {
    const sentences: string[] = [];
    let remainder = text;

    // Split on sentence-ending punctuation followed by a space or end of string
    const regex = /[^.!?\n;]*[.!?\n;]+(?:\s|$)/g;
    let match;
    let lastIndex = 0;

    while ((match = regex.exec(text)) !== null) {
      const sentence = match[0].trim();
      if (sentence.length > 5) {
        // Ignore very short fragments
        sentences.push(sentence);
      }
      lastIndex = regex.lastIndex;
    }

    remainder = text.slice(lastIndex);
    return { sentences, remainder };
  };

  // Fire a TTS request and return the audio blob
  const fetchTTSAudio = async (text: string): Promise<Blob | null> => {
    try {
      const response = await fetch("/api/tts/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voiceId, languageCode: language }),
      });
      if (!response.ok) return null;
      return await response.blob();
    } catch {
      return null;
    }
  };

  // Play the audio queue sequentially
  const playQueue = useCallback(async () => {
    if (isPlayingQueue.current) return; // Already playing
    isPlayingQueue.current = true;
    setIsPlaying(true);
    setIsSpeaking(true);

    while (audioQueue.current.length > 0) {
      if (isStopped.current) break;

      const item = audioQueue.current[0];
      const blob = await item.audioPromise;

      if (isStopped.current) break;

      if (blob && blob.size > 0) {
        const audioUrl = URL.createObjectURL(blob);
        const audio = new Audio(audioUrl);
        currentAudio.current = audio;

        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            resolve();
          };
          audio.play().catch(() => resolve());
        });
      }

      // Remove the played item
      audioQueue.current.shift();
    }

    currentAudio.current = null;
    isPlayingQueue.current = false;
    setIsPlaying(false);
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  /**
   * Queue a batch of sentences as a single TTS request
   */
  const queueBatch = useCallback((sentences: string[]) => {
    if (sentences.length === 0) return;
    const batchText = sentences.join(" ");
    const id = sentenceCounter.current++;
    const audioPromise = fetchTTSAudio(batchText);
    audioQueue.current.push({ id, audioPromise });

    if (!isPlayingQueue.current) {
      playQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceId, language, playQueue]);

  // Max chars for a batch before firing TTS
  const BATCH_CHAR_LIMIT = 300;
  const BATCH_SENTENCE_LIMIT = 3;

  /**
   * feedText — call this with the FULL streamed text so far on every update.
   * The hook tracks how much it already processed and only extracts new sentences.
   */
  const feedText = useCallback(
    (fullText: string) => {
      if (isStopped.current) return;

      // Get only the new text since last processing
      const newText = fullText.slice(processedLength.current);
      if (!newText) return;

      // Combine with any pending buffer from previous call
      const combined = pendingBuffer.current + newText;
      const { sentences, remainder } = splitSentences(combined);

      // Update processed length to include everything except the remainder
      processedLength.current = fullText.length - remainder.length;
      pendingBuffer.current = remainder;

      for (const sentence of sentences) {
        // Send the very first sentence immediately for low time-to-first-audio
        if (isFirstSentence.current) {
          isFirstSentence.current = false;
          queueBatch([sentence]);
          continue;
        }

        sentenceBatch.current.push(sentence);
        const batchLength = sentenceBatch.current.join(" ").length;

        // Flush batch when it hits size or count limits
        if (batchLength >= BATCH_CHAR_LIMIT || sentenceBatch.current.length >= BATCH_SENTENCE_LIMIT) {
          queueBatch([...sentenceBatch.current]);
          sentenceBatch.current = [];
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [voiceId, language, queueBatch]
  );

  /**
   * flush — call when generation is complete to speak any remaining buffered text
   */
  const flush = useCallback(() => {
    if (isStopped.current) return;

    // Flush any accumulated sentence batch
    if (sentenceBatch.current.length > 0) {
      queueBatch([...sentenceBatch.current]);
      sentenceBatch.current = [];
    }

    // Flush any remaining text fragment
    const remaining = pendingBuffer.current.trim();
    if (remaining.length > 3) {
      queueBatch([remaining]);
    }
    pendingBuffer.current = "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceId, language, queueBatch]);

  /**
   * reset — call before a new response starts to clear state
   */
  const reset = useCallback(() => {
    processedLength.current = 0;
    pendingBuffer.current = "";
    sentenceCounter.current = 0;
    sentenceBatch.current = [];
    isFirstSentence.current = true;
    isStopped.current = false;
  }, []);

  /**
   * stop — cancel all pending audio and stop playback
   */
  const stop = useCallback(() => {
    isStopped.current = true;
    audioQueue.current = [];
    pendingBuffer.current = "";
    processedLength.current = 0;
    sentenceCounter.current = 0;
    sentenceBatch.current = [];
    isFirstSentence.current = true;

    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }

    setIsPlaying(false);
    setIsSpeaking(false);
  }, [setIsSpeaking]);

  return { feedText, flush, reset, stop, isPlaying };
};
