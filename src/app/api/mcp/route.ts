import { NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateAutomationRequest, authFailureResponse } from "@/server/mcp/auth";
import { buildAutomationMcpServer, correlationId } from "@/server/mcp/server";
import { getAutomationConfig } from "@/server/automation/config";
import { rateLimit } from "@/server/security/rate-limit";

/**
 * Remote MCP endpoint (Streamable HTTP, stateless: sessionIdGenerator
 * undefined, one transport per request — the current recommended pattern for
 * serverless-style deployments per the official TypeScript SDK docs).
 *
 * Security boundary, in order:
 *   1. body size limit (256 KB) and per-principal rate limit;
 *   2. OAuth 2.1 bearer authentication (fail-closed dev static token is
 *      structurally impossible in production);
 *   3. scope enforcement per tool inside dispatchOperation;
 *   4. bounded, redacted, structured errors — never stack traces or driver
 *      errors. Credentials never appear in query strings.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

async function readBoundedJson(request: Request): Promise<unknown | null> {
  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) return null;
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function genericJson(status: number, body: Record<string, unknown>, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...headers,
    },
  });
}

export async function POST(request: Request) {
  const cid = correlationId(`${request.headers.get("x-request-id") ?? ""}:${Date.now()}:${Math.random()}`);

  const config = getAutomationConfig();
  if (config.isProduction && !config.productionComplete) {
    // Fail closed: incomplete OAuth setup must not expose tools.
    console.error("[mcp] Production MCP configuration incomplete; failing closed.");
    return genericJson(503, { error: "temporarily_unavailable" });
  }

  const body = await readBoundedJson(request);
  if (body === null) {
    return genericJson(413, { jsonrpc: "2.0", error: { code: -32700, message: "Request too large or malformed." } });
  }

  const auth = await authenticateAutomationRequest(request.headers.get("authorization"), config);
  if (!auth.ok) {
    const response = authFailureResponse(auth.failure);
    return genericJson(response.status, { jsonrpc: "2.0", error: { code: -32000, message: response.body.error as string } }, {
      ...(response.status === 401
        ? { "WWW-Authenticate": 'Bearer realm="poc-gen-mcp", error="invalid_token"' }
        : {}),
    });
  }

  const rate = rateLimit(`mcp:${auth.auth.principal}`, 60, 60_000);
  if (!rate.allowed) {
    return genericJson(429, { jsonrpc: "2.0", error: { code: -32000, message: "Rate limit exceeded." } }, {
      "Retry-After": String(Math.max(1, rate.retryAfterSeconds)),
    });
  }

  try {
    const server = buildAutomationMcpServer(auth.auth);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
      enableJsonResponse: true,
    });
    await server.connect(transport);

    // Dispatch through the transport's fetch-native handler. The forwarded
    // request carries no Authorization header — authentication already
    // happened above and tool handlers never see raw credentials.
    const upstream = new Request(new URL("/api/mcp", request.url), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: request.headers.get("accept") ?? "application/json, text/event-stream",
        "x-correlation-id": cid,
      },
      body: JSON.stringify(body),
    });
    const handled: Response = await transport.handleRequest(upstream);
    const payload = await handled.text();
    return new NextResponse(payload, {
      status: handled.status,
      headers: {
        "content-type": handled.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
        "x-correlation-id": cid,
      },
    });
  } catch (error) {
    console.error(`[mcp] Request handling failed (cid=${cid}):`, error instanceof Error ? error.name : "unknown");
    return genericJson(500, { jsonrpc: "2.0", error: { code: -32603, message: "Internal error." } });
  }
}

export async function GET() {
  // Stateless server: no SSE stream without a session id.
  return genericJson(405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." } }, {
    Allow: "POST, OPTIONS",
  });
}

export async function DELETE() {
  return genericJson(405, { jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." } }, {
    Allow: "POST, OPTIONS",
  });
}
