
import React, { useState } from 'react';
import { User } from '../types';
import { ApiService } from '../services/api';

interface ProfileProps {
  user: User;
  onUpdate: (user: User) => void;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setStatus({ type: 'error', msg: 'Passwords mismatch' });
    
    try {
      await ApiService.changePassword({ old_password: oldPassword, new_password: newPassword });
      setStatus({ type: 'success', msg: 'Password updated!' });
      setOldPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (err: any) {
      setStatus({ type: 'error', msg: err.message });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-fit">
          <div className="h-24 bg-indigo-600"></div>
          <div className="px-6 pb-6 -mt-12 text-center">
            <div className="w-24 h-24 rounded-2xl border-4 border-white mx-auto bg-slate-100 flex items-center justify-center text-3xl font-bold text-indigo-600 shadow-md">{user.username.charAt(0)}</div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">{user.username}</h2>
            <p className="text-slate-500 text-sm">{user.email}</p>
          </div>
        </div>
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h3 className="text-lg font-bold mb-6">Security Settings</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {status.msg && <div className={`p-3 text-sm rounded-lg ${status.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>{status.msg}</div>}
            <div><label className="text-sm font-semibold">Current Password</label><input type="password" required value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-semibold">New Password</label><input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-sm font-semibold">Confirm</label><input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            </div>
            <button type="submit" className="mt-4 px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md">Update Password</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
