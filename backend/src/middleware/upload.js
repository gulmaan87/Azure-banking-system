/**
 * upload.js — Multer middleware for KYC document uploads
 *
 * Validates: file type (images + PDF only), file size (max 10MB),
 * max 3 files per submission (passport, utility bill, selfie).
 * Uses memoryStorage so files go directly to Blob Storage (no disk writes).
 */

import multer from 'multer';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_FILE_SIZE  = 10 * 1024 * 1024; // 10 MB per file
const MAX_FILE_COUNT = 3;                 // passport + utility bill + selfie

const storage = multer.memoryStorage(); // buffer → Blob Storage directly

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_TYPES.has(file.mimetype)) {
    return cb(new Error(`File type not allowed: ${file.mimetype}. Use JPEG, PNG, WebP, or PDF.`));
  }
  cb(null, true);
};

export const kycUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize:  MAX_FILE_SIZE,
    files:     MAX_FILE_COUNT,
  },
});
