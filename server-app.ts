import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import crypto from "crypto";
import { put, list, del } from "@vercel/blob";

const UPLOADS_DIR = process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure the secret exists, ideally via env, fallback to persistent generated key
let keyBuffer: Buffer;
if (process.env.ENCRYPTION_SECRET) {
  keyBuffer = Buffer.from(process.env.ENCRYPTION_SECRET.padEnd(32, '0').slice(0, 32));
} else {
  const keyFile = path.join(UPLOADS_DIR, 'secret.key');
  if (fs.existsSync(keyFile)) {
    keyBuffer = fs.readFileSync(keyFile);
  } else {
    keyBuffer = crypto.randomBytes(32);
    fs.writeFileSync(keyFile, keyBuffer);
  }
}
const CIPHER_ALGO = 'aes-256-cbc';

const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

interface FileVersion {
  filename: string;
  size: number;
  createdAt: number;
  blobUrl?: string; // Add blobUrl if uploaded to vercel
}

interface FileEntry {
  id: string;
  originalName: string;
  isEncrypted: boolean;
  versions: FileVersion[];
}

async function getMetadata(): Promise<Record<string, FileEntry>> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { blobs } = await list({ prefix: 'metadata.json', limit: 1 });
      if (blobs.length > 0) {
        const res = await fetch(blobs[0].downloadUrl);
        if (res.ok) {
          return await res.json();
        }
      }
    } catch (e) {
      console.error("Vercel Blob metadata fetch failed:", e);
    }
  } else {
    if (fs.existsSync(METADATA_FILE)) {
      try {
        return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
      } catch {
        return {};
      }
    }
  }
  return {};
}

async function saveMetadata(data: Record<string, FileEntry>) {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put('metadata.json', JSON.stringify(data, null, 2), { access: 'public', addRandomSuffix: false });
    } catch (e) {
      console.error("Vercel Blob metadata save failed:", e);
    }
  } else {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
  }
}

// Set up storage for multer (Memory storage to bypass Vercel serverless /tmp limits conceptually, and avoid permission errors)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit from Express middleware
});

const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// API routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Upload file
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "Storage is not configured. Please add BLOB_READ_WRITE_TOKEN in Vercel." });
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  
  try {
    const isEncrypted = req.body.isEncrypted === 'true';
    const originalName = req.file.originalname;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const internalFilename = uniqueSuffix + "-" + originalName;
    
    let fileData = req.file.buffer;
    
    if (isEncrypted) {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(CIPHER_ALGO, keyBuffer, iv);
      fileData = Buffer.concat([iv, cipher.update(fileData), cipher.final()]);
    }
    
    let blobUrl: string | undefined;
    
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      // Upload to Vercel Blob
      const blob = await put(internalFilename, fileData, { access: 'public' });
      blobUrl = blob.url;
    } else {
      // Save to local disk
      fs.writeFileSync(path.join(UPLOADS_DIR, internalFilename), fileData);
    }
    
    const metadata = await getMetadata();
    const fileId = Buffer.from(`${originalName}:${isEncrypted}`).toString('base64');
    
    if (!metadata[fileId]) {
      metadata[fileId] = {
        id: fileId,
        originalName,
        isEncrypted,
        versions: []
      };
    }
    
    metadata[fileId].versions.push({
      filename: internalFilename,
      size: fileData.length,
      createdAt: Date.now(),
      blobUrl
    });
    
    await saveMetadata(metadata);

    res.json({
      message: "File uploaded successfully",
      filename: internalFilename,
      originalName: originalName,
      size: fileData.length,
      mimetype: req.file.mimetype,
      url: `/api/download/${internalFilename}`,
      isEncrypted
    });
  } catch (err) {
    console.error("Upload failed", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// List files
app.get("/api/files", async (req, res) => {
  const metadata = await getMetadata();
  const fileDetails = [];
  
  for (const entry of Object.values(metadata)) {
    if (entry.versions.length === 0) continue;
    
    const sortedVersions = [...entry.versions].sort((a, b) => b.createdAt - a.createdAt);
    const latestVersion = sortedVersions[0];
    
    fileDetails.push({
      id: entry.id,
      originalName: entry.originalName,
      isEncrypted: entry.isEncrypted,
      filename: latestVersion.filename,
      size: latestVersion.size,
      createdAt: latestVersion.createdAt,
      url: `/api/download/${latestVersion.filename}`,
      versions: sortedVersions.map(v => ({
         ...v,
         url: `/api/download/${v.filename}`
      }))
    });
  }

  fileDetails.sort((a, b) => b.createdAt - a.createdAt);
  res.json(fileDetails);
});

// Download file
app.get("/api/download/:filename", async (req, res) => {
  const filename = req.params.filename;
  
  // Check metadata first
  let isEncrypted = false;
  let originalName = filename;
  let blobUrl: string | undefined;
  
  const metadata = await getMetadata();
  for (const entry of Object.values(metadata)) {
    const version = entry.versions.find(v => v.filename === filename);
    if (version) {
      isEncrypted = entry.isEncrypted;
      originalName = entry.originalName;
      blobUrl = version.blobUrl;
      break;
    }
  }

  // If not encrypted and on Vercel Blob, redirect directly!
  if (!isEncrypted && blobUrl && process.env.BLOB_READ_WRITE_TOKEN) {
     return res.redirect(blobUrl);
  }

  let fileBuffer: Buffer | null = null;
  
  // Read from Vercel Blob or Disk
  if (process.env.BLOB_READ_WRITE_TOKEN && blobUrl) {
     try {
        const fetched = await fetch(blobUrl);
        const arrayBuf = await fetched.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
     } catch (err) {
       console.error("Failed to read from Vercel Blob URL", err);
     }
  } else if (process.env.BLOB_READ_WRITE_TOKEN) {
     try {
       const { blobs } = await list({ prefix: filename, limit: 1 });
       if (blobs.length > 0) {
          const fetched = await fetch(blobs[0].downloadUrl);
          const arrayBuf = await fetched.arrayBuffer();
          fileBuffer = Buffer.from(arrayBuf);
       }
     } catch (err) {
       console.error("Failed to read from Vercel Blob", err);
     }
  }
  
  if (!fileBuffer) {
    const filePath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filePath)) {
      fileBuffer = fs.readFileSync(filePath);
    }
  }
  
  if (!fileBuffer) {
    return res.status(404).json({ error: "File not found" });
  }

  if (isEncrypted) {
     try {
       if (fileBuffer.length < 16) {
         return res.status(500).json({ error: "Invalid encrypted file" });
       }
       const iv = fileBuffer.subarray(0, 16);
       const encryptedContent = fileBuffer.subarray(16);
       const decipher = crypto.createDecipheriv(CIPHER_ALGO, keyBuffer, iv);
       const decrypted = Buffer.concat([decipher.update(encryptedContent), decipher.final()]);
       
       const ext = path.extname(originalName).toLowerCase();
       const mimeTypes: Record<string, string> = {
          '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg',
          '.png': 'image/png',
          '.gif': 'image/gif',
          '.webp': 'image/webp',
          '.svg': 'image/svg+xml',
          '.txt': 'text/plain',
          '.md': 'text/markdown',
          '.json': 'application/json',
          '.csv': 'text/csv',
          '.html': 'text/html',
          '.css': 'text/css',
          '.js': 'application/javascript',
       };
       if (mimeTypes[ext]) {
          res.setHeader('Content-Type', mimeTypes[ext]);
       }
       
       res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
       res.send(decrypted);
     } catch (err) {
       console.error("Decryption failed for", filename, err);
       res.status(500).json({ error: "Failed to decrypt file" });
     }
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${originalName}"`);
    res.send(fileBuffer);
  }
});

// Delete file
app.delete("/api/files/:identifier", async (req, res) => {
  const identifier = req.params.identifier;
  const metadata = await getMetadata();
  
  // Check if it's an ID
  if (metadata[identifier]) {
    const entry = metadata[identifier];
    for (const v of entry.versions) {
      if (process.env.BLOB_READ_WRITE_TOKEN && v.blobUrl) {
         try { await del(v.blobUrl); } catch (e) {}
      } else {
         const filePath = path.join(UPLOADS_DIR, v.filename);
         if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    delete metadata[identifier];
    await saveMetadata(metadata);
    return res.json({ message: "File group deleted successfully" });
  }
  
  // Check if it's a specific version filename
  let found = false;
  for (const [id, entry] of Object.entries(metadata)) {
    const vIndex = entry.versions.findIndex(v => v.filename === identifier);
    if (vIndex !== -1) {
       const v = entry.versions[vIndex];
       if (process.env.BLOB_READ_WRITE_TOKEN && v.blobUrl) {
          try { await del(v.blobUrl); } catch (e) {}
       } else {
          const filePath = path.join(UPLOADS_DIR, v.filename);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
       }
       
       entry.versions.splice(vIndex, 1);
       found = true;
       if (entry.versions.length === 0) {
          delete metadata[id];
       }
       break;
    }
  }
  
  if (found) {
     await saveMetadata(metadata);
     return res.json({ message: "File deleted successfully" });
  }
  
  res.status(404).json({ error: "File not found" });
});

export default app;
