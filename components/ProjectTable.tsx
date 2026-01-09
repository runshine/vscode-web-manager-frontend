
import React, { useState } from 'react';
import { Project, ProjectStatus } from '../types';
import { StorageService } from '../services/storage';

interface ProjectTableProps {
  projects: Project[];
  onDelete: (id: string) => void;
  onUpdate: (project: Project) => void;
  searchQuery: string;
}

const ProjectTable: React.FC<ProjectTableProps> = ({ projects, onDelete, onUpdate, searchQuery }) => {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    alert('VSCode URL copied to clipboard!');
  };

  const handleCreateVSCode = async (project: Project) => {
    await StorageService.createVSCodeProject(project, onUpdate);
  };

  const renderStatusIcon = (status: ProjectStatus) => {
    switch (status) {
      case 'waiting':
        return (
          <div className="flex items-center gap-2 text-slate-400" title="Waiting for project creation">
            <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'creating':
        return (
          <div className="flex items-center gap-2 text-indigo-500" title="Creating VSCode environment...">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case 'success':
        return (
          <div className="flex items-center gap-2 text-emerald-500" title="VSCode Environment Ready">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="flex items-center gap-2 text-red-500" title="Environment Creation Failed">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  if (projects.length === 0) {
    return (
      <div className="p-20 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-slate-100 rounded-full mb-4">
          <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-slate-500 font-medium text-lg">Empty Repository Vault</p>
        <p className="text-slate-400 text-sm max-w-xs mx-auto mt-1">Try refining your search or create a new project to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <th className="px-6 py-4 w-10">Status</th>
            <th className="px-6 py-4">Project Information</th>
            <th className="px-6 py-4">Metrics</th>
            <th className="px-6 py-4">Created Date</th>
            <th className="px-6 py-4">VSCode Web Address / Message</th>
            <th className="px-6 py-4 text-right">Operations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {projects.map(project => {
            const query = searchQuery.toLowerCase();
            const matchedFiles = searchQuery 
              ? project.files.filter(f => f.name.toLowerCase().includes(query) || f.path.toLowerCase().includes(query))
              : [];
            
            const isExpanded = expandedRows[project.id] || (searchQuery && matchedFiles.length > 0);

            return (
              <React.Fragment key={project.id}>
                <tr className={`group transition-all hover:bg-indigo-50/20 ${isExpanded ? 'bg-indigo-50/10 shadow-inner' : ''}`}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => toggleRow(project.id)}
                        className={`flex items-center justify-center w-6 h-6 rounded-md transition-all ${isExpanded ? 'bg-indigo-100 text-indigo-600 rotate-90' : 'text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600'}`}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      {renderStatusIcon(project.status)}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{project.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">ID: {project.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-xs font-semibold text-slate-700">{formatSize(project.totalSize)}</span>
                      </div>
                      <div className="text-xs text-slate-500">{project.fileCount} source files</div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                      {new Date(project.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {project.status === 'failed' ? (
                      <div className="max-w-[300px] text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 animate-in fade-in slide-in-from-left-2">
                        <div className="flex items-center gap-1.5 mb-1 font-bold">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          Creation Failed
                        </div>
                        <p className="opacity-80 line-clamp-2">{project.errorMessage}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className={`max-w-[180px] lg:max-w-[250px] overflow-hidden text-ellipsis whitespace-nowrap border rounded px-2 py-1 text-[10px] mono transition-colors ${project.vscodeUrl ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-slate-100 border-dashed border-slate-300 text-slate-400'}`}>
                          {project.vscodeUrl || 'No environment link yet'}
                        </div>
                        {project.vscodeUrl && (
                          <button 
                            onClick={() => copyToClipboard(project.vscodeUrl)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-all"
                            title="Copy Link"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-right whitespace-nowrap">
                    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
                      {project.status === 'success' ? (
                        <a
                          href={project.vscodeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors border-r border-slate-200 flex items-center gap-2"
                        >
                           Open VSCode
                           <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      ) : (
                        <button
                          onClick={() => handleCreateVSCode(project)}
                          disabled={project.status === 'creating'}
                          className={`px-4 py-2 text-xs font-bold transition-colors border-r border-slate-200 flex items-center gap-2 ${project.status === 'creating' ? 'text-slate-400 bg-slate-50 cursor-not-allowed' : 'text-indigo-600 hover:bg-indigo-50'}`}
                        >
                          {project.status === 'creating' ? 'Generating...' : project.status === 'failed' ? 'Retry Creation' : 'Create VSCode'}
                          {project.status !== 'creating' && <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
                        </button>
                      )}
                      <button
                        onClick={() => onDelete(project.id)}
                        className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr className="bg-slate-50/50">
                    <td colSpan={6} className="px-12 py-4 shadow-inner border-b border-slate-200">
                      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                        <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                             {searchQuery ? `Search Results for "${searchQuery}"` : "Source File Manifest"}
                           </span>
                           <span className="text-[10px] text-slate-400">{matchedFiles.length || project.files.length} items</span>
                        </div>
                        <table className="w-full text-left">
                          <thead className="bg-slate-50/30 text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                            <tr>
                              <th className="px-4 py-2">File Name</th>
                              <th className="px-4 py-2">Deployment Path</th>
                              <th className="px-4 py-2 text-right">Size</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(matchedFiles.length > 0 ? matchedFiles : project.files.slice(0, 8)).map((file, idx) => (
                              <tr key={idx} className="hover:bg-indigo-50/30 transition-colors">
                                <td className="px-4 py-2 text-xs font-medium text-slate-700 mono">
                                  <div className="flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                    {file.name}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs text-slate-400 mono">{file.path}</td>
                                <td className="px-4 py-2 text-xs text-slate-500 text-right">{formatSize(file.size)}</td>
                              </tr>
                            ))}
                            {!searchQuery && project.files.length > 8 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-3 text-[10px] text-center text-slate-400 italic bg-slate-50/20">
                                  Displaying first 8 files. Use search to find specific items in this project.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectTable;
