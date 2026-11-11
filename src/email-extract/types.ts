export interface ExtractedEmail {
  email: string;
  originalText: string;
  start: number;
  end: number;
  domain: string;
  localPart: string;
}

export interface EmailExtractOptions {
  limit?: number;
  allowedDomains?: string[];
  blockedDomains?: string[];
  normalizeCase?: boolean; // Default true: lowercases domain & email
}

export interface NormalizeEmailOptions {
  lowercaseDomain?: boolean; // default true
  lowercaseLocal?: boolean; // default false (RFC allows case-sensitive local parts, though commonly lowercased)
  removeSubaddressing?: boolean; // e.g. user+tag@domain -> user@domain
}
