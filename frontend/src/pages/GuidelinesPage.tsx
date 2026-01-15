import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Save, Edit2, FileText } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { guidelineService, Guideline } from '../services/guideline.service';
import { useAuthStore } from '../store/authStore';
import { isAdmin } from '../utils/permissions';
import { useLoadingStore } from '../store/loadingStore';
import toast from 'react-hot-toast';
import { getUserFriendlyError } from '../utils/errorHandler';
import { formatItalianDate } from '../utils/date';

// Define formats outside component to prevent recreation
const formats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'list',
  'bullet',
  'indent',
  'link',
  'image',
  'color',
  'background',
  'align',
];

export default function GuidelinesPage() {
  const { user } = useAuthStore();
  const { startLoading, stopLoading } = useLoadingStore();
  const [guideline, setGuideline] = useState<Guideline | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const quillRef = useRef<ReactQuill>(null);

  const canEdit = isAdmin(user);

  useEffect(() => {
    loadGuideline();
  }, []);

  const loadGuideline = async () => {
    setIsLoading(true);
    try {
      const data = await guidelineService.getLatestGuideline();
      if (data) {
        setGuideline(data);
        setTitle(data.title);
        setContent(data.content);
      }
    } catch (error: any) {
      console.error('Failed to load guideline:', error);
      toast.error(getUserFriendlyError(error, { action: 'load', entity: 'guidelines' }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!content.trim() || content === '<p><br></p>') {
      toast.error('Please enter content');
      return;
    }

    setIsSaving(true);
    startLoading(guideline ? 'Updating guidelines...' : 'Creating guidelines...');
    try {
      if (guideline) {
        await guidelineService.updateGuideline(guideline.id, { title, content });
        toast.success('Guidelines updated successfully');
      } else {
        await guidelineService.createGuideline({ title, content });
        toast.success('Guidelines created successfully');
      }
      await loadGuideline();
      setIsEditing(false);
    } catch (error: any) {
      console.error('Failed to save guideline:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      if (error.response?.status === 401) {
        toast.error('Your session has expired. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to perform this action. Admin access required.');
      } else {
        toast.error(getUserFriendlyError(error, { action: 'save', entity: 'guidelines' }));
      }
    } finally {
      setIsSaving(false);
      stopLoading();
    }
  };

  const handleCancel = () => {
    if (guideline) {
      setTitle(guideline.title);
      setContent(guideline.content);
    } else {
      setTitle('');
      setContent('');
    }
    setIsEditing(false);
  };

  const handleImageUpload = useCallback(async () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      try {
        toast.loading('Uploading image...', { id: 'upload-image' });
        const result = await guidelineService.uploadImage(file);
        const quill = quillRef.current?.getEditor();
        if (quill) {
          const range = quill.getSelection(true);
          if (range) {
            quill.insertEmbed(range.index, 'image', result.url);
            quill.setSelection(range.index + 1);
          } else {
            // If no selection, insert at the end
            const length = quill.getLength();
            quill.insertEmbed(length - 1, 'image', result.url);
            quill.setSelection(length);
          }
        }
        toast.success('Image uploaded successfully', { id: 'upload-image' });
      } catch (error: any) {
        console.error('Failed to upload image:', error);
        toast.error(getUserFriendlyError(error, { action: 'upload', entity: 'image' }), {
          id: 'upload-image',
        });
      }
    };
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ list: 'ordered' }, { list: 'bullet' }],
          [{ indent: '-1' }, { indent: '+1' }],
          ['link', 'image'],
          [{ color: [] }, { background: [] }],
          [{ align: [] }],
          ['clean'],
        ],
        handlers: {
          image: handleImageUpload,
        },
      },
    }),
    [handleImageUpload]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Guidelines</h1>
          <p className="text-sm text-gray-600 mt-1">
            {canEdit
              ? 'Manage guidelines that chatters must follow'
              : 'View the guidelines you must follow'}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={handleCancel}
                  className="btn btn-secondary"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="btn btn-primary flex items-center gap-2"
                  disabled={isSaving}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Guidelines
              </button>
            )}
          </div>
        )}
      </div>

      {/* Guideline Info */}
      {guideline && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <FileText className="w-4 h-4" />
            <span>
              Version {guideline.version} • Last updated{' '}
              {formatItalianDate(guideline.updatedAt, 'MMM dd, yyyy HH:mm')}
            </span>
          </div>
        </div>
      )}

      {/* Editor/Viewer */}
      <div className="card">
        {isEditing && canEdit ? (
          <div className="space-y-4">
            {/* Title Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="Enter guideline title..."
                disabled={isSaving}
              />
            </div>

            {/* Rich Text Editor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content <span className="text-red-500">*</span>
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                <style>{`
                  .ql-container {
                    font-size: 16px;
                  }
                  .ql-editor {
                    min-height: 400px;
                    cursor: text;
                  }
                  .ql-editor:focus {
                    outline: none;
                  }
                `}</style>
                <ReactQuill
                  ref={quillRef}
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={modules}
                  formats={formats}
                  placeholder="Enter guideline content..."
                  readOnly={isSaving}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Click the image icon in the toolbar to upload images
              </p>
            </div>
          </div>
        ) : (
          <div className="prose max-w-none">
            {guideline ? (
              <>
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{guideline.title}</h2>
                <div
                  dangerouslySetInnerHTML={{ __html: guideline.content }}
                  className="guideline-content"
                />
              </>
            ) : (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Guidelines Yet</h3>
                <p className="text-gray-600">
                  {canEdit
                    ? 'Create the first set of guidelines for your team.'
                    : 'Guidelines will be available here once they are created.'}
                </p>
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="btn btn-primary mt-6"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Create Guidelines
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

