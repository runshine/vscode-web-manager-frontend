
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api.ts';
import { Project, FileItem } from '../types.ts';
import ConfirmModal from '../components/ConfirmModal.tsx';

// Helper Components
const StatItem = ({ label, value, status, isMono }: { label: string; value: string; status?: string; isMono?: boolean }) => (
  <div className="group">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">{label}</p>
    <div className="flex items-center gap-2">
      {status && <div className={`w-2 h-2 rounded-full ${status === 'ready' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-400 animate-pulse'}`} />}
      <p className={`text-xs font-bold text-slate-700 truncate ${isMono ? 'font-mono tracking-tight text-slate-500' : ''}`}>{value}</p>
    </div>
  </div>
);

interface TabBtnProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}

const TabBtn: React.FC<TabBtnProps> = ({ children, active, onClick }) => (
  <button onClick={onClick} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap shrink-0 ${active ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{children}</button>
);

const InfraPanel = ({ label, value, status, isMono }: { label: string; value: string; status?: string; isMono?: boolean }) => (
  <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors">
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-black text-slate-800 truncate ${isMono ? 'font-mono text-xs text-slate-500' : ''}`}>{value}</p>
    </div>
    {status && <div className={`shrink-0 ml-4 w-2.5 h-2.5 rounded-full ${status === 'ready' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : 'bg-amber-400 animate-pulse'}`} />}
  </div>
);

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [codeServer, setCodeServer] = useState<any>(null);
  const [k8sInfo, setK8sInfo] = useState<any>(null);
  
  // Tab Management
  const [activeTab, setActiveTab] = useState<'files' | 'editor' | 'wiki' | 'infra' | 'systemLogs'>('files');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'error' | 'success', message: string } | null>(null);

  // Consolidated Log States
  const [systemLogs, setSystemLogs] = useState<{ type: string, content: string }[]>([]);
  const [selectedSystemLog, setSelectedSystemLog] = useState<number>(0);

  // IDE Editor (Code-Server) States
  const [ideLogs, setIdeLogs] = useState<string>('');
  const [ideLogLines, setIdeLogLines] = useState(200);
  const [isIdeLogsLoading, setIsIdeLogsLoading] = useState(false);
  const [showIdePassword, setShowIdePassword] = useState(false);

  // CodeWiki States
  const [wikiData, setWikiData] = useState<any>(null);
  const [wikiK8s, setWikiK8s] = useState<any>(null);
  const [wikiLogs, setWikiLogs] = useState<string>('');
  const [wikiTasks, setWikiTasks] = useState<any[]>([]);
  const [selectedWikiTaskLogs, setSelectedWikiTaskLogs] = useState<{ id: string, logs: string } | null>(null);
  const [isWikiLoading, setIsWikiLoading] = useState(false);
  const [isWikiTaskLoading, setIsWikiTaskLoading] = useState(false);
  const [isWikiLogsLoading, setIsWikiLogsLoading] = useState(false);
  const [isWikiLogModalOpen, setIsWikiLogModalOpen] = useState(false);
  
  // CodeWiki Creation Form
  const [wikiConfig, setWikiConfig] = useState({ api_key: '', cpu_limit: '1000m', memory_limit: '1024Mi' });

  // File List States
  const [fileSearch, setFileSearch] = useState('');
  const [filePage, setFilePage] = useState(1);
  const [filePageSize, setFilePageSize] = useState(100);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; action: () => Promise<void>; isDanger?: boolean;
  }>({ isOpen: false, title: '', message: '', action: async () => { }, isDanger: true });

  const showNotification = (type: 'error' | 'success', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 6000 : 3000);
  };

  const fetchDetails = async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      if (isSilent) setRefreshing(true);
      setFetchError(null);

      const [pData, csResponse] = await Promise.all([
        ApiService.getProjectDetails(id),
        ApiService.getCodeServer(id).catch(() => null)
      ]);

      const projectCore = pData.project || (pData.id ? pData : null);
      if (!projectCore) throw new Error("Could not find project data");

      const csData = csResponse?.code_server || null;
      const k8sData = csResponse?.k8s_info || null;

      const mergedProject = {
        ...projectCore,
        files: pData.files || projectCore.files || [],
        code_server_status: csData?.status || projectCore.code_server_status || null,
        access_url: csData?.access_url || projectCore.access_url || null
      };

      setProject(mergedProject);
      setCodeServer(csData);
      setK8sInfo(k8sData);

      // Refresh data for current active tab
      if (activeTab === 'editor') fetchIdeLogs();
      if (activeTab === 'wiki') fetchWikiData();
      if (activeTab === 'systemLogs') fetchSystemLogs();
    } catch (err: any) {
      console.error("Fetch error:", err.message);
      setFetchError(err.message);
      if (!isSilent) setTimeout(() => navigate('/'), 3000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchIdeLogs = async () => {
    if (!id) return;
    try {
      setIsIdeLogsLoading(true);
      const data = await ApiService.getCodeServerLogs(id, ideLogLines);
      setIdeLogs(data.logs || 'No logs available for IDE container.');
    } catch (err: any) {
      setIdeLogs(`Failed to fetch IDE logs: ${err.message}`);
    } finally {
      setIsIdeLogsLoading(false);
    }
  };

  const fetchWikiData = async () => {
    if (!id) return;
    try {
      setIsWikiLoading(true);
      const data = await ApiService.getCodeWiki(id);
      setWikiData(data.code_wiki);
      setWikiK8s(data.k8s_info);
      
      if (data.code_wiki?.status === 'running') {
        fetchWikiTasks();
        fetchWikiLogs();
      }
    } catch (err: any) {
      console.debug("CodeWiki not initialized yet.");
      setWikiData(null);
    } finally {
      setIsWikiLoading(false);
    }
  };

  const fetchWikiTasks = async () => {
    if (!id) return;
    try {
      setIsWikiTaskLoading(true);
      const data = await ApiService.listCodeWikiTasks(id);
      // Handle direct array response from internal proxy
      const tasks = Array.isArray(data) ? data : (data.tasks || []);
      setWikiTasks(tasks);
    } catch (err: any) {
      console.warn("Could not fetch Wiki tasks:", err.message);
    } finally {
      setIsWikiTaskLoading(false);
    }
  };

  const fetchWikiTaskLogs = async (taskId: string) => {
    if (!id) return;
    try {
      const data = await ApiService.getCodeWikiTaskLogs(id, taskId, 1000);
      setSelectedWikiTaskLogs({ id: taskId, logs: data.logs || 'No task logs captured.' });
    } catch (err: any) {
      showNotification('error', `Failed to fetch task logs: ${err.message}`);
    }
  };

  const fetchWikiLogs = async () => {
    if (!id) return;
    try {
      setIsWikiLogsLoading(true);
      const data = await ApiService.getCodeWikiLogs(id, 300);
      setWikiLogs(data.logs || '');
    } catch (err: any) {
      setWikiLogs(`Wiki logs unavailable: ${err.message}`);
    } finally {
      setIsWikiLogsLoading(false);
    }
  };

  const fetchSystemLogs = async () => {
    if (!id) return;
    try {
      const [init, deploy] = await Promise.all([
        ApiService.getProjectInitLogs(id, 200).catch(() => 'Init logs empty'),
        ApiService.getDeploymentLogs(id, 'all', 100).catch(() => ({ logs: [] }))
      ]);

      const logsArr = [];
      logsArr.push({ type: 'Initialization', content: typeof init === 'string' ? init : (init.log_content || JSON.stringify(init)) });
      
      if (deploy.logs) {
        deploy.logs.forEach((l: any) => {
          logsArr.push({ type: `Deploy: ${l.source}`, content: l.content || l.error || 'Empty' });
        });
      }
      
      setSystemLogs(logsArr);
    } catch (err) {
      console.error("System logs fetch failed");
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(() => fetchDetails(true), 20000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    if (activeTab === 'editor') fetchIdeLogs();
    if (activeTab === 'wiki') fetchWikiData();
    if (activeTab === 'systemLogs') fetchSystemLogs();
  }, [activeTab, ideLogLines]);

  const handleCreateWiki = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    try {
      setActionLoading(true);
      await ApiService.createCodeWiki(id, wikiConfig);
      showNotification('success', 'CodeWiki creation task submitted.');
      fetchWikiData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleWikiAction = async (action: 'start' | 'stop' | 'restart' | 'delete') => {
    if (!id) return;
    try {
      setActionLoading(true);
      if (action === 'start') await ApiService.startCodeWiki(id);
      else if (action === 'stop') await ApiService.stopCodeWiki(id);
      else if (action === 'restart') await ApiService.restartCodeWiki(id);
      else if (action === 'delete') await ApiService.deleteCodeWiki(id);
      showNotification('success', `Wiki ${action} performed.`);
      fetchWikiData();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateWikiTask = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await ApiService.createCodeWikiTask(id, { name: "System Analysis", parameters: {} });
      showNotification('success', 'Analysis task started.');
      fetchWikiTasks();
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIDEAction = async (action: 'start' | 'stop' | 'restart' | 'delete' | 'recreate') => {
    if (!project?.id) return;
    try {
      setActionLoading(true);
      if (action === 'start') await ApiService.startCodeServer(project.id);
      else if (action === 'stop') await ApiService.stopCodeServer(project.id);
      else if (action === 'restart') await ApiService.restartCodeServer(project.id);
      else if (action === 'delete') await ApiService.deleteCodeServer(project.id);
      else if (action === 'recreate') {
        await ApiService.deleteCodeServer(project.id).catch(() => {});
        await ApiService.createCodeServer(project.id);
      }
      showNotification('success', `IDE ${action} completed.`);
      fetchDetails(true);
    } catch (err: any) {
      showNotification('error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredFiles = useMemo(() => {
    if (!project?.files) return [];
    return project.files.filter(f => 
      f.path.toLowerCase().includes(fileSearch.toLowerCase()) ||
      f.name?.toLowerCase().includes(fileSearch.toLowerCase())
    );
  }, [project?.files, fileSearch]);

  const paginatedFiles = useMemo(() => {
    const start = (filePage - 1) * filePageSize;
    return filteredFiles.slice(start, start + filePageSize);
  }, [filteredFiles, filePage, filePageSize]);

  if (fetchError) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 text-2xl">⚠️</div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Sync Error</h2>
        <p className="text-slate-500 max-w-sm mb-6">{fetchError}</p>
        <Link to="/" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold">Return to Registry</Link>
      </div>
    );
  }

  if (loading && !project) return <div className="h-screen flex items-center justify-center font-bold text-slate-400 animate-pulse uppercase tracking-widest text-xs">Connecting...</div>;
  if (!project) return null;

  return (
    <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8 animate-in fade-in duration-500">
      
      {notification && (
        <div className={`fixed top-20 right-6 z-[60] max-w-sm p-4 rounded-2xl shadow-2xl border animate-in slide-in-from-top-2 duration-300 ${notification.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
          <p className="text-xs font-black uppercase mb-1">{notification.type === 'error' ? 'Operation Failure' : 'Operation OK'}</p>
          <p className="text-sm font-medium">{notification.message}</p>
        </div>
      )}

      {/* Header section with consolidated status */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <Link to="/" className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-1.5 hover:-translate-x-1 transition-transform">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
            Registry
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{project.name}</h1>
            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${project.status === 'ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {project.status}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {project.access_url && project.code_server_status === 'running' && (
             <a href={project.access_url} target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
               Launch VSCode
             </a>
          )}
          {wikiData?.access_url && wikiData?.status === 'running' && (
             <a href={wikiData.access_url} target="_blank" rel="noreferrer" className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5S19.832 5.477 21 6.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
               Open CodeWiki
             </a>
          )}
          <button onClick={() => fetchDetails(true)} disabled={refreshing} className="p-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl hover:bg-slate-50 disabled:opacity-50">
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Simplified Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-6">
             <div className="flex items-center gap-2 mb-2">
               <span className="text-xl">📊</span>
               <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Project Metadata</h3>
             </div>
             <StatItem label="Filename" value={project.original_filename || 'Local Source'} />
             <StatItem label="Archive Size" value={(project.total_size / (1024 * 1024)).toFixed(2) + ' MB'} />
             <StatItem label="Created At" value={new Date(project.created_at).toLocaleDateString()} />
             <div className="pt-2">
               <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1.5">System Reference</p>
               <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-500 break-all">{project.id}</div>
             </div>
          </div>
          
          {project.pvc_name && (
            <div className="bg-indigo-50/30 rounded-3xl border border-indigo-100/50 p-6">
               <h3 className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-4">Persistent Storage</h3>
               <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-700">{project.pvc_name}</p>
                    <p className="text-[10px] text-indigo-500 font-medium">Status: {project.pvc_status || 'Bound'}</p>
                  </div>
                  <div className="text-xl">💾</div>
               </div>
            </div>
          )}
        </div>

        {/* Main Interface */}
        <div className="lg:col-span-3 bg-white rounded-[32px] border border-slate-200 shadow-sm min-h-[750px] flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-100 px-8 bg-slate-50/30 overflow-x-auto no-scrollbar">
            <TabBtn active={activeTab === 'files'} onClick={() => setActiveTab('files')}>Files</TabBtn>
            <TabBtn active={activeTab === 'editor'} onClick={() => setActiveTab('editor')}>IDE Hub</TabBtn>
            <TabBtn active={activeTab === 'wiki'} onClick={() => setActiveTab('wiki')}>CodeWiki</TabBtn>
            <TabBtn active={activeTab === 'infra'} onClick={() => setActiveTab('infra')}>K8s Topology</TabBtn>
            <TabBtn active={activeTab === 'systemLogs'} onClick={() => setActiveTab('systemLogs')}>System Logs</TabBtn>
          </div>

          <div className="flex-1 p-8">
            {activeTab === 'files' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <div className="relative w-full max-w-md">
                    <input type="text" placeholder="Filter files..." value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                    <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeWidth={2} /></svg>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                      <tr><th className="px-6 py-4">Path</th><th className="px-6 py-4 text-right">Size</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {paginatedFiles.length > 0 ? paginatedFiles.map((f, i) => (
                        <tr key={i} className="hover:bg-slate-50/80 group">
                          <td className="px-6 py-3.5 text-sm font-medium text-slate-700 truncate max-w-sm"><span className="mr-3 opacity-50">📄</span>{f.path}</td>
                          <td className="px-6 py-3.5 text-right font-mono text-[11px] text-slate-400">{(f.size / 1024).toFixed(1)} KB</td>
                        </tr>
                      )) : <tr><td colSpan={2} className="py-20 text-center text-slate-400 italic">No files match criteria.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-8 rounded-[24px] bg-slate-50 border border-slate-100 space-y-6">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">IDE Context</h4>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${codeServer?.status === 'running' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                          {codeServer?.status || 'Provisioning'}
                        </span>
                      </div>
                      
                      <StatItem label="Pod Identifier" value={codeServer?.pod_name || 'Allocating...'} isMono />
                      
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Editor Credentials</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 font-mono text-xs text-slate-600 truncate">
                            <span className={showIdePassword ? '' : 'blur-sm select-none'}>{codeServer?.password || 'No pwd set'}</span>
                          </div>
                          <button onClick={() => setShowIdePassword(!showIdePassword)} className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50">{showIdePassword ? '🙈' : '👁️'}</button>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                         <button 
                           onClick={() => handleIDEAction('start')} 
                           disabled={!['stopped', 'error'].includes(codeServer?.status)}
                           className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                         >
                            Start
                         </button>
                         <button 
                           onClick={() => handleIDEAction('stop')} 
                           disabled={codeServer?.status !== 'running'}
                           className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                         >
                            Stop
                         </button>
                         <button 
                           onClick={() => handleIDEAction('restart')} 
                           disabled={codeServer?.status !== 'running'}
                           className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                         >
                            Restart
                         </button>
                      </div>
                   </div>

                   <div className="p-8 rounded-[24px] bg-indigo-50/30 border border-indigo-100/50 space-y-6">
                      <h4 className="text-sm font-black text-indigo-900 uppercase tracking-widest">Infrastructure Management</h4>
                      <p className="text-xs text-indigo-700 leading-relaxed">Modify container runtime parameters or execute deep reconstruction of the IDE workspace.</p>
                      
                      <div className="space-y-3">
                         <button 
                           onClick={() => setConfirmConfig({
                             isOpen: true,
                             title: 'Recreate Editor IDE',
                             message: 'This will purge the current container deployment and spin up a fresh instance. Workspace files are preserved.',
                             action: () => handleIDEAction('recreate'),
                             isDanger: false
                           })}
                           disabled={['creating', 'deleting', 'pending'].includes(codeServer?.status) || actionLoading}
                           className="w-full px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                         >
                           <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                           Recreate Deployment
                         </button>
                         <button 
                           onClick={() => setConfirmConfig({
                             isOpen: true,
                             title: 'Delete IDE Instance',
                             message: 'Completely remove the IDE runtime. Storage remains intact.',
                             action: () => handleIDEAction('delete'),
                             isDanger: true
                           })}
                           disabled={codeServer?.status === 'deleting' || actionLoading}
                           className="w-full px-5 py-3 border border-red-200 text-red-600 rounded-xl text-xs font-bold hover:bg-red-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                         >
                           Terminate IDE Runtime
                         </button>
                      </div>
                   </div>
                 </div>

                 <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IDE Container Logs (Runtime)</h5>
                      <div className="flex items-center gap-2">
                        <select value={ideLogLines} onChange={(e) => setIdeLogLines(Number(e.target.value))} className="bg-white border border-slate-200 rounded-lg text-[10px] font-bold px-2 py-1 outline-none">
                          <option value={100}>100 Lines</option>
                          <option value={500}>500 Lines</option>
                        </select>
                        <button onClick={fetchIdeLogs} className="p-1 text-indigo-600"><svg className={`w-4 h-4 ${isIdeLogsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                      </div>
                    </div>
                    <div className="bg-slate-950 rounded-2xl p-6 font-mono text-[11px] text-emerald-400/80 h-96 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-xl border border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
                      {isIdeLogsLoading ? 'Fetching stream...' : ideLogs}
                    </div>
                 </div>
              </div>
            )}

            {activeTab === 'wiki' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                 {!wikiData ? (
                   <div className="max-w-xl mx-auto py-12">
                      <div className="text-center mb-10">
                         <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">📖</div>
                         <h3 className="text-xl font-black text-slate-900">Provision CodeWiki</h3>
                         <p className="text-slate-500 text-sm mt-2">Generate deep architectural documentation from your source using AI-powered static analysis.</p>
                      </div>
                      <form onSubmit={handleCreateWiki} className="space-y-5 p-8 bg-slate-50 border border-slate-100 rounded-3xl shadow-sm">
                         <div>
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">AI Gateway Key</label>
                           <input type="password" placeholder="Enter API Key for Analysis..." value={wikiConfig.api_key} onChange={(e) => setWikiConfig({...wikiConfig, api_key: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-mono" />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">CPU Limit</label>
                             <select value={wikiConfig.cpu_limit} onChange={(e) => setWikiConfig({...wikiConfig, cpu_limit: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold">
                               <option value="1000m">1.0 Core</option>
                               <option value="2000m">2.0 Cores</option>
                             </select>
                           </div>
                           <div>
                             <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">RAM Limit</label>
                             <select value={wikiConfig.memory_limit} onChange={(e) => setWikiConfig({...wikiConfig, memory_limit: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none text-sm font-bold">
                               <option value="1024Mi">1024 Mi</option>
                               <option value="2048Mi">2048 Mi</option>
                             </select>
                           </div>
                         </div>
                         <button type="submit" disabled={actionLoading} className="w-full py-3.5 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">Initialize Wiki Environment</button>
                      </form>
                   </div>
                 ) : (
                   <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 p-8 rounded-[24px] bg-emerald-50/30 border border-emerald-100/50 flex flex-col justify-between">
                           <div>
                             <div className="flex justify-between mb-6">
                               <h4 className="text-sm font-black text-emerald-900 uppercase tracking-widest">CodeWiki Status</h4>
                               <div className="flex items-center gap-3">
                                 <button onClick={() => setIsWikiLogModalOpen(true)} className="px-3 py-1 bg-white border border-emerald-200 rounded-lg text-[10px] font-black text-emerald-600 uppercase hover:bg-emerald-50 shadow-sm transition-all">
                                   View Service Logs
                                 </button>
                                 <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${wikiData.status === 'running' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                   {wikiData.status}
                                 </span>
                               </div>
                             </div>
                             <div className="grid grid-cols-2 gap-8">
                               <StatItem label="Pod Status" value={wikiData.pod_status || 'Checking...'} />
                               <StatItem label="Provisioned At" value={new Date(wikiData.created_at).toLocaleString()} />
                               <StatItem label="Allocation" value={`${wikiData.cpu_limit} / ${wikiData.memory_limit}`} />
                               <StatItem label="Deployment" value={wikiData.deployment_name || 'N/A'} isMono />
                             </div>
                           </div>
                           <div className="flex gap-3 mt-8">
                              <button 
                                onClick={() => handleWikiAction('start')} 
                                disabled={!['stopped', 'error'].includes(wikiData.status)}
                                className="flex-1 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed transition-all"
                              >
                                Start
                              </button>
                              <button 
                                onClick={() => handleWikiAction('stop')} 
                                disabled={wikiData.status !== 'running'}
                                className="flex-1 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed transition-all"
                              >
                                Stop
                              </button>
                              <button 
                                onClick={() => handleWikiAction('restart')} 
                                disabled={wikiData.status !== 'running'}
                                className="flex-1 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 disabled:cursor-not-allowed transition-all"
                              >
                                Restart
                              </button>
                              <button 
                                onClick={() => handleWikiAction('delete')} 
                                disabled={wikiData.status === 'deleting'}
                                className="px-4 py-2 border border-red-200 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                              >
                                Terminate
                              </button>
                           </div>
                        </div>
                        <div className="p-8 rounded-[24px] bg-slate-900 text-white space-y-6">
                           <h4 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Analysis Control</h4>
                           <p className="text-xs text-slate-400 leading-relaxed">Trigger static analysis tasks to scan project structure and generate updated documentation pages.</p>
                           <button 
                             onClick={handleCreateWikiTask} 
                             disabled={wikiData.status !== 'running' || actionLoading} 
                             className="w-full py-3 bg-white text-slate-900 rounded-xl font-bold text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
                           >
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             New Analysis Task
                           </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Analysis Tasks</h5>
                           <button onClick={fetchWikiTasks} disabled={isWikiTaskLoading} className="text-indigo-600 text-[10px] font-bold hover:underline flex items-center gap-1">
                             {isWikiTaskLoading && <div className="w-2 h-2 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>}
                             Refresh Tasks
                           </button>
                        </div>
                        <div className="rounded-2xl border border-slate-100 overflow-hidden bg-white shadow-sm">
                           <table className="w-full text-left text-xs">
                             <thead className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase">
                               <tr>
                                 <th className="px-6 py-3">Task ID</th>
                                 <th className="px-6 py-3">Status</th>
                                 <th className="px-6 py-3">Started</th>
                                 <th className="px-6 py-3 text-right">Actions</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-50">
                               {wikiTasks.length > 0 ? wikiTasks.map((t, i) => (
                                 <React.Fragment key={t.id || i}>
                                   <tr className="hover:bg-slate-50/80 transition-colors">
                                     <td className="px-6 py-3 font-mono text-slate-500">{t.id?.substring(0,8)}...</td>
                                     <td className="px-6 py-3">
                                       <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase flex w-fit items-center gap-1.5 ${
                                         t.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                         t.status === 'failed' ? 'bg-red-50 text-red-600 border border-red-100' : 
                                         'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                                       }`}>
                                         {t.status}
                                       </span>
                                       {t.error_message && <p className="text-[9px] text-red-400 mt-1 max-w-[200px] truncate" title={t.error_message}>{t.error_message}</p>}
                                     </td>
                                     <td className="px-6 py-3 text-slate-400">{new Date(t.created_at).toLocaleString()}</td>
                                     <td className="px-6 py-3 text-right">
                                        <button onClick={() => fetchWikiTaskLogs(t.id)} className="text-indigo-600 font-bold hover:underline">View Logs</button>
                                     </td>
                                   </tr>
                                   {selectedWikiTaskLogs?.id === t.id && (
                                     <tr>
                                       <td colSpan={4} className="bg-slate-900 p-8 animate-in slide-in-from-top-2">
                                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
                                             <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                                               <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                                               Analysis Stream: {t.id}
                                             </p>
                                             <button onClick={() => setSelectedWikiTaskLogs(null)} className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white text-[10px] font-bold transition-all uppercase">Close Logs</button>
                                          </div>
                                          <div className="font-mono text-[11px] text-emerald-400/90 whitespace-pre-wrap h-[600px] overflow-y-auto leading-relaxed scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
                                            {selectedWikiTaskLogs.logs}
                                          </div>
                                       </td>
                                     </tr>
                                   )}
                                 </React.Fragment>
                               )) : (
                                 <tr>
                                   <td colSpan={4} className="py-12 text-center text-slate-400 italic">
                                     {isWikiTaskLoading ? 'Searching for tasks...' : 'No analysis tasks found for this project.'}
                                   </td>
                                 </tr>
                               )}
                             </tbody>
                           </table>
                        </div>
                      </div>
                   </div>
                 )}
              </div>
            )}

            {activeTab === 'infra' && (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kubernetes Deployment</h5>
                      <InfraPanel label="Deployment Name" value={k8sInfo?.deployment?.name || 'Searching...'} isMono />
                      <InfraPanel label="Replicas" value={`${k8sInfo?.deployment?.available_replicas || 0}/${k8sInfo?.deployment?.replicas || 0}`} status={k8sInfo?.deployment?.available_replicas > 0 ? 'ready' : 'pending'} />
                    </div>
                    <div className="space-y-4">
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Service</h5>
                      <InfraPanel label="Cluster IP" value={k8sInfo?.service?.cluster_ip || 'None'} isMono />
                      <InfraPanel label="Ingress URL" value={project.access_url || 'Provisioning...'} />
                    </div>
                 </div>
                 
                 <div className="bg-slate-900 rounded-[32px] p-10 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none group-hover:scale-110 transition-transform">
                      <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                   </div>
                   <div className="relative z-10">
                      <h4 className="text-xl font-black text-white mb-2">Storage Maintenance</h4>
                      <p className="text-slate-400 text-sm max-w-lg mb-8">Execute deep operations on persistent project storage. These actions can be destructive to existing data on the volume.</p>
                      <button 
                         onClick={() => setConfirmConfig({
                           isOpen: true,
                           title: 'Purge & Recreate PVC',
                           message: 'CRITICAL: This will PERMANENTLY ERASE all data in the current workspace and provision a fresh storage volume. This cannot be undone.',
                           action: () => ApiService.recreatePVC(project.id),
                           isDanger: true
                         })}
                         disabled={actionLoading}
                         className="px-8 py-3 bg-red-900/40 text-red-200 border border-red-800/50 rounded-xl text-xs font-bold hover:bg-red-900/60 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         Force PVC Reconstruction
                      </button>
                   </div>
                 </div>
              </div>
            )}

            {activeTab === 'systemLogs' && (
              <div className="flex h-full animate-in fade-in">
                 <div className="w-56 border-r border-slate-100 pr-6 py-2 space-y-2">
                    <h5 className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-4">Log Sources</h5>
                    {systemLogs.map((log, idx) => (
                      <button key={idx} onClick={() => setSelectedSystemLog(idx)} className={`w-full text-left px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedSystemLog === idx ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                        {log.type}
                      </button>
                    ))}
                 </div>
                 <div className="flex-1 pl-8 py-2">
                    <div className="bg-slate-950 rounded-2xl p-8 font-mono text-[11px] text-emerald-400/80 h-full max-h-[600px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-2xl border border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
                      {systemLogs[selectedSystemLog]?.content || 'Logging context is being aggregated...'}
                    </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDanger={confirmConfig.isDanger}
        onConfirm={async () => { await confirmConfig.action(); setConfirmConfig(p => ({ ...p, isOpen: false })); }}
        onCancel={() => setConfirmConfig(p => ({ ...p, isOpen: false }))}
      />

      {/* CodeWiki Service Log Modal */}
      {isWikiLogModalOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-8 bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-slate-950 rounded-[32px] w-full max-w-6xl h-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-800 animate-in zoom-in duration-300">
            <div className="p-8 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]"></div>
                <h3 className="text-xl font-black text-white uppercase tracking-widest">Wiki Service Runtime Stream</h3>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={fetchWikiLogs} className="p-2 text-slate-400 hover:text-white transition-colors">
                   <svg className={`w-5 h-5 ${isWikiLogsLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
                <button onClick={() => setIsWikiLogModalOpen(false)} className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-full text-slate-300 transition-all">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="flex-1 p-8 overflow-hidden">
               <div className="bg-black/50 rounded-2xl h-full font-mono text-[12px] text-emerald-400/80 p-6 overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-inner scrollbar-thin scrollbar-track-slate-900 scrollbar-thumb-slate-700">
                  {isWikiLogsLoading ? 'Synchronizing logs...' : wikiLogs || 'No active service output detected.'}
               </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end">
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Internal Service Relay: {id}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
