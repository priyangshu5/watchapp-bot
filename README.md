# 🤖 WhatsApp AI Bot

A self-contained WhatsApp chatbot that runs entirely on **GitHub Actions** — no server, no hosting, no monthly cost.

When someone sends your WhatsApp number a message, the bot reads it, sends it to an AI model (via OpenRouter), and replies automatically.

> ⚠️ **Student / experimental project only.** Using unofficial WhatsApp automation violates WhatsApp's Terms of Service. Do not use this on a personal number you care about.

---

## 📁 File Structure

```
whatsapp-ai-bot/
│
├── .github/
│   └── workflows/
│       └── main.yml        ← GitHub Actions workflow (runs the bot)
│
├── session/
│   └── .gitkeep            ← Placeholder; auth data is written here at runtime
│
├── .gitignore              ← Excludes node_modules, session data, qr.png
├── ai.js                   ← Sends messages to OpenRouter AI, returns reply
├── config.js               ← ⚙️  All settings live here — edit this first
├── index.js                ← Main bot logic (WhatsApp client + message handler)
├── package.json            ← Node.js dependencies
├── qr-server.js            ← Tiny built-in web server for the QR viewer page
└── README.md               ← This file
```

---

## ⚙️ How the System Works

```
┌─────────────────────────────────────────────────────────┐
│                   GitHub Actions Runner                  │
│                                                         │
│  node index.js                                          │
│     │                                                   │
│     ├── starts qr-server.js  (HTTP on port 3000)        │
│     │       GET /        → QR viewer HTML page          │
│     │       GET /qr.png  → the QR image file            │
│     │                                                   │
│     └── starts WhatsApp client (Puppeteer + Chromium)   │
│              │                                          │
│              ├── [QR event]  → saves qr.png             │
│              │                  prints ASCII in logs     │
│              │                                          │
│              ├── [ready]    → bot is live                │
│              │                                          │
│              └── [message]  → calls ai.js               │
│                                   │                     │
│                                   └── OpenRouter API    │
│                                         (GPT-4o-mini)   │
└─────────────────────────────────────────────────────────┘
         ↕  WhatsApp Web protocol
┌─────────────┐
│  Your Phone  │  ← scans QR to link, then sends/receives messages
└─────────────┘
```

**Flow in plain English:**

1. You trigger the workflow manually on GitHub.
2. GitHub spins up a fresh Ubuntu machine and runs `node index.js`.
3. A QR code appears in the logs (and is also served on port 3000 as a big image).
4. You scan the QR with your phone to link WhatsApp.
5. The bot is now live. Any WhatsApp message sent to that number → AI processes it → reply sent back.
6. After ~6 hours GitHub kills the runner and the bot stops.

---

## 🚀 Setup Guide

### Step 1 — Get an OpenRouter API key

1. Go to [https://openrouter.ai](https://openrouter.ai) and sign up (free).
2. Click **Keys** → **Create Key**.
3. Copy the key (starts with `sk-or-...`).

---

### Step 2 — Edit `config.js`

Open `config.js` and paste your key:

```js
OPENROUTER_API_KEY: "sk-or-YOUR-KEY-HERE",
```

Everything else is pre-filled with working defaults. You can also change:

| Setting | Default | What it does |
|---------|---------|--------------|
| `MODEL` | `openai/gpt-4o-mini:free` | The AI model used |
| `SYSTEM_PROMPT` | Helpful assistant | The bot's personality |
| `QR_SERVER_PORT` | `3000` | Port for the QR web viewer |

---

### Step 3 — Push to GitHub

```bash
# In the project folder:
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

> 💡 The repo can be **private**. GitHub Actions works on both public and private repos.

---

### Step 4 — Run the workflow

1. Open your repo on GitHub.
2. Click the **Actions** tab.
3. In the left sidebar, click **WhatsApp AI Bot**.
4. Click **Run workflow** → **Run workflow**.

---

### Step 5 — Scan the QR code

1. Click the running job to open the live log view.
2. Click on the **🤖 Start WhatsApp AI Bot** step.
3. Wait ~30 seconds — a QR code will appear as ASCII art in the logs.
4. On your phone: **WhatsApp → ⋮ → Linked Devices → Link a Device** → scan.
5. You'll see in the logs: `✅ Authenticated. Session saved.`

> 📱 If the ASCII QR is too small to scan on your device, open  
> `http://localhost:3000` — but note: GitHub Actions runners are not publicly  
> accessible, so this URL only works if you are running the bot **locally**.  
> For GitHub Actions, use the ASCII QR in the logs.

---

### Step 6 — Test it

Send a WhatsApp message to the linked number. The bot will reply within a few seconds. 🎉

---

## 🔄 Re-running the Bot

Each GitHub Actions run is **temporary**. When it ends (or after ~6 hours), the bot goes offline.

To restart:
1. Go to **Actions → WhatsApp AI Bot → Run workflow**.
2. You will need to scan the QR again (session data is not persisted between runs).

---

## ⚠️ Limitations

| Limitation | Detail |
|------------|--------|
| **6-hour max** | GitHub Actions free tier allows up to 6 hours per run |
| **QR every time** | Session is not saved between runs — re-scan required |
| **Not always online** | Must manually restart the workflow |
| **No groups** | Group messages are ignored by default (editable in `index.js`) |
| **ToS risk** | WhatsApp may ban accounts using unofficial automation |
| **AI rate limits** | Free OpenRouter models have request limits |

---

## 🛠️ Customisation

**Change the AI model** (`config.js`):
```js
MODEL: "meta-llama/llama-3-8b-instruct:free",
```
Browse free models at [openrouter.ai/models](https://openrouter.ai/models).

**Change the bot personality** (`config.js`):
```js
SYSTEM_PROMPT: "You are a sarcastic assistant who answers only in rhymes.",
```

**Enable group chat replies** (`index.js`) — remove these lines:
```js
if (msg.isGroupMsg) {
  console.log("[Bot] Skipping group message.");
  return;
}
```

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `whatsapp-web.js` | Drives WhatsApp Web via a headless Chromium browser |
| `qrcode-terminal` | Renders the QR as ASCII art in the terminal / logs |
| `qrcode` | Generates `qr.png` for the built-in web viewer |

All are installed automatically by `npm install` in the workflow.

---

## 📄 License

MIT — free to use and modify for educational purposes.
