type ChatCompletionArgs = {
  requestBody: Record<string, unknown>;
  modelEnvVar?: string;
};

type ResolvedProvider = {
  provider: string;
  url: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
};

function firstEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    if (!key) continue;
    const value = Deno.env.get(key);
    if (value) return value;
  }

  return undefined;
}

function resolveProvider(modelEnvVar?: string): ResolvedProvider {
  const provider = (firstEnv("AI_PROVIDER") || "").toLowerCase();

  if (provider === "gemini" || Deno.env.get("GOOGLE_GEMINI_API_KEY")) {
    const apiKey = firstEnv("AI_API_KEY", "GOOGLE_GEMINI_API_KEY");
    if (!apiKey) throw new Error("Missing AI API key for Gemini");

    return {
      provider: "gemini",
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      apiKey,
      model: firstEnv(modelEnvVar || "", "AI_MODEL", "GEMINI_MODEL") || "gemini-2.0-flash",
    };
  }

  if (provider === "openrouter" || Deno.env.get("OPENROUTER_API_KEY")) {
    const apiKey = firstEnv("AI_API_KEY", "OPENROUTER_API_KEY");
    if (!apiKey) throw new Error("Missing AI API key for OpenRouter");

    return {
      provider: "openrouter",
      url: "https://openrouter.ai/api/v1/chat/completions",
      apiKey,
      model: firstEnv(modelEnvVar || "", "AI_MODEL", "OPENROUTER_MODEL") || "openai/gpt-4o-mini",
      extraHeaders: {
        "HTTP-Referer": firstEnv("SITE_URL", "PUBLIC_SITE_URL") || "https://mohcom-production.up.railway.app",
        "X-Title": "MohCom",
      },
    };
  }

  if (provider === "custom") {
    const apiKey = firstEnv("AI_API_KEY");
    const baseUrl = firstEnv("AI_API_BASE_URL");
    if (!apiKey || !baseUrl) throw new Error("Missing AI_API_KEY or AI_API_BASE_URL for custom provider");

    return {
      provider: "custom",
      url: baseUrl.endsWith("/chat/completions") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/chat/completions`,
      apiKey,
      model: firstEnv(modelEnvVar || "", "AI_MODEL") || "gpt-4o-mini",
    };
  }

  const apiKey = firstEnv("AI_API_KEY", "OPENAI_API_KEY");
  if (!apiKey) throw new Error("Missing AI API key");

  return {
    provider: "openai",
    url: "https://api.openai.com/v1/chat/completions",
    apiKey,
    model: firstEnv(modelEnvVar || "", "AI_MODEL", "OPENAI_MODEL") || "gpt-4o-mini",
  };
}

export async function createAiChatCompletion({ requestBody, modelEnvVar }: ChatCompletionArgs): Promise<Response> {
  const config = resolveProvider(modelEnvVar);
  const body = {
    ...requestBody,
    model: (requestBody.model as string | undefined) || config.model,
  };

  return fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      ...(config.extraHeaders || {}),
    },
    body: JSON.stringify(body),
  });
}