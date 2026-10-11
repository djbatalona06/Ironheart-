import OpenAI from "openai";

type Env = Record<string, string | undefined>;

export type AiConfig = { apiKey: string; baseURL?: string; model: string };

/**
 * Which AI provider the bot talks to. Any OpenAI-compatible Responses API works
 * (OpenAI, DeepSeek, a local Ollama). `AI_*` wins; `OPENAI_*` still works so
 * existing deploys don't change. Returns null when AI isn't configured.
 */
export function aiConfig(env: Env = process.env): AiConfig | null {
  const apiKey = env.AI_API_KEY || env.OPENAI_API_KEY;
  if (!apiKey) return null;
  const baseURL = env.AI_BASE_URL || undefined; // OPENAI_BASE_URL is read by the SDK itself
  // A custom host must name its model: "gpt-5-mini" is meaningless on DeepSeek.
  const model = env.AI_MODEL || env.OPENAI_MODEL || (baseURL ? "" : "gpt-5-mini");
  return model ? { apiKey, baseURL, model } : null;
}

export const aiClient = (c: AiConfig) => new OpenAI({ apiKey: c.apiKey, baseURL: c.baseURL });
