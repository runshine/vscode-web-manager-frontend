
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { Project, FileItem, ProjectStatus } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [jumpPage, setJumpPage] = useState('');

  // Log Viewer States
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isLogExpanded, setIsLogExpanded] = useState(false);
  const [activeLogType, setActiveLogType] = useState('all');
  const [logs, setLogs] = useState<any[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Deletion state
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

  const fetchDetails = async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      const data = await ApiService.getProjectDetails(id);
      
      const rawProject = data.project || {};
      let rawFiles = data.files || [];
      if (Array.isArray(rawFiles) && Array.isArray(rawFiles[0])) {
        rawFiles = rawFiles.flat();
      }

      const combinedProject: Project = {
        ...rawProject,
        id: rawProject.id || id,
        files: rawFiles,
        code_server_status: data.code_server?.status || rawProject.code_server_status || null,
        access_url: data.code_server?.access_url || rawProject.access_url || null,
        error_message: data.code_server?.error_message || rawProject.error_message || null
      };

      setProject(combinedProject);
    } catch (err: any) {
      console.error('Fetch Details Error:', err);
      if (loading) {
        alert('Failed to load project details: ' + err.message);
        navigate('/');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (!id || !isLogOpen) return;
    try {
      setFetchingLogs(true);
      const data = await ApiService.getDeploymentLogs(id, activeLogType);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Log error:', err);
    } finally {
      setFetchingLogs(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id, navigate]);

  useEffect(() => {
    if (isLogOpen) {
      fetchLogs();
      const interval = setInterval(fetchLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [isLogOpen, id, activeLogType]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleCreateIDE = async () => {
    if (!project?.id) return;
    try {
      setActionLoading(true);
      const res = await ApiService.createCodeServer(project.id);
      alert('Deployment task submitted. Task ID: ' + res.task_id);
      fetchDetails(true);
    } catch (err: any) {
      alert('Failed: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleIDEAction = async (action: 'start' | 'stop' | 'restart' | 'delete') => {
    if (!project?.id) return;
    
    const execute = async () => {
      try {
        setActionLoading(true);
        if (action === 'start') await ApiService.startCodeServer(project.id);
        if (action === 'stop') await ApiService.stopCodeServer(project.id);
        if (action === 'restart') await ApiService.restartCodeServer(project.id);
        if (action === 'delete') await ApiService.deleteCodeServer(project.id);
        fetchDetails(true);
      } catch (err: any) {
        alert('Action failed: ' + err.message);
      } finally {
        setActionLoading(false);
        setConfirmConfig(p => ({ ...p, isOpen: false }));
      }
    };

    if (action === 'delete') {
      setConfirmConfig({
        isOpen: true,
        title: 'Delete IDE Environment',
        message: 'Are you sure you want to delete the Kubernetes resources (Deployment, Service, PVC) for this IDE? This will NOT delete your source code.',
        action: execute
      });
    } else {
      execute();
    }
  };

  const mapStatus = (status: string | null): ProjectStatus => {
    if (!status) return 'waiting';
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'creating' || s === 'deleting') return 'creating';
    if (s === 'running' || s === 'success' || s === 'active') return 'success';
    if (s === 'error' || s === 'failed') return 'failed';
    return 'waiting';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const filteredFiles = useMemo(() => {
    if (!project?.files) return [];
    if (!fileSearch.trim()) return project.files;
    const query = fileSearch.toLowerCase();
    return project.files.filter(f => 
      (f.name || '').toLowerCase().includes(query) || 
      (f.path || '').toLowerCase().includes(query)
    );
  }, [project?.files, fileSearch]);

  const totalPages = Math.ceil(filteredFiles.length / pageSize) || 1;
  const paginatedFiles = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFiles.slice(start, start + pageSize);
  }, [filteredFiles, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Loading Details...</p>
      </div>
    );
  }

  if (!project) return null;
  const currentStatus = mapStatus(project.code_server_status);

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Header Info & Lifecycle Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4 min-w-0 flex-1">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <div className="min-w-0">
            <Link to="/" className="text-xs font-bold text-indigo-600 hover:underline uppercase tracking-widest mb-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
              Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">{project.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
               <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1.5 ${
                 currentStatus === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm shadow-emerald-50' : 
                 currentStatus === 'creating' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100 animate-pulse' :
                 currentStatus === 'failed' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-400 border border-slate-200'
               }`}>
                 <div className={`w-1.5 h-1.5 rounded-full ${currentStatus === 'success' ? 'bg-emerald-500' : currentStatus === 'creating' ? 'bg-indigo-500' : 'bg-slate-400'}`}></div>
                 {project.code_server_status || 'Offline'}
               </span>
               <button 
                 onClick={() => setIsLogOpen(true)}
                 className="text-[10px] font-bold px-2 py-0.5 rounded uppercase bg-slate-900 text-slate-300 hover:text-white transition-colors flex items-center gap-1"
               >
                 <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 Deployment Logs
               </button>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {!project.code_server_status || project.code_server_status === 'deleting' ? (
            <button 
              onClick={handleCreateIDE}
              disabled={actionLoading}
              className="flex-1 lg:flex-none px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              Deploy Code-Server
            </button>
          ) : (
            <>
              {currentStatus === 'success' && project.access_url && (
                <a href={project.access_url} target="_blank" rel="noreferrer" className="flex-1 lg:flex-none px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700 transition-all text-xs sm:text-sm flex items-center gap-2">
                  Open IDE
                </a>
              )}
              {project.code_server_status === 'stopped' ? (
                <button onClick={() => handleIDEAction('start')} disabled={actionLoading} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all text-xs sm:text-sm">Start</button>
              ) : (
                <button onClick={() => handleIDEAction('stop')} disabled={actionLoading} className="px-4 py-2.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs sm:text-sm">Stop</button>
              )}
              <button onClick={() => handleIDEAction('restart')} disabled={actionLoading} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-all text-xs sm:text-sm">Restart</button>
              <button onClick={() => handleIDEAction('delete')} disabled={actionLoading} className="px-4 py-2.5 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold hover:bg-red-100 transition-all text-xs sm:text-sm">Delete Environment</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Repository Meta</h3>
              <button onClick={() => window.open(ApiService.getDownloadArchiveUrl(project.id), '_blank')} className="text-indigo-600 hover:underline text-[10px] font-bold uppercase tracking-widest">Download ZIP</button>
            </div>
            <div className="p-5 space-y-5">
              <DetailItem label="Created At" value={project.created_at ? new Date(project.created_at).toLocaleString() : 'N/A'} icon="📅" />
              <DetailItem label="Storage" value={formatSize(project.total_size)} icon="⚖️" />
              <DetailItem label="Files" value={`${project.file_count || 0} items`} icon="📂" />
              <DetailItem label="Source" value={project.original_filename || 'N/A'} icon="📄" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 sm:p-6 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-lg font-bold text-slate-900">File Explorer</h2>
              <div className="relative w-full sm:w-80">
                 <input 
                   type="text" 
                   placeholder="Search files..." 
                   value={fileSearch}
                   onChange={(e) => setFileSearch(e.target.value)}
                   className="w-full pl-4 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs sm:text-sm transition-all" 
                 />
              </div>
            </div>
          </div>

          <div className="relative overflow-x-auto min-h-[400px]">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3 w-1/2">Name</th>
                  <th className="px-6 py-3 w-1/4 text-right">Size</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedFiles.map((file, idx) => (
                  <tr key={`${file.path}-${idx}`} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                         <span className="text-xs sm:text-sm font-semibold text-slate-700 truncate block">{file.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-xs text-slate-500 font-mono">{formatSize(file.size)}</td>
                    <td className="px-6 py-4 text-right">
                       <button onClick={() => ApiService.downloadFile(project.id, file.path, file.name)} className="text-indigo-600 hover:bg-indigo-50 p-1 rounded transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" strokeWidth={2} /></svg></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Advanced Log Viewer Modal */}
      {isLogOpen && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 sm:p-8 bg-slate-950/90 backdrop-blur-lg animate-in fade-in duration-300">
          <div className={`bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ${isLogExpanded ? 'w-full h-full' : 'w-full max-w-5xl h-[85vh]'}`}>
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${fetchingLogs ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                <div>
                  <h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest">K8s Deployment Monitor</h3>
                  <div className="flex gap-4 mt-2">
                    {['all', 'code-server', 'init', 'copy-job'].map(type => (
                      <button 
                        key={type} 
                        onClick={() => setActiveLogType(type)}
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded transition-all ${activeLogType === type ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {type.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsLogExpanded(!isLogExpanded)} className="p-2 text-slate-400 hover:text-white"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" strokeWidth={2} /></svg></button>
                <button onClick={() => setIsLogOpen(false)} className="p-2 text-slate-400 hover:text-red-400"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2} /></svg></button>
              </div>
            </div>
            
            <div className="flex-1 bg-black p-6 overflow-y-auto font-mono text-xs sm:text-sm text-slate-300">
               {logs.length > 0 ? (
                 <div className="space-y-6">
                   {logs.map((logGroup, idx) => (
                     <div key={idx} className="border-l-2 border-slate-800 pl-4 py-2">
                       <div className="text-indigo-400 text-[10px] font-bold uppercase mb-2 flex items-center gap-2">
                         <span className="bg-indigo-900/50 px-1.5 py-0.5 rounded">{logGroup.source}</span>
                         {logGroup.container && <span className="opacity-50">Container: {logGroup.container}</span>}
                         {logGroup.pod && <span className="opacity-50">Pod: {logGroup.pod}</span>}
                       </div>
                       <pre className="whitespace-pre-wrap break-all leading-relaxed opacity-90">
                         {logGroup.content || logGroup.error || 'Empty output...'}
                       </pre>
                     </div>
                   ))}
                   <div ref={logEndRef} />
                 </div>
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-700 italic">No logs found for this filter.</div>
               )}
            </div>
            
            <div className="px-6 py-2 border-t border-slate-800 bg-slate-900/30 flex justify-between items-center text-[10px] text-slate-500 font-bold">
               <div className="flex items-center gap-4 uppercase tracking-widest">
                 <span>Status: {fetchingLogs ? 'Streaming' : 'Idle'}</span>
                 <span>Refresh: 5s Auto</span>
               </div>
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                 Cluster Connected
               </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmConfig.action}
        onCancel={() => setConfirmConfig(p => ({ ...p, isOpen: false }))}
        isLoading={actionLoading}
      />
    </div>
  );
};

const DetailItem: React.FC<{label: string; value: string; icon: string}> = ({label, value, icon}) => (
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-base shrink-0">{icon}</div>
    <div className="min-w-0">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
      <p className="text-xs font-bold text-slate-700 break-words">{value}</p>
    </div>
  </div>
);

export default ProjectDetail;
