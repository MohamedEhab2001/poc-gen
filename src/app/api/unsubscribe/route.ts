import { NextResponse } from "next/server";
import { parseContactKeys, verifyUnsubscribeToken } from "@/lib/automation/crypto";
import { addSuppression, addUnsubscribe } from "@/server/automation/store/contacts";
import { writeAudit } from "@/server/automation/support";
import { advisoryLock, contactLockKey, withDatabase, withTransaction } from "@/server/automation/db";
import { rateLimit } from "@/server/security/rate-limit";

/**
 * Unsubscribe endpoint backing the List-Unsubscribe headers on outreach
 * messages. Tokens are HMAC-signed contact hashes (stateless, keyed off the
 * contact encryption material) — the link reveals no address and cannot be
 * forged without the key.
 *
 * GET renders a minimal confirmation page with a one-click POST form
 * (RFC 8058); POST performs the suppression. Every outcome is generic and
 * rate-limited; nothing leaks whether an address is known.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tokenFromRequest(request: Request): string | null {
  const k = new URL(request.url).searchParams.get("k");
  return k && k.length <= 700 ? k : null;
}

async function tokenFromBody(request: Request): Promise<string | null> {
  const form = await request.formData().catch(() => null);
  const k = form?.get("k");
  return typeof k === "string" && k.length <= 700 ? k : null;
}

function page(body: string, status = 200): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;color:#1a1a1a}main{max-width:32rem;padding:2rem;text-align:center}button{font:inherit;padding:0.75rem 1.5rem}</style></head><body><main>${body}</main></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" } },
  );
}

export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!rateLimit(`unsubscribe:${ip}`, 20, 60_000).allowed) {
    return page("<p>Too many requests. Please try again later.</p>", 429);
  }

  const keys = parseContactKeys(process.env.CONTACT_DATA_ENCRYPTION_KEYS);
  if (keys.size === 0) return page("<p>Unsubscribe is not available.</p>", 503);

  const token = tokenFromRequest(request);
  const addressHash = token ? verifyUnsubscribeToken(token, keys) : null;
  if (!addressHash) {
    // Generic: never confirm whether the link was valid.
    return page("<p>This unsubscribe link is invalid or has expired.</p>");
  }

  const url = new URL(request.url);
  return page(
    `<h1>Unsubscribe</h1><p>Confirm that you no longer want to receive concept proposals.</p>
     <form method="post" action="${url.pathname}">
       <input type="hidden" name="k" value="${token}">
       <button type="submit">Unsubscribe</button>
     </form>`,
  );
}

export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (!rateLimit(`unsubscribe-post:${ip}`, 20, 60_000).allowed) {
    return page("<p>Too many requests. Please try again later.</p>", 429);
  }

  const keys = parseContactKeys(process.env.CONTACT_DATA_ENCRYPTION_KEYS);
  if (keys.size === 0) return page("<p>Unsubscribe is not available.</p>", 503);

  const token = (await tokenFromBody(request)) ?? tokenFromRequest(request);
  const addressHash = token ? verifyUnsubscribeToken(token, keys) : null;
  if (!addressHash) {
    return page("<p>This unsubscribe link is invalid or has expired.</p>");
  }

  try {
    await withTransaction(async (tx) => {
      // The shared contact lock linearizes this suppression against any
      // concurrent send reservation on the same contact.
      await advisoryLock(tx, contactLockKey(addressHash));
      await addUnsubscribe(tx, { addressHash, method: "one_click" });
      await addSuppression(tx, { addressHash, reason: "unsubscribe" });
    });
    await withDatabase((db) =>
      writeAudit(db, {
        actor: "unsubscribe-endpoint",
        action: "unsubscribe_one_click",
        targetType: "contact",
        targetId: addressHash.slice(0, 12),
        metadata: { method: "one_click" },
      }),
    );
  } catch {
    return page("<p>Unsubscribe is temporarily unavailable. Please try again.</p>", 503);
  }

  // RFC 8058 one-click clients expect 200; browsers see the confirmation.
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return new NextResponse(null, { status: 200 });
  }
  return page("<h1>Unsubscribed</h1><p>You will not receive further messages at this address.</p>");
}
