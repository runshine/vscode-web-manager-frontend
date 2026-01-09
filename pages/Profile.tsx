
import React, { useState } from 'react';
import { User } from '../types';
import { StorageService } from '../services/storage';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, onUpdate }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const users = StorageService.getUsers();
    const userIdx = users.findIndex(u => u.id === user.id);
    
    if (users[userIdx].password !== oldPassword) {
      setError('Current password is incorrect');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    users[userIdx].password = newPassword;
    StorageService.setUsers(users);
    setSuccess('Password updated successfully!');
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* User Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="h-24 bg-gradient-to-r from-indigo-500 to-purple-600"></div>
          <div className="px-6 pb-6 -mt-12 text-center">
            <img src={user.avatar} className="w-24 h-24 rounded-2xl border-4 border-white mx-auto shadow-md object-cover" alt="avatar" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">{user.username}</h2>
            <p className="text-slate-500 text-sm">{user.email}</p>
            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              <div>
                <p className="text-slate-900 text-lg">Active</p>
                <p>Status</p>
              </div>
              <div className="w-px bg-slate-100"></div>
              <div>
                <p className="text-slate-900 text-lg">Pro</p>
                <p>Tier</p>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        <div className="md:col-span-2 space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              Change Password
            </h3>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
              {success && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-100">{success}</div>}
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                className="mt-4 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 active:scale-95"
              >
                Update Password
              </button>
            </form>
          </div>

          <div className="bg-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
             <div className="relative z-10">
                <h3 className="text-xl font-bold mb-2">Connect to VS Code Online</h3>
                <p className="text-slate-400 text-sm mb-6 max-w-sm">Seamlessly sync your local vault with our hosted VS Code environment for mobile development.</p>
                <button className="bg-white text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-slate-100 transition-colors">
                  Enable Syncing
                </button>
             </div>
             <svg className="absolute top-0 right-0 w-64 h-64 text-indigo-500/10 -mr-20 -mt-20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
             </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
