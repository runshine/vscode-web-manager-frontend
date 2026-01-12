
import React from 'react';
import { Link } from 'react-router-dom';
import { Project, ProjectStatus } from '../types';
import { ApiService } from '../services/api';

interface ProjectTableProps {
  projects: Project[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading: boolean;
}

const ProjectTable: React.FC<ProjectTableProps> = ({ 
  projects, 
  onDelete, 
  onRefresh, 
  selectedIds, 
  onSelectionChange, 
  loading 
}) => {
  const handleCreateVSCode = async (id: string) => {
    try {
      await ApiService.createCodeServer(id);
      onRefresh();
    } catch (err: any) {
      alert('Deployment failed: ' + err.message);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusConfig = (status: ProjectStatus, codeStatus: string | null) => {
    if (status === 'initializing') return { color: 'bg-amber-400', label: 'Initializing', pulse: true };
    if (status === 'pending') return { color: 'bg-slate-300', label: 'Queued', pulse: true };
    if (status === 'error') return { color: 'bg-red-500', label: 'Setup Error', pulse: false };
    if (status === 'deleting') return { color: 'bg-red-400', label: 'Deleting', pulse: true };
    
    // Project is Ready, check Code Server
    if (codeStatus === 'running') return { color: 'bg-emerald-500', label: 'IDE Online', pulse: false };
    if (codeStatus === 'creating') return { color: 'bg-indigo-500', label: 'Starting IDE', pulse: true };
    if (codeStatus === 'stopped') return { color: 'bg-slate-400', label: 'IDE Stopped', pulse: false };
    if (codeStatus === 'error') return { color: 'bg-red-600', label: 'IDE Error', pulse: false };
    
    return { color: 'bg-slate-200', label: 'No IDE', pulse: false };
  };

  if (loading && projects.length === 0) {
    return <div className="p-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div></div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <th className="px-6 py-4 w-12 text-center">
              <input 
                type="checkbox" 
                checked={projects.length > 0 && selectedIds.length === projects.length} 
                onChange={(e) => onSelectionChange(e.target.checked ? projects.map(p => p.id) : [])} 
              />
            </th>
            <th className="px-6 py-4">Project</th>
            <th className="px-6 py-4 text-center">Status</th>
            <th className="px-6 py-4">Archive</th>
            <th className="px-6 py-4">Code Server</th>
            <th className="px-6 py-4">Created</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map(project => {
            const sc = getStatusConfig(project.status, project.code_server_status);
            const isSelected = selectedIds.includes(project.id);

            return (
              <tr key={project.id} className={`group hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                <td className="px-6 py-4 text-center">
                  <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => onSelectionChange(isSelected ? selectedIds.filter(id => id !== project.id) : [...selectedIds, project.id])} 
                  />
                </td>
                <td className="px-6 py-4">
                  <Link to={`/project/${project.id}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600 truncate block">
                    {project.name}
                  </Link>
                  <span className="text-[10px] font-mono text-slate-400 block mt-0.5">{project.id.substring(0, 16)}...</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${sc.color} ${sc.pulse ? 'animate-pulse' : ''}`} />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{sc.label}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                  {formatSize(project.total_size)}
                  <span className="block text-[10px] text-slate-400">{project.file_count} files</span>
                </td>
                <td className="px-6 py-4">
                  {project.status === 'ready' && (
                    project.code_server_status === 'running' ? (
                      project.access_url ? (
                        <a href={project.access_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:underline">Open IDE</a>
                      ) : (
                        <Link to={`/project/${project.id}`} className="text-xs font-bold text-amber-600 hover:underline">View in Details</Link>
                      )
                    ) : (
                      <button 
                        onClick={() => handleCreateVSCode(project.id)}
                        disabled={project.code_server_status === 'creating'}
                        className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded hover:bg-slate-200 transition-colors"
                      >
                        {project.code_server_status === 'creating' ? 'Starting...' : 'Setup IDE'}
                      </button>
                    )
                  )}
                </td>
                <td className="px-6 py-4 text-xs text-slate-400">{new Date(project.created_at).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                     <Link to={`/project/${project.id}`} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                     </Link>
                     <button onClick={() => onDelete(project.id)} className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} /></svg></button>
                  </div>
                </td>
              </tr>
            );
          })}
          {projects.length === 0 && !loading && (
            <tr>
              <td colSpan={7} className="px-6 py-20 text-center text-slate-400 italic">No repositories found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectTable;
