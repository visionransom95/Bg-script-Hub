import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import crypto from "crypto";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
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
}

interface FileEntry {
  id: string;
  originalName: string;
  isEncrypted: boolean;
  versions: FileVersion[];
}

function getMetadata(): Record<string, FileEntry> {
  if (fs.existsSync(METADATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

function saveMetadata(data: Record<string, FileEntry>) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
}

// Set up storage for multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Keep original filename or generate unique name
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});
const upload = multer({ storage });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ limit: '100mb', extended: true }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Upload file
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    
    // Parse isEncrypted from body
    const isEncrypted = req.body.isEncrypted === 'true';
    const originalName = req.file.originalname;
    
    if (isEncrypted) {
      // Encrypt file in place
      try {
        const filePath = req.file.path;
        const fileBuffer = fs.readFileSync(filePath);
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(CIPHER_ALGO, keyBuffer, iv);
        const encrypted = Buffer.concat([iv, cipher.update(fileBuffer), cipher.final()]);
        fs.writeFileSync(filePath, encrypted);
        req.file.size = encrypted.length;
      } catch (err) {
        console.error("Encryption failed", err);
        return res.status(500).json({ error: "Encryption failed" });
      }
    }
    
    const metadata = getMetadata();
    // Using originalName + encryption status as the unique identifier for a "File"
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
      filename: req.file.filename,
      size: req.file.size,
      createdAt: Date.now()
    });
    
    saveMetadata(metadata);

    const fileUrl = `/api/download/${req.file.filename}`;
    res.json({
      message: "File uploaded successfully",
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl,
      isEncrypted
    });
  });

  // List files
  app.get("/api/files", (req, res) => {
    const metadata = getMetadata();
    const fileDetails = [];
    
    // Fallback: If there are files in the directory that aren't in metadata.json
    // (e.g. from before we added metadata.json)
    try {
      const actualFiles = fs.readdirSync(UPLOADS_DIR);
      actualFiles.forEach(file => {
        if (file === 'metadata.json') return;
        
        let found = false;
        for (const entry of Object.values(metadata)) {
          if (entry.versions.some(v => v.filename === file)) {
            found = true;
            break;
          }
        }
        
        if (!found) {
          try {
            const stats = fs.statSync(path.join(UPLOADS_DIR, file));
            const originalName = file.split('-').slice(2).join('-') || file;
            const isEncrypted = false;
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
              filename: file,
              size: stats.size,
              createdAt: stats.mtimeMs
            });
            saveMetadata(metadata);
          } catch (e) {
             console.error("Error migrating file", file, e);
          }
        }
      });
    } catch(e) {
      console.error(e);
    }
    
    for (const entry of Object.values(metadata)) {
      if (entry.versions.length === 0) continue;
      
      const sortedVersions = [...entry.versions].sort((a, b) => b.createdAt - a.createdAt);
      const latestVersion = sortedVersions[0];
      
      fileDetails.push({
        id: entry.id,
        originalName: entry.originalName,
        isEncrypted: entry.isEncrypted,
        filename: latestVersion.filename, // Keep for backward compatibility
        size: latestVersion.size,
        createdAt: latestVersion.createdAt,
        url: `/api/download/${latestVersion.filename}`,
        versions: sortedVersions.map(v => ({
           ...v,
           url: `/api/download/${v.filename}`
        }))
      });
    }

    // Sort newest first
    fileDetails.sort((a, b) => b.createdAt - a.createdAt);
    res.json(fileDetails);
  });

  // Download file
  app.get("/api/download/:filename", (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    // Check if the file is encrypted
    let isEncrypted = false;
    let originalName = filename;
    const metadata = getMetadata();
    for (const entry of Object.values(metadata)) {
      if (entry.versions.some(v => v.filename === filename)) {
        isEncrypted = entry.isEncrypted;
        originalName = entry.originalName;
        break;
      }
    }

    if (isEncrypted) {
       try {
         const fileBuffer = fs.readFileSync(filePath);
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
         
         // Set headers to prompt download/inline correctly
         res.setHeader('Content-Disposition', `inline; filename="${originalName}"`);
         res.send(decrypted);
       } catch (err) {
         console.error("Decryption failed for", filename, err);
         res.status(500).json({ error: "Failed to decrypt file" });
       }
    } else {
      res.download(filePath, originalName);
    }
  });

  // Delete an entire file entry (all versions) or a single version
  // We'll overload the endpoint. If the filename matches an ID, we delete the group.
  app.delete("/api/files/:identifier", (req, res) => {
    const identifier = req.params.identifier;
    const metadata = getMetadata();
    
    // Check if it's an ID
    if (metadata[identifier]) {
      const entry = metadata[identifier];
      for (const v of entry.versions) {
        const filePath = path.join(UPLOADS_DIR, v.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      delete metadata[identifier];
      saveMetadata(metadata);
      return res.json({ message: "File group deleted successfully" });
    }
    
    // Check if it's a specific version filename
    let found = false;
    for (const [id, entry] of Object.entries(metadata)) {
      const vIndex = entry.versions.findIndex(v => v.filename === identifier);
      if (vIndex !== -1) {
         entry.versions.splice(vIndex, 1);
         found = true;
         if (entry.versions.length === 0) {
            delete metadata[id];
         }
         break;
      }
    }
    
    if (found) {
       saveMetadata(metadata);
    }
    
    const filePath = path.join(UPLOADS_DIR, identifier);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({ message: "File deleted successfully" });
    }
    
    if (found) {
       return res.json({ message: "File metadata deleted" });
    }
    
    res.status(404).json({ error: "File not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
