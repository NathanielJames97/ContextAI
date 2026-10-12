import { readFile } from "node:fs/promises";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !apiToken) {
  throw new Error("Workers Builds must provide Cloudflare account and API token credentials.");
}

const workerSource = await readFile(new URL("../worker/index.js", import.meta.url), "utf8");
const metadata = {
  main_module: "worker.js",
  compatibility_date: "2026-10-12",
  compatibility_flags: ["nodejs_compat"],
  keep_assets: true,
  keep_bindings: ["assets", "r2_bucket"],
};
const boundary = `----contextai-${crypto.randomUUID()}`;
const body = [
  `--${boundary}`,
  'Content-Disposition: form-data; name="metadata"',
  "Content-Type: application/json",
  "",
  JSON.stringify(metadata),
  `--${boundary}`,
  'Content-Disposition: form-data; name="worker.js"; filename="worker.js"',
  "Content-Type: application/javascript+module",
  "",
  workerSource,
  `--${boundary}--`,
  "",
].join("\r\n");

const response = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/contextai`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  },
);
const result = await response.json();

if (!response.ok || !result.success) {
  throw new Error(`Cloudflare deployment failed (HTTP ${response.status}): ${JSON.stringify(result.errors)}`);
}

console.log(`Deployed Worker contextai, etag ${result.result.etag}`);
