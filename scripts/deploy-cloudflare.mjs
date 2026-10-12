import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { delimiter, dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workerUrl = process.env.CONTEXTAI_URL || "https://contextai.namaja592.workers.dev";
const manifest = JSON.parse(readFileSync(resolve(root, "worker/manifest.json"), "utf8"));
const windows = process.platform === "win32";
if (
  manifest.version !== "glove50-v1" ||
  manifest.count !== 1844 ||
  !manifest.vocabulary.includes("about")
) {
  throw new Error("The Worker manifest does not match the deployed R2 ranking set");
}

function run(command, args, { capture = false } = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH || ""}`,
    },
    shell: windows,
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
    if (output) process.stderr.write(`${output}\n`);
    throw new Error(`${command} exited with status ${result.status}`);
  }
  return result;
}

function wrangler(args, options) {
  return run(windows ? "npx.cmd" : "npx", ["--yes", "wrangler@4", ...args], options);
}

async function checkLiveGame() {
  const healthResponse = await fetch(`${workerUrl}/api/health`);
  const health = await healthResponse.json();
  if (!healthResponse.ok || health.status !== "ok") {
    throw new Error("The deployed Worker health check failed");
  }

  const todayResponse = await fetch(`${workerUrl}/api/today`);
  const today = await todayResponse.json();
  const expectedDate = new Date().toISOString().slice(0, 10);
  if (!todayResponse.ok || today.date !== expectedDate) {
    throw new Error("The deployed Worker could not load today's R2 ranking");
  }

  const guessResponse = await fetch(`${workerUrl}/api/check/about`);
  const guess = await guessResponse.json();
  if (
    !guessResponse.ok ||
    guess.date !== expectedDate ||
    guess.word !== "about" ||
    !Number.isInteger(guess.rank) ||
    guess.rank < 1
  ) {
    throw new Error("The deployed Worker could not rank a known vocabulary word");
  }
}

const buildCommand = windows ? "npm.cmd" : "npm";
run(buildCommand, ["run", "build", "--prefix", "frontend"]);

const previousDeployment = JSON.parse(
  wrangler(["deployments", "status", "--name", "contextai", "--json"], { capture: true }).stdout,
);
const previousVersionId = previousDeployment.versions?.find((version) => version.percentage === 100)?.version_id;
if (!previousVersionId || !/^[0-9a-f-]{36}$/i.test(previousVersionId)) {
  throw new Error("Could not identify the active Worker version for automatic rollback");
}

wrangler(["deploy", "--config", "wrangler.jsonc"]);

try {
  await checkLiveGame();
  process.stdout.write("Cloudflare deployment verified: health, today's puzzle, and a ranked guess all work.\n");
} catch (error) {
  process.stderr.write(`${error.message}; rolling back the Worker and its assets.\n`);
  wrangler([
    "rollback",
    previousVersionId,
    "--name",
    "contextai",
    "--message",
    "Rollback after ContextAI live game verification failed",
  ]);
  throw error;
}
