import { env } from "@/config/env";
import postgres from "postgres";

// Create a singleton connection
// Using lazy initialization pattern or just direct export
const sql = postgres(env.DATABASE_URL, {
  // Production optimizations could go here
  ssl: env.NODE_ENV === "production" ? "require" : false,
  prepare: false, // Fix for "prepared statement does not exist" errors in serverless/pooled environments
  max: process.env.DB_MAX_CONNECTIONS
    ? parseInt(process.env.DB_MAX_CONNECTIONS)
    : 10,
});

export default sql;
