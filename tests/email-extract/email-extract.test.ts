import { describe, expect, it } from "vitest";
import {
  extractEmails,
  extractUniqueEmails,
  normalizeEmail,
  validateExtractedEmail,
} from "../../src/email-extract/index.js";
import { ValidationError } from "../../src/shared/errors.js";

describe("email-extract utility", () => {
  it("extracts multiple emails with source positions and domains", () => {
    const text = "Contact Alice at alice@example.com and Bob at bob@test.org for info.";
    const emails = extractEmails(text);

    expect(emails).toHaveLength(2);
    expect(emails[0]!.email).toBe("alice@example.com");
    expect(emails[0]!.start).toBe(17);
    expect(emails[0]!.end).toBe(34);
    expect(emails[0]!.domain).toBe("example.com");
    expect(emails[0]!.localPart).toBe("alice");

    expect(emails[1]!.email).toBe("bob@test.org");
    expect(emails[1]!.domain).toBe("test.org");
  });

  it("cleans trailing punctuation attached in prose sentences", () => {
    const text = "Send feedback to support@company.com. Or hello@company.com! Is it info@company.com?";
    const emails = extractEmails(text);

    expect(emails.map((e) => e.email)).toEqual([
      "support@company.com",
      "hello@company.com",
      "info@company.com",
    ]);
  });

  it("deduplicates unique emails and normalizes case", () => {
    const text = "User test@EXAMPLE.com and TEST@example.com and user2@example.com";
    const unique = extractUniqueEmails(text);

    expect(unique).toHaveLength(2);
    expect(unique[0]!.email).toBe("test@example.com");
    expect(unique[1]!.email).toBe("user2@example.com");
  });

  it("filters by allowed and blocked domains", () => {
    const text = "a@gmail.com, b@company.com, c@spam.biz";

    const allowed = extractEmails(text, { allowedDomains: ["company.com"] });
    expect(allowed.map((e) => e.email)).toEqual(["b@company.com"]);

    const unblocked = extractEmails(text, { blockedDomains: ["spam.biz"] });
    expect(unblocked.map((e) => e.email)).toEqual(["a@gmail.com", "b@company.com"]);
  });

  it("enforces extraction limits", () => {
    const text = "one@a.com two@b.com three@c.com";
    const limited = extractEmails(text, { limit: 2 });
    expect(limited).toHaveLength(2);
  });

  it("validates extracted email syntax strictly", () => {
    expect(validateExtractedEmail("valid.email@example.co.uk").valid).toBe(true);
    expect(validateExtractedEmail("").valid).toBe(false);
    expect(validateExtractedEmail("no-at-sign.com").valid).toBe(false);
    expect(validateExtractedEmail("@nodomain.com").valid).toBe(false);
    expect(validateExtractedEmail("user@.com").valid).toBe(false);
    expect(validateExtractedEmail("user..dot@domain.com").valid).toBe(false);
    expect(validateExtractedEmail("user@domain..com").valid).toBe(false);
    expect(validateExtractedEmail("user@domain.c").valid).toBe(false); // TLD must be >= 2 chars
  });

  it("normalizes emails with options (subaddressing, domain lowercase)", () => {
    expect(normalizeEmail("USER@EXAMPLE.COM")).toBe("USER@example.com");
    expect(normalizeEmail("user+tag@domain.com", { removeSubaddressing: true })).toBe("user@domain.com");
    expect(normalizeEmail("USER@DOMAIN.COM", { lowercaseLocal: true })).toBe("user@domain.com");
    expect(() => normalizeEmail("invalid")).toThrow(ValidationError);
  });

  it("handles large inputs safely without backtracking issues", () => {
    const padding = "lorem ipsum dolor sit amet ".repeat(5000);
    const text = `${padding} target@domain.org ${padding}`;
    const start = Date.now();
    const emails = extractEmails(text);
    const duration = Date.now() - start;

    expect(emails).toHaveLength(1);
    expect(emails[0]!.email).toBe("target@domain.org");
    expect(duration).toBeLessThan(1000); // fast execution
  });
});
