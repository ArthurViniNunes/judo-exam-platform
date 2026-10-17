import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, isAbsolute, join, normalize, relative, resolve } from "node:path";

const root = resolve(process.argv[2] || "out");
const port = Number(process.argv[3] || process.env.PORT || 3000);

if (!existsSync(root)) {
  console.error(`Diretório ${root} não encontrado. Execute \"pnpm build\" primeiro.`);
  process.exit(1);
}

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
};

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url || "/", "http://local").pathname);
  const relativePath = normalize(pathname).replace(/^([/\\])+/, "");
  let filePath = join(root, relativePath || "index.html");

  const relativeTarget = relative(root, filePath);
  if (relativeTarget.startsWith("..") || isAbsolute(relativeTarget)) {
    response.writeHead(403).end("Forbidden");
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
  if (!existsSync(filePath)) filePath = join(root, "404.html");
  if (!existsSync(filePath)) {
    response.writeHead(404).end("Not found");
    return;
  }

  response.writeHead(filePath.endsWith("404.html") ? 404 : 200, {
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
    "Cache-Control": extname(filePath) === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });
  createReadStream(filePath).pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Frontend disponível em http://127.0.0.1:${port}`);
});
