import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const isWindows = process.platform === "win32";
const exposeToLan = process.argv.includes("--lan");
const host = exposeToLan ? "0.0.0.0" : "127.0.0.1";
const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const nextCli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const wranglerCli = fileURLToPath(new URL("../node_modules/wrangler/bin/wrangler.js", import.meta.url));

function run(cli, args) {
  return spawn(process.execPath, [cli, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
    windowsHide: true,
  });
}

const backendArgs = [
  "dev",
  "--config",
  "backend/wrangler.jsonc",
  "--local",
  "--persist-to",
  ".wrangler/state",
  "--ip",
  host,
  "--port",
  "8787",
];
const frontendArgs = ["dev", "--webpack", "--hostname", host, "--port", "3000"];

const children = [
  run(wranglerCli, backendArgs),
  run(nextCli, frontendArgs),
];

function stop(signal) {
  for (const child of children) {
    if (!child.pid) continue;
    if (isWindows) {
      spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: "ignore",
        windowsHide: true,
      });
    } else {
      child.kill(signal);
    }
  }
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

const result = await Promise.race(
  children.map((child) => new Promise((resolve) => child.once("exit", (code) => resolve(code ?? 1)))),
);
stop("SIGTERM");
process.exit(result);
