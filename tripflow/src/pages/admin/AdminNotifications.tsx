// pages/admin/AdminNotifications.tsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Send, Trash2, Users, User, AlertCircle,
  CheckCircle2, Clock, Plus, X, Loader2, RefreshCw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  fetchAdminNotifications,
  deleteAdminNotification,
} from '../../lib/adminServices';
import type { AdminNotification } from '../../types/admin';

// ── Notification type config ──────────────────────────────────
const TYPE_OPTIONS = [
  { value: 'system',       label: 'System',       color: 'bg-violet-100 text-violet-700 border-violet-200' },
  { value: 'announcement', label: 'Announcement', color: 'bg-blue-100 text-blue-700 border-blue-200'       },
  { value: 'update',       label: 'Update',       color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'maintenance',  label: 'Maintenance',  color: 'bg-amber-100 text-amber-700 border-amber-200'    },
] as const;

type NotifType = typeof TYPE_OPTIONS[number]['value'];

function TypeBadge({ type }: { type: string }) {
  const cfg = TYPE_OPTIONS.find((t) => t.value === type) ?? TYPE_OPTIONS[0];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

// ── Send notification to actual notifications table ───────────
async function broadcastNotification(notif: AdminNotification): Promise<{ sent: number }> {
  if (notif.target === 'specific' && notif.target_user_id) {
    const { error } = await supabase.from('notifications').insert({
      user_id: notif.target_user_id,
      trip_id: null,
      title: notif.title,
      message: notif.message,
      type: 'system',
      is_read: false,
      scheduled_at: notif.scheduled_at,
    });
    if (error) throw error;
    return { sent: 1 };
  }

  // Get all real auth user IDs via security definer function
  const { data: users, error: usersError } = await supabase.rpc('get_all_user_ids');
  if (usersError) throw usersError;
  if (!users || users.length === 0) return { sent: 0 };

  const rows = users.map((u: { id: string }) => ({
    user_id: u.id,
    trip_id: null,
    title: notif.title,
    message: notif.message,
    type: 'system',
    is_read: false,
    scheduled_at: notif.scheduled_at,
  }));

  const { error: insertError } = await supabase.from('notifications').insert(rows);
  if (insertError) throw insertError;
  return { sent: users.length };
}

// ── Mark admin_notification as sent ──────────────────────────
async function markAsSent(id: string) {
  await supabase
    .from('admin_notifications')
    .update({ is_sent: true, sent_at: new Date().toISOString() })
    .eq('id', id);
}

// ── Create modal ──────────────────────────────────────────────
interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<NotifType>('system');
  const [target, setTarget] = useState<'all' | 'specific'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [sendNow, setSendNow] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const valid = title.trim() && message.trim() && (target === 'all' || targetUserId.trim());

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    setError('');

    try {
      // 1. Create in admin_notifications
      const { data: inserted, error: insertErr } = await supabase
        .from('admin_notifications')
        .insert({
          title: title.trim(),
          message: message.trim(),
          type,
          target,
          target_user_id: target === 'specific' ? targetUserId.trim() : null,
          scheduled_at: null,
          is_sent: false,
        })
        .select()
        .single();

      if (insertErr) throw insertErr;

      // 2. If send now, broadcast immediately
      if (sendNow && inserted) {
        const { sent } = await broadcastNotification(inserted as AdminNotification);
        await markAsSent(inserted.id);
        console.log(`Sent to ${sent} user(s)`);
      }

      onCreated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-2xl shadow-xl border border-violet-100 w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-violet-100 flex items-center justify-center">
              <Bell className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-sm font-semibold text-gray-800">New Notification</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Type */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {TYPE_OPTIONS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setType(t.value)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                    type === t.value ? t.color : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-gray-800 placeholder:text-gray-300 transition-all"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1.5 block">Message</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your notification message..."
              rows={3}
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-gray-800 placeholder:text-gray-300 transition-all resize-none"
            />
          </div>

          {/* Target */}
          <div>
            <label className="text-xs font-medium text-gray-500 mb-2 block">Send To</label>
            <div className="flex gap-2">
              <button
                onClick={() => setTarget('all')}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all ${
                  target === 'all'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                <Users className="w-3.5 h-3.5" /> All Users
              </button>
              <button
                onClick={() => setTarget('specific')}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border transition-all ${
                  target === 'specific'
                    ? 'bg-violet-50 text-violet-700 border-violet-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                }`}
              >
                <User className="w-3.5 h-3.5" /> Specific User
              </button>
            </div>
            {target === 'specific' && (
              <input
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="User UUID (from profiles table)..."
                className="mt-2 w-full text-xs font-mono px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-gray-800 placeholder:text-gray-300 transition-all"
              />
            )}
          </div>

          {/* Send now toggle */}
          <div className="flex items-center justify-between py-2.5 px-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs font-medium text-gray-700">Send immediately</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Deliver to users right now</p>
            </div>
            <button
              onClick={() => setSendNow((v) => !v)}
              className={`relative w-10 h-5.5 rounded-full transition-colors ${sendNow ? 'bg-violet-500' : 'bg-gray-300'}`}
              style={{ height: '22px', width: '40px' }}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${sendNow ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2.5"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="text-sm font-medium text-gray-500 hover:text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!valid || loading}
            className="flex items-center gap-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2 rounded-xl transition-all shadow-sm shadow-violet-200"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
            ) : (
              <><Send className="w-4 h-4" /> {sendNow ? 'Send Now' : 'Save Draft'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Send existing draft ───────────────────────────────────────
async function sendDraft(notif: AdminNotification): Promise<{ sent: number }> {
  const result = await broadcastNotification(notif);
  await markAsSent(notif.id);
  return result;
}

// ── Main page ─────────────────────────────────────────────────
export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSend = async (notif: AdminNotification) => {
    setSending(notif.id);
    try {
      const { sent } = await sendDraft(notif);
      setNotifications((prev) =>
        prev.map((n) => n.id === notif.id ? { ...n, is_sent: true, sent_at: new Date().toISOString() } : n)
      );
      showToast(`Sent to ${sent} user${sent !== 1 ? 's' : ''}!`);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Send failed', 'error');
    } finally {
      setSending(null);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteAdminNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      showToast('Notification deleted');
    } catch {
      showToast('Delete failed', 'error');
    } finally {
      setDeleting(null);
    }
  };

  const stats = {
    total: notifications.length,
    sent: notifications.filter((n) => n.is_sent).length,
    drafts: notifications.filter((n) => !n.is_sent).length,
    broadcast: notifications.filter((n) => n.target === 'all').length,
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Notifications</h2>
          <p className="text-sm text-gray-400 mt-0.5">Create and broadcast notifications to users</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 px-4 py-2 rounded-xl transition-all shadow-sm shadow-violet-200"
          >
            <Plus className="w-4 h-4" /> New Notification
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',     value: stats.total,     color: 'text-gray-700',    bg: 'bg-gray-50 border-gray-200'       },
          { label: 'Sent',      value: stats.sent,      color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Drafts',    value: stats.drafts,    color: 'text-amber-700',   bg: 'bg-amber-50 border-amber-200'     },
          { label: 'Broadcast', value: stats.broadcast, color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200'   },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} border rounded-xl px-4 py-3`}>
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="bg-white border border-violet-100 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center mb-3">
              <Bell className="w-6 h-6 text-violet-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1">Create your first notification to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            <AnimatePresence initial={false}>
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-start gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors group"
                >
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    notif.is_sent ? 'bg-emerald-50' : 'bg-amber-50'
                  }`}>
                    {notif.is_sent
                      ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      : <Clock className="w-4 h-4 text-amber-500" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                      <TypeBadge type={notif.type} />
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        notif.target === 'all'
                          ? 'bg-blue-50 text-blue-600 border-blue-200'
                          : 'bg-gray-100 text-gray-500 border-gray-200'
                      }`}>
                        {notif.target === 'all' ? '👥 All Users' : '👤 Specific'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notif.message}</p>
                    <p className="text-[11px] text-gray-300 mt-1.5">
                      {notif.is_sent && notif.sent_at
                        ? `Sent ${new Date(notif.sent_at).toLocaleString()}`
                        : `Created ${new Date(notif.created_at).toLocaleString()}`}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    {!notif.is_sent && (
                      <button
                        onClick={() => handleSend(notif)}
                        disabled={sending === notif.id}
                        className="flex items-center gap-1.5 text-xs font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-all"
                      >
                        {sending === notif.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Send className="w-3.5 h-3.5" />
                        }
                        Send
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(notif.id)}
                      disabled={deleting === notif.id}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                    >
                      {deleting === notif.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Trash2 className="w-3.5 h-3.5" />
                      }
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateModal
            onClose={() => setShowCreate(false)}
            onCreated={load}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className={`fixed bottom-6 right-6 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg text-sm font-medium z-50 ${
              toast.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success'
              ? <CheckCircle2 className="w-4 h-4" />
              : <AlertCircle className="w-4 h-4" />
            }
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}