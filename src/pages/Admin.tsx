import React, { useState, useEffect } from 'react';
import { Lock, File as FileIcon, Trash2, Search, Database, Clock, Eye, FileCode2, FileJson, FileTerminal, FileText, FileImage, FileAudio, FileVideo, FileArchive } from 'lucide-react';
import { saveAs } from 'file-saver';

interface FileVersion {
  filename: string;
  size: number;
  createdAt: number;
  url: string;
}

interface FileDetails {
  id: string;
  originalName: string;
  isEncrypted: boolean;
  filename: string;
  size: number;
  createdAt: number;
  url: string;
  versions: FileVersion[];
}

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'html':
    case 'css':
      return <FileCode2 className="h-full w-full" />;
    case 'py':
    case 'lua':
    case 'sh':
    case 'rb':
    case 'go':
    case 'cpp':
    case 'c':
    case 'h':
      return <FileTerminal className="h-full w-full" />;
    case 'json':
      return <FileJson className="h-full w-full" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <FileArchive className="h-full w-full" />;
    case 'pdf':
    case 'doc':
    case 'docx':
    case 'txt':
    case 'md':
      return <FileText className="h-full w-full" />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
    case 'webp':
      return <FileImage className="h-full w-full" />;
    case 'mp3':
    case 'wav':
    case 'ogg':
      return <FileAudio className="h-full w-full" />;
    case 'mp4':
    case 'mov':
    case 'avi':
    case 'mkv':
      return <FileVideo className="h-full w-full" />;
    default:
      return <FileIcon className="h-full w-full" />;
  }
};

export default function Admin() {
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem("adminToken"));
  
  // Login State
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Dashboard State
  const [searchQuery, setSearchQuery] = useState("");
  const [fileEntries, setFileEntries] = useState<FileDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [selectedFile, setSelectedFile] = useState<FileDetails | null>(null);

  useEffect(() => {
    if (sessionToken) {
      fetchFiles();
    }
  }, [sessionToken]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/files');
      if (res.ok) {
        const data = await res.json();
        setFileEntries(data);
      } else {
        setError('Failed to load files.');
      }
    } catch (err) {
      setError('Error communicating with server.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("adminToken", data.token);
        setSessionToken(data.token);
      } else {
        const errorData = await res.json();
        setLoginError(errorData.error || "Invalid credentials.");
      }
    } catch (err) {
      setLoginError("An error occurred during login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setSessionToken(null);
  };

  const handleDelete = async (identifier: string) => {
    if (!window.confirm("Are you sure you want to delete this file completely? This action is irreversible.")) return;
    try {
      const res = await fetch(`/api/files?id=${encodeURIComponent(identifier)}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${sessionToken}`
        }
      });
      if (res.ok) {
        setFileEntries(f => f.filter(file => file.id !== identifier && file.filename !== identifier));
        if (selectedFile?.id === identifier || selectedFile?.filename === identifier) {
          setSelectedFile(null);
        }
      } else {
        alert("Failed to delete file.");
      }
    } catch (err) {
      alert("Error deleting file.");
    }
  };

  const filteredFiles = fileEntries.filter(f => 
    f.originalName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!sessionToken) {
    return (
      <div className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="bg-red-50 p-4 rounded-full text-red-600">
              <Lock className="h-8 w-8" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-center text-red-600">Admin Login</h1>
          <p className="text-gray-500 text-center mb-8">Restricted access.</p>
          
          <form onSubmit={handleLogin} className="space-y-6">
            {loginError && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium">
                {loginError}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                required
              />
            </div>
            
            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-red-600 text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-red-600 flex items-center gap-2">
            <Database className="h-6 w-6" /> Admin Dashboard
          </h1>
          <p className="text-gray-500 leading-relaxed font-mono text-sm max-w-2xl">
            Manage all uploaded files across the system. 
          </p>
        </div>
        <button 
          onClick={handleLogout}
          className="text-xs uppercase tracking-widest font-bold text-gray-400 hover:text-black transition-colors"
        >
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: File List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search files by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
                Loading files...
              </div>
            ) : error ? (
              <div className="p-12 text-center text-red-500 flex flex-col items-center">
                {error}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                <FileIcon className="h-12 w-12 mb-4 opacity-50" />
                No files found
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {filteredFiles.map((file) => (
                  <div 
                    key={file.id} 
                    className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer ${selectedFile?.id === file.id ? 'bg-red-50 border-l-4 border-red-600' : ''}`}
                    onClick={() => setSelectedFile(file)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="p-2 bg-gray-100 rounded-lg shrink-0 w-10 h-10 flex items-center justify-center">
                        {getFileIcon(file.originalName)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm truncate">{file.originalName}</h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Database className="h-3 w-3" />
                            {formatBytes(file.size)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(file.createdAt).toLocaleDateString()}
                          </span>
                          {file.isEncrypted && (
                            <span className="flex items-center gap-1 text-red-500 font-semibold">
                              <Lock className="h-3 w-3" /> Encrypted
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}
                         className="p-2 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-100 rounded-lg transition-colors"
                         title="Delete Master Record"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: File Details */}
        <div className="lg:col-span-1">
           {selectedFile ? (
             <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sticky top-24">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-red-100 rounded-xl text-red-600 w-14 h-14 flex items-center justify-center">
                    {getFileIcon(selectedFile.originalName)}
                  </div>
                  <div className="overflow-hidden">
                    <h2 className="font-bold text-lg truncate" title={selectedFile.originalName}>{selectedFile.originalName}</h2>
                    <p className="text-xs text-gray-500 uppercase tracking-widest">{selectedFile.id}</p>
                  </div>
                </div>

                <div className="space-y-4 mb-8">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 text-sm font-semibold">Size</span>
                    <span className="font-mono text-sm">{formatBytes(selectedFile.size)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 text-sm font-semibold">Uploaded</span>
                    <span className="font-mono text-sm">{new Date(selectedFile.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 text-sm font-semibold">Internal ID</span>
                    <span className="font-mono text-xs max-w-[150px] truncate" title={selectedFile.filename}>{selectedFile.filename}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 text-sm font-semibold">Encryption</span>
                    <span className={`font-mono text-sm font-bold ${selectedFile.isEncrypted ? 'text-red-500' : 'text-green-500'}`}>
                       {selectedFile.isEncrypted ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-gray-500 text-sm font-semibold">Total Versions</span>
                    <span className="font-mono text-sm">{selectedFile.versions?.length || 1}</span>
                  </div>
                </div>

                <div className="mb-6">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Management Action</h3>
                   <button 
                     onClick={() => handleDelete(selectedFile.id)}
                     className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-red-100 transition-colors"
                   >
                     <Trash2 className="h-4 w-4" /> Delete File Record
                   </button>
                </div>

                {selectedFile.versions?.length > 0 && (
                   <div>
                     <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">File Versions</h3>
                     <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {selectedFile.versions.map((ver, idx) => (
                           <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-mono truncate max-w-[160px]" title={ver.filename}>{ver.filename}</span>
                                <span className="text-xs text-gray-400">{formatBytes(ver.size)}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-400 uppercase tracking-widest">{new Date(ver.createdAt).toLocaleString()}</span>
                                <button 
                                  onClick={() => handleDelete(ver.filename)}
                                  className="text-[10px] text-red-500 uppercase tracking-widest font-bold hover:underline"
                                >
                                  Delete Version
                                </button>
                              </div>
                           </div>
                        ))}
                     </div>
                   </div>
                )}
             </div>
           ) : (
             <div className="bg-gray-50 rounded-3xl border border-gray-100 p-8 text-center flex flex-col items-center justify-center h-64 sticky top-24">
                <Eye className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-400 font-medium">Select a file to view details</p>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
