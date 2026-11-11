export interface SnippetPayload {
  title?: string;
  language?: string;
  description?: string;
  content: string;
  createdAt: string;
  expiresAt?: string;
  version: number;
}

export interface CreateSnippetOptions {
  title?: string;
  language?: string;
  description?: string;
  content: string;
  expiresAt?: string | number | Date;
  maxContentSize?: number;
}

export interface ShareableSnippetUrlOptions {
  baseUrl?: string;
  fragmentPrefix?: string;
  maxUrlLength?: number;
}

export interface PastebinStorageAdapter {
  publishSnippet(snippet: SnippetPayload): Promise<{ id: string; url?: string }>;
  getSnippet(id: string): Promise<SnippetPayload>;
}

export interface PastebinClient {
  publishSnippet(snippet: SnippetPayload): Promise<{ id: string; url?: string }>;
  getSnippet(id: string): Promise<SnippetPayload>;
}
