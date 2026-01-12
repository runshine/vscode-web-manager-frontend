
export type ProjectStatus = 'pending' | 'initializing' | 'ready' | 'error' | 'deleting';
export type CodeServerStatus = 'pending' | 'creating' | 'running' | 'stopped' | 'error' | 'deleting';

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
  name: string;
  // Fix: Add owner_id to match usage in storage service
  owner_id: string;
  description?: string;
  status: ProjectStatus;
  total_size: number;
  file_count: number;
  archive_size: number;
  original_filename?: string;
  created_at: string;
  initialized_at?: string;
  code_server_status: string | null;
  access_url?: string;
  error_message?: string;
  // PVC related
  pvc_name?: string;
  pvc_status?: string;
  pvc_size?: string;
  file_synced?: boolean;
  init_error?: string;
  files?: FileItem[];
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