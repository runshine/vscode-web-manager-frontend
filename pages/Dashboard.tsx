
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  const [totalCount, setTotalCount] = useState(0);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sysStats, setSysStats] = useState<any>(null);
  const pollingRef = useRef<any>(null);

  // Modal state
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    isDanger?: boolean;
    action: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    action: async () => {},
  });

  const fetchProjects = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      if (!isSilent) setRefreshing(true);
      
      const data = await ApiService.getProjects(currentPage, pageSize, searchQuery);
      let mergedProjects = data.projects;
      
      try {
        const csData = await ApiService.getCodeServers(1, 100);
        if (csData && csData.code_servers) {
          mergedProjects = data.projects.map((p: Project) => {
            const cs = csData.code_servers.find((c: any) => c.project_id === p.id);
            return {
              ...p,
              access_url: cs?.access_url || p.access_url
            };
          });
        }
      } catch (e) {
        console.warn("Failed to supplement project list with IDE URLs", e);
      }

      setProjects(mergedProjects);
      setTotalCount(data.total);
      
      const health = await ApiService.getHealth();
      setSysStats(health.checks?.stats || null);
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoading(false);
      if (!isSilent) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [currentPage, pageSize, searchQuery]);

  useEffect(() => {
    const needsPolling = projects.some(p => 
      ['initializing', 'pending', 'deleting'].includes(p.status) || 
      p.code_server_status === 'creating' || 
      p.code_server_status === 'deleting'
    );

    if (needsPolling) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => fetchProjects(true), 4000);
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [projects]);

  const stats: UserStats = useMemo(() => {
    const totalFiles = projects.reduce((acc, p) => acc + (p.file_count || 0), 0);
    const totalBytes = projects.reduce((acc, p) => acc + (p.total_size || 0), 0);
    const totalStorage = (totalBytes / (1024 * 1024)).toFixed(2) + ' MB';
    return { 
      totalProjects: sysStats?.projects || totalCount, 
      totalFiles: sysStats?.files || totalFiles, 
      totalStorage 
    };
  }, [projects, totalCount, sysStats]);

  const handleDelete = (id: string) => {
    const project = projects.find(p => p.id === id);
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Project',
      message: `Are you sure you want to delete "${project?.name}"? All associated archives and infrastructure will be permanently removed.`,
      isDanger: true,
      action: async () => {
        await ApiService.deleteProject(id);
        setSelectedIds(prev => prev.filter(sid => sid !== id));
        fetchProjects();
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmConfig({
      isOpen: true,
      title: 'Bulk Delete Projects',
      message: `You are about to permanently delete ${selectedIds.length} projects. This action will purge all code repositories and Kubernetes resources for each selected item. Proceed with caution.`,
      isDanger: true,
      action: async () => {
        await ApiService.deleteProjects(selectedIds);
        setSelectedIds([]);
        fetchProjects();
      }
    });
  };

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Project Registry</h1>
          <p className="text-slate-500 mt-2 font-medium">Asynchronous repository initialization and IDE management.</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-5 py-2.5 rounded-xl hover:bg-red-100 font-bold transition-all animate-in slide-in-from-right-4"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete {selectedIds.length} {selectedIds.length === 1 ? 'Project' : 'Projects'}
            </button>
          )}
          <button
            onClick={() => fetchProjects(false)}
            disabled={refreshing}
            className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-bold transition-all shadow-lg shadow-indigo-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
            Upload Project
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard label="Total Repos" value={stats.totalProjects} icon="📦" color="indigo" />
        <StatCard label="Provisioned PVCs" value={projects.filter(p => p.pvc_name).length} icon="💾" color="blue" />
        <StatCard label="Used Capacity" value={stats.totalStorage} icon="⚖️" color="emerald" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <input
            type="text"
            placeholder="Search registry..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full max-w-md px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <ProjectTable 
          projects={projects} 
          onDelete={handleDelete} 
          onRefresh={() => fetchProjects(true)} 
          selectedIds={selectedIds} 
          onSelectionChange={setSelectedIds} 
          loading={loading} 
        />
      </div>

      {isUploadOpen && <UploadModal onClose={() => setIsUploadOpen(false)} onSuccess={() => { setIsUploadOpen(false); fetchProjects(); }} />}
      
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={async () => { await confirmConfig.action(); setConfirmConfig(p => ({ ...p, isOpen: false })); }}
        onCancel={() => setConfirmConfig(p => ({ ...p, isOpen: false }))}
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
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 group hover:border-slate-300 transition-colors">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl transition-transform group-hover:scale-110 ${colors[color]}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;
