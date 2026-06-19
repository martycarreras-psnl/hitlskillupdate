#!/usr/bin/env node
// Encrypts docs/index.source.html into a passcode-gated docs/index.html.
// The published page contains ONLY AES-256-GCM ciphertext; the real content
// is decrypted in the browser via Web Crypto when the correct code is entered.
//
// Usage: node scripts/encrypt-page.mjs [PASSCODE]
//   PASSCODE defaults to the ACCESS_CODE constant below.

import { readFileSync, writeFileSync } from "node:fs";
import { pbkdf2Sync, randomBytes, createCipheriv } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "docs", "index.source.html");
const OUT = join(ROOT, "docs", "index.html");

const ACCESS_CODE = process.argv[2] || "NEM0619";
const ITERATIONS = 250000;

const plaintext = readFileSync(SRC);

const salt = randomBytes(16);
const iv = randomBytes(12);
const key = pbkdf2Sync(ACCESS_CODE, salt, ITERATIONS, 32, "sha256");

const cipher = createCipheriv("aes-256-gcm", key, iv);
const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
const tag = cipher.getAuthTag();
// Web Crypto expects ciphertext || authTag
const payload = Buffer.concat([enc, tag]).toString("base64");

const b64 = (b) => b.toString("base64");

const gate = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow" />
    <title>Protected · HITL Skill Improvement</title>
    <script>
      (() => {
        const stored = localStorage.getItem("hitl-theme");
        const theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", theme);
      })();
    </script>
    <style>
      :root {
        color-scheme: light;
        --cp-bg: #f7f4ef; --cp-surface: #ffffff; --cp-surface-soft: #f5f5f5;
        --cp-border: #dedede; --cp-text: #242424; --cp-text-muted: #5c5c5c;
        --cp-accent: #b11f4b; --cp-accent-hover: #9a1a41; --cp-accent-soft: rgba(177,31,75,0.08);
        --cp-accent-fg: #ffffff; --cp-danger: #dc2626;
        --cp-shadow: 0 18px 48px rgba(0,0,0,0.12);
      }
      html[data-theme="dark"] {
        color-scheme: dark;
        --cp-bg: #3d3b3a; --cp-surface: #292929; --cp-surface-soft: #2e2e2e;
        --cp-border: #474747; --cp-text: #dedede; --cp-text-muted: #919191;
        --cp-accent: #fd8ea1; --cp-accent-hover: #fb7b91; --cp-accent-soft: rgba(253,142,161,0.14);
        --cp-accent-fg: #1a1a1a; --cp-danger: #f87171;
        --cp-shadow: 0 18px 48px rgba(0,0,0,0.32);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0; min-height: 100vh; display: grid; place-items: center;
        background: var(--cp-bg); color: var(--cp-text);
        font-family: "Segoe UI", Aptos, Calibri, -apple-system, BlinkMacSystemFont, sans-serif;
      }
      .card {
        width: min(92vw, 400px);
        background: var(--cp-surface);
        border: 1px solid var(--cp-border);
        border-radius: 16px;
        padding: 36px 32px 32px;
        box-shadow: var(--cp-shadow);
        text-align: center;
      }
      .lock {
        width: 52px; height: 52px; margin: 0 auto 18px;
        display: grid; place-items: center;
        background: var(--cp-accent-soft); color: var(--cp-accent);
        border-radius: 14px; font-size: 1.5rem;
      }
      h1 { font-size: 1.3rem; margin: 0 0 6px; letter-spacing: -0.01em; }
      p.sub { margin: 0 0 22px; color: var(--cp-text-muted); font-size: 0.94rem; }
      form { display: flex; flex-direction: column; gap: 12px; }
      input {
        width: 100%; padding: 12px 14px; font-size: 1rem;
        text-align: center; letter-spacing: 0.18em; text-transform: uppercase;
        border: 1px solid var(--cp-border); border-radius: 0.625rem;
        background: var(--cp-surface-soft); color: var(--cp-text);
        font-family: Consolas, "Courier New", monospace;
      }
      input:focus { outline: none; border-color: var(--cp-accent); }
      button {
        padding: 12px 14px; font-size: 0.96rem; font-weight: 650;
        border: none; border-radius: 0.625rem; cursor: pointer;
        background: var(--cp-accent); color: var(--cp-accent-fg);
      }
      button:hover { background: var(--cp-accent-hover); }
      button:disabled { opacity: 0.6; cursor: default; }
      .err {
        min-height: 18px; font-size: 0.85rem; color: var(--cp-danger);
        margin-top: 2px;
      }
      .hint { margin-top: 18px; font-size: 0.78rem; color: var(--cp-text-muted); }
    </style>
  </head>
  <body>
    <main class="card">
      <div class="lock" aria-hidden="true">🔒</div>
      <h1>Access required</h1>
      <p class="sub">This walkthrough is protected. Enter your access code to continue.</p>
      <form id="gate">
        <input id="code" name="code" type="password" inputmode="text"
               autocomplete="off" autocapitalize="characters" spellcheck="false"
               placeholder="ACCESS CODE" aria-label="Access code" required />
        <button id="submit" type="submit">Unlock</button>
        <div class="err" id="err" role="alert"></div>
      </form>
      <div class="hint">HITL Skill Improvement · Human-in-the-Loop document review</div>
    </main>

    <script>
      const CFG = {
        salt: "${b64(salt)}",
        iv: "${b64(iv)}",
        data: "${payload}",
        iterations: ${ITERATIONS},
      };

      const b64ToBytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

      async function deriveKey(code, salt, iterations) {
        const enc = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
          "raw", enc.encode(code), { name: "PBKDF2" }, false, ["deriveKey"]
        );
        return crypto.subtle.deriveKey(
          { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
          baseKey,
          { name: "AES-GCM", length: 256 },
          false,
          ["decrypt"]
        );
      }

      async function unlock(code) {
        const salt = b64ToBytes(CFG.salt);
        const iv = b64ToBytes(CFG.iv);
        const data = b64ToBytes(CFG.data);
        const key = await deriveKey(code, salt, CFG.iterations);
        const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
        return new TextDecoder().decode(plainBuf);
      }

      const form = document.getElementById("gate");
      const input = document.getElementById("code");
      const err = document.getElementById("err");
      const submit = document.getElementById("submit");

      // Auto-unlock if a valid code was used this session.
      const remembered = sessionStorage.getItem("hitl-access");
      if (remembered) {
        unlock(remembered).then(render).catch(() => sessionStorage.removeItem("hitl-access"));
      }

      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        err.textContent = "";
        submit.disabled = true;
        submit.textContent = "Unlocking…";
        try {
          const html = await unlock(input.value.trim());
          sessionStorage.setItem("hitl-access", input.value.trim());
          render(html);
        } catch {
          err.textContent = "Incorrect access code. Please try again.";
          submit.disabled = false;
          submit.textContent = "Unlock";
          input.select();
        }
      });

      function render(html) {
        document.open();
        document.write(html);
        document.close();
      }
    </script>
  </body>
</html>
`;

writeFileSync(OUT, gate);
console.log(
  `Encrypted ${plaintext.length} bytes → ${OUT}\n` +
    `  passcode: ${ACCESS_CODE}\n  pbkdf2 iters: ${ITERATIONS}\n  payload: ${payload.length} b64 chars`
);
