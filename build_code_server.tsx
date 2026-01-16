
import React from 'react';

const BuildCodeServer: React.FC = () => {
  return (
    <div className="p-12 text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <h2 className="text-xl font-bold text-slate-800">IDE Environment Provisioning</h2>
      <p className="text-slate-500">Preparing Kubernetes resources and storage volumes...</p>
    </div>
  );
};

export default BuildCodeServer;
