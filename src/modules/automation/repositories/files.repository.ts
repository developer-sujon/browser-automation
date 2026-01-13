import sql from "@/database/client";
import type { FileItem } from "../types";

export interface IFilesRepository {
  findPending(limit: number): Promise<FileItem[]>;
  countPending(): Promise<number>;
  updateStatus(
    id: string,
    status: string,
    attempt?: number,
    additionalMetadata?: Record<string, any>
  ): Promise<void>;
}

export class FilesRepository implements IFilesRepository {
  async findPending(limit: number): Promise<FileItem[]> {
    // Atomic batch claiming using FOR UPDATE SKIP LOCKED
    // This allows multiple instances to run concurrently without processing the same items
    const rows = await sql<any[]>`
      UPDATE files
      SET 
        status = 'processing',
        attempts = COALESCE(attempts, 0) + 1
      WHERE id IN (
        SELECT id FROM files 
        WHERE 
          status != 'success'
          -- AND created_at::date = CURRENT_DATE
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING *
    `;

    return rows;
  }

  async countPending(): Promise<number> {
    const result = await sql`
      SELECT count(*)::int as count 
      FROM files 
      WHERE 
        status != 'success'
        -- AND created_at::date = CURRENT_DATE
    `;
    return result[0]?.count || 0;
  }

  async updateStatus(
    id: string,
    status: string,
    attempt?: number,
    additionalMetadata?: Record<string, any>
  ): Promise<void> {
    const reason = additionalMetadata?.message || null;

    // Determine attempts value
    const attemptsUpdate =
      status === "failed" && !attempt
        ? sql`, attempts = COALESCE(attempts, 0) + 1`
        : attempt
        ? sql`, attempts = ${attempt}`
        : sql``;

    // Prepare metadata update (simple merge/replace)
    const metadataUpdate = additionalMetadata
      ? sql`, metadata = COALESCE(metadata, '{}'::jsonb) || ${sql.json(
          additionalMetadata
        )}::jsonb`
      : sql``;

    await sql`
      UPDATE files 
      SET 
        status = ${status},
        reason = ${reason}
        ${attemptsUpdate}
        ${metadataUpdate}
      WHERE id = ${id}
    `;
  }
}
