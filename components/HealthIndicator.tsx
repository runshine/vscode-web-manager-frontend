
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
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="fixed bottom-6 right-6 z-[200] flex flex-col items-end">
      {isOpen && (
        <div className="mb-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">System Health</h4>
            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600">Overall Status</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isHealthy ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {health?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            
            {health?.checks && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                {Object.entries(health.checks).map(([key, value]: [string, any]) => {
                  if (key === 'stats') return null;
                  const checkStatus = typeof value === 'string' ? value : 'unknown';
                  const isCheckHealthy = checkStatus.includes('healthy');
                  return (
                    <div key={key} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-500 capitalize">{key.replace('_', ' ')}</span>
                      <span className={isCheckHealthy ? 'text-emerald-500 font-medium' : 'text-red-500 font-medium'}>
                        {isCheckHealthy ? 'Healthy' : 'Error'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {health?.checks?.stats && (
              <div className="space-y-1 pt-2 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Live Stats</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                   <div className="bg-slate-50 p-1.5 rounded-lg">
                      <div className="text-[10px] text-slate-500">Users</div>
                      <div className="text-xs font-bold text-slate-800">{health.checks.stats.users}</div>
                   </div>
                   <div className="bg-slate-50 p-1.5 rounded-lg">
                      <div className="text-[10px] text-slate-500">Proj</div>
                      <div className="text-xs font-bold text-slate-800">{health.checks.stats.projects}</div>
                   </div>
                   <div className="bg-slate-50 p-1.5 rounded-lg">
                      <div className="text-[10px] text-slate-500">Node</div>
                      <div className="text-xs font-bold text-slate-800">{health.checks.stats.code_servers}</div>
                   </div>
                </div>
              </div>
            )}

            <div className="pt-2 text-[10px] text-slate-400 text-right italic">
              Last check: {lastCheck.toLocaleTimeString()}
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
            <>
              <div className={`w-3 h-3 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-red-500'} ${isHealthy ? 'animate-pulse' : ''}`}></div>
              {isHealthy && <div className="absolute w-3 h-3 rounded-full bg-emerald-500 animate-ping opacity-75"></div>}
            </>
          )}
        </div>
        <span className="text-xs font-bold tracking-wide uppercase">
          {loading ? 'Checking...' : isHealthy ? 'System Healthy' : 'System Error'}
        </span>
      </button>
    </div>
  );
};

export default HealthIndicator;
