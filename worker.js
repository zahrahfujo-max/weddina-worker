// ============================================
// WEDDINA AI PROXY — Cloudflare Worker
// Fungsinya: nyimpen Gemini API key aman di server,
// jadi gak nempel plain text di HTML.
// ============================================

export default {
  async fetch(request, env) {
    // Izinkan HTML kamu (dari mana pun dibuka) buat manggil Worker ini
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Browser suka ngirim "preflight request" (OPTIONS) dulu sebelum POST asli
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    try {
      const body = await request.json();

      // MODEL_NAME diambil dari Environment Variable Cloudflare.
      // Kalau Gemini deprecate model lagi, tinggal ganti value-nya di
      // Settings > Variables, gak perlu edit kode ini atau HTML-nya.
      const model = env.MODEL_NAME || "gemini-2.5-flash";
      const apiKey = env.GEMINI_API_KEY; // ini secret, disimpan aman di Cloudflare

      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "GEMINI_API_KEY belum diset di Cloudflare Variables" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body), // body dari HTML kamu (contents + systemInstruction) diteruskan apa adanya
        }
      );

      const data = await geminiRes.json();

      return new Response(JSON.stringify(data), {
        status: geminiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Worker error: " + err.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  },
};
