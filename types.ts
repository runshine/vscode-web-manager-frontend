
export type ProjectStatus = 'waiting' | 'creating' | 'success' | 'failed';

export interface User {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  avatar?: string;
}

export interface FileItem {
  name: string;
  path: string;
  size: number;
  type?: string;
}

export interface Project {
  id: string;
  owner_id: string;
  name: string;
  description?: string;
  total_size: number;
  file_count: number;
  created_at: string;
  code_server_status: string | null;
  files?: FileItem[];
  access_url?: string;
  error_message?: string;
  // Fix: Added original_filename to Project interface to support archive type display in ProjectDetail.tsx
  original_filename?: string;
  // Fix: Added archive_size property to Project interface to resolve access error in ProjectDetail.tsx
  archive_size?: number;
}

export interface UserStats {
  totalProjects: number;
  totalFiles: number;
  totalStorage: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}