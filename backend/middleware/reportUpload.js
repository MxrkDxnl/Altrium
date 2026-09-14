const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

// Protected storage directory outside public uploads
const REPORT_STORAGE_DIR = process.env.REPORT_STORAGE_DIR
  ? path.resolve(process.env.REPORT_STORAGE_DIR)
  : path.resolve(__dirname, '../storage/reports');
if (!fs.existsSync(REPORT_STORAGE_DIR)) {
  fs.mkdirSync(REPORT_STORAGE_DIR, { recursive: true });
}

// Allowed extensions and MIME types
const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.xlsx', '.png', '.jpg', '.jpeg']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg',
  'image/jpg',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Safe disk storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, REPORT_STORAGE_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const randomName = `report-${crypto.randomBytes(16).toString('hex')}${ext}`;
    cb(null, randomName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new Error('Invalid file extension. Allowed formats: PDF, DOCX, XLSX, PNG, JPG/JPEG.'));
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return cb(new Error('Invalid MIME type. Allowed formats: PDF, DOCX, XLSX, PNG, JPG/JPEG.'));
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
}).single('reportFile');

/**
 * Validate OpenXML Office documents (DOCX, XLSX) via bounded ZIP parsing and decompression limits
 */
function validateOpenXmlStructure(filePath, ext) {
  let fd = null;
  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    if (fileSize < 100 || fileSize > MAX_FILE_SIZE) return false;

    fd = fs.openSync(filePath, 'r');

    // 1. Check magic bytes at start: PK\x03\x04
    const headerBuf = Buffer.alloc(4);
    fs.readSync(fd, headerBuf, 0, 4, 0);
    if (headerBuf[0] !== 0x50 || headerBuf[1] !== 0x4B || headerBuf[2] !== 0x03 || headerBuf[3] !== 0x04) {
      return false;
    }

    // 2. Locate End of Central Directory (EOCD) signature: 0x06054b50 (PK\x05\x06)
    const searchLen = Math.min(fileSize, 65557);
    const searchBuf = Buffer.alloc(searchLen);
    const searchOffset = fileSize - searchLen;
    fs.readSync(fd, searchBuf, 0, searchLen, searchOffset);

    let eocdPos = -1;
    for (let i = searchLen - 22; i >= 0; i--) {
      if (
        searchBuf[i] === 0x50 &&
        searchBuf[i + 1] === 0x4B &&
        searchBuf[i + 2] === 0x05 &&
        searchBuf[i + 3] === 0x06
      ) {
        eocdPos = i;
        break;
      }
    }

    if (eocdPos === -1) return false;

    const totalEntries = searchBuf.readUInt16LE(eocdPos + 10);
    const cdSize = searchBuf.readUInt32LE(eocdPos + 12);
    const cdOffset = searchBuf.readUInt32LE(eocdPos + 16);

    // Bounded checks on ZIP parameters
    if (totalEntries === 0 || totalEntries > 500) return false;
    if (cdSize === 0 || cdSize > fileSize) return false;
    if (cdOffset + cdSize > fileSize) return false;

    // 3. Read Central Directory
    const cdBuf = Buffer.alloc(cdSize);
    fs.readSync(fd, cdBuf, 0, cdSize, cdOffset);

    const MAX_TOTAL_UNCOMPRESSED_SIZE = 50 * 1024 * 1024; // 50 MB total across archive
    const MAX_SINGLE_ENTRY_UNCOMPRESSED = 15 * 1024 * 1024; // 15 MB per single entry
    const MAX_CONTENT_TYPES_UNCOMPRESSED = 512 * 1024; // 512 KB for [Content_Types].xml

    const entryNames = new Set();
    const localHeaderOffsets = {};
    let cursor = 0;
    let entryCount = 0;
    let totalUncompressedBytes = 0;

    while (cursor < cdSize && entryCount < totalEntries) {
      if (
        cdBuf[cursor] !== 0x50 ||
        cdBuf[cursor + 1] !== 0x4B ||
        cdBuf[cursor + 2] !== 0x01 ||
        cdBuf[cursor + 3] !== 0x02
      ) {
        return false;
      }

      const compressionMethod = cdBuf.readUInt16LE(cursor + 10);
      const compressedSize = cdBuf.readUInt32LE(cursor + 20);
      const uncompressedSize = cdBuf.readUInt32LE(cursor + 24);
      const fileNameLen = cdBuf.readUInt16LE(cursor + 28);
      const extraLen = cdBuf.readUInt16LE(cursor + 30);
      const commentLen = cdBuf.readUInt16LE(cursor + 32);
      const localOffset = cdBuf.readUInt32LE(cursor + 42);

      if (cursor + 46 + fileNameLen > cdSize) return false;

      // Enforce decompression output size limits on individual and cumulative entries
      if (uncompressedSize > MAX_SINGLE_ENTRY_UNCOMPRESSED) return false;
      totalUncompressedBytes += uncompressedSize;
      if (totalUncompressedBytes > MAX_TOTAL_UNCOMPRESSED_SIZE) return false;

      const fileName = cdBuf.toString('utf8', cursor + 46, cursor + 46 + fileNameLen);
      entryNames.add(fileName);
      localHeaderOffsets[fileName] = {
        localOffset,
        compressionMethod,
        compressedSize,
        uncompressedSize,
      };

      cursor += 46 + fileNameLen + extraLen + commentLen;
      entryCount++;
    }

    // 4. Validate OpenXML Required Parts
    if (!entryNames.has('[Content_Types].xml')) return false;
    if (!entryNames.has('_rels/.rels')) return false;

    if (ext === '.docx') {
      const hasWordDoc = Array.from(entryNames).some(
        name => name.startsWith('word/') && name.endsWith('.xml')
      );
      if (!hasWordDoc) return false;
    } else if (ext === '.xlsx') {
      const hasWorkbook = Array.from(entryNames).some(
        name => name.startsWith('xl/') && name.endsWith('.xml')
      );
      if (!hasWorkbook) return false;
    } else {
      return false;
    }

    // 5. Deep validate [Content_Types].xml content with strict maxOutputLength
    const ctInfo = localHeaderOffsets['[Content_Types].xml'];
    if (!ctInfo || ctInfo.uncompressedSize > MAX_CONTENT_TYPES_UNCOMPRESSED) return false;

    const localBuf = Buffer.alloc(30);
    fs.readSync(fd, localBuf, 0, 30, ctInfo.localOffset);
    if (
      localBuf[0] !== 0x50 ||
      localBuf[1] !== 0x4B ||
      localBuf[2] !== 0x03 ||
      localBuf[3] !== 0x04
    ) {
      return false;
    }
    const localNameLen = localBuf.readUInt16LE(26);
    const localExtraLen = localBuf.readUInt16LE(28);
    const dataOffset = ctInfo.localOffset + 30 + localNameLen + localExtraLen;

    const dataBuf = Buffer.alloc(ctInfo.compressedSize);
    fs.readSync(fd, dataBuf, 0, ctInfo.compressedSize, dataOffset);

    let decompressedStr = '';
    if (ctInfo.compressionMethod === 8) {
      const inflated = zlib.inflateRawSync(dataBuf, {
        maxOutputLength: MAX_CONTENT_TYPES_UNCOMPRESSED
      });
      decompressedStr = inflated.toString('utf8');
    } else if (ctInfo.compressionMethod === 0) {
      if (dataBuf.length > MAX_CONTENT_TYPES_UNCOMPRESSED) return false;
      decompressedStr = dataBuf.toString('utf8');
    } else {
      return false;
    }

    if (ext === '.docx') {
      if (!decompressedStr.includes('wordprocessingml') && !decompressedStr.includes('application/vnd.openxmlformats-officedocument.wordprocessingml')) {
        return false;
      }
    } else if (ext === '.xlsx') {
      if (!decompressedStr.includes('spreadsheetml') && !decompressedStr.includes('application/vnd.openxmlformats-officedocument.spreadsheetml')) {
        return false;
      }
    }

    return true;
  } catch (err) {
    console.error('OpenXML structure validation error:', err.message);
    return false;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_) {}
    }
  }
}

/**
 * Validate PDF document structure
 */
function validatePdfStructure(filePath) {
  let fd = null;
  try {
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    if (fileSize < 100) return false;

    fd = fs.openSync(filePath, 'r');
    const headerBuf = Buffer.alloc(1024);
    const bytesRead = fs.readSync(fd, headerBuf, 0, 1024, 0);
    const headerStr = headerBuf.slice(0, bytesRead).toString('latin1');

    if (!headerStr.startsWith('%PDF-')) return false;

    const tailLen = Math.min(fileSize, 2048);
    const tailBuf = Buffer.alloc(tailLen);
    fs.readSync(fd, tailBuf, 0, tailLen, fileSize - tailLen);
    const tailStr = tailBuf.toString('latin1');

    const hasEof = tailStr.includes('%%EOF');
    const hasCatalogOrRoot = tailStr.includes('/Root') || tailStr.includes('/Type') || tailStr.includes('xref') || tailStr.includes('startxref') || headerStr.includes('obj');

    return hasEof && hasCatalogOrRoot;
  } catch (_err) {
    return false;
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_) {}
    }
  }
}

/**
 * Validate magic bytes & file structure
 */
function validateFileIntegrity(filePath, originalFilename, _mimetype) {
  let fd = null;
  try {
    const ext = path.extname(originalFilename).toLowerCase();
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;

    if (fileSize === 0) return { isValid: false, message: 'File is empty (0 bytes).' };
    if (fileSize > MAX_FILE_SIZE) return { isValid: false, message: 'File exceeds maximum 10MB limit.' };

    if (ext === '.docx' || ext === '.xlsx') {
      const isOpenXmlValid = validateOpenXmlStructure(filePath, ext);
      if (!isOpenXmlValid) {
        return {
          isValid: false,
          message: `Invalid ${ext.toUpperCase().slice(1)} file: corrupted document structure or missing required OpenXML elements.`,
        };
      }
      return { isValid: true };
    }

    if (ext === '.pdf') {
      const isPdfValid = validatePdfStructure(filePath);
      if (!isPdfValid) {
        return { isValid: false, message: 'Invalid PDF file: corrupted structure or missing required PDF headers/trailers.' };
      }
      return { isValid: true };
    }

    fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(16);
    const bytesRead = fs.readSync(fd, buf, 0, 16, 0);

    if (ext === '.png') {
      if (
        bytesRead < 8 ||
        buf[0] !== 0x89 ||
        buf[1] !== 0x50 ||
        buf[2] !== 0x4E ||
        buf[3] !== 0x47 ||
        buf[4] !== 0x0D ||
        buf[5] !== 0x0A ||
        buf[6] !== 0x1A ||
        buf[7] !== 0x0A
      ) {
        return { isValid: false, message: 'Invalid PNG file: corrupted magic bytes.' };
      }
    } else if (ext === '.jpg' || ext === '.jpeg') {
      if (bytesRead < 3 || buf[0] !== 0xFF || buf[1] !== 0xD8 || buf[2] !== 0xFF) {
        return { isValid: false, message: 'Invalid JPEG file: corrupted magic bytes.' };
      }
    }

    return { isValid: true };
  } catch (err) {
    console.error('File integrity validation error:', err.message);
    return { isValid: false, message: `File validation failed: ${err.message}` };
  } finally {
    if (fd !== null) {
      try { fs.closeSync(fd); } catch (_) {}
    }
  }
}

/**
 * Middleware for report document upload
 */
function handleReportUpload(req, res, next) {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File exceeds maximum 10MB limit.' });
      }
      return res.status(400).json({ message: `Upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    // Optional file check depending on route
    if (req.file) {
      const integrity = validateFileIntegrity(req.file.path, req.file.originalname, req.file.mimetype);
      if (!integrity.isValid) {
        try {
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
        } catch (_) {}
        return res.status(400).json({ message: integrity.message });
      }
    }

    next();
  });
}

module.exports = {
  handleReportUpload,
  REPORT_STORAGE_DIR,
  validateFileIntegrity,
  validateOpenXmlStructure,
  validatePdfStructure,
};
