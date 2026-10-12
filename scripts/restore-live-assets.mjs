import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";

const origin = (process.env.RANKING_EXPORT_URL || "https://contextai.namaja592.workers.dev").replace(/\/$/, "");
const token = process.env.RANKING_EXPORT_TOKEN;
if (!token) throw new Error("RANKING_EXPORT_TOKEN build secret is required");

const source = await readFile("worker/index.js", "utf8");
const manifest = source.match(/var manifest_default = \{ version: ("(?:\\\\.|[^"])*"), anchor: ("(?:\\\\.|[^"])*"), count: (\\d+), vocabulary: (\\[[\\s\\S]*?\\]), model:/);
if (!manifest) throw new Error("Could not read the ranking manifest from worker/index.js");
const answerCount = Number(manifest[3]);
const guessCount = JSON.parse(manifest[4]).length;
const outputRoot = resolve("frontend/dist");
const seen = new Set();

async function requestAsset(path) {
  const response = await fetch(`${origin}/_internal/export${path}`, {
    headers: { authorization: `Bearer ${token}` },
    redirect: "error",
  });
  if (!response.ok) throw new Error(`Asset export failed for ${path}: HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

async function writeAsset(path, bytes) {
  const file = resolve(outputRoot, `.${path}`);
  if (file !== outputRoot && !file.startsWith(outputRoot + sep)) throw new Error("Unsafe asset path");
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, bytes);
}

function localPath(reference, basePath = "/") {
  if (!reference || /^(?:data:|https?:|\/\/|#)/i.test(reference)) return null;
  const url = new URL(reference, `https://contextai.namaja592.workers.dev${basePath}`);
  return url.origin === "https://contextai.namaja592.workers.dev" ? url.pathname : null;
}

const htmlBytes = await requestAsset("/");
const html = new TextDecoder().decode(htmlBytes);
await writeAsset("/index.html", htmlBytes);
const queue = new Set();
for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
  const path = localPath(match[1]);
  if (path && path !== "/") queue.add(path);
}

while (queue.size) {
  const batch = [...queue].filter((path) => !seen.has(path)).slice(0, 12);
  if (!batch.length) break;
  await Promise.all(batch.map(async (path) => {
    seen.add(path);
    try {
      const bytes = await requestAsset(path);
      await writeAsset(path, bytes);
      if (/\.(?:css|js|mjs)$/i.test(path)) {
        const text = new TextDecoder().decode(bytes);
        for (const match of text.matchAll(/(?:url\(\s*|(?:import|from)\s*["'])([^)"'\s]+)["']?\)?/g)) {
          const referenced = localPath(match[1], path);
          if (referenced && !seen.has(referenced)) queue.add(referenced);
        }
      }
    } catch (error) {
      if (!String(error).includes("HTTP 404")) throw error;
    }
  }));
  for (const path of [...queue]) if (seen.has(path)) queue.delete(path);
}

let rankingBytes = 0;
for (let start = 0; start < answerCount; start += 12) {
  const batch = Array.from({ length: Math.min(12, answerCount - start) }, (_, offset) => start + offset);
  await Promise.all(batch.map(async (index) => {
    const path = `/_rankings/${String(index).padStart(4, "0")}.bin`;
    const bytes = await requestAsset(path);
    if (bytes.byteLength !== guessCount * 2) {
      throw new Error(`Unexpected size for ${path}: expected ${guessCount * 2}, received ${bytes.byteLength}`);
    }
    await writeAsset(path, bytes);
    rankingBytes += bytes.byteLength;
  }));
}

console.log(`Restored ${answerCount} ranking tables (${rankingBytes} bytes) and ${seen.size + 1} live UI assets.`);
