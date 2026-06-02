import { env } from "@/lib/env";
import { modelRegistry } from "@/lib/model-registry";

type GenerateImageInput = {
  sourceImageBase64: string;
  stylePrompt: string;
};

type GenerateImageOutput = {
  resultUrl?: string;
  resultBase64?: string;
};

export const polzaClient = {
  async generateStyledImage(input: GenerateImageInput): Promise<GenerateImageOutput> {
    if (!env.polzaApiKey) {
      throw new Error("POLZA_API_KEY is not configured");
    }

    const prompt = `${input.stylePrompt}\nKeep facial identity. Preserve resemblance.`;

    const requestBody = {
      model: modelRegistry.image.default,
      prompt,
      image: `data:image/jpeg;base64,${input.sourceImageBase64}`,
      size: "1024x1024",
    };

    const response = await fetch(`${env.polzaBaseUrl}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.polzaApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Polza API error (${response.status}): ${text}`);
    }

    const data = (await response.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };

    const first = data.data?.[0];
    if (!first?.url && !first?.b64_json) {
      throw new Error("Polza API returned empty image payload");
    }

    return { resultUrl: first.url, resultBase64: first.b64_json };
  },
};
