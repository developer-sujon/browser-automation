import postgres from "postgres";
import { env } from "@/config/env";

// Create a singleton connection
// Using lazy initialization pattern or just direct export
const sql = postgres(env.DATABASE_URL, {
  // Production optimizations could go here
  ssl: env.NODE_ENV === "production" ? "require" : false,
});

export default sql;
