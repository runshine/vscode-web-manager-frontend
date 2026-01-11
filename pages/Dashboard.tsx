
import React, { useState, useEffect, useMemo } from 'react';
import { User, Project, UserStats } from '../types';
import { ApiService } from '../services/api';
import ProjectTable from '../components/ProjectTable';
import UploadModal from '../components/UploadModal';
import ConfirmModal from '../components/ConfirmModal';

interface DashboardProps {
  user: User;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [matchedFiles, setMatchedFiles] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sysStats, setSysStats] = useState<any>(null);

  // Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });
  const [isActionInProgress, setIsActionInProgress] = useState(false);

  const fetchStats = async () => {
    try {
      const data = await ApiService.getHealth();
      setSysStats(data.checks?.stats || null);
    } catch (e) {}
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      if (searchQuery.trim()) {
        const data = await ApiService.getGlobalSearch(searchQuery);
        setProjects(data.projects || []);
        setMatchedFiles(data.files || []);
        setTotalCount(data.projects?.length || 0);
      } else {
        const data = await ApiService.getProjects(currentPage, pageSize);
        setProjects(data.projects);
        setTotalCount(data.total);
        setMatchedFiles([]);
      }
      fetchStats();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentPage, pageSize, searchQuery]);

  const stats: UserStats = useMemo(() => {
    if (sysStats) {
      return { 
        totalProjects: sysStats.projects, 
        totalFiles: projects.reduce((acc, p) => acc + (p.file_count || 0), 0), 
        totalStorage: (projects.reduce((acc, p) => acc + (p.total_size || 0), 0) / (1024 * 1024)).toFixed(2) + ' MB'
      };
    }
    const totalFiles = projects.reduce((acc, p) => acc + (p.file_count || 0), 0);
    const totalBytes = projects.reduce((acc, p) => acc + (p.total_size || 0), 0);
    const totalStorage = (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';
    return { totalProjects: totalCount, totalFiles, totalStorage };
  }, [projects, totalCount, sysStats]);

  const handleDelete = (id: string) => {
    const project = projects.find(p => p.id === id);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project?.name || 'this project'}"? This action cannot be undone.`,
      action: async () => {
        await ApiService.deleteProject(id);
        fetchProjects();
        setSelectedIds(prev => prev.filter(sid => sid !== id));
      }
    });
  };

  const handleBulkDelete = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Selected Projects',
      message: `Are you sure you want to delete ${selectedIds.length} projects? All associated data will be permanently removed.`,
      action: async () => {
        await Promise.all(selectedIds.map(id => ApiService.deleteProject(id)));
        fetchProjects();
        setSelectedIds([]);
      }
    });
  };

  const executeConfirmedAction = async () => {
    try {
      setIsActionInProgress(true);
      await confirmConfig.action();
      setConfirmConfig(prev => ({ ...prev, isOpen: false }));
    } catch (err: any) {
      alert('Action failed: ' + err.message);
    } finally {
      setIsActionInProgress(false);
    }
  };

  const handleUploadSuccess = () => {
    fetchProjects();
    setIsUploadOpen(false);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">CodeVault Dashboard</h1>
          <p className="text-slate-500 mt-2 font-medium">Manage and deploy your source code repositories.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={fetchProjects}
            disabled={loading}
            className="flex items-center gap-2 bg-white text-slate-600 border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 font-bold transition-all shadow-sm disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeWidth={2} /></svg>
            Refresh
          </button>
          
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-100 active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Upload Project
          </button>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-5 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-colors"
            >
              Delete Selected ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Projects" value={stats.totalProjects} icon="📦" color="indigo" />
        <StatCard label="Total Files" value={stats.totalFiles} icon="📂" color="blue" />
        <StatCard label="Used Storage" value={stats.totalStorage} icon="⚖️" color="emerald" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col lg:flex-row gap-4 lg:items-center justify-between bg-slate-50/30">
          <div className="relative flex-1 max-width-xl">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input
              type="text"
              placeholder="Search by project name or file name..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="block w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all shadow-inner"
            />
          </div>
          <div className="flex items-center gap-3">
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Page Size</span>
             <select 
               value={pageSize} 
               onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
               className="bg-slate-100 border-none rounded-lg text-sm font-bold px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
             >
                {[10, 20, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
             </select>
          </div>
        </div>

        <ProjectTable 
          projects={projects} 
          matchedFiles={matchedFiles}
          onDelete={handleDelete} 
          onRefresh={fetchProjects} 
          selectedIds={selectedIds} 
          onSelectionChange={setSelectedIds} 
          loading={loading} 
        />

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Displaying {projects.length} of {totalCount} projects</p>
          {!searchQuery && (
            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="p-2 border border-slate-200 bg-white rounded-lg disabled:opacity-30 hover:bg-slate-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
              <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700">Page {currentPage} / {Math.ceil(totalCount / pageSize) || 1}</div>
              <button disabled={currentPage >= Math.ceil(totalCount / pageSize)} onClick={() => setCurrentPage(p => p + 1)} className="p-2 border border-slate-200 bg-white rounded-lg disabled:opacity-30 hover:bg-slate-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
            </div>
          )}
        </div>
      </div>

      {isUploadOpen && <UploadModal onClose={() => setIsUploadOpen(false)} onSuccess={handleUploadSuccess} />}
      
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={executeConfirmedAction}
        onCancel={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        isLoading={isActionInProgress}
        confirmLabel="Delete Forever"
      />
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; icon: string; color: string }> = ({ label, value, icon, color }) => {
  const colors: Record<string, string> = {
    indigo: 'text-indigo-600 bg-indigo-50',
    blue: 'text-blue-600 bg-blue-50',
    emerald: 'text-emerald-600 bg-emerald-50'
  };
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-indigo-200 transition-colors">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl ${colors[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900 truncate">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;
