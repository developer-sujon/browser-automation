import { createEnv } from "@/utils/createEnv";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    PORT: z.string().default("4000"),
    TARGET_URL: z.string().url().default("https://example.com/contact"),
    PROXY_SERVER: z.string().optional(),
    PROXY_USERNAME: z.string().optional(),
    PROXY_PASSWORD: z.string().optional(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  runtimeEnv: process.env,
});
