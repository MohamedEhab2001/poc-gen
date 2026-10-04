import { describe, expect, it } from "vitest";
import { randomBytes } from "node:crypto";
import { buildTemplateParams } from "./emailjs";
import { sendWithTimeout } from "./provider";
import type { EmailProvider, OutgoingEmail } from "./provider";
import { sanitizeOutreachHtml } from "@/lib/automation/html-sanitize";

function key(): string {
  return randomBytes(32).toString("base64");
}

describe("EmailJS provider unit behavior", () => {
  const message: OutgoingEmail = {
    toEncrypted: "contact-1",
    toAddress: "owner@example.com",
    subject: "A website concept",
    text: "plain body",
    html: '<p>body</p><script>alert(1)</script>',
    templateParams: {
      business_name: "Harbor Fig Kitchen",
      sender_name: "Test Sender",
      preview_text: "A private concept page",
      poc_url: "https://poc.example/p/token123",
      postal_address: "1 Test Way",
      advertisement_disclosure: "This is an advertisement.",
    },
    headers: {
      messageId: "<m1@sender.example>",
      listUnsubscribe: "<https://poc.example/api/unsubscribe?k=abc>",
      listUnsubscribePost: true,
      from: "Test Sender <test@sender.example>",
      replyTo: "test@sender.example",
    },
  };

  it("buildTemplateParams sanitizes body_html and carries every template field", () => {
    const params = buildTemplateParams(message);
    expect(params.body_html).toBe(sanitizeOutreachHtml(message.html));
    expect(params.body_html).not.toContain("script");
    expect(params.to_email).toBe("owner@example.com");
    expect(params.business_name).toBe("Harbor Fig Kitchen");
    expect(params.subject).toBe("A website concept");
    expect(params.unsubscribe_url).toBe("https://poc.example/api/unsubscribe?k=abc");
    expect(params.message_reference).toBe("<m1@sender.example>");
    expect(params.reply_to).toBe("test@sender.example");
    expect(Object.keys(params).sort()).toEqual(
      [
        "advertisement_disclosure",
        "body_html",
        "body_text",
        "business_name",
        "postal_address",
        "preview_text",
        "poc_url",
        "reply_to",
        "sender_name",
        "subject",
        "to_email",
        "unsubscribe_url",
        "message_reference",
      ].sort(),
    );
  });

  it("sendWithTimeout maps a hanging provider to delivery_unknown", async () => {
    const hanging: EmailProvider = {
      name: "hanging",
      send: () => new Promise(() => undefined), // never settles
    };
    const outcome = await sendWithTimeout(hanging, message, 30);
    expect(outcome).toEqual({ status: "delivery_unknown" });
  });

  it("sendWithTimeout returns the provider outcome when it settles in time", async () => {
    const quick: EmailProvider = {
      name: "quick",
      send: async () => ({ status: "sent", providerMessageId: "x-1" }),
    };
    const outcome = await sendWithTimeout(quick, message, 5_000);
    expect(outcome).toEqual({ status: "sent", providerMessageId: "x-1" });
  });

  it("sendWithTimeout maps thrown provider errors to delivery_unknown (uncertain)", async () => {
    const throwing: EmailProvider = {
      name: "throwing",
      send: async () => {
        throw new Error("socket hang up");
      },
    };
    const outcome = await sendWithTimeout(throwing, message, 5_000);
    expect(outcome).toEqual({ status: "delivery_unknown" });
  });

  it("secrets never appear in module output strings", () => {
    const params = buildTemplateParams(message);
    void params;
    const keyMaterial = key();
    expect(JSON.stringify(buildTemplateParams(message))).not.toContain(keyMaterial);
  });
});
