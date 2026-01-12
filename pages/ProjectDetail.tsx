
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { Project, FileItem } from '../types';
import ConfirmModal from '../components/ConfirmModal';

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [codeServer, setCodeServer] = useState<any>(null);
  const [k8sInfo, setK8sInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'files' | 'infra' | 'logs'>('files');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [initLogs, setInitLogs] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  // File List States
  const [fileSearch, setFileSearch] = useState('');
  const [filePage, setFilePage] = useState(1);
  const [filePageSize, setFilePageSize] = useState(100);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; action: () => Promise<void>; isDanger?: boolean;
  }>({ isOpen: false, title: '', message: '', action: async () => { }, isDanger: true });

  const fetchLogs = async (projectId: string) => {
    try {
      const logData = await ApiService.getProjectInitLogs(projectId, 800);
      let content = '';
      if (typeof logData === 'string') {
        content = logData;
      } else if (logData) {
        content = logData.log_content || logData.logs || logData.content || logData.detail || '';
      }
      setInitLogs(content || 'Logs are currently empty or being generated...');
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setInitLogs('System failed to retrieve logs.');
    }
  };

  const fetchDetails = async (isSilent = false) => {
    if (!id) return;
    try {
      if (!isSilent) setLoading(true);
      if (isSilent) setRefreshing(true);

      const [data, csResponse] = await Promise.all([
        ApiService.getProjectDetails(id),
        ApiService.getCodeServer(id).catch(() => null)
      ]);

      const csData = csResponse?.code_server || null;
      const k8sData = csResponse?.k8s_info || null;

      const mergedProject = {
        ...data.project,
        files: data.files || [],
        code_server_status: csData?.status || data.code_server?.status || null,
        access_url: csData?.access_url || data.code_server?.access_url || null
      };

      setProject(mergedProject);
      setCodeServer(csData);
      setK8sInfo(k8sData);

      if (activeTab === 'logs' || mergedProject.status === 'initializing' || mergedProject.status === 'pending') {
        fetchLogs(id);
      }
    } catch (err: any) {
      console.error("Project fetch error:", err);
      if (!isSilent) navigate('/');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    const interval = setInterval(() => fetchDetails(true), 15000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    if (activeTab === 'logs' && id) {
      fetchLogs(id);
    }
  }, [activeTab]);

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

  const totalFilePages = Math.ceil(filteredFiles.length / filePageSize);

  const handleCreateIDE = async () => {
    if (!project?.id) return;
    try {
      setActionLoading(true);
      await ApiService.createCodeServer(project.id);
      await fetchDetails(true);
    } catch (err: any) { alert(err.message); } finally { setActionLoading(false); }
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
      await fetchDetails(true);
    } catch (err: any) { alert(err.message); } finally { setActionLoading(false); }
  };

  const handlePVCAction = async (action: 'recreate') => {
    if (!project?.id) return;
    try {
      setActionLoading(true);
      if (action === 'recreate') {
        await ApiService.recreatePVC(project.id);
      }
      await fetchDetails(true);
    } catch (err: any) { alert(err.message); } finally { setActionLoading(false); }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleCopyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const handleDownloadFile = (f: FileItem) => {
    if (!project?.id) return;
    ApiService.downloadFile(project.id, f.path, f.path.split('/').pop() || 'file');
  };

  const handleEditInIDE = (f: FileItem) => {
    if (!project?.access_url) return;
    const editUrl = `${project.access_url}/?folder=/config/workspace/${f.path}`;
    window.open(editUrl, '_blank');
  };

  if (loading && !project) return <div className="p-20 text-center animate-pulse text-slate-400 font-medium">Synchronizing Project Environment...</div>;
  if (!project) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-12 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="space-y-1">
          <Link to="/" className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center gap-1.5 hover:translate-x-[-4px] transition-transform">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path d="M15 19l-7-7 7-7" /></svg>
            Registry
          </Link>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">{project.name}</h1>
            <div className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase border ${
              project.status === 'ready' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
              project.status === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
            }`}>
              {project.status}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => fetchDetails(true)} 
            disabled={refreshing}
            className="p-3 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center disabled:opacity-50"
            title="Manual Refresh"
          >
            <svg className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {project.status === 'ready' && (
            <>
              {project.code_server_status === 'running' ? (
                <div className="flex gap-2">
                  <a href={project.access_url} target="_blank" rel="noreferrer" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                    Open Editor
                  </a>
                  <button onClick={() => handleIDEAction('stop')} disabled={actionLoading} className="px-4 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors text-sm">Stop IDE</button>
                </div>
              ) : (project.code_server_status === 'creating' || project.code_server_status === 'pending') ? (
                <button disabled className="px-6 py-3 bg-indigo-50 text-indigo-400 rounded-xl font-bold text-sm animate-pulse flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
                  Spinning Up...
                </button>
              ) : (
                <button onClick={handleCreateIDE} disabled={actionLoading} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all text-sm flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Setup IDE
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Info Display (Bottom-Left) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
              <span className="text-lg">📁</span>
              <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Metadata</span>
            </div>
            <div className="p-6 space-y-5">
              <StatItem label="Filename" value={project.original_filename || 'Internal Resource'} />
              <StatItem label="Provisioned" value={new Date(project.created_at).toLocaleString()} />
              <StatItem label="UUID" value={project.id} isMono />
            </div>
          </div>

          {codeServer && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-indigo-50/50 border-b border-indigo-100 flex items-center gap-2">
                <span className="text-lg">⚡</span>
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Runtime Info</span>
              </div>
              <div className="p-6 space-y-5">
                <StatItem 
                  label="IDE Status" 
                  value={`${codeServer.status?.toUpperCase()} (${codeServer.pod_status || 'N/A'})`} 
                  status={codeServer.status === 'running' ? 'ready' : (codeServer.status === 'stopped' ? 'error' : 'pending')} 
                />
                
                <div className="pt-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Access Password</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-grow bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 font-mono text-xs text-slate-600 flex items-center min-h-[38px] overflow-hidden">
                      <span className={showPassword ? 'break-all' : 'blur-[4px] select-none break-all'}>
                        {codeServer.password || 'No password set'}
                      </span>
                    </div>
                    <button onClick={() => setShowPassword(!showPassword)} className="p-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200">
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                    {codeServer.password && (
                      <button 
                        onClick={() => handleCopyPassword(codeServer.password)}
                        className={`p-2 rounded-lg ${copyStatus === 'copied' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                      >
                        {copyStatus === 'copied' ? '✓' : '📋'}
                      </button>
                    )}
                  </div>
                </div>

                <StatItem label="Allocation" value={`${codeServer.cpu_limit} CPU / ${codeServer.memory_limit} RAM`} />
                <StatItem label="Pod Identifier" value={codeServer.pod_name || 'Allocating...'} isMono />
                
                {codeServer.access_url && (
                  <div className="pt-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Public Endpoint</p>
                    <a href={codeServer.access_url} target="_blank" rel="noreferrer" className="text-[11px] font-mono text-indigo-600 break-all hover:underline bg-indigo-50/50 p-2 rounded-lg block border border-indigo-100/50">
                      {codeServer.access_url}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 shadow-sm min-h-[700px] flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-100 px-6 bg-slate-50/20">
            <TabBtn active={activeTab === 'files'} onClick={() => setActiveTab('files')}>Files</TabBtn>
            <TabBtn active={activeTab === 'infra'} onClick={() => setActiveTab('infra')}>K8s Infra</TabBtn>
            <TabBtn active={activeTab === 'logs'} onClick={() => setActiveTab('logs')}>Init Logs</TabBtn>
          </div>

          <div className="flex-1 p-8">
            {activeTab === 'files' && (
              project.status === 'ready' ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-md">
                      <input 
                        type="text" 
                        placeholder="Search files by path..." 
                        value={fileSearch}
                        onChange={(e) => { setFileSearch(e.target.value); setFilePage(1); }}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                      />
                      <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <label className="text-[10px] font-black text-slate-400 uppercase whitespace-nowrap">Page Size:</label>
                      <select 
                        value={filePageSize} 
                        onChange={(e) => { setFilePageSize(Number(e.target.value)); setFilePage(1); }}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 outline-none"
                      >
                        <option value={100}>100</option>
                        <option value={500}>500</option>
                        <option value={1000}>1000</option>
                        <option value={5000}>5000</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-100">
                    <table className="w-full text-left">
                      <thead className="text-[10px] font-black text-slate-400 uppercase bg-slate-50/50 border-b border-slate-100">
                        <tr>
                          <th className="py-4 px-6">Path</th>
                          <th className="py-4 px-4 text-right">Size</th>
                          <th className="py-4 px-6 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {paginatedFiles.length > 0 ? (
                          paginatedFiles.map((f, i) => (
                            <tr key={i} className="hover:bg-indigo-50/30 transition-colors group">
                              <td className="py-3 px-6 text-sm text-slate-700 font-medium truncate max-w-[300px]">
                                 <span className="mr-3">📄</span>{f.path}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-[11px] text-slate-400">{formatSize(f.size)}</td>
                              <td className="py-3 px-6 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {project.code_server_status === 'running' && (
                                    <button onClick={() => handleEditInIDE(f)} className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit in Code-Server">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    </button>
                                  )}
                                  <button onClick={() => handleDownloadFile(f)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Download File">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr><td colSpan={3} className="py-20 text-center text-slate-400 italic">No files match your search.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {totalFilePages > 1 && (
                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                      <p className="text-xs text-slate-400 font-medium">Showing <span className="text-slate-700">{(filePage - 1) * filePageSize + 1}</span> to <span className="text-slate-700">{Math.min(filePage * filePageSize, filteredFiles.length)}</span> of <span className="text-slate-700">{filteredFiles.length}</span></p>
                      <div className="flex gap-2">
                        <button disabled={filePage === 1} onClick={() => setFilePage(p => p - 1)} className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30">Prev</button>
                        <button disabled={filePage === totalFilePages} onClick={() => setFilePage(p => p + 1)} className="px-3 py-1 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30">Next</button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                   <div className="w-16 h-16 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mb-6" />
                   <h3 className="text-xl font-black text-slate-800">Environment Setup...</h3>
                </div>
              )
            )}

            {activeTab === 'infra' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compute Context</h5>
                    {k8sInfo?.deployment ? (
                       <div className="space-y-3">
                          <InfraPanel label="Available Replicas" value={`${k8sInfo.deployment.available_replicas}/${k8sInfo.deployment.replicas}`} status={k8sInfo.deployment.available_replicas > 0 ? 'ready' : 'pending'} />
                          <InfraPanel label="Internal IP" value={k8sInfo.deployment.pods?.[0]?.ip || 'Pending'} sub={`Node: ${k8sInfo.deployment.pods?.[0]?.node}`} />
                       </div>
                    ) : <p className="text-xs text-slate-400">Loading K8s context...</p>}
                  </div>

                  <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Network Ingress</h5>
                    {k8sInfo?.service ? (
                       <div className="space-y-3">
                          <InfraPanel label="Cluster Virtual IP" value={k8sInfo.service.cluster_ip} sub={`Protocol: TCP/80`} />
                          <InfraPanel label="External Access" value={k8sInfo.service.load_balancer?.[0]?.ip || 'None'} status={k8sInfo.service.load_balancer?.[0]?.ip ? 'ready' : 'pending'} />
                       </div>
                    ) : <p className="text-xs text-slate-400">Network sync in progress.</p>}
                  </div>
                </div>

                <div className="space-y-4">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Persistent Storage</h5>
                    {k8sInfo?.pvc ? (
                       <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <InfraPanel label="Storage Class" value={k8sInfo.pvc.storage_class} isMono />
                          <InfraPanel label="Provisioned Size" value={k8sInfo.pvc.capacity} status={k8sInfo.pvc.status === 'Bound' ? 'ready' : 'pending'} />
                          <InfraPanel label="Volume ID" value={k8sInfo.pvc.volume_name} isMono />
                       </div>
                    ) : <p className="text-xs text-slate-400">Volume lookup active.</p>}
                </div>

                {/* Reconstruction Operations Section */}
                <div className="bg-slate-900 rounded-3xl p-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <svg className="w-24 h-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-lg font-black text-white mb-2">Infrastructure Maintenance</h4>
                    <p className="text-slate-400 text-sm max-w-lg mb-8">Execute reconstruction operations on project resources. Note that PVC reconstruction will purge all current data on the volume.</p>
                    <div className="flex flex-wrap gap-4">
                      {/* Code Server Reconstruction */}
                      <button 
                        onClick={() => setConfirmConfig({
                          isOpen: true,
                          title: 'Recreate IDE',
                          message: 'This will delete the current IDE deployment and start a new one. Your configuration may be reset, but persistent data in the workspace is preserved.',
                          action: () => handleIDEAction('recreate'),
                          isDanger: false
                        })}
                        disabled={actionLoading}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Recreate IDE
                      </button>

                      {/* PVC Reconstruction - Disabled when codeServer exists */}
                      <button 
                        onClick={() => setConfirmConfig({
                          isOpen: true,
                          title: 'Recreate PVC',
                          message: 'DANGER: This will PERMANENTLY DELETE all current storage data and recreate the Persistent Volume Claim. This action cannot be undone.',
                          action: () => handlePVCAction('recreate'),
                          isDanger: true
                        })}
                        disabled={actionLoading || !!codeServer}
                        title={codeServer ? "You must delete the IDE instance before recreating the storage volume." : "Permanently delete and recreate storage"}
                        className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                          (actionLoading || !!codeServer) 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-60' 
                            : 'bg-red-900/40 text-red-200 border border-red-800/50 hover:bg-red-900/60'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Recreate PVC
                      </button>

                      <button onClick={() => handleIDEAction('restart')} className="px-5 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 transition-colors">Bounce Pod</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="flex flex-col h-full space-y-4">
                <div className="bg-slate-950 rounded-2xl p-8 font-mono text-[11px] text-emerald-400/80 flex-1 min-h-[450px] max-h-[600px] overflow-y-auto whitespace-pre-wrap leading-relaxed shadow-2xl border border-slate-800 scrollbar-thin scrollbar-thumb-slate-800">
                  {initLogs ? initLogs : 'Aggregating container stdout...'}
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
    </div>
  );
};

const StatItem = ({ label, value, status, isMono }: { label: string; value: string; status?: string; isMono?: boolean }) => (
  <div className="group">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">{label}</p>
    <div className="flex items-center gap-2">
      {status && (
        <div className={`w-2 h-2 rounded-full ${status === 'ready' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : (status === 'error' ? 'bg-red-500' : 'bg-amber-400 animate-pulse')}`} />
      )}
      <p className={`text-xs font-bold text-slate-700 truncate ${isMono ? 'font-mono tracking-tight text-slate-500' : ''}`}>{value}</p>
    </div>
  </div>
);

const TabBtn = ({ children, active, onClick }: { children?: React.ReactNode; active: boolean; onClick: () => void }) => (
  <button onClick={onClick} className={`px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 whitespace-nowrap ${active ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>{children}</button>
);

const InfraPanel = ({ label, value, sub, status, isMono }: { label: string; value: string; sub?: string; status?: string; isMono?: boolean }) => (
  <div className="p-5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between shadow-sm hover:border-slate-300 transition-colors group">
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className={`text-sm font-black text-slate-800 truncate mb-0.5 ${isMono ? 'font-mono text-xs text-slate-500' : ''}`}>{value}</p>
      {sub && <p className="text-[9px] font-bold text-slate-400">{sub}</p>}
    </div>
    {status && (
      <div className={`shrink-0 ml-4 w-2.5 h-2.5 rounded-full ${status === 'ready' ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]' : (status === 'error' ? 'bg-red-500' : 'bg-amber-400 animate-pulse')}`} />
    )}
  </div>
);

export default ProjectDetail;
