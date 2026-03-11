/**
 * File Security Validator
 * Validates file types using Magic Bytes (file signatures)
 * to prevent malicious file uploads with fake extensions
 */

// Magic bytes signatures for allowed file types
const FILE_SIGNATURES: Record<string, { signature: number[][]; mimeTypes: string[] }> = {
  // PDF
  pdf: {
    signature: [[0x25, 0x50, 0x44, 0x46]], // %PDF
    mimeTypes: ['application/pdf'],
  },
  // JPEG
  jpg: {
    signature: [[0xFF, 0xD8, 0xFF]],
    mimeTypes: ['image/jpeg'],
  },
  jpeg: {
    signature: [[0xFF, 0xD8, 0xFF]],
    mimeTypes: ['image/jpeg'],
  },
  // PNG
  png: {
    signature: [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
    mimeTypes: ['image/png'],
  },
  // GIF
  gif: {
    signature: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], // GIF89a
    ],
    mimeTypes: ['image/gif'],
  },
  // WebP
  webp: {
    signature: [[0x52, 0x49, 0x46, 0x46]], // RIFF (with WEBP at offset 8)
    mimeTypes: ['image/webp'],
  },
  // DOCX, XLSX, PPTX (ZIP-based Office formats)
  docx: {
    signature: [[0x50, 0x4B, 0x03, 0x04]], // PK (ZIP archive)
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  xlsx: {
    signature: [[0x50, 0x4B, 0x03, 0x04]],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  },
  pptx: {
    signature: [[0x50, 0x4B, 0x03, 0x04]],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  },
  // DOC, XLS (Old Office format - Compound File Binary Format)
  doc: {
    signature: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
    mimeTypes: ['application/msword'],
  },
  xls: {
    signature: [[0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]],
    mimeTypes: ['application/vnd.ms-excel'],
  },
  // MP3
  mp3: {
    signature: [
      [0xFF, 0xFB], // MPEG Audio Frame sync
      [0xFF, 0xF3],
      [0xFF, 0xF2],
      [0x49, 0x44, 0x33], // ID3 tag
    ],
    mimeTypes: ['audio/mpeg', 'audio/mp3'],
  },
  // WAV
  wav: {
    signature: [[0x52, 0x49, 0x46, 0x46]], // RIFF (with WAVE at offset 8)
    mimeTypes: ['audio/wav', 'audio/wave', 'audio/x-wav'],
  },
  // OGG (audio/video)
  ogg: {
    signature: [[0x4F, 0x67, 0x67, 0x53]], // OggS
    mimeTypes: ['audio/ogg', 'video/ogg', 'application/ogg'],
  },
  // MP4 / M4A
  mp4: {
    signature: [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ftyp at offset 4
      [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ],
    mimeTypes: ['video/mp4', 'audio/mp4', 'audio/x-m4a'],
  },
  m4a: {
    signature: [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x1C, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ],
    mimeTypes: ['audio/mp4', 'audio/x-m4a', 'audio/aac'],
  },
  // WebM
  webm: {
    signature: [[0x1A, 0x45, 0xDF, 0xA3]], // EBML header
    mimeTypes: ['video/webm', 'audio/webm'],
  },
  // TXT (no specific signature, validate by content)
  txt: {
    signature: [],
    mimeTypes: ['text/plain'],
  },
  // CSV
  csv: {
    signature: [],
    mimeTypes: ['text/csv', 'application/csv'],
  },
};

// Dangerous file extensions that should always be blocked
const DANGEROUS_EXTENSIONS = [
  'exe', 'dll', 'bat', 'cmd', 'com', 'msi', 'scr', 'pif',
  'js', 'jse', 'vbs', 'vbe', 'wsf', 'wsh', 'ps1', 'psm1',
  'sh', 'bash', 'php', 'py', 'pl', 'rb', 'jar', 'class',
  'html', 'htm', 'svg', 'swf', 'fla',
  'reg', 'inf', 'lnk', 'url',
  'iso', 'img', 'dmg',
];

// Allowed extensions for case document uploads
const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'txt', 'csv',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'xls', 'xlsx', 'pptx',
  'mp3', 'wav', 'ogg', 'm4a',
  'mp4', 'webm',
];

// Maximum content scan size for text-based files
const TEXT_SCAN_SIZE = 1024;

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  detectedType?: string;
  warning?: string;
}

/**
 * Read the first N bytes of a file
 */
async function readFileHeader(file: File, bytes: number = 16): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      resolve(new Uint8Array(arrayBuffer));
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, bytes));
  });
}

/**
 * Check if bytes match a signature
 */
function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  return signature.every((byte, index) => bytes[index] === byte);
}

/**
 * Detect file type from magic bytes
 */
async function detectFileType(file: File): Promise<string | null> {
  try {
    const header = await readFileHeader(file, 16);
    
    for (const [extension, { signature }] of Object.entries(FILE_SIGNATURES)) {
      if (signature.length === 0) continue; // Skip text files
      
      for (const sig of signature) {
        if (matchesSignature(header, sig)) {
          // Special check for WebP (RIFF format with WEBP at offset 8)
          if (extension === 'webp') {
            const webpCheck = await readFileHeader(file, 12);
            if (webpCheck[8] === 0x57 && webpCheck[9] === 0x45 && 
                webpCheck[10] === 0x42 && webpCheck[11] === 0x50) {
              return 'webp';
            }
            continue;
          }
          // Special check for WAV (RIFF format with WAVE at offset 8)
          if (extension === 'wav') {
            const wavCheck = await readFileHeader(file, 12);
            if (wavCheck[8] === 0x57 && wavCheck[9] === 0x41 && 
                wavCheck[10] === 0x56 && wavCheck[11] === 0x45) {
              return 'wav';
            }
            continue;
          }
          return extension;
        }
      }
    }
    
    // Fallback: check for ftyp at byte 4 (MP4 variants)
    if (header.length >= 8) {
      const ftyp = String.fromCharCode(header[4], header[5], header[6], header[7]);
      if (ftyp === 'ftyp') {
        return 'mp4';
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if file content looks like valid text (UTF-8)
 */
async function isValidTextFile(file: File): Promise<boolean> {
  try {
    const text = await file.slice(0, TEXT_SCAN_SIZE).text();
    
    // Check for null bytes (binary file indicator)
    if (text.includes('\0')) {
      return false;
    }
    
    // Check for reasonable printable character ratio
    const printableChars = text.match(/[\x20-\x7E\u0600-\u06FF\u0750-\u077F\t\n\r]/g)?.length || 0;
    const ratio = printableChars / text.length;
    
    return ratio > 0.85;
  } catch {
    return false;
  }
}

/**
 * Scan file content for suspicious patterns (basic malware indicators)
 */
async function scanForSuspiciousContent(file: File): Promise<string | null> {
  try {
    // Only scan text-based and Office files
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const textExts = ['txt', 'csv', 'doc', 'docx'];
    if (!textExts.includes(ext)) return null;

    const sampleSize = Math.min(file.size, 8192);
    const text = await file.slice(0, sampleSize).text();

    // Check for embedded scripts/macros indicators
    const suspiciousPatterns = [
      /\bAutoOpen\b/i,
      /\bAutoExec\b/i,
      /\bDocument_Open\b/i,
      /\bShell\s*\(/i,
      /\bWScript\.Shell\b/i,
      /\bpowershell\b/i,
      /\bcmd\.exe\b/i,
      /<script[\s>]/i,
      /javascript\s*:/i,
      /\beval\s*\(/i,
      /\bexec\s*\(/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(text)) {
        return `تم اكتشاف محتوى مشبوه في الملف (${pattern.source})`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Validate file for security
 */
export async function validateFileSecurely(file: File): Promise<FileValidationResult> {
  const fileName = file.name.toLowerCase();
  const extension = fileName.split('.').pop() || '';
  
  // Check for dangerous extensions
  if (DANGEROUS_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `نوع الملف غير مسموح به: .${extension}`,
    };
  }
  
  // Check if extension is allowed
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      error: `نوع الملف غير مدعوم. الأنواع المسموحة: ${ALLOWED_EXTENSIONS.join(', ')}`,
    };
  }
  
  // For text-based files, validate content
  if (extension === 'txt' || extension === 'csv') {
    const isText = await isValidTextFile(file);
    if (!isText) {
      return {
        isValid: false,
        error: 'الملف ليس ملف نصي صالح',
      };
    }
    return { isValid: true, detectedType: extension };
  }
  
  // Detect actual file type from magic bytes
  const detectedType = await detectFileType(file);
  
  // ZIP-based Office formats (docx, xlsx, pptx)
  const zipBasedFormats = ['docx', 'xlsx', 'pptx'];
  if (zipBasedFormats.includes(extension)) {
    if (detectedType === 'docx' || detectedType === 'xlsx' || detectedType === 'pptx') {
      // All Office Open XML start with PK (ZIP); trust the extension for distinction
      const suspicion = await scanForSuspiciousContent(file);
      if (suspicion) {
        return { isValid: false, error: suspicion };
      }
      return { isValid: true, detectedType: extension };
    }
    if (detectedType === 'doc' || detectedType === 'xls') {
      return {
        isValid: false,
        error: 'الملف قديم ولا يتوافق مع الامتداد الحديث',
      };
    }
  }
  
  // Old Office formats (doc, xls)
  if (extension === 'doc' || extension === 'xls') {
    if (detectedType === 'doc' || detectedType === 'xls') {
      const suspicion = await scanForSuspiciousContent(file);
      if (suspicion) {
        return { isValid: false, error: suspicion };
      }
      return { isValid: true, detectedType: extension };
    }
    if (detectedType === 'docx' || detectedType === 'xlsx') {
      return { 
        isValid: true, 
        detectedType: detectedType,
        warning: `الملف بصيغة ${detectedType.toUpperCase()} وليس ${extension.toUpperCase()}`
      };
    }
  }

  // Audio/Video: MP4/M4A share same signatures
  if ((extension === 'mp4' || extension === 'm4a') && detectedType === 'mp4') {
    return { isValid: true, detectedType: extension };
  }
  if ((extension === 'mp4' || extension === 'm4a') && detectedType === 'm4a') {
    return { isValid: true, detectedType: extension };
  }

  // WebM uses same EBML header
  if (extension === 'webm' && detectedType === 'webm') {
    return { isValid: true, detectedType: 'webm' };
  }

  // For other files, verify signature matches extension
  if (detectedType === null) {
    // MP3 has multiple possible headers; allow if MIME matches
    if (extension === 'mp3' && (file.type === 'audio/mpeg' || file.type === 'audio/mp3')) {
      return { isValid: true, detectedType: 'mp3', warning: 'لم يتم التحقق من توقيع الملف بالكامل' };
    }
    return {
      isValid: false,
      error: 'لا يمكن التحقق من نوع الملف الحقيقي',
    };
  }
  
  // Check if detected type matches declared extension
  const expectedTypes = [extension];
  if (extension === 'jpg') expectedTypes.push('jpeg');
  if (extension === 'jpeg') expectedTypes.push('jpg');
  if (extension === 'mp4') expectedTypes.push('m4a');
  if (extension === 'm4a') expectedTypes.push('mp4');
  
  if (!expectedTypes.includes(detectedType)) {
    return {
      isValid: false,
      error: `نوع الملف الحقيقي (${detectedType}) لا يتطابق مع الامتداد (${extension})`,
    };
  }
  
  return { isValid: true, detectedType };
}

/**
 * Sanitize filename to prevent path traversal attacks
 */
export function sanitizeFileName(fileName: string): string {
  let sanitized = fileName.replace(/[\/\\:\*\?"<>\|\x00-\x1f]/g, '_');
  sanitized = sanitized.replace(/^\.+/, '');
  
  if (sanitized.length > 200) {
    const ext = sanitized.split('.').pop() || '';
    const name = sanitized.slice(0, 200 - ext.length - 1);
    sanitized = `${name}.${ext}`;
  }
  
  return sanitized || 'unnamed_file';
}

/**
 * Check file size with detailed feedback
 */
export function validateFileSize(file: File, maxSizeBytes: number): FileValidationResult {
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'الملف فارغ',
    };
  }
  
  if (file.size > maxSizeBytes) {
    const maxSizeMB = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `حجم الملف (${fileSizeMB} ميجابايت) يتجاوز الحد المسموح (${maxSizeMB} ميجابايت)`,
    };
  }
  
  return { isValid: true };
}

/**
 * Comprehensive file validation
 */
export async function validateFile(file: File, maxSizeBytes: number = 10 * 1024 * 1024): Promise<FileValidationResult> {
  // Check size first
  const sizeResult = validateFileSize(file, maxSizeBytes);
  if (!sizeResult.isValid) {
    return sizeResult;
  }
  
  // Then check security
  return validateFileSecurely(file);
}

/**
 * Get human-readable accepted file types string for input accept attribute
 */
export const CASE_DOCUMENT_ACCEPTED_TYPES = ".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx,.pptx,.mp3,.wav,.ogg,.m4a,.mp4,.webm";

/**
 * Get maximum file size for case documents (20MB)
 */
export const CASE_DOCUMENT_MAX_SIZE = 20 * 1024 * 1024;

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
