import { NextResponse } from "next/server";
import { getAutomationConfig } from "@/server/automation/config";
import { getMcpProtectedResourceMetadata } from "@/server/mcp/resource-metadata";

/** Path-aware RFC 9728 alias for clients that derive metadata from /api/mcp. */
export const runtime = "nodejs";

export async function GET(request: Request) {
  return NextResponse.json(
    getMcpProtectedResourceMetadata(getAutomationConfig(), request.url),
    { headers: { "Cache-Control": "no-store" } },
  );
}
