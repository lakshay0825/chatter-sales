import { prisma } from '../config/database';

export interface LessonFilters {
  search?: string;
  category?: string;
  sortBy?: 'newest' | 'mostViewed' | 'category';
}

export async function listLessons(filters: LessonFilters = {}) {
  const { search, category, sortBy = 'newest' } = filters;

  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (category && category !== 'All Categories') {
    where.category = category;
  }

  let orderBy: any = { createdAt: 'desc' };
  if (sortBy === 'mostViewed') {
    orderBy = { views: 'desc' };
  } else if (sortBy === 'category') {
    orderBy = [{ category: 'asc' }, { createdAt: 'desc' }];
  }

  return prisma.lesson.findMany({
    where,
    orderBy,
  });
}

export async function createLesson(data: {
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  category: string;
  notes?: string;
}) {
  return prisma.lesson.create({ data });
}

export async function updateLesson(
  id: string,
  data: {
    title?: string;
    description?: string;
    videoUrl?: string;
    thumbnailUrl?: string;
    duration?: number;
    category?: string;
    notes?: string;
  }
) {
  return prisma.lesson.update({
    where: { id },
    data,
  });
}

export async function deleteLesson(id: string) {
  await prisma.lesson.delete({ where: { id } });
}

export async function incrementLessonViews(id: string) {
  return prisma.lesson.update({
    where: { id },
    data: { views: { increment: 1 } },
  });
}


