import { useEffect, useMemo, useRef, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Camera, ImagePlus, Heart, X, Loader2, Star, CalendarDays } from "lucide-react";
import { HeaderIcons } from "../layouts/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { useTrip } from "../context/TripContext";
import { useDestinationPhotos } from "../hooks/useDestinationPhotos";
import {
  getTripPhotos,
  uploadTripPhotos,
} from "../lib/photoService";
import type { TripPhoto } from "../types/photos";

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", opts);
  const endStr = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

// ─────────────────────────────────────────────
// Date grouping helpers (iOS Photos style)
// ─────────────────────────────────────────────
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function dayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface DayGroup {
  key: string;
  label: string;
  photos: TripPhoto[];
}

function groupByDay(photos: TripPhoto[]): DayGroup[] {
  const map = new Map<string, TripPhoto[]>();
  for (const photo of photos) {
    const key = new Date(photo.createdAt).toDateString();
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(photo);
  }
  return Array.from(map.entries())
    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
    .map(([key, items]) => ({ key, label: dayLabel(items[0].createdAt), photos: items }));
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function Gallery() {
  const { unreadCount } = useOutletContext<{ unreadCount: number }>();
  const { user } = useAuth();
  const { trip } = useTrip();
  const { hero: heroImage, loading: heroLoading } = useDestinationPhotos(
    trip?.destination ?? ""
  );

  const [photos, setPhotos] = useState<TripPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [likedPhotoIds, setLikedPhotoIds] = useState<Set<string>>(new Set());
  const [actionSheetOpen, setActionSheetOpen] = useState(false);
  const [viewerPhoto, setViewerPhoto] = useState<TripPhoto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const captureInputRef = useRef<HTMLInputElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!trip) {
      setPhotos([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getTripPhotos(trip.id)
      .then(setPhotos)
      .catch((err) => {
        console.error(err);
        setError("Couldn't load photos.");
      })
      .finally(() => setLoading(false));
  }, [trip]);

  const dayGroups = useMemo(() => groupByDay(photos), [photos]);

  const toggleLike = (photoId: string) => {
    setLikedPhotoIds((prev) => {
      const next = new Set(prev);
      next.has(photoId) ? next.delete(photoId) : next.add(photoId);
      return next;
    });
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || !trip || !user) return;

    setActionSheetOpen(false);
    setUploading(true);
    setError(null);

    try {
      const uploaded = await uploadTripPhotos(trip.id, user.id, Array.from(fileList));
      if (uploaded.length === 0) {
        setError("Upload failed. Please try again.");
      } else {
        setPhotos((prev) => [...uploaded, ...prev]);
      }
    } catch (err) {
      console.error(err);
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (captureInputRef.current) captureInputRef.current.value = "";
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  };

  return (
    <div className="px-4 max-w-7xl mx-auto">
      {/* Page header */}
      <div className="sticky top-0 z-20 -mx-4 px-4 pt-5 pb-3 mb-5 bg-slate-50/90 backdrop-blur-md flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Gallery
        </h1>
        <HeaderIcons unreadCount={unreadCount} />
      </div>

      {!trip && !loading && (
        <div className="text-center py-16 text-slate-400 text-sm">
          Start or select a trip to see its gallery.
        </div>
      )}

      {/* Featured trip — real destination photo, auto-generated */}
      {trip && (
        <section className="mb-8">
          <motion.div
            whileTap={{ scale: 0.98 }}
            className="relative w-full h-56 rounded-3xl overflow-hidden shadow-lg shadow-violet-900/10 bg-slate-100"
          >
            {heroLoading ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-slate-300" />
              </div>
            ) : heroImage ? (
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${heroImage}')` }}
                role="img"
                aria-label={trip.destination}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400 to-violet-600" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-violet-900/70 to-transparent" />
            <div className="absolute bottom-6 left-6 text-white">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">
                Featured Trip
              </p>
              <h2 className="text-2xl font-extrabold mb-1">{trip.destination}</h2>
              {trip.startDate && trip.endDate && (
                <p className="text-sm font-semibold opacity-90 flex items-center gap-1">
                  <CalendarDays size={14} />
                  {formatDateRange(trip.startDate, trip.endDate)}
                </p>
              )}
            </div>
            <div className="absolute top-5 right-5 bg-white/20 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5">
              <Star size={14} className="text-white" fill="white" />
              <span className="text-white text-xs font-semibold">Featured</span>
            </div>
          </motion.div>
        </section>
      )}

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-rose-50 text-rose-600 text-sm font-medium">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      )}

      {/* iOS-style day-grouped grid */}
      {!loading && trip && (
        <>
          {dayGroups.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No photos yet — tap the + button to add one.
            </div>
          ) : (
            <div className="space-y-6 pb-8">
              {dayGroups.map((group) => (
                <section key={group.key}>
                  <h3 className="text-sm font-bold text-slate-700 mb-2">
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-3 gap-1">
                    {group.photos.map((photo) => {
                      const isLiked = likedPhotoIds.has(photo.id);
                      return (
                        <button
                          key={photo.id}
                          onClick={() => setViewerPhoto(photo)}
                          className="relative aspect-square overflow-hidden bg-slate-100 group"
                        >
                          <img
                            src={photo.url}
                            alt={photo.caption ?? "Trip photo"}
                            className="w-full h-full object-cover transition-transform duration-300 group-active:scale-95"
                          />
                          {isLiked && (
                            <div className="absolute bottom-1 right-1">
                              <Heart size={14} className="text-white drop-shadow" fill="white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </>
      )}

      {/* Full-screen photo viewer */}
      <AnimatePresence>
        {viewerPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black flex flex-col"
          >
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => setViewerPhoto(null)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <X size={18} />
              </button>
              <button
                onClick={() => toggleLike(viewerPhoto.id)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white"
              >
                <Heart
                  size={18}
                  fill={likedPhotoIds.has(viewerPhoto.id) ? "white" : "none"}
                />
              </button>
            </div>
            <div className="flex-1 flex items-center justify-center px-4">
              <img
                src={viewerPhoto.url}
                alt={viewerPhoto.caption ?? "Trip photo"}
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <p className="text-center text-white/60 text-xs pb-8">
              {dayLabel(viewerPhoto.createdAt)}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Capture/Upload button — bottom-right, above the bottom nav */}
      <button
        onClick={() => setActionSheetOpen(true)}
        disabled={!trip || uploading}
        aria-label="Add photo"
        className="fixed bottom-24 right-6 z-30 w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg shadow-violet-900/30 active:scale-90 transition-transform disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, #7C5CFF 0%, #8B5CF6 100%)" }}
      >
        {uploading ? (
          <Loader2 size={22} className="animate-spin" />
        ) : (
          <Plus size={24} strokeWidth={2.5} />
        )}
      </button>

      {/* Capture / Upload action sheet */}
      <AnimatePresence>
        {actionSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActionSheetOpen(false)}
              className="fixed inset-0 bg-black/40 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-6 pb-8 shadow-2xl"
            >
              <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-5" />
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Add a Photo
              </h3>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => captureInputRef.current?.click()}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-violet-50 hover:bg-violet-100 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center flex-shrink-0">
                    <Camera size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Capture</p>
                    <p className="text-xs text-slate-500">
                      Take a new photo with your camera
                    </p>
                  </div>
                </button>
                <button
                  onClick={() => uploadInputRef.current?.click()}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-violet-50 hover:bg-violet-100 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-full bg-violet-500 text-white flex items-center justify-center flex-shrink-0">
                    <ImagePlus size={18} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Upload</p>
                    <p className="text-xs text-slate-500">
                      Choose photos from your device
                    </p>
                  </div>
                </button>
              </div>
              <button
                onClick={() => setActionSheetOpen(false)}
                className="w-full mt-4 py-3 text-sm font-semibold text-slate-500"
              >
                Cancel
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Hidden file inputs driven by the action sheet buttons */}
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFilesSelected(e.target.files)}
      />
    </div>
  );
}