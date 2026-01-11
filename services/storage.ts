
import { Project, User, ProjectStatus } from '../types';

const USERS_KEY = 'cv_users';
const PROJECTS_KEY = 'cv_projects';
const SESSION_KEY = 'cv_session';

const defaultUsers: any[] = [
  { id: '1', username: 'admin', password: 'password123', email: 'admin@codevault.com', avatar: 'https://picsum.photos/seed/admin/100' },
  { id: '2', username: 'dev_user', password: 'dev', email: 'dev@codevault.com', avatar: 'https://picsum.photos/seed/dev/100' }
];

const mockFiles = [
  { name: 'App.tsx', path: 'src/App.tsx', size: 2048 },
  { name: 'index.html', path: 'public/index.html', size: 1024 },
  { name: 'package.json', path: 'package.json', size: 512 },
  { name: 'main.py', path: 'api/main.py', size: 4096 },
  { name: 'utils.ts', path: 'src/utils/utils.ts', size: 1500 }
];

export const StorageService = {
  init() {
    if (!localStorage.getItem(USERS_KEY)) {
      localStorage.setItem(USERS_KEY, JSON.stringify(defaultUsers));
    }
    if (!localStorage.getItem(PROJECTS_KEY)) {
      const initialProjects: Project[] = [
        {
          id: 'p1',
          // Fix: ownerId renamed to owner_id to match Project interface
          owner_id: '1',
          name: 'React Dashboard Pro',
          // Fix: totalSize renamed to total_size
          total_size: 15728640,
          // Fix: fileCount renamed to file_count
          file_count: 45,
          // Fix: createdAt renamed to created_at
          created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
          files: [...mockFiles],
          // Fix: vscodeUrl renamed to access_url
          access_url: 'https://vscode.dev/github/admin/dashboard',
          // Fix: status renamed to code_server_status; 'success' mapped to 'running'
          code_server_status: 'running'
        },
        {
          id: 'p2',
          // Fix: ownerId renamed to owner_id
          owner_id: '1',
          name: 'AI Image Generator',
          // Fix: totalSize renamed to total_size
          total_size: 52428800,
          // Fix: fileCount renamed to file_count
          file_count: 120,
          // Fix: createdAt renamed to created_at
          created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          files: [...mockFiles],
          // Fix: vscodeUrl renamed to access_url
          access_url: '',
          // Fix: status renamed to code_server_status
          code_server_status: null
        }
      ];
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(initialProjects));
    }
  },

  getUsers(): any[] {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  },

  setUsers(users: any[]) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  getCurrentUser(): User | null {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  },

  setCurrentUser(user: User | null) {
    if (user) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  },

  getProjects(userId: string): Project[] {
    const all = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    // Fix: updated ownerId to owner_id for filtering
    return all.filter((p: Project) => p.owner_id === userId);
  },

  updateProject(project: Project) {
    const all = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    const idx = all.findIndex((p: Project) => p.id === project.id);
    if (idx !== -1) {
      all[idx] = project;
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
    }
  },

  addProject(project: Project) {
    const all = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    all.unshift(project);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(all));
  },

  deleteProject(projectId: string) {
    const all = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    const filtered = all.filter((p: Project) => p.id !== projectId);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
  },

  deleteProjects(projectIds: string[]) {
    const all = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]');
    const filtered = all.filter((p: Project) => !projectIds.includes(p.id));
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(filtered));
  },

  // Mock Asynchronous VSCode Project Creation
  async createVSCodeProject(project: Project, onUpdate: (p: Project) => void): Promise<void> {
    // 1. Set to creating
    // Fix: replaced status with code_server_status to match Project interface
    const creatingProject = { ...project, code_server_status: 'creating' };
    this.updateProject(creatingProject);
    onUpdate(creatingProject);

    // 2. Simulate delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Random success or failure
    const isSuccess = Math.random() > 0.2;
    let finalProject: Project;

    if (isSuccess) {
      finalProject = {
        ...creatingProject,
        // Fix: replaced status with code_server_status; replaced vscodeUrl with access_url
        code_server_status: 'running',
        access_url: `https://vscode.dev/github/user/${project.name.replace(/\s+/g, '-').toLowerCase()}`
      };
    } else {
      finalProject = {
        ...creatingProject,
        // Fix: replaced status with code_server_status; replaced errorMessage with error_message
        code_server_status: 'failed',
        error_message: 'Backend build pipeline failed: Container resource limit exceeded during initialization.'
      };
    }

    this.updateProject(finalProject);
    onUpdate(finalProject);
  }
};