import api from './api';
import { ApiResponse } from '../types';

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  category: string;
  views: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonFilters {
  search?: string;
  category?: string;
  sortBy?: 'newest' | 'mostViewed' | 'category';
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
// Convert '/uploads/...' coming from older data into absolute backend URL
function normalizeMediaUrl(url?: string): string | undefined {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) {
    const backendBase = API_BASE_URL.replace(/\/api\/?$/, '');
    return `${backendBase}${url}`;
  }
  return url;
}

export const lessonService = {
  async listLessons(filters: LessonFilters = {}): Promise<Lesson[]> {
    const response = await api.get<ApiResponse<Lesson[]>>('/lessons', {
      params: filters,
    });
    const lessons = response.data.data || [];
    return lessons.map((l) => ({
      ...l,
      videoUrl: normalizeMediaUrl(l.videoUrl) || l.videoUrl,
      thumbnailUrl: normalizeMediaUrl(l.thumbnailUrl),
    }));
  },

  async createLesson(payload: Partial<Lesson>): Promise<Lesson> {
    const response = await api.post<ApiResponse<Lesson>>('/lessons', payload);
    const lesson = response.data.data!;
    return {
      ...lesson,
      videoUrl: normalizeMediaUrl(lesson.videoUrl) || lesson.videoUrl,
      thumbnailUrl: normalizeMediaUrl(lesson.thumbnailUrl),
    };
  },

  async updateLesson(id: string, payload: Partial<Lesson>): Promise<Lesson> {
    const response = await api.put<ApiResponse<Lesson>>(`/lessons/${id}`, payload);
    const lesson = response.data.data!;
    return {
      ...lesson,
      videoUrl: normalizeMediaUrl(lesson.videoUrl) || lesson.videoUrl,
      thumbnailUrl: normalizeMediaUrl(lesson.thumbnailUrl),
    };
  },

  async deleteLesson(id: string): Promise<void> {
    await api.delete<ApiResponse>(`/lessons/${id}`);
  },

  async uploadMedia(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<ApiResponse<{ url: string }>>('/lessons/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data!.url;
  },

  async incrementViews(id: string): Promise<void> {
    await api.post<ApiResponse>(`/lessons/${id}/views`);
  },
};


