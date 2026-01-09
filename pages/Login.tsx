
import React, { useState } from 'react';
import { StorageService } from '../services/storage';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = StorageService.getUsers();
    const foundUser = users.find(u => u.username === username && u.password === password);
    
    if (foundUser) {
      const userObj = { id: foundUser.id, username: foundUser.username, email: foundUser.email, avatar: foundUser.avatar };
      StorageService.setCurrentUser(userObj);
      onLogin(userObj);
    } else {
      setError('Invalid username or password');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 mb-4">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 mt-2">Sign in to manage your source repositories</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-pulse">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-slate-50/50"
              placeholder="Enter your username"
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-sm font-semibold text-slate-700">Password</label>
              <a href="#" className="text-xs font-semibold text-indigo-600 hover:text-indigo-500">Forgot password?</a>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none bg-slate-50/50"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
          >
            Sign In
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Demo account: <span className="font-semibold text-slate-700">admin</span> / <span className="font-semibold text-slate-700">password123</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
