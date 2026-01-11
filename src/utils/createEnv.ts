import { z, ZodError, ZodType } from "zod/v4";

export type EnvConfig<T extends Record<string, ZodType>> = {
  server: T;
  runtimeEnv: Record<string, string | undefined>;
};

export function createEnv<T extends Record<string, ZodType>>(
  config: EnvConfig<T>
): z.infer<z.ZodObject<T>> {
  const { server, runtimeEnv } = config;
  const schema = z.object(server);

  try {
    return schema.parse(runtimeEnv);
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("❌ Invalid environment variables:");
      error.issues.forEach((issue) => {
        console.error(`  ${issue.path.join(".")}: ${issue.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}
