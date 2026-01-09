import { FastifyRequest } from 'fastify';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

const uploadsDir = join(process.cwd(), 'uploads');
const publicUploadsDir = join(process.cwd(), 'public', 'uploads');

// Ensure upload directories exist
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
}
if (!existsSync(publicUploadsDir)) {
  mkdirSync(publicUploadsDir, { recursive: true });
}

/**
 * Generate a unique filename
 */
function generateFilename(originalFilename: string): string {
  const ext = originalFilename.split('.').pop();
  const randomString = randomBytes(16).toString('hex');
  return `${randomString}.${ext}`;
}

/**
 * Save uploaded file to disk
 */
export async function saveUploadedFile(
  file: any,
  subfolder: 'users' | 'creators' | 'guidelines' | 'lessons' = 'users'
): Promise<string> {
  const filename = generateFilename(file.filename);
  const folder = join(publicUploadsDir, subfolder);
  
  // Ensure subfolder exists
  if (!existsSync(folder)) {
    mkdirSync(folder, { recursive: true });
  }
  
  const filepath = join(folder, filename);
  const buffer = await file.toBuffer();
  
  const writeStream = createWriteStream(filepath);
  writeStream.write(buffer);
  writeStream.end();
  
  await new Promise<void>((resolve, reject) => {
    writeStream.on('finish', () => resolve());
    writeStream.on('error', reject);
  });
  
  // Return relative path from public directory
  return `/uploads/${subfolder}/${filename}`;
}

/**
 * Parse multipart form data and get file
 */
export async function parseFileUpload(request: FastifyRequest): Promise<any> {
  const data = await request.file();
  return data;
}

/**
 * Validate image file
 */
export async function validateImageFile(file: any): Promise<{ valid: boolean; error?: string }> {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }
  
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { valid: false, error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed' };
  }
  
  const maxSize = 5 * 1024 * 1024; // 5MB
  const buffer = await file.toBuffer();
  if (buffer.length > maxSize) {
    return { valid: false, error: 'File size exceeds 5MB limit' };
  }
  
  return { valid: true };
}

