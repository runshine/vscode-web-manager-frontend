
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
          errorMessage = errorData.error?.message || errorData.detail || errorMessage;
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

  async getProjectTaskLogs(id: string) {
    return this.fetchWithAuth(`/projects/${id}/task-logs`);
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
    // Perform sequential or parallel deletions depending on API constraints
    // Since individual endpoints are standard, we use Promise.all
    return Promise.all(ids.map(id => this.deleteProject(id)));
  },

  // PVC Management
  async createPVC(projectId: string, storageSize: string) {
    const formData = new FormData();
    formData.append('storage_size', storageSize);
    const token = localStorage.getItem('cv_token');
    return this.fetchWithAuth(`/projects/${projectId}/pvc/create`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
  },

  async recreatePVC(projectId: string, storageSize?: string) {
    return this.fetchWithAuth(`/projects/${projectId}/pvc/recreate`, {
      method: 'POST',
      body: JSON.stringify({ storage_size: storageSize })
    });
  },

  async deletePVC(projectId: string) {
    return this.fetchWithAuth(`/projects/${projectId}/pvc`, { method: 'DELETE' });
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

  async getDeploymentStatus(projectId: string) {
    return this.fetchWithAuth(`/code-servers/${projectId}/deployment/status`);
  },

  async getDeploymentLogs(projectId: string, logType: string = 'all', lines: number = 100) {
    return this.fetchWithAuth(`/code-servers/${projectId}/deployment/logs?log_type=${logType}&lines=${lines}`);
  },

  async getGlobalSearch(query: string) {
    return this.fetchWithAuth(`/search?q=${encodeURIComponent(query)}`);
  },

  async changePassword(passwords: any) {
    return this.fetchWithAuth('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(passwords),
    });
  },

  async getHealth() {
    return this.fetchWithAuth('/health');
  },

  getDownloadArchiveUrl(projectId: string) {
    const token = localStorage.getItem('cv_token');
    return `${API_BASE}/projects/${projectId}/download/archive?token=${token}`;
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
