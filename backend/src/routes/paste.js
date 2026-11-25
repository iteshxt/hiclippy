import express from 'express';
import multer from 'multer';
import { Paste } from '../models/Paste.js';
import { lookupLimiter } from '../middleware/fingerprint.js';

const router = express.Router();
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: MAX_FILE_SIZE },
  // Browsers send file names as UTF-8; the default (latin1) turns
  // "résumé.pdf" into "rÃ©sumÃ©.pdf".
  defParamCharset: 'utf8',
});

// Generate unique 4-digit ID
async function generateUniqueId() {
  const MAX_ATTEMPTS = 100;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const id = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    const existing = await Paste.findOne({ id });
    if (!existing) {
      return id;
    }
  }
  throw new Error('Unable to generate unique ID after maximum attempts');
}

// POST /api/paste - Create a new paste
router.post('/paste', upload.single('file'), async (req, res) => {
  try {
    const { content, contentType, duration } = req.body;
    const expiryMinutes = Math.min(
      parseInt(duration) || parseInt(process.env.PASTE_DEFAULT_EXPIRY_MINUTES || 60),
      parseInt(process.env.PASTE_MAX_EXPIRY_MINUTES || 1440)
    );

    let pasteContent = content;
    let pasteContentType = contentType || 'text';
    let fileName = null;
    let fileSize = 0;
    let mimeType = 'text/plain';

    console.log(`[PASTE] Processing new ${contentType} upload...`);

    if (req.file) {
      // File upload handling
      fileName = req.file.originalname;
      fileSize = req.file.size;
      mimeType = req.file.mimetype;
      pasteContent = req.file.buffer.toString('base64');
      pasteContentType = (contentType === 'image') ? 'image' : 'file';
    } else if (content) {
      // Text/Link handling
      fileSize = content.length;
      if (contentType === 'image') {
        mimeType = 'image/png';
      }
    } else {
      return res.status(400).json({ error: 'No content provided' });
    }

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(413).json({ 
        error: `File size exceeds limit of ${process.env.MAX_FILE_SIZE_MB}MB` 
      });
    }

    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // generateUniqueId() checks then we save, so two uploads at the same
    // moment can pick the same code. The unique index rejects the second
    // one (E11000); pick a new code and try again instead of returning 500.
    const MAX_SAVE_ATTEMPTS = 5;
    let id;
    for (let attempt = 1; ; attempt++) {
      id = await generateUniqueId();
      try {
        await new Paste({
          id,
          content: pasteContent,
          contentType: pasteContentType,
          fileName,
          fileSize,
          mimeType,
          expiresAt,
          fingerprint: req.fingerprint,
        }).save();
        break;
      } catch (err) {
        if (err?.code !== 11000 || attempt >= MAX_SAVE_ATTEMPTS) throw err;
        console.warn(`[PASTE] Code ${id} was taken during save, retrying (${attempt}/${MAX_SAVE_ATTEMPTS})`);
      }
    }
    console.log(`[PASTE] Successfully created paste: ${id} (${pasteContentType}, ${fileSize} bytes)`);

    res.status(201).json({
      id,
      expiresAt,
      expiryMinutes,
      message: 'Paste created successfully',
    });
  } catch (error) {
    console.error('Error creating paste:', error);
    if (error.status === 429) {
      return res.status(429).json({ error: 'Too many uploads. Please try again later.' });
    }
    res.status(500).json({ error: error.message });
  }
});

/**
 * Shared lookup for GET routes: validates the code, loads the paste and
 * handles expiry. Sends the error response itself and returns null on failure.
 */
async function loadLivePaste(req, res) {
  const { id } = req.params;

  if (!/^\d{4}$/.test(id)) {
    res.status(400).json({ error: 'Invalid paste ID format' });
    return null;
  }

  const paste = await Paste.findOne({ id });

  if (!paste) {
    console.log(`[PASTE] Fetch failed: ${id} (Not found or expired)`);
    res.status(404).json({ error: 'Paste not found or expired' });
    return null;
  }

  if (new Date() > paste.expiresAt) {
    console.log(`[PASTE] Fetch failed: ${id} (Found but expired)`);
    await Paste.deleteOne({ _id: paste._id });
    res.status(404).json({ error: 'Paste has expired' });
    return null;
  }

  return paste;
}

/** Binary pastes: uploaded files, and images uploaded as files (base64). */
const isBinaryPaste = (paste) => paste.contentType === 'file';

// GET /api/paste/:id - Fetch a paste
// With ?meta=1, file pastes come back without `content`; fetch the bytes
// from /api/paste/:id/raw instead (about 25% smaller, and no huge JSON).
router.get('/paste/:id', lookupLimiter, async (req, res) => {
  try {
    const paste = await loadLivePaste(req, res);
    if (!paste) return;

    console.log(`[PASTE] Successfully retrieved: ${paste.id} (${paste.contentType})`);
    const metaOnly = req.query.meta === '1' || req.query.meta === 'true';

    // Return data based on content type
    if (paste.contentType === 'file' || paste.contentType === 'image') {
      res.json({
        id: paste.id,
        contentType: paste.contentType,
        fileName: paste.fileName,
        fileSize: paste.fileSize,
        mimeType: paste.mimeType || 'image/png',
        ...(metaOnly && isBinaryPaste(paste) ? {} : { content: paste.content }), // base64 for files
        createdAt: paste.createdAt,
        expiresAt: paste.expiresAt,
      });
    } else {
      res.json({
        id: paste.id,
        content: paste.content,
        contentType: paste.contentType,
        createdAt: paste.createdAt,
        expiresAt: paste.expiresAt,
      });
    }
  } catch (error) {
    console.error('Error fetching paste:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/paste/:id/raw - The paste's bytes, for downloading and previews.
// User-uploaded content is served so a browser never renders it on this
// origin: forced download, no MIME sniffing, and a sandbox CSP.
router.get('/paste/:id/raw', lookupLimiter, async (req, res) => {
  try {
    const paste = await loadLivePaste(req, res);
    if (!paste) return;

    const body = isBinaryPaste(paste)
      ? Buffer.from(paste.content, 'base64')
      : Buffer.from(String(paste.content), 'utf8');
    const type = isBinaryPaste(paste) ? (paste.mimeType || 'application/octet-stream') : 'text/plain; charset=utf-8';
    const fileName = paste.fileName || `clippy-${paste.id}${isBinaryPaste(paste) ? '' : '.txt'}`;
    const asciiName = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');

    res.set({
      'Content-Type': type,
      'Content-Length': body.length,
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cache-Control': 'private, no-store',
    });
    console.log(`[PASTE] Raw download: ${paste.id} (${body.length} bytes)`);
    res.end(body);
  } catch (error) {
    console.error('Error fetching raw paste:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/paste/:id - Delete a paste. Only the device that uploaded it
// (same fingerprint) may delete; anyone else gets the same 404 as a missing
// paste, so the endpoint can't be used to probe which codes exist.
router.delete('/paste/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!/^\d{4}$/.test(id)) {
      return res.status(400).json({ error: 'Invalid paste ID format' });
    }

    const result = await Paste.deleteOne({ id, fingerprint: req.fingerprint });

    if (result.deletedCount === 0) {
      console.log(`[PASTE] Delete failed: ${id} (Not found or not owner)`);
      return res.status(404).json({ error: 'Paste not found' });
    }

    console.log(`[PASTE] Manually deleted: ${id}`);
    res.json({ message: 'Paste deleted successfully' });
  } catch (error) {
    console.error('Error deleting paste:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
