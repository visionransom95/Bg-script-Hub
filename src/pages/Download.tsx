import React, { useState, useEffect, Fragment } from "react";
import { Download as DownloadIcon, File as FileIcon, Clock, HardDrive, Trash2, Search, Eye, X, CheckSquare, Square, FolderArchive } from "lucide-react";
import { saveAs } from "file-saver";
import JSZip from "jszip";

interface FileVersionInfo {
  filename: string;
  size: number;
  createdAt: string;
  url: string;
}

interface FileInfo {
  id?: string;
  filename: string;
  originalName: string;
  isEncrypted?: boolean;
  size: number;
  createdAt: string;
  url: string;
  versions?: FileVersionInfo[];
}

export default function Download() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New State variables
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("date-desc");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  const [previewFile, setPreviewFile] = useState<FileInfo | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'image' | 'text' | 'unsupported' | null>(null);
  const [activeTab, setActiveTab] = useState<'standard' | 'encrypted'>('standard');
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch("/api/files");
      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      }
    } catch (error) {
      console.error("Failed to fetch files", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const recordDownloadHistory = (filesToRecord: FileInfo[]) => {
    try {
      const history = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
      const newEntries = filesToRecord.map(f => ({
        originalName: f.originalName,
        size: f.size,
        downloadedAt: new Date().toISOString()
      }));
      localStorage.setItem('downloadHistory', JSON.stringify([...history, ...newEntries]));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  const handleDownload = (file: FileInfo) => {
    saveAs(file.url, file.originalName);
    recordDownloadHistory([file]);
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm("Are you sure you want to delete this file?")) return;
    try {
      const res = await fetch(`/api/files/${filename}`, { method: 'DELETE' });
      if (res.ok) {
        fetchFiles();
        if (selectedFiles.has(filename)) {
          const newSelection = new Set(selectedFiles);
          newSelection.delete(filename);
          setSelectedFiles(newSelection);
        }
      }
    } catch (error) {
      console.error("Failed to delete file", error);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedFiles.size === 0) return;
    
    const zip = new JSZip();
    const selectedFilesInfo = files.filter(f => selectedFiles.has(f.filename));
    
    for (const file of selectedFilesInfo) {
      try {
        const response = await fetch(file.url);
        const blob = await response.blob();
        zip.file(file.originalName, blob);
      } catch (err) {
        console.error("Error fetching file for zip:", file.originalName, err);
      }
    }
    
    zip.generateAsync({ type: "blob" }).then((content) => {
      saveAs(content, "bg-script-hub-archive.zip");
      recordDownloadHistory(selectedFilesInfo);
    });
  };

  const handlePreview = async (file: FileInfo) => {
    setPreviewFile(file);
    const extension = file.originalName.split('.').pop()?.toLowerCase() || '';
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const textExtensions = ['txt', 'md', 'csv', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'sh', 'log'];
    
    if (imageExtensions.includes(extension)) {
      setPreviewType('image');
      setPreviewContent(file.url);
    } else if (textExtensions.includes(extension)) {
      try {
        const res = await fetch(file.url);
        const text = await res.text();
        setPreviewType('text');
        setPreviewContent(text);
      } catch (error) {
        setPreviewType('unsupported');
        setPreviewContent("Failed to load text content.");
      }
    } else {
      setPreviewType('unsupported');
      setPreviewContent("This file type cannot be previewed.");
    }
  };

  const toggleSelection = (filename: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filename)) {
      newSelection.delete(filename);
    } else {
      newSelection.add(filename);
    }
    setSelectedFiles(newSelection);
  };

  const filteredAndSortedFiles = [...files]
    .filter(file => {
      const matchesSearch = file.originalName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = activeTab === 'encrypted' ? file.isEncrypted : !file.isEncrypted;
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => {
      switch (sortOption) {
        case 'name-asc':
          return a.originalName.localeCompare(b.originalName);
        case 'name-desc':
          return b.originalName.localeCompare(a.originalName);
        case 'size-asc':
          return a.size - b.size;
        case 'size-desc':
          return b.size - a.size;
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  const toggleAll = () => {
    if (selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredAndSortedFiles.map(f => f.filename)));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-8 border-b border-gray-200 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Available Downloads</h1>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-semibold">
            Browse and download scripts and resources.
          </p>
        </div>
        
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select 
            className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm appearance-none cursor-pointer"
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value)}
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="size-desc">Largest First</option>
            <option value="size-asc">Smallest First</option>
          </select>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`flex-1 py-3 text-center font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'standard' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
          onClick={() => {
            setActiveTab('standard');
            setSelectedFiles(new Set());
          }}
        >
          Standard Files
        </button>
        <button
          className={`flex-1 py-3 text-center font-bold text-sm uppercase tracking-widest transition-colors ${activeTab === 'encrypted' ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
          onClick={() => {
            setActiveTab('encrypted');
            setSelectedFiles(new Set());
          }}
        >
          Encrypted Files
        </button>
      </div>

      {/* Action Bar for Bulk Selection */}
      {selectedFiles.size > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6 flex items-center justify-between animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 text-blue-700 py-1 px-3 rounded-full text-sm font-bold">
              {selectedFiles.size} selected
            </div>
          </div>
          <button
            onClick={handleBulkDownload}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-xl font-bold text-sm tracking-wide hover:bg-blue-700 transition-colors shadow-sm"
          >
            <FolderArchive className="h-4 w-4" />
            Download ZIP
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-black"></div>
        </div>
      ) : filteredAndSortedFiles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100 mt-6">
          <HardDrive className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">No files found</h3>
          <p className="text-gray-500">Try adjusting your search or upload some files.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-widest text-gray-500">
                  <th className="p-4 w-12 text-center">
                    <button onClick={toggleAll} className="text-gray-400 hover:text-black">
                      {selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0 ? (
                        <CheckSquare className="h-5 w-5 text-blue-600" />
                      ) : (
                        <Square className="h-5 w-5" />
                      )}
                    </button>
                  </th>
                  <th className="p-4 font-semibold">Name</th>
                  <th className="p-4 font-semibold">Size</th>
                  <th className="p-4 font-semibold">Date</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedFiles.map((file) => {
                  const isSelected = selectedFiles.has(file.filename);
                  const isExpanded = expandedFileId === file.filename;
                  const hasVersions = file.versions && file.versions.length > 1;

                  return (
                    <Fragment key={file.filename}>
                      <tr 
                        className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors group ${isSelected ? 'bg-blue-50/30' : ''}`}
                      >
                        <td className="p-4 text-center">
                          <button 
                            onClick={() => toggleSelection(file.filename)}
                            className={`text-gray-300 hover:text-black transition-colors ${isSelected ? 'text-blue-600' : ''}`}
                          >
                            {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                          </button>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-black'}`}>
                              <FileIcon className="h-5 w-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm truncate max-w-xs md:max-w-md lg:max-w-lg" title={file.originalName}>
                                {file.originalName}
                              </span>
                              {hasVersions && (
                                <button 
                                  onClick={() => setExpandedFileId(isExpanded ? null : file.filename)}
                                  className="text-xs text-blue-600 font-semibold uppercase tracking-wider text-left hover:underline mt-1 w-max"
                                >
                                  {isExpanded ? 'Hide Versions' : `View ${file.versions!.length} Versions`}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-500 tabular-nums">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </td>
                        <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {new Date(file.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handlePreview(file)}
                              className="p-2 text-gray-400 hover:text-blue-600 bg-white hover:bg-blue-50 border border-gray-100 rounded-lg transition-colors"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDelete(file.filename)}
                              className="p-2 text-gray-400 hover:text-red-600 bg-white hover:bg-red-50 border border-gray-100 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                            <button 
                              onClick={() => handleDownload(file)}
                              className="flex items-center gap-2 bg-black text-white px-3 py-2 rounded-lg font-semibold text-xs hover:bg-gray-800 transition-colors"
                            >
                              <DownloadIcon className="h-4 w-4" />
                              Get
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && hasVersions && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={5} className="!p-0 border-b border-gray-100">
                             <div className="pl-16 pr-4 py-4 space-y-2">
                               <div className="text-xs uppercase tracking-widest font-semibold text-gray-500 mb-2">Version History</div>
                               {file.versions!.map((v, i) => (
                                 <div key={v.filename} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                                   <div className="flex flex-col">
                                     <span className="text-sm font-medium">Version {file.versions!.length - i}</span>
                                     <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                       <span className="tabular-nums">{(v.size / 1024 / 1024).toFixed(2)} MB</span>
                                       <span>•</span>
                                       <span>{new Date(v.createdAt).toLocaleString()}</span>
                                     </div>
                                   </div>
                                   <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleDownload({url: v.url, originalName: file.originalName, size: v.size} as FileInfo)}
                                      className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold"
                                    >
                                      <DownloadIcon className="h-4 w-4" /> Get
                                    </button>
                                   </div>
                                 </div>
                               ))}
                             </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileIcon className="h-5 w-5 text-black" />
                </div>
                <h3 className="font-bold text-lg truncate">{previewFile.originalName}</h3>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest hidden sm:inline-block">
                  {(previewFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
              <div className="flex items-center gap-2 pl-4">
                <button 
                  onClick={() => handleDownload(previewFile)}
                  className="p-2 text-gray-600 hover:text-black hover:bg-gray-100 rounded-full transition-colors hidden sm:block"
                  title="Download File"
                >
                  <DownloadIcon className="h-5 w-5" />
                </button>
                <button 
                  onClick={() => setPreviewFile(null)}
                  className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Content Body */}
            <div className="p-0 overflow-auto bg-gray-50 flex-1 flex justify-center items-center relative">
              {!previewContent ? (
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-black"></div>
              ) : previewType === 'image' ? (
                <div className="p-8 w-full h-full flex items-center justify-center relative bg-[#f8f9fa] checkered-bg">
                   {/* subtle checkerboard background for transparent pngs */}
                   <style>{`
                     .checkered-bg {
                       background-image: linear-gradient(45deg, #e5e5e5 25%, transparent 25%, transparent 75%, #e5e5e5 75%, #e5e5e5),
                                         linear-gradient(45deg, #e5e5e5 25%, transparent 25%, transparent 75%, #e5e5e5 75%, #e5e5e5);
                       background-size: 20px 20px;
                       background-position: 0 0, 10px 10px;
                     }
                   `}</style>
                   <img src={previewContent} alt={previewFile.originalName} className="max-w-full max-h-full object-contain drop-shadow-md" />
                </div>
              ) : previewType === 'text' ? (
                <div className="w-full h-full p-6 text-sm text-gray-800 font-mono flex">
                  <pre className="w-full h-full bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-auto leading-relaxed">
                    {previewContent}
                  </pre>
                </div>
              ) : (
                <div className="text-center text-gray-500 flex flex-col items-center">
                  <FileIcon className="h-16 w-16 mb-4 text-gray-300" />
                  <p className="font-medium text-gray-800">{previewContent}</p>
                  <button 
                    onClick={() => handleDownload(previewFile)}
                    className="mt-6 flex items-center gap-2 bg-black text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors"
                  >
                    <DownloadIcon className="h-4 w-4" />
                    Download Instead
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
