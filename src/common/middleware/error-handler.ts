import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { Logger } from "../logger";

const logger = new Logger("GlobalErrorHandler");

export const globalErrorHandler = (err: Error, c: Context) => {
  if (err instanceof HTTPException) {
    return err.getResponse();
  }

  logger.error("Unhandled error:", err);

  const status = 500;
  const message = "Internal Server Error";

  // In production, you might want to hide the stack trace
  return c.json(
    {
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? err.message : undefined,
    },
    status
  );
};
