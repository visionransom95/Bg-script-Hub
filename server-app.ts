import express from "express";
import path from "path";
import multer from "multer";
import fs from "fs";
import cors from "cors";
import crypto from "crypto";
import { put, list, del, head } from "@vercel/blob";
import { google } from "googleapis";
import { Readable } from 'stream';
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import dotenv from "dotenv";

dotenv.config();

// Initialize Firebase Admin
let configData: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    configData = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
} catch (err) {
  console.error("Failed to read Firebase config", err);
}

let db: any = null;
let bucket: any = null;

if (!admin.apps.length && configData) {
  try {
    const adminConfig: admin.AppOptions = {
      projectId: configData.projectId,
      storageBucket: configData.storageBucket
    };

    if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
      const saBytes = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf-8');
      adminConfig.credential = admin.credential.cert(JSON.parse(saBytes));
    } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      adminConfig.credential = admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT));
    } else {
      console.warn("No explicit Firebase credentials found. Local persistence may fail on serverless platforms.");
    }

    admin.initializeApp(adminConfig);
    console.log("Firebase Admin initialized");
  } catch (err) {
    console.error("Failed to initialize Firebase Admin", err);
  }
}

if (admin.apps.length) {
  try {
    db = configData?.firestoreDatabaseId 
      ? getFirestore(admin.app(), configData.firestoreDatabaseId) 
      : getFirestore();
    bucket = getStorage().bucket();
  } catch (err) {
    console.error("Failed to acquire Firestore or Storage. Check credentials.", err);
  }
}

// storage variable removed as we use getStorage() modularly

let driveClient: any = null;
let DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;
if (process.env.GOOGLE_DRIVE_CREDENTIALS && DRIVE_FOLDER_ID) {
  try {
     const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
     const driveAuth = new google.auth.GoogleAuth({
       credentials,
       scopes: ['https://www.googleapis.com/auth/drive.file']
     });
     driveClient = google.drive({ version: 'v3', auth: driveAuth });
     console.log("Google Drive client initialized.");
  } catch (err) {
     console.error("Failed to init Google Drive client", err);
  }
}

const UPLOADS_DIR = process.env.STORAGE_DIR || (process.env.VERCEL ? path.join('/tmp', 'uploads') : path.join(process.cwd(), "uploads"));
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Ensure the secret exists, ideally via env, fallback to persistent generated key
let keyBuffer: Buffer;
if (process.env.ENCRYPTION_SECRET) {
  keyBuffer = Buffer.from(process.env.ENCRYPTION_SECRET.padEnd(32, '0').slice(0, 32));
  console.log("Encryption secret loaded from environment.");
} else {
  const keyFile = path.join(UPLOADS_DIR, 'secret.key');
  if (fs.existsSync(keyFile)) {
    keyBuffer = fs.readFileSync(keyFile);
    console.log("Encryption secret loaded from local keyfile.");
  } else {
    keyBuffer = crypto.randomBytes(32);
    try {
      fs.writeFileSync(keyFile, keyBuffer);
      console.log("New encryption secret generated and saved locally.");
    } catch (e) {
      console.warn("Could not save encryption secret locally. Encryption will use a volatile key.");
    }
  }
}
const CIPHER_ALGO = 'aes-256-cbc';

const METADATA_FILE = path.join(UPLOADS_DIR, 'metadata.json');

interface FileVersion {
  filename: string;
  size: number;
  createdAt: number;
  blobUrl?: string; // Add blobUrl if uploaded to vercel
  driveFileId?: string; // Add Google Drive file ID
  storagePath?: string; // Firebase Storage path
  firebaseUrl?: string; // Firebase Storage public URL (if public)
}

interface FileEntry {
  id: string;
  originalName: string;
  isEncrypted: boolean;
  versions: FileVersion[];
}

let cachedDriveMetadataId: string | null = null;

async function getMetadata(): Promise<Record<string, FileEntry>> {
  // Try Firestore first
  if (db) {
    try {
      const snapshot = await db.collection('files').get();
      if (!snapshot.empty) {
        const data: Record<string, FileEntry> = {};
        snapshot.forEach(doc => {
          data[doc.id] = doc.data() as FileEntry;
        });
        return data;
      }
    } catch (err) {
      console.error("Firestore metadata fetch failed:", err);
    }
  }

  if (driveClient && DRIVE_FOLDER_ID) {
    try {
      const res = await driveClient.files.list({
        q: `name='metadata.json' and '${DRIVE_FOLDER_ID}' in parents and trashed=false`,
        fields: 'files(id)'
      });
      if (res.data.files && res.data.files.length > 0) {
        cachedDriveMetadataId = res.data.files[0].id;
        const fileRes = await driveClient.files.get({ fileId: cachedDriveMetadataId, alt: 'media' }, { responseType: 'stream' });
        const chunks: any[] = [];
        for await (const chunk of fileRes.data) {
           chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return JSON.parse(buffer.toString());
      }
    } catch (e) {
       console.error("Drive metadata fetch failed:", e);
    }
  }

  let vercelData: Record<string, FileEntry> | null = null;
  
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const blobs = await list();
      const hasMetadata = blobs.blobs.some(b => b.pathname === 'metadata.json');
      
      if (hasMetadata) {
        const blobMeta = await head('metadata.json');
        const res = await fetch(blobMeta.downloadUrl, { cache: 'no-store' });
        if (res.ok) {
          vercelData = await res.json();
        }
      }
    } catch (e) {
      console.error("Vercel Blob metadata fetch failed:", e);
    }
  }
  
  if (vercelData) {
    return vercelData;
  }

  if (fs.existsSync(METADATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(METADATA_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

async function saveMetadata(data: Record<string, FileEntry>) {
  // Save to Firestore
  if (db) {
    try {
      const batch = db.batch();
      for (const [id, entry] of Object.entries(data)) {
        const docRef = db.collection('files').doc(id);
        batch.set(docRef, entry);
      }
      await batch.commit();
      console.log("Metadata synced to Firestore");
    } catch (err) {
      console.error("Firestore metadata save failed:", err);
    }
  }

  if (driveClient && DRIVE_FOLDER_ID) {
     try {
        const buffer = Buffer.from(JSON.stringify(data, null, 2));
        const media = {
           mimeType: 'application/json',
           body: Readable.from(buffer)
        };
        if (cachedDriveMetadataId) {
           await driveClient.files.update({
             fileId: cachedDriveMetadataId,
             media: media
           });
        } else {
           const driveRes = await driveClient.files.create({
             requestBody: { name: 'metadata.json', parents: [DRIVE_FOLDER_ID] },
             media: media,
             fields: 'id'
           });
           cachedDriveMetadataId = driveRes.data.id;
        }
     } catch (e) {
        console.error("Drive metadata save failed:", e);
     }
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      await put('metadata.json', JSON.stringify(data, null, 2), { access: 'public', addRandomSuffix: false, allowOverwrite: true });
    } catch (e) {
      console.error("Vercel Blob metadata save failed:", e);
    }
  }
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("Local metadata save failed:", e);
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
  res.json({ 
    status: "ok",
    storage: {
      firebase: !!bucket,
      firestore: !!db,
      drive: !!driveClient,
      blob: !!process.env.BLOB_READ_WRITE_TOKEN
    },
    environment: {
      isVercel: !!process.env.VERCEL,
      hasConfig: !!configData
    }
  });
});

// Upload file
app.post("/api/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  try {
    const isEncrypted = req.body.isEncrypted === 'true';
    const originalName = req.file.originalname;
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const internalFilename = uniqueSuffix + "-" + originalName;
    
    let fileData = req.file.buffer;
    
    // Check if any storage provider is available
    const hasFirebase = !!bucket;
    const hasDrive = !!driveClient && !!DRIVE_FOLDER_ID;
    const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
    const isVercel = !!process.env.VERCEL;

    if (isVercel && !hasFirebase && !hasDrive && !hasBlob) {
      console.warn("Vercel detected but no persistent storage (Firebase, Drive, Blob) configured.");
    }

    if (isEncrypted) {
      if (isVercel && !process.env.ENCRYPTION_SECRET) {
        return res.status(500).json({ error: "Encryption requires ENCRYPTION_SECRET environment variable on Vercel." });
      }
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(CIPHER_ALGO, keyBuffer, iv);
      fileData = Buffer.concat([iv, cipher.update(fileData), cipher.final()]);
    }
    
    let blobUrl: string | undefined;
    let driveFileId: string | undefined;
    let storagePath: string | undefined;
    let firebaseUrl: string | undefined;
    
    // Upload logic with cascading fallback
    if (hasFirebase) {
      try {
        storagePath = `uploads/${internalFilename}`;
        const file = bucket.file(storagePath);
        await file.save(fileData, {
          metadata: {
            contentType: req.file.mimetype,
          },
        });
        console.log(`Uploaded to Firebase Storage: ${storagePath}`);
      } catch (err) {
        console.error("Firebase Storage upload failed:", err);
      }
    }
    
    if (!storagePath && hasDrive) {
      try {
        const media = {
          mimeType: req.file.mimetype,
          body: Readable.from(fileData)
        };
        const driveRes = await driveClient.files.create({
          requestBody: { name: internalFilename, parents: [DRIVE_FOLDER_ID!] },
          media: media,
          fields: 'id'
        });
        driveFileId = driveRes.data.id;
      } catch (err) {
        console.error("Google Drive upload failed:", err);
      }
    }
    
    if (!storagePath && !driveFileId && hasBlob) {
      try {
        const blob = await put(internalFilename, fileData, { access: 'public' });
        blobUrl = blob.url;
      } catch (err) {
        console.error("Vercel Blob upload failed:", err);
      }
    }

    if (!storagePath && !driveFileId && !blobUrl) {
      if (isVercel) {
        console.warn("No persistent storage providers (Firebase, Drive, Blob) configured or used. Falling back to ephemeral /tmp storage.");
      }
      try {
        if (!fs.existsSync(UPLOADS_DIR)) {
          console.log(`Creating uploads directory: ${UPLOADS_DIR}`);
          fs.mkdirSync(UPLOADS_DIR, { recursive: true });
        }
        fs.writeFileSync(path.join(UPLOADS_DIR, internalFilename), fileData);
        console.log(`Saved to local storage: ${internalFilename}`);
      } catch (fsErr: any) {
        console.error("Local storage write failed:", fsErr);
        throw new Error(`Local storage write failed (likely read-only filesystem). Please configure Vercel Blob or Firebase Storage. Details: ${fsErr.message}`);
      }
    }
    
    const metadata = await getMetadata();
    const fileId = Buffer.from(`${originalName}:${isEncrypted}`).toString('base64').replace(/\//g, '_').replace(/\+/g, '-');
    
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
      blobUrl,
      driveFileId,
      storagePath,
      firebaseUrl
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
  } catch (err: any) {
    console.error("Upload failed", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

// List files
app.get("/api/files", async (req, res) => {
  try {
    const metadata = await getMetadata();
    const fileDetails = [];
    
    for (const entry of Object.values(metadata)) {
      if (!entry.versions || entry.versions.length === 0) continue;
      
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
  } catch (err: any) {
    console.error("Failed to list files:", err);
    res.status(500).json({ error: "Failed to list files" });
  }
});

// Download file
app.get("/api/download/:filename", async (req, res) => {
  const filename = req.params.filename;
  
  // Check metadata first
  let isEncrypted = false;
  let originalName = filename;
  let blobUrl: string | undefined;
  let driveFileId: string | undefined;
  let storagePath: string | undefined;
  
  const metadata = await getMetadata();
  for (const entry of Object.values(metadata)) {
    const version = entry.versions.find(v => v.filename === filename);
    if (version) {
      isEncrypted = entry.isEncrypted;
      originalName = entry.originalName;
      blobUrl = version.blobUrl;
      driveFileId = version.driveFileId;
      storagePath = version.storagePath;
      break;
    }
  }

  // If not encrypted and on Vercel Blob, redirect directly!
  if (!isEncrypted && blobUrl && process.env.BLOB_READ_WRITE_TOKEN) {
     return res.redirect(blobUrl);
  }

  let fileBuffer: Buffer | null = null;
  
  if (storagePath && bucket) {
    try {
      const file = bucket.file(storagePath);
      const [buffer] = await file.download();
      fileBuffer = buffer;
    } catch (err) {
      console.error("Failed to read from Firebase Storage", err);
    }
  } else if (driveFileId && driveClient) {
     try {
       const fileRes = await driveClient.files.get({ fileId: driveFileId, alt: 'media' }, { responseType: 'stream' });
       const chunks: any[] = [];
       for await (const chunk of fileRes.data) {
          chunks.push(chunk);
       }
       fileBuffer = Buffer.concat(chunks);
     } catch (err) {
       console.error("Failed to read from Google Drive", err);
     }
  } else if (process.env.BLOB_READ_WRITE_TOKEN && blobUrl) {
     try {
        const fetched = await fetch(blobUrl);
        const arrayBuf = await fetched.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuf);
     } catch (err) {
       console.error("Failed to read from Vercel Blob URL", err);
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

// Login endpoint
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "bgscripthub" && password === "bgscripthub666") {
    res.json({ token: "bgscripthub666" }); // simplistic token
  } else {
    res.status(401).json({ error: "Invalid credentials" });
  }
});

// Delete file
app.delete("/api/files", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || authHeader !== `Bearer bgscripthub666`) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const identifier = req.query.id as string;
  if (!identifier) return res.status(400).json({ error: "Missing id" });

  const metadata = await getMetadata();
  
  const deleteVersion = async (v: FileVersion) => {
    if (v.storagePath && bucket) {
      try { await bucket.file(v.storagePath).delete(); } catch (e) { console.error("Firebase delete failed", e); }
    } else if (driveClient && v.driveFileId) {
      try { await driveClient.files.delete({ fileId: v.driveFileId }); } catch (e) { console.error("Drive delete failed", e); }
    } else if (process.env.BLOB_READ_WRITE_TOKEN && v.blobUrl) {
      try { await del(v.blobUrl); } catch (e) {}
    } else {
      const filePath = path.join(UPLOADS_DIR, v.filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
  };

  // Check if it's an ID
  if (metadata[identifier]) {
    const entry = metadata[identifier];
    for (const v of entry.versions) {
      await deleteVersion(v);
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
       await deleteVersion(v);
       
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
