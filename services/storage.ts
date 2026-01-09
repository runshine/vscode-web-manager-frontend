
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
          ownerId: '1',
          name: 'React Dashboard Pro',
          totalSize: 15728640,
          fileCount: 45,
          createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
          files: [...mockFiles],
          vscodeUrl: 'https://vscode.dev/github/admin/dashboard',
          status: 'success'
        },
        {
          id: 'p2',
          ownerId: '1',
          name: 'AI Image Generator',
          totalSize: 52428800,
          fileCount: 120,
          createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
          files: [...mockFiles],
          vscodeUrl: '',
          status: 'waiting'
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
    return all.filter((p: Project) => p.ownerId === userId);
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

  // Mock Asynchronous VSCode Project Creation
  async createVSCodeProject(project: Project, onUpdate: (p: Project) => void): Promise<void> {
    // 1. Set to creating
    const creatingProject = { ...project, status: 'creating' as ProjectStatus };
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
        status: 'success' as ProjectStatus,
        vscodeUrl: `https://vscode.dev/github/user/${project.name.replace(/\s+/g, '-').toLowerCase()}`
      };
    } else {
      finalProject = {
        ...creatingProject,
        status: 'failed' as ProjectStatus,
        errorMessage: 'Backend build pipeline failed: Container resource limit exceeded during initialization.'
      };
    }

    this.updateProject(finalProject);
    onUpdate(finalProject);
  }
};
