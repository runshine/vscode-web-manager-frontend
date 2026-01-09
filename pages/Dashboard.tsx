
import React, { useState, useEffect, useMemo } from 'react';
import { User, Project, UserStats } from '../types';
import { StorageService } from '../services/storage';
import ProjectTable from '../components/ProjectTable';
import UploadModal from '../components/UploadModal';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const data = StorageService.getProjects(user.id);
    setProjects(data);
  }, [user.id]);

  const stats: UserStats = useMemo(() => {
    const totalFiles = projects.reduce((acc, p) => acc + p.fileCount, 0);
    const totalBytes = projects.reduce((acc, p) => acc + p.totalSize, 0);
    const totalStorage = (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';
    return { totalProjects: projects.length, totalFiles, totalStorage };
  }, [projects]);

  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.files.some(f => f.name.toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

  const paginatedProjects = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProjects.slice(start, start + pageSize);
  }, [filteredProjects, currentPage, pageSize]);

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this project?')) {
      StorageService.deleteProject(id);
      setProjects(prev => prev.filter(p => p.id !== id));
    }
  };

  const handleUpdate = (updatedProject: Project) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleUploadSuccess = (newProject: Project) => {
    StorageService.addProject(newProject);
    setProjects(prev => [newProject, ...prev]);
    setIsUploadOpen(false);
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-12 py-8 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Code Repository Dashboard</h1>
          <p className="text-slate-500 mt-1">Manage, search, and deploy your source code projects globally.</p>
        </div>
        <div className="flex items-center gap-3">
           <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Stats Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard 
          label="Total Repositories" 
          value={stats.totalProjects} 
          subValue="Active Projects"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <StatCard 
          label="Managed Files" 
          value={stats.totalFiles.toLocaleString()} 
          subValue="Source Artifacts"
          icon={<svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard 
          label="Storage Usage" 
          value={stats.totalStorage} 
          subValue="Vault Capacity"
          icon={<svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>}
        />
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-slate-50/30">
          <div className="relative w-full max-w-2xl">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search projects by name or specific file paths..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-11 pr-4 py-3 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
            />
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 font-medium">
             <span className="hidden sm:inline">Page Size:</span>
             <div className="flex bg-slate-100 p-1 rounded-lg">
                {[10, 20, 50, 100].map(size => (
                  <button 
                    key={size}
                    onClick={() => { setPageSize(size); setCurrentPage(1); }}
                    className={`px-3 py-1 rounded-md transition-all ${pageSize === size ? 'bg-white text-indigo-600 shadow-sm' : 'hover:text-slate-800'}`}
                  >
                    {size}
                  </button>
                ))}
             </div>
          </div>
        </div>

        <ProjectTable 
          projects={paginatedProjects} 
          onDelete={handleDelete}
          onUpdate={handleUpdate}
          searchQuery={searchQuery}
        />

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-900">{paginatedProjects.length}</span> of <span className="font-bold text-slate-900">{filteredProjects.length}</span> results
          </p>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-30 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.ceil(filteredProjects.length / pageSize) || 1 }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${currentPage === i + 1 ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-slate-200 text-slate-600'}`}
                >
                  {i + 1}
                </button>
              )).slice(Math.max(0, currentPage - 3), Math.min(Math.ceil(filteredProjects.length / pageSize), currentPage + 2))}
            </div>
            <button
              disabled={currentPage >= Math.ceil(filteredProjects.length / pageSize)}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-30 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>

      {isUploadOpen && (
        <UploadModal 
          userId={user.id} 
          onClose={() => setIsUploadOpen(false)} 
          onSuccess={handleUploadSuccess} 
        />
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; subValue: string; icon: React.ReactNode }> = ({ label, value, subValue, icon }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-start justify-between hover:border-indigo-200 transition-colors group">
    <div>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-3xl font-extrabold text-slate-900 mt-2">{value}</p>
      <p className="text-sm text-slate-500 mt-1">{subValue}</p>
    </div>
    <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">{icon}</div>
  </div>
);

export default Dashboard;
