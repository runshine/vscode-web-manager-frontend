
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import ProjectDetail from './pages/ProjectDetail';
import HealthIndicator from './components/HealthIndicator';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('cv_user');
    const token = localStorage.getItem('cv_token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('cv_token');
    localStorage.removeItem('cv_user');
    setUser(null);
  };

  if (loading) return null;

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        {user && (
          <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="w-full px-4 sm:px-6 lg:px-12 flex justify-between h-16 items-center">
              <Link to="/" className="flex items-center gap-2 group">
                <div className="bg-indigo-600 p-2 rounded-lg"><svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg></div>
                <span className="text-xl font-bold tracking-tight">CodeVault</span>
              </Link>
              <div className="flex items-center gap-4">
                <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-xs">{user.username.charAt(0)}</div>
                  <span className="hidden sm:inline text-sm font-medium text-slate-700">{user.username}</span>
                </Link>
                <button onClick={handleLogout} className="text-sm font-medium text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg">Logout</button>
              </div>
            </div>
          </nav>
        )}
        <main className="flex-grow w-full">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} />
            <Route path="/" element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} />
            <Route path="/project/:id" element={user ? <ProjectDetail /> : <Navigate to="/login" />} />
            <Route path="/profile" element={user ? <Profile user={user} onUpdate={setUser} /> : <Navigate to="/login" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
        
        {/* Fixed Health Indicator in bottom-right */}
        <HealthIndicator />
      </div>
    </HashRouter>
  );
};

export default App;
