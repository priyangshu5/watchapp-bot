// ================================================================
// qr-server.js — Tiny built-in web server for the QR viewer
// ================================================================
//
//  Serves two routes on http://localhost:PORT
//
//    GET /        → returns the full-screen QR viewer HTML page
//    GET /qr.png  → returns the current qr.png file (the QR image)
//
//  This runs INSIDE the same Node process as the bot.
//  No extra server or library needed — only Node's built-in 'http'
//  and 'fs' modules are used.
//
// ================================================================

const http = require("http");
const fs   = require("fs");
const path = require("path");

const QR_FILE = path.join(__dirname, "qr.png");

// ── Full HTML page (inlined so no extra files are needed) ─────
const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <title>WhatsApp QR — Scan to Connect</title>
  <link rel="preconnect" href="https://fonts.googleapis.com"/>
  <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Syne:wght@400;700&display=swap" rel="stylesheet"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg:      #0a0a0a;
      --surface: #111111;
      --border:  #1e1e1e;
      --accent:  #00ff88;
      --accent2: #00ccff;
      --text:    #e8e8e8;
      --muted:   #555555;
      --danger:  #ff4444;
      --r:       14px;
    }
    html, body {
      height: 100%; width: 100%;
      overflow: hidden;
      background: var(--bg);
      color: var(--text);
      font-family: 'Syne', sans-serif;
    }
    /* subtle dot-grid background */
    body::before {
      content: '';
      position: fixed; inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px);
      background-size: 28px 28px;
      pointer-events: none; z-index: 0;
    }
    .shell {
      position: relative; z-index: 1;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      height: 100dvh; padding: 24px; gap: 24px;
    }
    /* ── header ── */
    .hdr { display: flex; flex-direction: column; align-items: center; gap: 4px; animation: fadeD .5s ease both; }
    .hdr .tag { font-family:'Share Tech Mono',monospace; font-size:11px; letter-spacing:.25em; text-transform:uppercase; color:var(--accent); }
    .hdr h1  { font-size:clamp(18px,4vw,26px); font-weight:700; letter-spacing:-.02em; }
    /* ── card ── */
    .card {
      position: relative;
      display: flex; align-items: center; justify-content: center;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--r);
      padding: 18px;
      width:  min(82vw, 82vh, 440px);
      height: min(82vw, 82vh, 440px);
      animation: scaleIn .5s cubic-bezier(.34,1.56,.64,1) .15s both;
      transition: box-shadow .4s;
    }
    .card.flash { box-shadow: 0 0 0 4px rgba(0,255,136,.35); }
    /* corner marks */
    .card::before,.card::after,.card-i::before,.card-i::after {
      content:''; position:absolute; width:22px; height:22px;
      border-color:var(--accent); border-style:solid; opacity:.7;
    }
    .card::before  { top:10px;    left:10px;    border-width:2px 0 0 2px; }
    .card::after   { bottom:10px; right:10px;   border-width:0 2px 2px 0; }
    .card-i::before{ top:10px;    right:10px;   border-width:2px 2px 0 0; }
    .card-i::after { bottom:10px; left:10px;    border-width:0 0 2px 2px; }
    .card-i { position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
    /* scan line */
    .scan-line {
      position:absolute; left:8%; right:8%; height:2px;
      background:linear-gradient(90deg,transparent,var(--accent),transparent);
      box-shadow:0 0 10px var(--accent);
      animation:scan 2.8s ease-in-out infinite; display:none;
    }
    @keyframes scan { 0%{top:8%;opacity:0} 10%{opacity:.9} 90%{opacity:.9} 100%{top:92%;opacity:0} }
    /* ── QR image ── */
    #qrImg {
      width:100%; height:100%; object-fit:contain;
      image-rendering:pixelated; border-radius:6px;
      background:#fff; padding:8px; display:none;
    }
    /* ── states ── */
    .state { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; text-align:center; padding:24px; }
    #stLoad { display:flex; }
    #stErr  { display:none; }
    .spinner { width:40px;height:40px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .8s linear infinite; }
    @keyframes spin { to{transform:rotate(360deg)} }
    .st-txt { font-family:'Share Tech Mono',monospace; font-size:13px; color:var(--muted); letter-spacing:.07em; }
    .err-icon { font-size:28px; }
    .err-txt  { font-family:'Share Tech Mono',monospace; font-size:12px; color:var(--danger); white-space:pre-line; }
    /* ── footer ── */
    .ftr { display:flex; flex-direction:column; align-items:center; gap:10px; animation:fadeU .5s ease .3s both; }
    /* progress bar */
    .bar-wrap { width:min(82vw,82vh,440px); height:2px; background:var(--border); border-radius:999px; overflow:hidden; }
    #bar { height:100%; background:linear-gradient(90deg,var(--accent),var(--accent2)); border-radius:999px; transform-origin:left; }
    /* status pill */
    .pill { display:flex; align-items:center; gap:8px; background:var(--surface); border:1px solid var(--border); border-radius:999px; padding:6px 16px; }
    .dot  { width:6px;height:6px;border-radius:50%;background:var(--muted); }
    .dot.on { background:var(--accent); box-shadow:0 0 6px var(--accent); animation:pulse 1.5s infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.25} }
    .pill-txt { font-family:'Share Tech Mono',monospace; font-size:12px; color:var(--muted); letter-spacing:.06em; }
    #statusTxt { color:var(--accent); }
    /* fullscreen btn */
    .btn-fs {
      background:none; border:1px solid var(--border); border-radius:8px;
      color:var(--muted); font-family:'Share Tech Mono',monospace;
      font-size:11px; letter-spacing:.1em; padding:7px 18px;
      cursor:pointer; text-transform:uppercase;
      transition:border-color .2s,color .2s;
    }
    .btn-fs:hover { border-color:var(--accent2); color:var(--accent2); }
    /* animations */
    @keyframes fadeD  { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:none} }
    @keyframes fadeU  { from{opacity:0;transform:translateY(10px)}  to{opacity:1;transform:none} }
    @keyframes scaleIn{ from{opacity:0;transform:scale(.92)}        to{opacity:1;transform:none} }
    @media (max-height:600px) { .shell{gap:12px;padding:12px} .hdr{display:none} }
  </style>
</head>
<body>
<div class="shell">

  <div class="hdr">
    <span class="tag">⬡ WhatsApp Auth</span>
    <h1>Scan to Connect</h1>
  </div>

  <div class="card" id="card">
    <div class="card-i">
      <div class="scan-line" id="scanLine"></div>
      <img id="qrImg" alt="QR Code"/>
      <div class="state" id="stLoad">
        <div class="spinner"></div>
        <span class="st-txt">Waiting for QR code…</span>
      </div>
      <div class="state" id="stErr">
        <div class="err-icon">⚠</div>
        <span class="err-txt" id="errTxt">QR not ready yet.\\nBot may still be starting…</span>
      </div>
    </div>
  </div>

  <div class="bar-wrap"><div id="bar"></div></div>

  <div class="ftr">
    <div class="pill">
      <div class="dot" id="dot"></div>
      <span class="pill-txt"><span id="statusTxt">CONNECTING</span></span>
    </div>
    <button class="btn-fs" onclick="toggleFS()">⛶ Fullscreen</button>
  </div>

</div>
<script>
  const REFRESH_MS = 7000;
  const qrImg    = document.getElementById('qrImg');
  const card     = document.getElementById('card');
  const stLoad   = document.getElementById('stLoad');
  const stErr    = document.getElementById('stErr');
  const errTxt   = document.getElementById('errTxt');
  const dot      = document.getElementById('dot');
  const statusTx = document.getElementById('statusTxt');
  const scanLine = document.getElementById('scanLine');
  const bar      = document.getElementById('bar');
  let barTimer, failCount = 0;

  function loadQR() {
    const src = '/qr.png?t=' + Date.now();
    const tmp = new Image();
    tmp.onload = () => {
      failCount = 0;
      qrImg.src = src;
      qrImg.style.display = 'block';
      stLoad.style.display = 'none';
      stErr.style.display  = 'none';
      scanLine.style.display = 'block';
      dot.classList.add('on');
      statusTx.textContent = 'READY — SCAN NOW';
      // flash border
      card.classList.remove('flash');
      void card.offsetWidth;
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 700);
      startBar();
    };
    tmp.onerror = () => {
      failCount++;
      qrImg.style.display    = 'none';
      scanLine.style.display = 'none';
      dot.classList.remove('on');
      if (failCount === 1) { stLoad.style.display = 'flex'; stErr.style.display = 'none'; }
      else                 { stLoad.style.display = 'none'; stErr.style.display  = 'flex'; errTxt.textContent = 'QR not ready yet.\\nRetrying… (attempt ' + failCount + ')'; }
      statusTx.textContent = 'WAITING';
      startBar();
    };
    tmp.src = src;
  }

  function startBar() {
    clearTimeout(barTimer);
    bar.style.transition = 'none';
    bar.style.transform  = 'scaleX(1)';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bar.style.transition = 'transform ' + (REFRESH_MS/1000) + 's linear';
      bar.style.transform  = 'scaleX(0)';
    }));
    barTimer = setTimeout(loadQR, REFRESH_MS);
  }

  function toggleFS() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
    else document.exitFullscreen().catch(()=>{});
  }
  document.addEventListener('keydown', e => { if(e.key==='f'||e.key==='F') toggleFS(); });

  loadQR();
</script>
</body>
</html>`;

/**
 * Start the QR web-viewer server.
 * @param {number} port  TCP port to listen on (default from config)
 */
function startQRServer(port) {
  const server = http.createServer((req, res) => {

    // ── Route: GET /  →  serve the viewer HTML page
    if (req.url === "/" || req.url === "/index.html") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(HTML_PAGE);
      return;
    }

    // ── Route: GET /qr.png  →  serve the QR image file
    if (req.url.startsWith("/qr.png")) {
      if (!fs.existsSync(QR_FILE)) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("QR not generated yet");
        return;
      }
      const img = fs.readFileSync(QR_FILE);
      res.writeHead(200, {
        "Content-Type":  "image/png",
        "Cache-Control": "no-store", // always serve the freshest QR
      });
      res.end(img);
      return;
    }

    // ── All other routes → 404
    res.writeHead(404);
    res.end("Not found");
  });

  server.listen(port, () => {
    console.log(`\n🌐 QR Viewer running at: http://localhost:${port}`);
    console.log(`   Open that URL in your browser / phone to scan the QR.\n`);
  });

  return server;
}

module.exports = { startQRServer };
