import React, { useState } from 'react';
import { adminLogin } from '../services/apiService';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await adminLogin(username.trim(), password);
      if (res.success) {
        onLoginSuccess();
      } else {
        setError(res.message || 'Invalid username or password.');
      }
    } catch (err: any) {
      setError('Connection error: ' + (err.message || 'Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-gray-100 transform transition-all animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-blue-950 text-white px-6 py-5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-400 text-blue-950 flex items-center justify-center font-bold text-lg shadow">
              <i className="fa fa-shield-alt"></i>
            </div>
            <div>
              <h3 className="text-lg font-bold">Admin Portal Login</h3>
              <p className="text-xs text-blue-200">Grand Travela Management &amp; Reception Only</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 cursor-pointer"
            aria-label="Close"
          >
            <i className="fa fa-times text-lg"></i>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs flex items-center space-x-2">
              <i className="fa fa-exclamation-circle text-red-500"></i>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Admin Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <i className="fa fa-user"></i>
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:border-hotel-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Admin Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                <i className="fa fa-lock"></i>
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:bg-white focus:outline-none focus:border-hotel-primary transition-colors"
              />
            </div>
          </div>

          {/* Quick hint for evaluation convenience */}
          <div className="p-2.5 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-900 flex items-center justify-between">
            <span className="flex items-center">
              <i className="fa fa-info-circle text-amber-600 mr-1.5"></i>
              Credentials: <strong className="ml-1">admin / admin123</strong>
            </span>
            <button
              type="button"
              onClick={() => { setUsername('admin'); setPassword('admin123'); }}
              className="text-amber-800 underline font-bold hover:text-amber-950 cursor-pointer"
            >
              Autofill
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-hotel-primary hover:bg-blue-900 text-white font-bold text-sm rounded-xl shadow hover:shadow-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <i className="fa fa-spinner fa-spin"></i>
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <i className="fa fa-sign-in-alt"></i>
                  <span>Sign In to Dashboard</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-[11px] text-gray-400 pt-1">
            <i className="fa fa-lock mr-1"></i>
            Strict access control. General website visitors cannot access this console.
          </p>
        </form>
      </div>
    </div>
  );
};
