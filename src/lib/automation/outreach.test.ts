import { describe, expect, it } from "vitest";
import {
  buildBodyHtml,
  buildMessageId,
  escapeHtml,
  isDeceptiveSubject,
  misrepresentsPoc,
  validateOutreachDraft,
  type OutreachPolicyConfig,
} from "./outreach";

const config: OutreachPolicyConfig = {
  senderName: "Test Sender",
  fromEmail: "test@sender.example",
  replyTo: null,
  postalAddress: "1 Test Street, Portland, OR",
  advertisementDisclosure: true,
  publicBaseUrl: "https://poc.example",
};

const baseInput = {
  subject: "A website concept for your bistro",
  body: "Hi there — a private concept page: {{poc_link}}",
  pocLink: "https://poc.example/p/token",
  unsubscribeUrl: "https://poc.example/api/unsubscribe?k=abc",
};

describe("outreach safety validation", () => {
  it("rejects fake thread subjects", () => {
    for (const subject of ["Re: our conversation", "FWD: invoice", "re: quick question", "Fw: your order"]) {
      expect(isDeceptiveSubject(subject), subject).toBe(true);
    }
    expect(isDeceptiveSubject("A website concept for your bistro")).toBe(false);
  });

  it("rejects misleading transactional urgency subjects", () => {
    expect(isDeceptiveSubject("Action required on your account")).toBe(true);
    expect(isDeceptiveSubject("URGENT: final notice")).toBe(true);
    expect(isDeceptiveSubject("Your subscription will expire")).toBe(true);
  });

  it("rejects bodies misrepresenting the POC as the official site", () => {
    expect(misrepresentsPoc("We redesigned your website!")).toBe(true);
    expect(misrepresentsPoc("Your new site is now live")).toBe(true);
    expect(misrepresentsPoc("I prepared an unofficial concept page for you")).toBe(false);
  });

  it("requires exactly one poc_link placeholder", () => {
    expect(() =>
      validateOutreachDraft({ ...baseInput, body: "no link here", config }),
    ).toThrowError(/poc_link/);
    expect(() =>
      validateOutreachDraft({ ...baseInput, body: "{{poc_link}} and {{poc_link}}", config }),
    ).toThrowError(/exactly once/);
  });

  it("resolves the placeholder and appends the compliance footer", () => {
    const validated = validateOutreachDraft({ ...baseInput, config });
    expect(validated.bodyText).toContain("https://poc.example/p/token");
    expect(validated.bodyText).not.toContain("{{poc_link}}");
    expect(validated.bodyText).toContain("This is an advertisement.");
    expect(validated.bodyText).toContain("Test Sender");
    expect(validated.bodyText).toContain("1 Test Street, Portland, OR");
    expect(validated.bodyText).toContain("Unsubscribe: https://poc.example/api/unsubscribe?k=abc");
    expect(validated.footer).toEqual({
      senderName: "Test Sender",
      postalAddress: true,
      unsubscribeUrl: true,
      advertisementDisclosure: true,
    });
  });

  it("builds minimal accessible HTML with escaped content", () => {
    const html = buildBodyHtml("Hello <b>world</b> & friends\n\nSecond paragraph https://x.example/a");
    expect(html).toContain("&lt;b&gt;world&lt;/b&gt; &amp; friends");
    expect(html).toContain('<a href="https://x.example/a">');
    expect(html).toContain("<!DOCTYPE html>");
    expect(escapeHtml(`"><script>`)).not.toContain("<script>");
  });

  it("builds a stable Message-ID from the sending domain", () => {
    expect(buildMessageId("msg1", "out@sender.example")).toBe("<msg1@sender.example>");
  });
});
