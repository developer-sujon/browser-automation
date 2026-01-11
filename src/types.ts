// --- Data Models ---

export interface Person {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export interface JobItem {
  id: string; // Unique ID for tracking
  person: Person;
  status: "pending" | "success" | "failed";
  attempts: number;
  lastError?: string;
  workerId?: string; // ID of the Durable Object processing this item
}

export interface JobData {
  targetUrl: string;
  data: Person[];
}

export interface SubmissionStats {
  success: number;
  failed: number;
  total: number;
}

export interface SubmissionResult {
  success: boolean;
  status: number;
  message: string;
}

declare global {
  interface Env {
    JOB_MANAGER: DurableObjectNamespace;
    MYBROWSER: Fetcher;
  }
}
