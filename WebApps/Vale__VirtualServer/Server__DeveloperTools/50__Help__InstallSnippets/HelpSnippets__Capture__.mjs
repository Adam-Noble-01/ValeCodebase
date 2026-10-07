/* =============================================================================
   VALE HELP - INSTALL SNIPPETS CAPTURE (MAKES THE GUIDE'S PICTURES)
   =============================================================================

   FILE       : HelpSnippets__Capture__.mjs
   AUTHOR     : Adam Noble - Noble Architecture
   PURPOSE    : Render every picture in HelpSnippets__Studio__.html for each app
                and save it as Vale__ValeVision__Help/install-app/Help__Snippets/
                HelpSnippet__<app>__<picture>__.webp
   CREATED    : 07-Oct-2026

   DESCRIPTION:
   - Needs the Vale dev server running (it serves the real apps):
       python Server__DeveloperTools\ValeDev__LocalServer__.py      (port 8030)
   - Serves the studio on http://127.0.0.1:8031/__studio/ and passes every
     other path to the dev server, so the app iframes are same-origin and the
     studio can ring the app's own install card.
   - Drives Microsoft Edge headless over the DevTools protocol (Node 22's
     built-in WebSocket): nothing to install. 2x pixels, WebP quality 90.

   USAGE:
     node HelpSnippets__Capture__.mjs                    every picture, both apps
     node HelpSnippets__Capture__.mjs Ios-04-AddScreen   pictures whose id contains this
     set VALE_DEV_PORT=8030 / VALE_EDGE=<path to msedge.exe> to override

   ============================================================================= */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


// -----------------------------------------------------------------------------
// REGION | Constants
// -----------------------------------------------------------------------------

const STUDIO_DIR   = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR      = path.resolve(STUDIO_DIR, '..', '..', 'Vale__ValeVision__Help', 'install-app', 'Help__Snippets');
const DEV_PORT     = Number(process.env.VALE_DEV_PORT || 8030);
const STUDIO_PORT  = 8031;
const CDP_PORT     = 9333;
const EDGE         = process.env.VALE_EDGE || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const APPS         = ['valevision', 'valevision3d'];
const FILTER       = process.argv[2] || '';
const MARGIN       = 14;                                                       // <-- Room round #Snip for the rings

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Studio Server (studio files + the dev server behind one origin)
// -----------------------------------------------------------------------------

function Na__StartServer() {
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript' };
    const server = http.createServer((req, res) => {
        if (req.url.startsWith('/__studio/')) {
            const file = path.join(STUDIO_DIR, decodeURIComponent(req.url.slice(10).split('?')[0]));
            if (!file.startsWith(STUDIO_DIR) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
            res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
            fs.createReadStream(file).pipe(res);
            return;
        }
        const up = http.request({ host: '127.0.0.1', port: DEV_PORT, path: req.url, method: req.method,
                                  headers: { ...req.headers, host: `127.0.0.1:${DEV_PORT}` } }, (r) => {
            res.writeHead(r.statusCode, r.headers);
            r.pipe(res);
        });
        up.on('error', () => { res.writeHead(502); res.end('dev server not running'); });
        req.pipe(up);
    });
    return new Promise((ok) => server.listen(STUDIO_PORT, '127.0.0.1', () => ok(server)));
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Edge Over the DevTools Protocol
// -----------------------------------------------------------------------------

const Na__Sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function Na__StartEdge() {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vale-help-snips-'));
    const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${CDP_PORT}`, `--user-data-dir=${profile}`,
                              '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--window-size=1700,1300',
                              'about:blank'], { stdio: 'ignore' });
    for (let i = 0; i < 60; i++) {
        try {
            const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
            const page = list.find((t) => t.type === 'page');
            if (page) return { edge, profile, ws: page.webSocketDebuggerUrl };
        } catch { /* not up yet */ }
        await Na__Sleep(250);
    }
    edge.kill();
    throw new Error('Edge did not start with DevTools on port ' + CDP_PORT);
}

function Na__Cdp(wsUrl) {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const waiting = new Map();
    ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.id && waiting.has(msg.id)) {
            const { ok, fail } = waiting.get(msg.id);
            waiting.delete(msg.id);
            msg.error ? fail(new Error(msg.error.message)) : ok(msg.result);
        }
    };
    const send = (method, params = {}) => new Promise((ok, fail) => {
        const n = ++id;
        waiting.set(n, { ok, fail });
        ws.send(JSON.stringify({ id: n, method, params }));
    });
    return new Promise((ok) => { ws.onopen = () => ok({ send, close: () => ws.close() }); });
}

async function Na__Eval(cdp, expression) {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return r.result.value;
}

// endregion -------------------------------------------------------------------


// -----------------------------------------------------------------------------
// REGION | Capture Every Picture
// -----------------------------------------------------------------------------

async function Na__Main() {
    try { await fetch(`http://127.0.0.1:${DEV_PORT}/help/`); }
    catch { console.error(`The Vale dev server is not answering on ${DEV_PORT}. Start ValeDev__LocalServer__.py first.`); process.exit(1); }
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const server = await Na__StartServer();
    const { edge, profile, ws } = await Na__StartEdge();
    const cdp = await Na__Cdp(ws);
    let made = 0;
    try {
        await cdp.send('Page.enable');
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1700, height: 1300, deviceScaleFactor: 2, mobile: false });
        const studio = `http://127.0.0.1:${STUDIO_PORT}/__studio/HelpSnippets__Studio__.html`;
        await cdp.send('Page.navigate', { url: studio });
        await Na__Sleep(800);
        const ids = (await Na__Eval(cdp, 'window.__snipList')).filter((s) => s.includes(FILTER));
        for (const app of APPS) {
            for (const snip of ids) {
                await cdp.send('Page.navigate', { url: `${studio}?snip=${snip}&app=${app}` });
                let ready = false;
                for (let i = 0; i < 160 && !ready; i++) { await Na__Sleep(250); ready = await Na__Eval(cdp, 'window.__snipReady === true'); }
                const box = await Na__Eval(cdp, `(() => { const r = document.getElementById('Snip').getBoundingClientRect();
                                                         return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height }; })()`);
                const shot = await cdp.send('Page.captureScreenshot', {
                    format: 'webp', quality: 90, captureBeyondViewport: true,
                    clip: { x: box.x - MARGIN, y: box.y - MARGIN, width: box.w + 2 * MARGIN, height: box.h + 2 * MARGIN, scale: 1 } });
                const file = path.join(OUT_DIR, `HelpSnippet__${app}__${snip}__.webp`);
                fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
                made += 1;
                console.log(`${ready ? 'ok     ' : 'TIMEOUT'} ${path.basename(file)}  ${Math.round(box.w)}x${Math.round(box.h)}`);
                if (process.env.VALE_SNIP_DEBUG) console.log('        ' + await Na__Eval(cdp, 'window.__snipDebug && window.__snipDebug()'));
            }
        }
    } finally {
        cdp.close();
        edge.kill();
        server.close();
        await Na__Sleep(500);
        fs.rmSync(profile, { recursive: true, force: true });
    }
    console.log(`${made} picture(s) in ${OUT_DIR}`);
}

Na__Main().catch((e) => { console.error(e); process.exit(1); });

// endregion -------------------------------------------------------------------
