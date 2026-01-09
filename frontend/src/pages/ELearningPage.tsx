import { useState, useEffect } from 'react';
import { Upload, Play, Search, Clock, Edit2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { openConfirm } from '../components/ConfirmDialog';
import { useLoadingStore } from '../store/loadingStore';
import { lessonService, Lesson } from '../services/lesson.service';

export default function ELearningPage() {
  const { user } = useAuthStore();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [sortBy, setSortBy] = useState<'newest' | 'mostViewed' | 'category'>('newest');
  const { startLoading, stopLoading } = useLoadingStore();

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadLessons();
  }, [searchQuery, selectedCategory, sortBy]);

  const loadLessons = async () => {
    setIsLoading(true);
    try {
      const data = await lessonService.listLessons({
        search: searchQuery || undefined,
        category: selectedCategory === 'All Categories' ? undefined : selectedCategory,
        sortBy,
      });
      setLessons(data);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to load lessons');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = ['All Categories', 'BEGINNER', 'SALES', 'CUSTOMER SERVICE', 'SAFETY', 'ADVANCED', 'PRODUCTIVITY'];

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch = lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lesson.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All Categories' || lesson.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedLessons = [...filteredLessons].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'mostViewed') {
      return b.views - a.views;
    }
    if (sortBy === 'category') {
      const byCategory = a.category.localeCompare(b.category);
      if (byCategory !== 0) return byCategory;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return 0;
  });

  const handleDeleteLesson = async (lessonId: string) => {
    const confirmed = await openConfirm({
      title: 'Delete lesson',
      message: 'Are you sure you want to delete this lesson? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
    });

    if (!confirmed) return;

    startLoading('Deleting lesson...');
    try {
      // TODO: Call backend delete API when available
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
      toast.success('Lesson deleted');
    } catch (error) {
      toast.error('Failed to delete lesson');
    } finally {
      stopLoading();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">E-Learning</h1>
          <p className="text-gray-600 mt-1">Browse and watch training lessons uploaded by the admin.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => {
              setEditingLesson(null);
              setIsUploadModalOpen(true);
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload New Lesson
          </button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
              placeholder="Search lessons..."
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input w-auto"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Tabs */}
        <div className="flex items-center gap-2 mt-4 border-b border-gray-200">
          <button
            onClick={() => setSortBy('newest')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              sortBy === 'newest'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Newest
          </button>
          <button
            onClick={() => setSortBy('mostViewed')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              sortBy === 'mostViewed'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Most Viewed
          </button>
          <button
            onClick={() => setSortBy('category')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              sortBy === 'category'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Category
          </button>
        </div>
      </div>

      {/* Lessons Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sortedLessons.map((lesson) => (
            <div key={lesson.id} className="card p-0 overflow-hidden hover:shadow-lg transition-shadow">
              {/* Thumbnail */}
              <div className="relative aspect-video bg-gray-200">
                {lesson.thumbnailUrl ? (
                  <img
                    src={lesson.thumbnailUrl}
                    alt={lesson.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <Play className="w-16 h-16 text-gray-400" />
                  </div>
                )}
                <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {Math.floor(lesson.duration / 60)}:{(lesson.duration % 60).toString().padStart(2, '0')}
                </div>
                {lesson.views > 100 && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                    POPULAR
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">{lesson.title}</h3>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{lesson.description}</p>
                
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                    {lesson.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {Math.max(1, Math.round(lesson.duration / 60))} minutes
                    </span>
                  </div>
                </div>

                <button
                  className="btn btn-primary w-full flex items-center justify-center gap-2"
                  onClick={async () => {
                    try {
                      await lessonService.incrementViews(lesson.id);
                      setLessons((prev) =>
                        prev.map((l) =>
                          l.id === lesson.id ? { ...l, views: l.views + 1 } : l
                        )
                      );
                    } catch {
                      // ignore counter error, still try to play
                    }
                    setActiveLesson(lesson);
                  }}
                >
                  <Play className="w-4 h-4" />
                  Watch Video
                </button>

                {isAdmin && (
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <button
                      type="button"
                      className="flex items-center gap-1 hover:text-primary-700"
                      onClick={() => {
                        setEditingLesson(lesson);
                        setIsUploadModalOpen(true);
                      }}
                    >
                      <Edit2 className="w-3 h-3" />
                      Edit
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                      onClick={() => handleDeleteLesson(lesson.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {sortedLessons.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing 1 to {sortedLessons.length} of {sortedLessons.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-secondary">Previous</button>
            <button className="px-3 py-1 bg-primary-600 text-white rounded">1</button>
            <button className="btn btn-secondary">Next</button>
          </div>
        </div>
      )}

      {/* Upload Modal (Admin only) */}
      {isUploadModalOpen && isAdmin && (
        <UploadLessonModal
          isOpen={isUploadModalOpen}
          lesson={editingLesson}
          onClose={() => {
            setIsUploadModalOpen(false);
            setEditingLesson(null);
          }}
          onSave={(savedLesson) => {
            setLessons((prev) => {
              const exists = prev.some((l) => l.id === savedLesson.id);
              if (exists) {
                return prev.map((l) => (l.id === savedLesson.id ? savedLesson : l));
              }
              return [...prev, savedLesson];
            });
          }}
        />
      )}

      {/* Video Player Modal */}
      {activeLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{activeLesson.title}</h2>
                {activeLesson.description && (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {activeLesson.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => setActiveLesson(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-4 flex-1 flex flex-col">
              <video
                key={activeLesson.id}
                controls
                autoPlay
                className="w-full max-h-[60vh] rounded bg-black"
                src={activeLesson.videoUrl}
                onLoadedMetadata={async (e) => {
                  const videoEl = e.currentTarget as HTMLVideoElement;
                  const seconds = videoEl.duration;
                  if (!seconds || Number.isNaN(seconds)) return;
                  const rounded = Math.round(seconds);
                  if (rounded === activeLesson.duration) return;
                  try {
                    const updated = await lessonService.updateLesson(activeLesson.id, {
                      duration: rounded,
                    });
                    setLessons((prev) =>
                      prev.map((l) => (l.id === updated.id ? updated : l))
                    );
                    setActiveLesson(updated);
                  } catch {
                    // ignore update error; playback still works
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Upload Lesson Modal Component
function UploadLessonModal({
  isOpen,
  onClose,
  lesson,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  lesson: Lesson | null;
  onSave: (lesson: Lesson) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState<number | null>(lesson?.duration ?? null);
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      title: lesson?.title || '',
      description: lesson?.description || '',
      category: lesson?.category || '',
      notes: lesson?.notes || '',
    },
  });

  const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      const seconds = video.duration;
      if (!Number.isNaN(seconds) && seconds > 0) {
        setDetectedDuration(Math.round(seconds));
      }
    };
  };

  const onSubmit = async (data: any) => {
    setIsUploading(true);
    try {
      let videoUrl = lesson?.videoUrl || '';
      let thumbnailUrl = lesson?.thumbnailUrl;

      if (data.video && data.video[0]) {
        videoUrl = await lessonService.uploadMedia(data.video[0]);
      }
      if (data.thumbnail && data.thumbnail[0]) {
        thumbnailUrl = await lessonService.uploadMedia(data.thumbnail[0]);
      }

      const payload = {
        title: data.title,
        description: data.description || '',
        category: data.category,
        notes: data.notes || '',
        videoUrl,
        thumbnailUrl,
        // Use detected video duration if available, otherwise keep existing or fallback
        duration: detectedDuration ?? lesson?.duration ?? 60,
      };

      const savedLesson = lesson
        ? await lessonService.updateLesson(lesson.id, payload)
        : await lessonService.createLesson(payload);

      onSave(savedLesson);
      toast.success(lesson ? 'Lesson updated successfully' : 'Lesson uploaded successfully');
      reset();
      onClose();
    } catch (error: any) {
      toast.error('Failed to upload lesson');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Upload New Lesson</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              {...register('title', { required: 'Title is required' })}
              className="input"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              {...register('description')}
              className="input min-h-[100px]"
              placeholder="Brief description of the lesson..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
            <select {...register('category', { required: 'Category is required' })} className="input">
              <option value="">Select category</option>
              <option value="BEGINNER">BEGINNER</option>
              <option value="SALES">SALES</option>
              <option value="CUSTOMER SERVICE">CUSTOMER SERVICE</option>
              <option value="SAFETY">SAFETY</option>
              <option value="ADVANCED">ADVANCED</option>
              <option value="PRODUCTIVITY">PRODUCTIVITY</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Video File (MP4)</label>
            <input
              type="file"
              accept="video/mp4"
                {...register('video', {
                  required: lesson ? false : 'Video file is required',
                  onChange: handleVideoChange,
                })}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Thumbnail Image</label>
            <input
              type="file"
              accept="image/*"
              {...register('thumbnail')}
              className="input"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <textarea
              {...register('notes')}
              className="input min-h-[100px]"
              placeholder="Additional notes for this lesson..."
            />
          </div>

          <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isUploading}>
              {isUploading ? 'Uploading...' : 'Upload Lesson'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

