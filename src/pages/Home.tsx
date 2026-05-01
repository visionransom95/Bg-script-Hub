import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle, File as FileIcon, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage('');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');

    const formData = new FormData();
    formData.append("file", file);
    formData.append("isEncrypted", isEncrypted.toString());

    try {
      await axios.post("/api/upload", formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });

      setUploadStatus('success');
      setFile(null);
      setTimeout(() => setUploadProgress(0), 1000); // Clear after a bit
    } catch (error: any) {
      const serverMsg = error.response?.data?.error || (error.response?.status === 413 ? "File is too large for serverless upload (>4.5MB limit)." : "");
      setUploadStatus('error');
      setErrorMessage(serverMsg || "Error uploading file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tighter leading-tight mb-6">
            Secure File<br />Storage Hub
          </h1>
          <p className="text-lg text-gray-600 mb-8 max-w-lg">
            Upload, store, and share your scripts and files effortlessly. A simple, secure platform built for everyone.
          </p>
          <div className="flex gap-4">
            <button 
              onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-black text-white px-8 py-3 rounded-full font-semibold uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors"
            >
              Start Uploading
            </button>
            <Link 
              to="/download"
              className="bg-white text-black border border-black px-8 py-3 rounded-full font-semibold uppercase tracking-widest text-sm hover:bg-gray-50 transition-colors"
            >
              Browse Files
            </Link>
          </div>
        </div>

        <div id="upload-section" className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden">
          {uploading && (
             <div className="absolute top-0 left-0 h-1 bg-blue-100 w-full">
               <div 
                 className="h-full bg-blue-600 transition-all duration-300 ease-out"
                 style={{ width: `${uploadProgress}%` }}
               />
             </div>
          )}
          
          <h2 className="text-2xl font-bold mb-6">Upload a File</h2>
          
          <div 
            className={`border-2 border-dashed rounded-2xl p-10 text-center transition-colors cursor-pointer ${
              file ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              onClick={(e) => e.stopPropagation()}
              accept=".js,.py,.lua,.sh,.txt,.md,.pdf,.png,.jpg,.jpeg,.zip,.rar"
              className="hidden" 
            />
            {file ? (
              <div className="flex flex-col items-center gap-3">
                <FileIcon className="h-10 w-10 text-blue-500" />
                <span className="font-medium text-blue-700 break-all">{file.name}</span>
                <span className="text-xs text-blue-500 uppercase font-semibold">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <UploadCloud className="h-12 w-12 text-gray-400" />
                <span className="text-gray-600 font-medium tracking-wide">Drag & drop your file here</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">or click to browse</span>
                <span className="text-[10px] text-gray-400 font-medium mt-1">Supported: JS, PY, LUA, TXT, PDF, ZIP, PNG, JPG</span>
              </div>
            )}
          </div>
          
          {file && (
            <div className="mt-4 flex items-center gap-2 px-1">
              <input 
                type="checkbox" 
                id="isEncrypted" 
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="isEncrypted" className="text-sm font-medium text-gray-700 flex items-center gap-1 cursor-pointer">
                <Lock className="h-3 w-3 text-gray-500" /> Mark as Encrypted
              </label>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2">
            <button 
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold uppercase tracking-widest text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors relative"
            >
              <span className="relative z-10">{uploading ? `Uploading... ${uploadProgress}%` : "Upload File"}</span>
            </button>
          </div>

          {uploadStatus === 'success' && (
            <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium text-sm">File uploaded successfully! Check the Downloads page.</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium text-sm">{errorMessage}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
