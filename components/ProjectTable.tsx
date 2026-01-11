
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Project, ProjectStatus, FileItem } from '../types';
import { ApiService } from '../services/api';

interface ProjectTableProps {
  projects: Project[];
  matchedFiles?: any[];
  onDelete: (id: string) => void;
  onRefresh: () => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  loading: boolean;
}

const ProjectTable: React.FC<ProjectTableProps> = ({ 
  projects, 
  matchedFiles = [],
  onDelete, 
  onRefresh, 
  selectedIds, 
  onSelectionChange, 
  loading 
}) => {
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  const handleCreateVSCode = async (id: string) => {
    try {
      await ApiService.createCodeServer(id);
      onRefresh();
    } catch (err: any) {
      alert('Failed: ' + err.message);
    }
  };

  const mapStatus = (status: string | null): ProjectStatus => {
    if (!status) return 'waiting';
    const s = status.toLowerCase();
    if (s === 'pending' || s === 'creating' || s === 'deleting') return 'creating';
    if (s === 'running' || s === 'success') return 'success';
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

  if (loading && projects.length === 0) {
    return <div className="p-20 text-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div></div>;
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse min-w-[1100px]">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
            <th className="px-6 py-4 w-12 text-center">
              <input 
                type="checkbox" 
                checked={projects.length > 0 && selectedIds.length === projects.length} 
                onChange={(e) => onSelectionChange(e.target.checked ? projects.map(p => p.id) : [])} 
              />
            </th>
            <th className="px-6 py-4 w-16 text-center">Status</th>
            <th className="px-6 py-4">Project</th>
            <th className="px-6 py-4">Files</th>
            <th className="px-6 py-4">Size</th>
            <th className="px-6 py-4">Created</th>
            <th className="px-6 py-4 text-right">Operations</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {projects.map(project => {
            const status = mapStatus(project.code_server_status);
            const isSelected = selectedIds.includes(project.id);
            const isExpanded = expandedProjectId === project.id;

            return (
              <React.Fragment key={project.id}>
                <tr className={`group hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/30' : ''}`}>
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => onSelectionChange(isSelected ? selectedIds.filter(id => id !== project.id) : [...selectedIds, project.id])} 
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 
                        status === 'creating' ? 'bg-indigo-500 animate-pulse' : 
                        status === 'failed' ? 'bg-red-500' : 'bg-slate-200'
                      }`} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/project/${project.id}`} className="text-sm font-bold text-slate-900 hover:text-indigo-600 truncate block">
                      {project.name}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600 font-medium">{project.file_count}</td>
                  <td className="px-6 py-4 text-xs text-slate-600 font-medium">{formatSize(project.total_size)}</td>
                  <td className="px-6 py-4 text-xs text-slate-400">{new Date(project.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                       <Link 
                         to={`/project/${project.id}`} 
                         className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                         title="Detailed View & Logs"
                       >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                       </Link>

                       {status === 'success' ? (
                         <a href={project.access_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-bold rounded-lg hover:bg-indigo-700 uppercase tracking-wider">Editor</a>
                       ) : (
                         <button 
                           onClick={() => handleCreateVSCode(project.id)}
                           disabled={status === 'creating'}
                           className={`px-3 py-1.5 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${
                             status === 'creating' ? 'bg-slate-50 text-slate-300 border-slate-100' : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                           }`}
                         >
                           {status === 'creating' ? 'Deploying' : 'Setup IDE'}
                         </button>
                       )}
                       
                       <button onClick={() => onDelete(project.id)} className="p-1.5 text-slate-300 hover:text-red-600 rounded-lg"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeWidth={2} /></svg></button>
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ProjectTable;
