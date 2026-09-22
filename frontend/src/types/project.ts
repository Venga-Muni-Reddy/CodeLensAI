export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  repository_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreatePayload {
  name: string;
  description?: string;
}

export interface ProjectUpdatePayload {
  name?: string;
  description?: string;
}
