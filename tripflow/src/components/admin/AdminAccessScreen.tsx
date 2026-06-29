// components/admin/AdminAccessScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { validateAdminKey } from '../../lib/adminServices';

export default function AdminAccessScreen() {
  const navigate = useNavigate();
  const [key, setKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccess = async () => {
    if (!key.trim()) return;
    setLoading(true);
    setError('');

    try {
      const valid = await validateAdminKey(key.trim());
      if (valid) {
        sessionStorage.setItem('isAdmin', 'true');
        navigate('/admin/dashboard', { replace: true });
      } else {
        setError('Invalid admin access key. Access denied.');
        setKey('');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAccess();
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background orbs */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-pink-600/8 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-900/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Glass card */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-3xl p-8 backdrop-blur-xl shadow-2xl shadow-black/40">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-400/20 flex items-center justify-center backdrop-blur-sm">
                <Lock className="w-7 h-7 text-violet-300" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-violet-500/10 blur-md" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-1">
              TripFlow Admin Access
            </h1>
            <p className="text-sm text-white/40">
              Enter your administrator access key to continue
            </p>
          </div>

          {/* Input */}
          <div className="space-y-3 mb-5">
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="ADMIN_ACCESS_KEY"
                className="
                  w-full bg-white/[0.06] border border-white/[0.1] rounded-xl
                  px-4 py-3 pr-12 text-white placeholder:text-white/20
                  font-mono text-sm tracking-wider
                  focus:outline-none focus:border-violet-400/50 focus:bg-white/[0.08]
                  transition-all duration-200
                "
                autoComplete="off"
                spellCheck={false}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors p-1"
                type="button"
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="flex items-center gap-2 text-red-400/90 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5"
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Button */}
          <button
            onClick={handleAccess}
            disabled={loading || !key.trim()}
            className="
              w-full py-3 rounded-xl font-medium text-sm
              bg-gradient-to-r from-violet-500 to-violet-600
              hover:from-violet-400 hover:to-violet-500
              disabled:opacity-40 disabled:cursor-not-allowed
              text-white shadow-lg shadow-violet-500/25
              transition-all duration-200 flex items-center justify-center gap-2
            "
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying…
              </>
            ) : (
              'Access Dashboard'
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/20 mt-5">
          Authorized personnel only · TripFlow Internal
        </p>
      </motion.div>
    </div>
  );
}