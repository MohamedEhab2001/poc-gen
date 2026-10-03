import { describe, expect, it } from "vitest";
import { redactForLog, redactString, redactedMetadata, stripSecret } from "./redaction";

describe("log redaction", () => {
  it("masks email addresses in free text", () => {
    expect(redactString("contact owner@example.com now")).toBe("contact [email] now");
  });

  it("masks standalone high-entropy token-like runs", () => {
    expect(redactString("token ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef12 here")).toBe(
      "token [redacted] here",
    );
  });

  it("leaves ordinary prose intact", () => {
    expect(redactString("The bistro opens at noon on weekdays")).toBe(
      "The bistro opens at noon on weekdays",
    );
  });

  it("truncates very long strings", () => {
    const prose = Array.from({ length: 60 }, (_, i) => `sentence number ${i} here`).join(" ");
    const out = redactString(prose);
    expect(out.length).toBeLessThanOrEqual(300);
    expect(out).toContain("…[truncated]");
  });

  it("redacts sensitive keys at any depth", () => {
    const out = redactForLog({
      token: "secret-value",
      nested: { authorization: "Bearer x", safe: "ok", email: "a@b.co" },
      bodyText: "message",
      count: 3,
    }) as Record<string, unknown>;
    expect(out.token).toBe("[redacted]");
    const nested = out.nested as Record<string, unknown>;
    expect(nested.authorization).toBe("[redacted]");
    expect(nested.email).toBe("[redacted]");
    expect(nested.safe).toBe("ok");
    expect(out.count).toBe(3);
  });

  it("bounds arrays and depth", () => {
    const out = redactForLog({ items: new Array(50).fill("x") }) as Record<string, unknown>;
    const items = out.items as unknown[];
    expect(items.length).toBe(26);
    expect(items[25]).toBe("[25 more]");
    const deep = { a: { b: { c: { d: { e: { f: { g: "x" } } } } } } };
    expect(JSON.stringify(redactForLog(deep))).toContain("[depth-limit]");
  });

  it("produces metadata objects safe for audit columns", () => {
    const meta = redactedMetadata({ subject: "hello", token: "t", n: 1 });
    expect(meta).toEqual({ subject: "[redacted]", token: "[redacted]", n: 1 });
    expect(redactedMetadata("plain")).toEqual({ value: "plain" });
  });

  it("strips a known secret (smoke output pattern)", () => {
    expect(stripSecret("url /p/ABC123 end", "ABC123")).toBe("url /p/[redacted] end");
  });
});
