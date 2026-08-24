
import { motion, AnimatePresence } from 'framer-motion';
import { X, Camera, MapPin, Clock, Navigation, Eye, Maximize2, ExternalLink } from 'lucide-react';
import type { Camera as CameraType } from '@/types/route';

interface CameraPreviewProps {
  camera: CameraType | null;
  onClose: () => void;
}

export function CameraPreview({ camera, onClose }: CameraPreviewProps) {
  if (!camera) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden"
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-slate-900">{camera.name}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>

          <div className="aspect-video bg-gradient-to-br from-slate-800 to-slate-900 relative">
              <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Camera className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500">Camera Feed</p>
              </div>
            </div>

              <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-white text-xs font-medium">LIVE</span>
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
                <span className="text-white text-xs">
                  {camera.roadName} · {camera.direction}
                </span>
              </div>
              <button className="bg-black/50 backdrop-blur-sm p-2 rounded-full hover:bg-black/70 transition-colors">
                <Maximize2 className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="text-sm font-medium text-slate-900">
                    {camera.location.lat.toFixed(4)}, {camera.location.lng.toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Direction</p>
                  <p className="text-sm font-medium text-slate-900">{camera.direction}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Last Updated</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatTimeAgo(camera.lastUpdated)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className={`text-sm font-medium ${
                    camera.status === 'active' ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {camera.status === 'active' ? 'Active' : camera.status === 'maintenance' ? 'Maintenance' : 'Inactive'}
                  </p>
                </div>
              </div>
            </div>

            {camera.description && (
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-slate-700">{camera.description}</p>
              </div>
            )}

            {camera.status !== 'active' && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">Camera Not Active</p>
                  <p className="text-sm text-amber-700 mt-1">
                    This camera is currently {camera.status}. Real-time monitoring may not be available.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" />
                View Full Feed
              </button>
              <button className="px-6 py-3 border border-slate-300 rounded-xl font-medium hover:bg-slate-50 transition-colors">
                Add to Watchlist
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}
