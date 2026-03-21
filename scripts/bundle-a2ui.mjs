#!/usr/bin/env node
/**
 * Cross-platform A2UI bundle step (see scripts/bundle-a2ui.sh).
 * Keeps hashing + build commands aligned with the shell script.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const HASH_FILE = path.join(ROOT_DIR, "src", "canvas-host", "a2ui", ".bundle.hash");
const OUTPUT_FILE = path.join(ROOT_DIR, "src", "canvas-host", "a2ui", "a2ui.bundle.js");
const A2UI_RENDERER_DIR = path.join(ROOT_DIR, "vendor", "a2ui", "renderers", "lit");
const A2UI_APP_DIR = path.join(ROOT_DIR, "apps", "shared", "OpenClawKit", "Tools", "CanvasA2UI");

function normalize(p) {
  return p.split(path.sep).join("/");
}

async function walk(entryPath, files) {
  const st = await fs.stat(entryPath);
  if (st.isDirectory()) {
    const entries = await fs.readdir(entryPath);
    for (const entry of entries) {
      await walk(path.join(entryPath, entry), files);
    }
    return;
  }
  files.push(entryPath);
}

async function computeHash(inputPaths) {
  const files = [];
  for (const input of inputPaths) {
    await walk(input, files);
  }
  files.sort((a, b) => normalize(a).localeCompare(normalize(b)));
  const hash = createHash("sha256");
  for (const filePath of files) {
    const rel = normalize(path.relative(ROOT_DIR, filePath));
    hash.update(rel);
    hash.update("\0");
    hash.update(await fs.readFile(filePath));
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function isDirectory(p) {
  try {
    const st = await fs.stat(p);
    return st.isDirectory();
  } catch {
    return false;
  }
}

function findRolldownClis() {
  const out = [];
  const p1 = path.join(ROOT_DIR, "node_modules", ".pnpm", "node_modules", "rolldown", "bin", "cli.mjs");
  if (existsSync(p1)) {
    out.push(p1);
  }
  const pnpmDir = path.join(ROOT_DIR, "node_modules", ".pnpm");
  try {
    for (const entry of readdirSync(pnpmDir)) {
      if (entry.startsWith("rolldown@")) {
        const p = path.join(pnpmDir, entry, "node_modules", "rolldown", "bin", "cli.mjs");
        if (existsSync(p)) {
          out.push(p);
        }
      }
    }
  } catch {
    /* ignore */
  }
  return out;
}

function runWithStatus(cmd, args, opts = {}) {
  const shell = process.platform === "win32";
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell,
    cwd: ROOT_DIR,
    ...opts,
  });
  return result.status ?? 1;
}

function runRolldown(configPath) {
  if (runWithStatus("rolldown", ["-c", configPath]) === 0) {
    return;
  }
  for (const cli of findRolldownClis()) {
    if (runWithStatus(process.execPath, [cli, "-c", configPath]) === 0) {
      return;
    }
  }
  if (runWithStatus("pnpm", ["-s", "dlx", "rolldown", "-c", configPath]) === 0) {
    return;
  }
  console.error("A2UI bundling failed. Re-run with: pnpm canvas:a2ui:bundle");
  console.error("If this persists, verify pnpm deps and try again.");
  process.exit(1);
}

async function main() {
  const rendererOk = await isDirectory(A2UI_RENDERER_DIR);
  const appOk = await isDirectory(A2UI_APP_DIR);
  if (!rendererOk || !appOk) {
    if (await pathExists(OUTPUT_FILE)) {
      console.log("A2UI sources missing; keeping prebuilt bundle.");
      return;
    }
    console.error(`A2UI sources missing and no prebuilt bundle found at: ${OUTPUT_FILE}`);
    process.exit(1);
  }

  const inputPaths = [
    path.join(ROOT_DIR, "package.json"),
    path.join(ROOT_DIR, "pnpm-lock.yaml"),
    A2UI_RENDERER_DIR,
    A2UI_APP_DIR,
  ];

  const currentHash = await computeHash(inputPaths);
  let previousHash = "";
  try {
    previousHash = (await fs.readFile(HASH_FILE, "utf8")).trim();
  } catch {
    /* no previous hash */
  }
  if (previousHash === currentHash && (await pathExists(OUTPUT_FILE))) {
    console.log("A2UI bundle up to date; skipping.");
    return;
  }

  const tscStatus = runWithStatus("pnpm", [
    "-s",
    "exec",
    "tsc",
    "-p",
    path.join(A2UI_RENDERER_DIR, "tsconfig.json"),
  ]);
  if (tscStatus !== 0) {
    console.error("A2UI bundling failed. Re-run with: pnpm canvas:a2ui:bundle");
    console.error("If this persists, verify pnpm deps and try again.");
    process.exit(tscStatus);
  }

  runRolldown(path.join(A2UI_APP_DIR, "rolldown.config.mjs"));

  await fs.writeFile(HASH_FILE, `${currentHash}\n`, "utf8");
}

main().catch((err) => {
  console.error(err);
  console.error("A2UI bundling failed. Re-run with: pnpm canvas:a2ui:bundle");
  process.exit(1);
});
