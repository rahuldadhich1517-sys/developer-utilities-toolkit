import { ValidationError } from "../shared/errors.js";
import { assertString } from "../shared/validation.js";
import type { EmailExtractOptions, ExtractedEmail, NormalizeEmailOptions } from "./types.js";

export * from "./types.js";

// Non-backtracking, safe regex for email candidate search
const EMAIL_CANDIDATE_REGEX =
  /[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;

const TRAILING_PUNCTUATION_REGEX = /[.,!?;:)>\]]+$/;

/**
 * Validates whether an email string meets standard RFC syntax requirements.
 */
export function validateExtractedEmail(candidate: string): { valid: boolean; reason?: string } {
  if (typeof candidate !== "string" || candidate.length === 0) {
    return { valid: false, reason: "Empty or non-string candidate" };
  }

  if (candidate.length > 254) {
    return { valid: false, reason: "Email exceeds maximum length of 254 characters" };
  }

  const atIndex = candidate.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === candidate.length - 1) {
    return { valid: false, reason: "Missing or misplaced '@' character" };
  }

  const localPart = candidate.slice(0, atIndex);
  const domain = candidate.slice(atIndex + 1);

  if (localPart.length > 64) {
    return { valid: false, reason: "Local part exceeds 64 characters" };
  }

  if (domain.length > 253) {
    return { valid: false, reason: "Domain exceeds 253 characters" };
  }

  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    return { valid: false, reason: "Local part cannot start/end with dot or contain consecutive dots" };
  }

  const domainParts = domain.split(".");
  if (domainParts.length < 2) {
    return { valid: false, reason: "Domain must contain at least one dot separating subdomains/TLD" };
  }

  for (const part of domainParts) {
    if (part.length === 0 || part.length > 63) {
      return { valid: false, reason: "Domain labels must be between 1 and 63 characters" };
    }
    if (part.startsWith("-") || part.endsWith("-")) {
      return { valid: false, reason: "Domain labels cannot start or end with a hyphen" };
    }
  }

  const tld = domainParts[domainParts.length - 1]!;
  if (!/^[a-zA-Z]{2,}$/.test(tld)) {
    return { valid: false, reason: "TLD must consist of at least 2 alphabetic characters" };
  }

  return { valid: true };
}

/**
 * Normalizes an email address according to options.
 */
export function normalizeEmail(email: string, options?: NormalizeEmailOptions): string {
  assertString(email, "email");
  const trimmed = email.trim();
  const atIndex = trimmed.lastIndexOf("@");
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    throw new ValidationError(`Cannot normalize invalid email address: "${email}"`);
  }

  let localPart = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  const lowercaseDomain = options?.lowercaseDomain ?? true;
  const lowercaseLocal = options?.lowercaseLocal ?? false;
  const removeSubaddressing = options?.removeSubaddressing ?? false;

  if (lowercaseDomain) {
    domain = domain.toLowerCase();
  }

  if (removeSubaddressing) {
    const plusIdx = localPart.indexOf("+");
    if (plusIdx > 0) {
      localPart = localPart.slice(0, plusIdx);
    }
  }

  if (lowercaseLocal) {
    localPart = localPart.toLowerCase();
  }

  return `${localPart}@${domain}`;
}

/**
 * Extracts all matching email addresses from text with source positions.
 */
export function extractEmails(text: string, options?: EmailExtractOptions): ExtractedEmail[] {
  assertString(text, "input text");
  const results: ExtractedEmail[] = [];
  const limit = options?.limit ?? Infinity;
  const allowedDomains = options?.allowedDomains?.map((d) => d.toLowerCase());
  const blockedDomains = options?.blockedDomains?.map((d) => d.toLowerCase());
  const normalizeCase = options?.normalizeCase ?? true;

  EMAIL_CANDIDATE_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = EMAIL_CANDIDATE_REGEX.exec(text)) !== null) {
    let matchedStr = match[0];
    let start = match.index;

    // Clean trailing punctuation like period at end of sentence
    const punctMatch = TRAILING_PUNCTUATION_REGEX.exec(matchedStr);
    if (punctMatch) {
      matchedStr = matchedStr.slice(0, -punctMatch[0].length);
    }
    const end = start + matchedStr.length;

    const validation = validateExtractedEmail(matchedStr);
    if (!validation.valid) {
      continue;
    }

    const atIdx = matchedStr.lastIndexOf("@");
    const localPart = matchedStr.slice(0, atIdx);
    const domain = matchedStr.slice(atIdx + 1);
    const lowerDomain = domain.toLowerCase();

    if (allowedDomains && !allowedDomains.includes(lowerDomain)) {
      continue;
    }

    if (blockedDomains && blockedDomains.includes(lowerDomain)) {
      continue;
    }

    const email = normalizeCase ? `${localPart.toLowerCase()}@${lowerDomain}` : matchedStr;

    results.push({
      email,
      originalText: matchedStr,
      start,
      end,
      domain: lowerDomain,
      localPart,
    });

    if (results.length >= limit) {
      break;
    }
  }

  return results;
}

/**
 * Extracts unique email addresses from text, deduplicated by normalized address.
 */
export function extractUniqueEmails(text: string, options?: EmailExtractOptions): ExtractedEmail[] {
  const all = extractEmails(text, options);
  const seen = new Set<string>();
  const unique: ExtractedEmail[] = [];

  for (const item of all) {
    const key = item.email.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }

  return unique;
}
