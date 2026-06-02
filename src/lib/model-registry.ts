import { env } from "@/lib/env";

export const modelRegistry = {
  image: {
    default: env.polzaImageModel,
  },
  video: {
    default: env.polzaVideoModel || "future-provider-placeholder",
  },
} as const;
