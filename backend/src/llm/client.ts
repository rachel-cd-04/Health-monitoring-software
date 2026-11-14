// LLM adapter (plan.md > Stack, MOD-02): OpenAI SDK pointed at NVIDIA NIM's OpenAI-compatible API.
// Provider, model and base URL come from env vars, so switching to another OpenAI-compatible provider
// (Groq, OpenRouter, an on-board server…) is a .env change. Nothing else imports the SDK.
import 'dotenv/config';
import OpenAI from 'openai';

export const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
// Model ids on NIM always carry the vendor prefix (vendor/model); without it the API answers 404.
export const LLM_MODEL = process.env.LLM_MODEL || 'nvidia/nemotron-3.5-super-vl-120b-a12b';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 30000);

let client: OpenAI | null | undefined;

/**
 * Configured client, or null when LLM_API_KEY is missing (the endpoint then answers 503 AI_UNAVAILABLE).
 * `maxRetries` makes the SDK retry 429/5xx with exponential backoff (honoring Retry-After): the NIM free
 * tier allows ~40 requests/min and one question can take several tool rounds.
 */
export function getLlm(): OpenAI | null {
  if (client === undefined) {
    const apiKey = process.env.LLM_API_KEY?.trim();
    client = apiKey ? new OpenAI({ apiKey, baseURL: LLM_BASE_URL, timeout: TIMEOUT_MS, maxRetries: 2 }) : null;
  }
  return client;
}
