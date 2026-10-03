import { NextResponse } from "next/server";
import { authenticateAutomationRequest } from "@/server/mcp/auth";
import { dispatchOperation } from "@/server/automation/registry";
import { getAutomationConfig } from "@/server/automation/config";
import { rateLimit } from "@/server/security/rate-limit";

/**
 * Internal HTTP adapter for CI, deployment integration, and smoke testing:
 * /api/internal/automation/[operation]. It shares the exact service layer,
 * schemas, scopes, idempotency, and audit pipeline as MCP — this file adds
 * no business logic.
 *
 * Authorization is a bearer service principal (the same OAuth/dev-token
 * verification as MCP). Operator cookies are deliberately NOT accepted:
 * cookie-authorized machine automation would make CSRF the primary control.
 * An admin email in the request body is never proof of identity.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 512 * 1024;

export async function POST(
  request: Request,
  context: { params: Promise<{ operation: string }> },
) {
  const { operation } = await context.params;

  const config = getAutomationConfig();
  if (config.isProduction && !config.productionComplete) {
    console.error("[automation-http] Production configuration incomplete; failing closed.");
    return NextResponse.json({ error: "temporarily_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "request_too_large" }, { status: 413 });
  }
  let input: unknown;
  try {
    input = text.length === 0 ? {} : JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const auth = await authenticateAutomationRequest(request.headers.get("authorization"), config);
  if (!auth.ok) {
    if (auth.failure.kind === "insufficient_scopes") {
      return NextResponse.json({ error: "insufficient_scope" }, { status: 403 });
    }
    return NextResponse.json(
      { error: "unauthorized" },
      { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="poc-gen-automation"' } },
    );
  }

  const rate = rateLimit(`automation-http:${auth.auth.principal}`, 120, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(Math.max(1, rate.retryAfterSeconds)) } },
    );
  }

  const origin = new URL(request.url).origin;
  const result = await dispatchOperation(operation, input, {
    principal: auth.auth.principal,
    scopes: auth.auth.scopes,
    baseUrl: config.mcpPublicBaseUrl ?? origin,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ...result.failure },
      {
        status:
          result.failure.outcome === "RETRYABLE" ? 503 : result.failure.outcome === "FAILED" ? 500 : 400,
        headers: {
          "Cache-Control": "no-store",
          ...(result.failure.retryAfterSeconds
            ? { "Retry-After": String(result.failure.retryAfterSeconds) }
            : {}),
        },
      },
    );
  }
  return NextResponse.json(result.result, { headers: { "Cache-Control": "no-store" } });
}
