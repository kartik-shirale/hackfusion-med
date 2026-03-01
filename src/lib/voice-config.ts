// Voice configuration: Gemini voices for English, Sarvam voices for Indian languages

export interface VoiceOption {
  id: string;
  label: string;
  gender: "Male" | "Female";
  provider: "gemini" | "sarvam";
}

export interface LanguageConfig {
  code: string;
  label: string;
  nativeLabel: string;
  sampleText: string;
  provider: "gemini" | "sarvam";
}

// Gemini voices — for English
export const GEMINI_VOICES: VoiceOption[] = [
  { id: "Kore", label: "Kore", gender: "Female", provider: "gemini" },
  { id: "Puck", label: "Puck", gender: "Male", provider: "gemini" },
  { id: "Aoede", label: "Aoede", gender: "Female", provider: "gemini" },
  { id: "Charon", label: "Charon", gender: "Male", provider: "gemini" },
  { id: "Fenrir", label: "Fenrir", gender: "Male", provider: "gemini" },
];

// Sarvam Bulbul v3 voices — for Indian languages
// Speaker names MUST be lowercase per Sarvam API
export const SARVAM_VOICES: VoiceOption[] = [
  // Female
  { id: "priya", label: "Priya", gender: "Female", provider: "sarvam" },
  { id: "ritu", label: "Ritu", gender: "Female", provider: "sarvam" },
  { id: "neha", label: "Neha", gender: "Female", provider: "sarvam" },
  { id: "pooja", label: "Pooja", gender: "Female", provider: "sarvam" },
  { id: "simran", label: "Simran", gender: "Female", provider: "sarvam" },
  { id: "kavya", label: "Kavya", gender: "Female", provider: "sarvam" },
  { id: "ishita", label: "Ishita", gender: "Female", provider: "sarvam" },
  { id: "shreya", label: "Shreya", gender: "Female", provider: "sarvam" },
  { id: "roopa", label: "Roopa", gender: "Female", provider: "sarvam" },
  { id: "amelia", label: "Amelia", gender: "Female", provider: "sarvam" },
  { id: "sophia", label: "Sophia", gender: "Female", provider: "sarvam" },
  { id: "tanya", label: "Tanya", gender: "Female", provider: "sarvam" },
  { id: "shruti", label: "Shruti", gender: "Female", provider: "sarvam" },
  { id: "suhani", label: "Suhani", gender: "Female", provider: "sarvam" },
  { id: "kavitha", label: "Kavitha", gender: "Female", provider: "sarvam" },
  { id: "rupali", label: "Rupali", gender: "Female", provider: "sarvam" },
  // Male
  { id: "shubh", label: "Shubh", gender: "Male", provider: "sarvam" },
  { id: "aditya", label: "Aditya", gender: "Male", provider: "sarvam" },
  { id: "rahul", label: "Rahul", gender: "Male", provider: "sarvam" },
  { id: "rohan", label: "Rohan", gender: "Male", provider: "sarvam" },
  { id: "amit", label: "Amit", gender: "Male", provider: "sarvam" },
  { id: "dev", label: "Dev", gender: "Male", provider: "sarvam" },
  { id: "ratan", label: "Ratan", gender: "Male", provider: "sarvam" },
  { id: "varun", label: "Varun", gender: "Male", provider: "sarvam" },
  { id: "manan", label: "Manan", gender: "Male", provider: "sarvam" },
  { id: "sumit", label: "Sumit", gender: "Male", provider: "sarvam" },
  { id: "kabir", label: "Kabir", gender: "Male", provider: "sarvam" },
  { id: "aayan", label: "Aayan", gender: "Male", provider: "sarvam" },
  { id: "ashutosh", label: "Ashutosh", gender: "Male", provider: "sarvam" },
  { id: "advait", label: "Advait", gender: "Male", provider: "sarvam" },
  { id: "anand", label: "Anand", gender: "Male", provider: "sarvam" },
  { id: "tarun", label: "Tarun", gender: "Male", provider: "sarvam" },
  { id: "sunny", label: "Sunny", gender: "Male", provider: "sarvam" },
  { id: "mani", label: "Mani", gender: "Male", provider: "sarvam" },
  { id: "gokul", label: "Gokul", gender: "Male", provider: "sarvam" },
  { id: "vijay", label: "Vijay", gender: "Male", provider: "sarvam" },
  { id: "mohit", label: "Mohit", gender: "Male", provider: "sarvam" },
  { id: "rehan", label: "Rehan", gender: "Male", provider: "sarvam" },
  { id: "soham", label: "Soham", gender: "Male", provider: "sarvam" },
];

// Get voices for a specific language
export const getVoicesForLanguage = (langCode: string): VoiceOption[] => {
  return langCode === "en-IN" ? GEMINI_VOICES : SARVAM_VOICES;
};

// Supported Indian languages
export const LANGUAGES: LanguageConfig[] = [
  {
    code: "en-IN",
    label: "English (India)",
    nativeLabel: "English",
    sampleText: "Hello! Welcome to PharmaCare AI. How can I help you today?",
    provider: "gemini",
  },
  {
    code: "hi-IN",
    label: "Hindi",
    nativeLabel: "हिन्दी",
    sampleText: "नमस्ते! फार्माकेयर एआई में आपका स्वागत है।",
    provider: "sarvam",
  },
  {
    code: "bn-IN",
    label: "Bengali",
    nativeLabel: "বাংলা",
    sampleText: "নমস্কার! ফার্মাকেয়ার এআই তে আপনাকে স্বাগতম।",
    provider: "sarvam",
  },
  {
    code: "te-IN",
    label: "Telugu",
    nativeLabel: "తెలుగు",
    sampleText: "నమస్కారం! ఫార్మాకేర్ AIకి స్వాగతం.",
    provider: "sarvam",
  },
  {
    code: "mr-IN",
    label: "Marathi",
    nativeLabel: "मराठी",
    sampleText: "नमस्कार! फार्माकेअर AI मध्ये आपले स्वागत आहे.",
    provider: "sarvam",
  },
  {
    code: "ta-IN",
    label: "Tamil",
    nativeLabel: "தமிழ்",
    sampleText: "வணக்கம்! ஃபார்மாகேர் AI-க்கு வரவேற்கிறோம்.",
    provider: "sarvam",
  },
  {
    code: "gu-IN",
    label: "Gujarati",
    nativeLabel: "ગુજરાતી",
    sampleText: "નમસ્તે! ફાર્માકેર AIમાં આપનું સ્વાગત છે.",
    provider: "sarvam",
  },
  {
    code: "kn-IN",
    label: "Kannada",
    nativeLabel: "ಕನ್ನಡ",
    sampleText: "ನಮಸ್ಕಾರ! ಫಾರ್ಮಾಕೇರ್ AIಗೆ ಸ್ವಾಗತ.",
    provider: "sarvam",
  },
  {
    code: "ml-IN",
    label: "Malayalam",
    nativeLabel: "മലയാളം",
    sampleText: "നമസ്കാരം! ഫാർമകെയർ AIയിലേക്ക് സ്വാഗതം.",
    provider: "sarvam",
  },
  {
    code: "pa-IN",
    label: "Punjabi",
    nativeLabel: "ਪੰਜਾਬੀ",
    sampleText: "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਫਾਰਮਾਕੇਅਰ AI ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ।",
    provider: "sarvam",
  },
  {
    code: "or-IN",
    label: "Odia",
    nativeLabel: "ଓଡ଼ିଆ",
    sampleText: "ନମସ୍କାର! ଫାର୍ମାକେୟାର AIରେ ଆପଣଙ୍କୁ ସ୍ୱାଗତ।",
    provider: "sarvam",
  },
];

// Helpers
export const getLanguageConfig = (code: string): LanguageConfig | undefined =>
  LANGUAGES.find((l) => l.code === code);

export const getLanguageLabel = (code: string): string => {
  const lang = getLanguageConfig(code);
  return lang ? `${lang.nativeLabel} (${lang.label})` : code;
};

// Get default voice for a language
export const getDefaultVoice = (langCode: string): string => {
  return langCode === "en-IN" ? "Kore" : "priya";
};
