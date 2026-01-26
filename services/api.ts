
const API_BASE = 'https://developsource.819819.xyz/api';

const getHeaders = () => {
  const token = localStorage.getItem('cv_token');
  return {
    'Authorization': token ? `Bearer ${token}` : '',
    'Content-Type': 'application/json',
  };
};

const handleUnauthorized = () => {
  localStorage.removeItem('cv_token');
  localStorage.removeItem('cv_user');
  window.location.hash = '#/login';
  window.location.reload();
};

export const ApiService = {
  async fetchWithAuth(url: string, options: RequestInit = {}) {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        ...getHeaders(),
        ...(options.headers || {}),
      }
    });

    if (response.status === 401) {
      handleUnauthorized();
      return new Promise(() => {});
    }

    if (!response.ok) {
      let errorMessage = `Request failed (Status ${response.status})`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error?.message || errorMessage;
        } else {
          const textError = await response.text();
          errorMessage = textError || `Error ${response.status}: ${response.statusText}`;
        }
      } catch (e) {
        errorMessage = `Error ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  },

  async login(username: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Invalid credentials');
    }
    return response.json();
  },

  async changePassword(data: any) {
    return this.fetchWithAuth('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  // Projects
  async getProjects(page: number, size: number, search?: string) {
    let url = `/projects?page=${page}&size=${size}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    return this.fetchWithAuth(url);
  },

  async getProjectDetails(id: string) {
    return this.fetchWithAuth(`/projects/${id}`);
  },

  async getProjectStatus(id: string) {
    return this.fetchWithAuth(`/projects/${id}/status`);
  },

  async getProjectInitLogs(id: string, lines: number = 200) {
    return this.fetchWithAuth(`/projects/${id}/init-logs?lines=${lines}`);
  },

  async uploadProject(formData: FormData) {
    const token = localStorage.getItem('cv_token');
    const response = await fetch(`${API_BASE}/projects/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData,
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.error?.message || 'Upload failed');
    }
    return response.json();
  },

  async deleteProject(id: string) {
    return this.fetchWithAuth(`/projects/${id}`, { method: 'DELETE' });
  },

  async deleteProjects(ids: string[]) {
    return Promise.all(ids.map(id => this.deleteProject(id)));
  },

  // PVC Management
  async recreatePVC(projectId: string, storageSize?: string) {
    return this.fetchWithAuth(`/projects/${projectId}/pvc/recreate`, {
      method: 'POST',
      body: JSON.stringify({ storage_size: storageSize })
    });
  },

  // Code Server
  async getCodeServers(page: number, size: number, status?: string) {
    let url = `/code-servers?page=${page}&size=${size}`;
    if (status) url += `&status=${status}`;
    return this.fetchWithAuth(url);
  },

  async getCodeServer(projectId: string) {
    return this.fetchWithAuth(`/code-servers/${projectId}`);
  },

  async createCodeServer(projectId: string, config: any = {}) {
    return this.fetchWithAuth(`/projects/${projectId}/code-server`, { 
      method: 'POST',
      body: JSON.stringify({
        cpu_limit: "1000m",
        memory_limit: "1024Mi",
        ...config
      })
    });
  },

  async startCodeServer(projectId: string) {
    return this.fetchWithAuth(`/code-servers/${projectId}/start`, { method: 'POST' });
  },

  async stopCodeServer(projectId: string) {
    return this.fetchWithAuth(`/code-servers/${projectId}/stop`, { method: 'POST' });
  },

  async restartCodeServer(projectId: string) {
    return this.fetchWithAuth(`/code-servers/${projectId}/restart`, { method: 'POST' });
  },

  async deleteCodeServer(projectId: string) {
    return this.fetchWithAuth(`/code-servers/${projectId}`, { method: 'DELETE' });
  },

  async getDeploymentLogs(projectId: string, logType: string = 'all', lines: number = 100) {
    return this.fetchWithAuth(`/code-servers/${projectId}/deployment/logs?log_type=${logType}&lines=${lines}`);
  },

  async getCodeServerLogs(projectId: string, lines: number = 100) {
    return this.fetchWithAuth(`/code-servers/${projectId}/logs?lines=${lines}`);
  },

  // Code Wiki
  async createCodeWiki(projectId: string, config: { api_key?: string, cpu_limit?: string, memory_limit?: string }) {
    return this.fetchWithAuth(`/projects/${projectId}/codewiki`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  },

  async listCodeWikis(page: number = 1, size: number = 10, status?: string) {
    let url = `/codewikis?page=${page}&size=${size}`;
    if (status) url += `&status=${status}`;
    return this.fetchWithAuth(url);
  },

  async getCodeWiki(projectId: string) {
    return this.fetchWithAuth(`/codewikis/${projectId}`);
  },

  async deleteCodeWiki(projectId: string) {
    return this.fetchWithAuth(`/codewikis/${projectId}`, { method: 'DELETE' });
  },

  async stopCodeWiki(projectId: string) {
    return this.fetchWithAuth(`/codewikis/${projectId}/stop`, { method: 'POST' });
  },

  async startCodeWiki(projectId: string) {
    return this.fetchWithAuth(`/codewikis/${projectId}/start`, { method: 'POST' });
  },

  async restartCodeWiki(projectId: string) {
    return this.fetchWithAuth(`/codewikis/${projectId}/restart`, { method: 'POST' });
  },

  async getCodeWikiLogs(projectId: string, lines: number = 100) {
    return this.fetchWithAuth(`/codewikis/${projectId}/logs?lines=${lines}`);
  },

  async updateCodeWiki(projectId: string, data: { api_key?: string, cpu_limit?: string, memory_limit?: string }) {
    return this.fetchWithAuth(`/codewikis/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  // CodeWiki Tasks (Internal Service Proxies)
  async listCodeWikiTasks(projectId: string, skip: number = 0, limit: number = 100) {
    return this.fetchWithAuth(`/codewikis/${projectId}/tasks?skip=${skip}&limit=${limit}`);
  },

  async createCodeWikiTask(projectId: string, taskRequest: any) {
    return this.fetchWithAuth(`/codewikis/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskRequest)
    });
  },

  async getCodeWikiTask(projectId: string, taskId: string) {
    return this.fetchWithAuth(`/codewikis/${projectId}/tasks/${taskId}`);
  },

  async deleteCodeWikiTask(projectId: string, taskId: string) {
    return this.fetchWithAuth(`/codewikis/${projectId}/tasks/${taskId}`, { method: 'DELETE' });
  },

  async getCodeWikiTaskLogs(projectId: string, taskId: string, lines: number = 1000) {
    return this.fetchWithAuth(`/codewikis/${projectId}/tasks/${taskId}/logs?lines=${lines}`);
  },

  async stopCodeWikiTask(projectId: string, taskId: string) {
    return this.fetchWithAuth(`/codewikis/${projectId}/tasks/${taskId}/stop`, { method: 'POST' });
  },

  async getHealth() {
    return this.fetchWithAuth('/health');
  },

  async downloadFile(projectId: string, filePath: string, fileName: string) {
    const url = `${API_BASE}/projects/${projectId}/download?file_path=${encodeURIComponent(filePath)}`;
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) throw new Error('Download failed');
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(blobUrl);
    document.body.removeChild(a);
  }
};
