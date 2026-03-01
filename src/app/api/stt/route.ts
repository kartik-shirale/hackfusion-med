export const POST = async (req: Request) => {
  try {
    // WIP: Gemini STT streaming proxy
    // This endpoint will accept audio chunks and forward to Gemini STT API
    // For now, the client-side SpeechInput component uses the browser's Web Speech API

    return new Response(
      JSON.stringify({
        success: true,
        message: "STT endpoint scaffolded. Currently using browser Web Speech API.",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("STT error:", error);
    return new Response(
      JSON.stringify({ error: "STT failed", status: 500 }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
