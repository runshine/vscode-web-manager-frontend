
import React, { useState, useEffect } from 'react';
import { ApiService } from '../services/api';

const HealthIndicator: React.FC = () => {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());

  const checkHealth = async () => {
    try {
      setLoading(true);
      const data = await ApiService.getHealth();
      setHealth(data);
      setLastCheck(new Date());
    } catch (err) {
      setHealth({ status: 'unhealthy', error: 'Service Unavailable' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Monitor</h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Overall Status</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${isHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {health?.status || 'UNKNOWN'}
              </span>
            </div>
            
            {health?.checks && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {Object.entries(health.checks).map(([key, value]: [string, any]) => {
                  if (key === 'stats') return null;

                  // Handle info-only display keys
                  const infoKeys = ['k8s_api_url', 'k8s_namespace', 'k8s_auth'];
                  if (infoKeys.includes(key)) {
                    return (
                      <div key={key} className="flex justify-between items-center text-[10px] py-0.5">
                        <span className="text-slate-400 capitalize">{key.replace(/k8s_/g, 'K8s ').replace(/_/g, ' ')}</span>
                        <span className="text-slate-600 font-medium truncate max-w-[140px] text-right" title={String(value)}>
                          {String(value)}
                        </span>
                      </div>
                    );
                  }

                  const checkValue = typeof value === 'string' ? value : '';
                  // Logic: if it starts with "healthy", it is considered healthy
                  const isCheckHealthy = checkValue.startsWith('healthy');
                  
                  return (
                    <div key={key} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isCheckHealthy ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className={isCheckHealthy ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>
                          {isCheckHealthy ? 'OK' : 'FAIL'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {health?.checks?.stats?.details && (
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Cluster Resources</div>
                <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                   <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400">Users</div>
                      <div className="font-extrabold text-slate-800">{health.checks.stats.details.users}</div>
                   </div>
                   <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400">Projects</div>
                      <div className="font-extrabold text-slate-800">{health.checks.stats.details.projects}</div>
                   </div>
                   <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                      <div className="text-slate-400">Pods</div>
                      <div className="font-extrabold text-slate-800">{health.checks.stats.details.code_servers}</div>
                   </div>
                </div>
              </div>
            )}

            <div className="pt-2 text-[9px] text-slate-400 text-right italic font-mono uppercase">
              Last Sync: {lastCheck.toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border transition-all hover:scale-105 active:scale-95 ${
          loading ? 'bg-white border-slate-200' : 
          isHealthy ? 'bg-white border-emerald-100 text-emerald-600' : 'bg-red-50 border-red-100 text-red-600'
        }`}
      >
        <div className="relative flex items-center justify-center">
          {loading ? (
            <div className="w-3 h-3 border-2 border-slate-200 border-t-slate-400 rounded-full animate-spin"></div>
          ) : (
            <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-red-500'}`} />
          )}
        </div>
        <span className="text-[10px] font-black tracking-widest uppercase">
          {loading ? 'Syncing...' : isHealthy ? 'System Ready' : 'System Degraded'}
        </span>
      </button>
    </div>
  );
};

export default HealthIndicator;
