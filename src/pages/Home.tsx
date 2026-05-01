import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle, File as FileIcon, Lock, X } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'partial'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage('');
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    if (files.length === 1) setUploadStatus('idle');
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');

    let successCount = 0;
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("isEncrypted", isEncrypted.toString());

        try {
            await axios.post("/api/upload", formData, {
                onUploadProgress: (progressEvent) => {
                  if (progressEvent.total) {
                    const fileProg = (progressEvent.loaded / progressEvent.total) * 100;
                    const overallProg = ((i * 100) + fileProg) / files.length;
                    setUploadProgress(Math.round(overallProg));
                  }
                }
            });
            successCount++;
        } catch (error: any) {
             console.error("Failed to upload", file.name, error);
        }
    }

    setUploading(false);
    
    if (successCount === files.length) {
        setUploadStatus('success');
        setFiles([]);
    } else if (successCount > 0) {
        setUploadStatus('partial');
        setErrorMessage(`Uploaded ${successCount} files, but ${files.length - successCount} failed.`);
        setFiles([]);
    } else {
        setUploadStatus('error');
        setErrorMessage("Error uploading files. Please try again.");
    }
    
    setTimeout(() => setUploadProgress(0), 1000);
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
              files.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-black hover:bg-gray-50'
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              multiple
              ref={fileInputRef} 
              onChange={handleFileChange} 
              onClick={(e) => e.stopPropagation()}
              accept=".js,.py,.lua,.sh,.txt,.md,.pdf,.png,.jpg,.jpeg,.zip,.rar"
              className="hidden" 
            />
            {files.length > 0 ? (
              <div className="flex flex-col gap-3 w-full max-w-sm mx-auto">
                <p className="text-sm font-semibold text-gray-700">{files.length} file{files.length !== 1 ? 's' : ''} selected</p>
                <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex flex-col items-start gap-1 p-3 bg-white border border-gray-100 rounded-xl">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileIcon className="h-5 w-5 text-blue-500 shrink-0" />
                          <span className="font-medium text-black text-sm truncate">{file.name}</span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                          className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      <span className="text-[10px] text-gray-400 uppercase font-semibold pl-7">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="text-xs text-blue-600 font-semibold uppercase tracking-wider hover:underline mt-2"
                >
                  + Add more files
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <UploadCloud className="h-12 w-12 text-gray-400" />
                <span className="text-gray-600 font-medium tracking-wide">Drag & drop your files here</span>
                <span className="text-xs text-gray-400 uppercase tracking-widest">or click to browse</span>
                <span className="text-[10px] text-gray-400 font-medium mt-1">Supported: JS, PY, LUA, TXT, PDF, ZIP, PNG, JPG</span>
              </div>
            )}
          </div>
          
          {files.length > 0 && (
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
              disabled={files.length === 0 || uploading}
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

          {uploadStatus === 'partial' && (
            <div className="mt-4 p-4 bg-yellow-50 text-yellow-700 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium text-sm">{errorMessage}</span>
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
