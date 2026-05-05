// ================================================================
// index.js — WhatsApp AI Bot — Main entry point
// ================================================================
//
//  What this file does (in order):
//
//   1. Validates config (API key must be set)
//   2. Starts a tiny web server so you can see the QR in a browser
//   3. Initialises the WhatsApp Web client (via Puppeteer)
//   4. On QR event  → saves qr.png so the web viewer can show it
//   5. On ready     → bot starts listening for messages
//   6. On message   → calls AI, sends reply back to the user
//
// ================================================================

const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode    = require("qrcode-terminal");     // ASCII QR in logs
const qrcodeLib = require("qrcode");              // PNG file for web viewer
const config    = require("./config");
const { getAIResponse }  = require("./ai");
const { startQRServer }  = require("./qr-server");
const path = require("path");

// ── 1. Validate config ────────────────────────────────────────
if (!config.OPENROUTER_API_KEY || !config.OPENROUTER_API_KEY.trim()) {
  console.error(
    "\n❌  OPENROUTER_API_KEY is empty in config.js.\n" +
    "    Get a free key at https://openrouter.ai/keys and paste it in.\n"
  );
  process.exit(1);
}

// ── 2. Start the QR web viewer ────────────────────────────────
startQRServer(config.QR_SERVER_PORT);

// ── 3. Create the WhatsApp client ─────────────────────────────
const client = new Client({
  authStrategy: new LocalAuth({ dataPath: config.SESSION_DIR }),
  puppeteer: {
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",          // required in CI / Docker
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
    ],
  },
});

// ── 4a. QR event — save PNG + print ASCII to logs ─────────────
client.on("qr", async (qrData) => {
  // Print ASCII QR in the GitHub Actions / terminal logs
  console.log("\n" + "=".repeat(60));
  console.log("📱  SCAN THIS QR WITH WHATSAPP:");
  console.log("    WhatsApp → ⋮ → Linked Devices → Link a Device");
  console.log("=".repeat(60) + "\n");
  qrcode.generate(qrData, { small: true });

  // Also save as qr.png so the web viewer can serve it
  const qrPath = path.join(__dirname, "qr.png");
  try {
    await qrcodeLib.toFile(qrPath, qrData, {
      type:  "png",
      scale: 8,           // large pixel size → easier to scan
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    });
    console.log(`\n✅  qr.png saved — open http://localhost:${config.QR_SERVER_PORT} to scan visually.\n`);
  } catch (err) {
    console.warn("[QR] Could not save qr.png:", err.message);
  }
});

// ── 4b. Authenticated ─────────────────────────────────────────
client.on("authenticated", () => {
  console.log("✅  Authenticated. Session saved to", config.SESSION_DIR);
});

// ── 4c. Auth failure ──────────────────────────────────────────
client.on("auth_failure", (msg) => {
  console.error("❌  Auth failed:", msg);
  console.error("    Delete the ./session folder and re-run.\n");
});

// ── 5. Ready — bot is live ────────────────────────────────────
client.on("ready", () => {
  console.log("\n" + "=".repeat(60));
  console.log("🤖  WhatsApp AI Bot is READY!");
  console.log("    Send any WhatsApp message to this number to test.");
  console.log("=".repeat(60) + "\n");
});

// ── 6. Incoming message ───────────────────────────────────────
client.on("message", async (msg) => {
  // Ignore own messages (prevents reply loops)
  if (msg.fromMe) return;

  // Ignore group messages — remove this block to enable group replies
  if (msg.isGroupMsg) {
    console.log("[Bot] Skipping group message.");
    return;
  }

  const text = msg.body?.trim();

  // Ignore empty / non-text messages (stickers, images, etc.)
  if (!text) {
    console.log("[Bot] Skipping non-text message.");
    return;
  }

  console.log(`\n[Bot] 📨  From: ${msg.from}`);
  console.log(`[Bot] 💬  Text: "${text}"`);

  try {
    // Show typing indicator while AI thinks
    const chat = await msg.getChat();
    await chat.sendStateTyping();

    // Get AI reply
    const reply = await getAIResponse(text);
    console.log(`[Bot] 🤖  Reply: "${reply}"`);

    // Send reply back on WhatsApp
    await msg.reply(reply);
    console.log(`[Bot] ✅  Sent to ${msg.from}\n`);

  } catch (err) {
    console.error("[Bot] ❌  Error:", err.message);
    try {
      await msg.reply("Sorry, I ran into a problem. Please try again!");
    } catch (_) { /* ignore secondary errors */ }
  }
});

// ── Disconnected ──────────────────────────────────────────────
client.on("disconnected", (reason) => {
  console.warn("\n⚠️   Disconnected:", reason);
  console.warn("    Re-run the workflow to reconnect.\n");
});

// ── Boot ──────────────────────────────────────────────────────
console.log("🚀  Starting WhatsApp AI Bot...");
console.log("    Model:", config.MODEL);
client.initialize();
