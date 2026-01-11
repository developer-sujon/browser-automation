import { createEnv } from "@/utils/createEnv";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    API_KEY: z.string().min(1),
    PORT: z.string().default("4000"),
    APP_URL: z.string().url().optional(),
    TARGET_URL: z.string().url().default("https://example.com/contact"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },
  runtimeEnv: process.env,
});
