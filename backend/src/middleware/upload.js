







import multer from 'multer';

const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const MAX_FILE_SIZE  = 10 * 1024 * 1024; 
const MAX_FILE_COUNT = 3;                 

const storage = multer.memoryStorage(); 

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
