import http from "http";
import fs from "fs";
import path from "path";

// Load env variables from .env file if it exists
try {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const index = trimmed.indexOf("=");
        if (index > 0) {
          const key = trimmed.slice(0, index).trim();
          let value = trimmed.slice(index + 1).trim();
          // Remove surrounding quotes if they exist
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }
          if (key && process.env[key] === undefined) {
            process.env[key] = value;
          }
        }
      }
    }
  }
} catch (e) {
  console.warn("Could not load .env file:", e);
}

// Dynamically import the built TanStack server after loading env variables.
// The generated output exports the server as the default export.
const serverModule = await import("./.output/server/server.js");
const handler = serverModule.handler ?? serverModule.default ?? serverModule;

const host = process.env.HOST || "0.0.0.0";
const port = process.env.PORT || 5173;
const clientDir = path.join(process.cwd(), ".output/client");

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Serve static files from dist/client
  const filePath = path.join(clientDir, url.pathname);

  // Check if file exists and is within client directory
  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname === "/index.html" ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".gif") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".woff") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname.endsWith(".ttf")
  ) {
    try {
      const file = await fs.promises.readFile(filePath);
      const ext = path.extname(filePath);
      const contentType =
        {
          ".html": "text/html",
          ".css": "text/css",
          ".js": "application/javascript",
          ".json": "application/json",
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".gif": "image/gif",
          ".ico": "image/x-icon",
          ".svg": "image/svg+xml",
          ".woff": "font/woff",
          ".woff2": "font/woff2",
          ".ttf": "font/ttf",
        }[ext] || "application/octet-stream";

      res.writeHead(200, { "Content-Type": contentType });
      res.end(file);
      return;
    } catch (err) {
      // File not found, continue to SSR handler
    }
  }

  // SPA fallback: serve index.html for non-API routes
  if (!url.pathname.startsWith("/api") && req.method === "GET") {
    try {
      const indexPath = path.join(clientDir, "index.html");
      const indexFile = await fs.promises.readFile(indexPath);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(indexFile);
      return;
    } catch (err) {
      // Index file not found, continue to SSR handler
    }
  }

  // SSR handler for API routes and other requests
  const request = new Request(url, {
    method: req.method,
    headers: req.headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : req,
    duplex: "half",
  });

  try {
    const response = await handler.fetch(request, {}, {});

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));

    if (response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    }

    res.end();
  } catch (error) {
    console.error("Server error:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
});

server.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});
