
import React, { useState } from 'react';
import { Project, FileItem, ProjectStatus } from '../types';

interface UploadModalProps {
  userId: string;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({ userId, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedFiles) return;

    setIsUploading(true);

    // Simulate upload delay
    setTimeout(() => {
      const files: FileItem[] = [];
      let totalSize = 0;
      
      for (let i = 0; i < selectedFiles.length; i++) {
        const f = selectedFiles[i];
        files.push({
          name: f.name,
          path: f.name, // In a real app, we'd handle directory structure
          size: f.size
        });
        totalSize += f.size;
      }

      const newProject: Project = {
        id: Math.random().toString(36).substr(2, 9),
        ownerId: userId,
        name,
        totalSize,
        fileCount: files.length,
        createdAt: new Date().toISOString(),
        files,
        vscodeUrl: '',
        status: 'waiting' as ProjectStatus
      };

      onSuccess(newProject);
      setIsUploading(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">Upload Source Project</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Project Name</label>
            <input
              type="text"
              required
              placeholder="e.g. My Awesome App"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Source Files</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-xl hover:border-indigo-400 transition-colors bg-slate-50 cursor-pointer relative">
              <input
                type="file"
                multiple
                required
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2 text-center">
                <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                  <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-slate-600">
                  <span className="font-semibold text-indigo-600">Upload a file</span>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-slate-500">ZIP, Folder or individual source files</p>
              </div>
            </div>
            {selectedFiles && (
              <p className="mt-2 text-xs text-indigo-600 font-medium bg-indigo-50 p-2 rounded">
                Selected {selectedFiles.length} file(s)
              </p>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !name || !selectedFiles}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : 'Upload Now'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadModal;
