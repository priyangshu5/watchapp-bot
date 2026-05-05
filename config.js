// ================================================================
// config.js — Central configuration for WhatsApp AI Bot
// ================================================================
//
//  ⚠️  BEFORE RUNNING: Fill in your OPENROUTER_API_KEY below.
//  All other values are pre-filled with working defaults.
//
// ================================================================

module.exports = {

  // --------------------------------------------------------------
  // 🔑  OpenRouter API Key
  //     Get one free at: https://openrouter.ai/keys
  // --------------------------------------------------------------
  OPENROUTER_API_KEY: "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",          // <── PASTE YOUR KEY HERE

  // --------------------------------------------------------------
  // 🌐  OpenRouter base URL  (do not change)
  // --------------------------------------------------------------
  BASE_URL: "https://openrouter.ai/api/v1",

  // --------------------------------------------------------------
  // 🤖  AI model
  //     Full list of free models: https://openrouter.ai/models
  // --------------------------------------------------------------
  MODEL: "openai/gpt-4o-mini:free",

  // --------------------------------------------------------------
  // 💬  System prompt — defines the bot's personality
  // --------------------------------------------------------------
  SYSTEM_PROMPT:
    "You are a helpful, friendly AI assistant answering WhatsApp messages. " +
    "Keep replies concise and easy to read on a phone screen.",

  // --------------------------------------------------------------
  // ⏱️  How long (ms) to wait for the AI before giving up
  // --------------------------------------------------------------
  REQUEST_TIMEOUT_MS: 15000,

  // --------------------------------------------------------------
  // 📁  Where WhatsApp session data is stored on disk
  // --------------------------------------------------------------
  SESSION_DIR: "./session",

  // --------------------------------------------------------------
  // 🌍  QR web-viewer server port
  //     Open http://localhost:PORT in your browser to see the QR
  // --------------------------------------------------------------
  QR_SERVER_PORT: 3000,

};
