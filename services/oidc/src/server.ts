import { createServer } from "node:http";

import { getOidcRuntimeConfig } from "./config";
import { handleOidcRequest } from "./app";

async function toWebRequest(request: import("node:http").IncomingMessage): Promise<Request> {
  const config = getOidcRuntimeConfig();
  const url = new URL(request.url ?? "/", config.publicOrigin);
  const headers = new Headers();

  for (const [key, value] of Object.entries(request.headers)) {
    if (typeof value === "undefined") {
      continue;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => headers.append(key, entry));
      continue;
    }

    headers.set(key, value);
  }

  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
  return new Request(url, {
    method: request.method,
    headers,
    body,
  });
}

async function startServer() {
  const config = getOidcRuntimeConfig();
  const server = createServer(async (req, res) => {
    try {
      const request = await toWebRequest(req);
      const response = await handleOidcRequest(request);

      res.statusCode = response.status;
      response.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      const body = Buffer.from(await response.arrayBuffer());
      res.end(body);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({
        error: "server_error",
        error_description: error instanceof Error ? error.message : "Unhandled OIDC server error.",
      }));
    }
  });

  server.listen(config.port, "0.0.0.0", () => {
    console.log(`[oidc] listening on ${config.publicOrigin}`);
  });
}

void startServer();
