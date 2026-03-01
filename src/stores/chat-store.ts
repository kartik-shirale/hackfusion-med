import { create } from "zustand";
import { persist } from "zustand/middleware";

// WIP: Chat store manages mode, voice state, cart, and sidebar visibility

export type ChatMode = "chat" | "voice";

interface ChatState {
  mode: ChatMode;
  chatId: string | null;
  isSpeaking: boolean;
  isListening: boolean;
  language: string;
  voiceId: string;
  cartOpen: boolean;
  navCollapsed: boolean;
  historyOpen: boolean;

  // Actions
  setMode: (mode: ChatMode) => void;
  setChatId: (id: string | null) => void;
  setIsSpeaking: (v: boolean) => void;
  setIsListening: (v: boolean) => void;
  setLanguage: (lang: string) => void;
  setVoiceId: (id: string) => void;
  setCartOpen: (v: boolean) => void;
  toggleCart: () => void;
  toggleMode: () => void;
  toggleNav: () => void;
  toggleHistory: () => void;
  setHistoryOpen: (v: boolean) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      mode: "chat",
      chatId: null,
      isSpeaking: false,
      isListening: false,
      language: "en-IN",
      voiceId: "priya",
      cartOpen: false,
      navCollapsed: false,
      historyOpen: true,

      setMode: (mode) => set({ mode }),
      setChatId: (chatId) => set({ chatId }),
      setIsSpeaking: (isSpeaking) => set({ isSpeaking }),
      setIsListening: (isListening) => set({ isListening }),
      setLanguage: (language) => set({ language }),
      setVoiceId: (voiceId) => set({ voiceId }),
      setCartOpen: (cartOpen) => set({ cartOpen }),
      toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),
      toggleMode: () =>
        set((s) => ({ mode: s.mode === "chat" ? "voice" : "chat" })),
      toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
      toggleHistory: () => set((s) => ({ historyOpen: !s.historyOpen })),
      setHistoryOpen: (historyOpen) => set({ historyOpen }),
    }),
    {
      name: "pharmacare-settings",
      // Only persist language and voice preferences
      partialize: (state) => ({
        language: state.language,
        voiceId: state.voiceId,
        navCollapsed: state.navCollapsed,
      }),
    }
  )
);
