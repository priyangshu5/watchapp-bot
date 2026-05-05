// ================================================================
// ai.js — AI integration via OpenRouter API
// ================================================================
//
//  Exports one function: getAIResponse(userMessage)
//  → sends the message to the AI model
//  → returns a plain-text reply string
//
// ================================================================

const config = require("./config");

/**
 * Send a user's WhatsApp message to the AI and get a reply.
 *
 * @param   {string}          userMessage  Raw text from WhatsApp
 * @returns {Promise<string>}              AI reply text
 */
async function getAIResponse(userMessage) {
  const url = `${config.BASE_URL}/chat/completions`;

  // Build the request body in OpenAI-compatible format
  const body = {
    model: config.MODEL,
    max_tokens: 500,
    temperature: 0.7,
    messages: [
      { role: "system", content: config.SYSTEM_PROMPT },
      { role: "user",   content: userMessage           },
    ],
  };

  // Timeout support via AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT_MS);

  try {
    console.log("[AI] → Sending to OpenRouter...");

    const res = await fetch(url, {
      method:  "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${config.OPENROUTER_API_KEY}`,
        "HTTP-Referer":  "https://github.com/whatsapp-ai-bot",
        "X-Title":       "WhatsApp AI Bot",
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Non-2xx response → log and return a safe fallback
    if (!res.ok) {
      const errText = await res.text();
      console.error(`[AI] ✗ HTTP ${res.status}: ${errText}`);
      return "Sorry, I couldn't reach the AI right now. Please try again.";
    }

    const data  = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      console.error("[AI] ✗ Unexpected response shape:", JSON.stringify(data));
      return "Sorry, I received an unexpected response. Please try again.";
    }

    console.log("[AI] ✓ Reply received.");
    return reply;

  } catch (err) {
    clearTimeout(timer);

    if (err.name === "AbortError") {
      console.error("[AI] ✗ Request timed out.");
      return "Sorry, the AI took too long to respond. Please try again.";
    }

    console.error("[AI] ✗ Unexpected error:", err.message);
    return "Sorry, something went wrong. Please try again.";
  }
}

module.exports = { getAIResponse };
