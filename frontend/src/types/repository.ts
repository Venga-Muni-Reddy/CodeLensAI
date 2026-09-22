export interface Repository {
  id: string;
  project_id: string;
  owner_id: string;
  name: string;
  source_type: "github" | "zip";
  source_url?: string | null;
  default_branch: string;
  commit_sha?: string | null;
  size_bytes: number;
  file_count: number;
  status: "queued" | "cloning" | "ready" | "failed";
  storage_key: string;
  error_message?: string | null;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface RepositoryCreateGitHubPayload {
  source_url: string;
  default_branch?: string;
  auth_token?: string;
  shallow_clone?: boolean;
  exclude_binaries?: boolean;
}
