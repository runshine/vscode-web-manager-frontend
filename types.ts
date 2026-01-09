
export type ProjectStatus = 'waiting' | 'creating' | 'success' | 'failed';

export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface FileItem {
  name: string;
  path: string;
  size: number;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  totalSize: number;
  fileCount: number;
  createdAt: string;
  files: FileItem[];
  vscodeUrl: string;
  status: ProjectStatus;
  errorMessage?: string;
}

export interface UserStats {
  totalProjects: number;
  totalFiles: number;
  totalStorage: string;
}
