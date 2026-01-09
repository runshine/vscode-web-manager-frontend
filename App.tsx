
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { StorageService } from './services/storage';
import { User } from './types';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StorageService.init();
    const currentUser = StorageService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const handleLogout = () => {
    StorageService.setCurrentUser(null);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="min-h-screen flex flex-col bg-slate-50">
        {user && (
          <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="w-full px-4 sm:px-6 lg:px-12">
              <div className="flex justify-between h-16">
                <div className="flex items-center">
                  <Link to="/" className="flex items-center gap-2 group">
                    <div className="bg-indigo-600 p-2 rounded-lg group-hover:bg-indigo-700 transition-colors">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <span className="text-xl font-bold text-slate-900 tracking-tight">CodeVault</span>
                  </Link>
                </div>
                <div className="flex items-center gap-4">
                  <Link to="/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-colors">
                    <img src={user.avatar} className="w-8 h-8 rounded-full object-cover border border-slate-200" alt="avatar" />
                    <span className="hidden sm:inline text-sm font-medium text-slate-700">{user.username}</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </nav>
        )}

        <main className="flex-grow w-full">
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/" /> : <Login onLogin={setUser} />} 
            />
            <Route 
              path="/" 
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/profile" 
              element={user ? <Profile user={user} onUpdate={setUser} /> : <Navigate to="/login" />} 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>

        <footer className="bg-white border-t border-slate-200 py-6">
          <div className="w-full px-4 lg:px-12 text-center sm:text-left flex flex-col sm:flex-row justify-between items-center text-slate-500 text-sm gap-4">
            <p>&copy; {new Date().getFullYear()} CodeVault Manager. Professional Enterprise Edition.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-indigo-600">Documentation</a>
              <a href="#" className="hover:text-indigo-600">Support</a>
              <a href="#" className="hover:text-indigo-600">API Status</a>
            </div>
          </div>
        </footer>
      </div>
    </HashRouter>
  );
};

export default App;
