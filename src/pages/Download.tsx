import React, { useState, useEffect, Fragment } from "react";
import { Download as DownloadIcon, File as FileIcon, Clock, HardDrive, Search, Eye, X, CheckSquare, Square, FolderArchive, Trash2, Filter, ChevronRight, LayoutGrid, List, Code, Lock } from "lucide-react";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { motion, AnimatePresence } from "motion/react";

interface FileVersionInfo {
  filename: string;
  size: number;
  createdAt: number | string;
  url: string;
}

interface FileInfo {
  id?: string;
  filename: string;
  originalName: string;
  isEncrypted?: boolean;
  size: number;
  createdAt: number | string;
  url: string;
  versions?: FileVersionInfo[];
}

export default function Download() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState("date-desc");
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [adminToken, setAdminToken] = useState<string | null>(localStorage.getItem('adminToken'));
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  
  useEffect(() => {
    const handleStorage = () => setAdminToken(localStorage.getItem('adminToken'));
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

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
    if (!adminToken) {
      alert("Unauthorized: Only owner can delete files.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this resource?")) return;
    try {
      const res = await fetch(`/api/files?id=${encodeURIComponent(filename)}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      if (res.ok) {
        fetchFiles();
        if (selectedFiles.has(filename)) {
          const newSelection = new Set(selectedFiles);
          newSelection.delete(filename);
          setSelectedFiles(newSelection);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete file.");
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
      saveAs(content, "repository-archive.zip");
      recordDownloadHistory(selectedFilesInfo);
    });
  };

  const handlePreview = async (file: FileInfo) => {
    setPreviewFile(file);
    const extension = file.originalName.split('.').pop()?.toLowerCase() || '';
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const textExtensions = ['txt', 'md', 'csv', 'json', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'py', 'sh', 'log', 'lua'];
    
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
        setPreviewContent("Failed to load text stream.");
      }
    } else {
      setPreviewType('unsupported');
      setPreviewContent("Direct preview not supported for this format.");
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
        case 'name-asc': return a.originalName.localeCompare(b.originalName);
        case 'name-desc': return b.originalName.localeCompare(a.originalName);
        case 'size-asc': return a.size - b.size;
        case 'size-desc': return b.size - a.size;
        case 'date-asc': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'date-desc': default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
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
    <div className="min-h-screen data-grid-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <p className="text-brand-accent font-bold uppercase tracking-[0.2em] text-[10px] mb-2 font-mono">REPOSITORY INDEX</p>
            <h1 className="text-5xl font-bold tracking-tighter">Available Files</h1>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-4 items-center bg-white p-2 rounded-[24px] border border-brand-ink/5 shadow-xl shadow-brand-ink/5"
          >
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Scan directory..."
                className="w-full bg-gray-50 border-none rounded-[18px] pl-12 pr-4 py-3 focus:ring-2 focus:ring-brand-accent/20 text-xs font-bold uppercase tracking-widest placeholder:text-gray-300"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 px-2 border-l border-gray-100 sm:ml-2">
              <Filter className="w-4 h-4 text-gray-400 ml-2" />
              <select 
                className="bg-transparent border-none py-3 pr-8 focus:ring-0 text-[10px] font-bold uppercase tracking-widest cursor-pointer"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="date-desc">Chronological (New)</option>
                <option value="date-asc">Chronological (Old)</option>
                <option value="name-asc">Alphabetical (A-Z)</option>
                <option value="name-desc">Alphabetical (Z-A)</option>
                <option value="size-desc">Mass (High)</option>
                <option value="size-asc">Mass (Low)</option>
              </select>
            </div>

            <div className="flex gap-1 bg-gray-50 p-1 rounded-xl sm:ml-2">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-brand-accent' : 'text-gray-400'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-brand-accent' : 'text-gray-400'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="flex gap-8 mb-8 border-b border-brand-ink/5">
          <button
            className={`pb-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative ${activeTab === 'standard' ? 'text-brand-ink' : 'text-gray-400 hover:text-brand-ink'}`}
            onClick={() => { setActiveTab('standard'); setSelectedFiles(new Set()); }}
          >
            Standard Objects
            {activeTab === 'standard' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent" />}
          </button>
          <button
            className={`pb-4 text-[11px] font-bold uppercase tracking-[0.2em] transition-all relative flex items-center gap-2 ${activeTab === 'encrypted' ? 'text-brand-ink' : 'text-gray-400 hover:text-brand-ink'}`}
            onClick={() => { setActiveTab('encrypted'); setSelectedFiles(new Set()); }}
          >
            <Lock className="w-3 h-3" /> Encrypted Vault
            {activeTab === 'encrypted' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {selectedFiles.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-brand-ink text-brand-bg rounded-[24px] p-4 mb-8 flex items-center justify-between shadow-2xl"
            >
              <div className="flex items-center gap-4 pl-4">
                <div className="p-2 bg-brand-accent rounded-lg">
                  <FolderArchive className="w-4 h-4 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest">{selectedFiles.size} Assets Selected</span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSelectedFiles(new Set())}
                  className="px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest text-brand-bg/60 hover:text-white transition-colors"
                >
                  Deselect
                </button>
                <button
                  onClick={handleBulkDownload}
                  className="bg-brand-accent text-white px-8 py-3 rounded-full font-bold uppercase tracking-[0.1em] text-[10px] hover:brightness-110 shadow-xl shadow-brand-accent/20 transition-all active:scale-[0.98]"
                >
                  Extract Archive
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-ink/10 border-t-brand-accent"></div>
          </div>
        ) : filteredAndSortedFiles.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-32 bg-white rounded-[40px] border border-brand-ink/5 shadow-sm mt-6"
          >
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <HardDrive className="h-10 w-10 text-gray-200" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Matches Found</h3>
            <p className="text-gray-400 text-sm">Target parameters returned zero results within the repository.</p>
          </motion.div>
        ) : (
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6' : 'bg-white rounded-[32px] border border-brand-ink/5 shadow-xl shadow-brand-ink/5 overflow-hidden'}`}>
            {viewMode === 'list' && (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 font-mono">
                    <th className="p-6 w-12 text-center">
                      <button onClick={toggleAll} className="hover:text-brand-accent transition-colors">
                        {selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0 ? (
                          <CheckSquare className="h-4 w-4 text-brand-accent" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </th>
                    <th className="p-6">Resource Name</th>
                    <th className="p-6">Metric (MB)</th>
                    <th className="p-6">Timestamp</th>
                    <th className="p-6 text-right">Access</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filteredAndSortedFiles.map((file, idx) => {
                      const isSelected = selectedFiles.has(file.filename);
                      const isExpanded = expandedFileId === file.filename;
                      const hasVersions = file.versions && file.versions.length > 1;

                      return (
                        <Fragment key={file.filename}>
                          <motion.tr 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className={`border-b border-gray-50 hover:bg-gray-50/30 transition-all group ${isSelected ? 'bg-brand-accent/5' : ''}`}
                          >
                            <td className="p-6 text-center">
                              <button 
                                onClick={() => toggleSelection(file.filename)}
                                className={`transition-colors ${isSelected ? 'text-brand-accent' : 'text-gray-200 group-hover:text-gray-400'}`}
                              >
                                {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="p-6">
                              <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl transition-all ${isSelected ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/20' : 'bg-gray-50 text-gray-400 group-hover:bg-white group-hover:shadow-md'}`}>
                                  <FileIcon className="h-5 w-5" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-900 truncate max-w-xs md:max-w-md" title={file.originalName}>
                                    {file.originalName}
                                  </span>
                                  {hasVersions && (
                                    <button 
                                      onClick={() => setExpandedFileId(isExpanded ? null : file.filename)}
                                      className="text-[10px] text-brand-accent font-bold uppercase tracking-widest text-left hover:underline mt-1 w-max"
                                    >
                                      {isExpanded ? 'Collapse Versions' : `Revision History [${file.versions!.length}]`}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-6 text-[11px] font-mono font-medium text-gray-400">
                              {(file.size / 1024 / 1024).toFixed(3)}
                            </td>
                            <td className="p-6 text-[11px] text-gray-400 font-mono">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                {new Date(file.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button 
                                  onClick={() => handlePreview(file)}
                                  className="p-3 text-gray-400 hover:text-brand-ink bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 rounded-[14px] transition-all"
                                  title="Analyze"
                                >
                                  <Eye className="h-4 w-4" />
                                </button>
                                {adminToken && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(file.filename); }}
                                    className="p-3 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-[14px] transition-all"
                                    title="Purge"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDownload(file)}
                                  className="flex items-center gap-2 bg-brand-ink text-brand-bg px-5 py-3 rounded-[16px] font-bold text-[10px] uppercase tracking-widest hover:brightness-125 transition-all shadow-lg active:scale-95"
                                >
                                  <DownloadIcon className="h-3.5 w-3.5" />
                                  Get
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                          {isExpanded && hasVersions && (
                            <tr className="bg-gray-50/50">
                              <td colSpan={5} className="!p-0 border-b border-gray-100">
                                 <div className="pl-24 pr-8 py-6 space-y-3">
                                   <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-gray-400 mb-4 bg-gray-100/50 inline-block px-3 py-1 rounded-full">Archive Ledger</div>
                                   {file.versions!.map((v, i) => (
                                     <motion.div 
                                       key={v.filename} 
                                       initial={{ opacity: 0, x: -10 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       transition={{ delay: i * 0.05 }}
                                       className="flex items-center justify-between p-4 bg-white rounded-[24px] border border-brand-ink/5 shadow-sm group/v hover:shadow-md transition-all"
                                     >
                                       <div className="flex flex-col">
                                         <div className="flex items-center gap-3">
                                           <span className="text-xs font-bold font-mono text-gray-900 truncate max-w-xs">{v.filename}</span>
                                           <span className="text-[10px] font-bold text-brand-accent bg-brand-accent/10 px-2 py-0.5 rounded uppercase">v{file.versions!.length - i}.0</span>
                                         </div>
                                         <div className="flex items-center gap-3 text-[10px] text-gray-400 mt-1 uppercase font-bold tracking-tighter">
                                           <span className="font-mono">{(v.size / 1024 / 1024).toFixed(3)} MB</span>
                                           <span className="text-gray-200">/</span>
                                           <span>{new Date(v.createdAt).toLocaleString()}</span>
                                         </div>
                                       </div>
                                       <button 
                                         onClick={() => handleDownload({url: v.url, originalName: file.originalName, size: v.size} as FileInfo)}
                                         className="p-3 bg-brand-ink text-white rounded-[14px] opacity-20 group-hover/v:opacity-100 transition-all hover:bg-brand-accent"
                                       >
                                         <DownloadIcon className="h-4 w-4" />
                                       </button>
                                     </motion.div>
                                   ))}
                                 </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            )}

            {viewMode === 'grid' && (
              <AnimatePresence>
                {filteredAndSortedFiles.map((file, idx) => {
                  const isSelected = selectedFiles.has(file.filename);
                  return (
                    <motion.div 
                      key={file.filename}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`brutal-card rounded-[32px] p-8 flex flex-col group ${isSelected ? 'ring-2 ring-brand-accent' : ''}`}
                    >
                      <div className="flex items-start justify-between mb-6">
                        <div className={`p-4 rounded-[20px] transition-all ${isSelected ? 'bg-brand-accent text-white shadow-xl shadow-brand-accent/20' : 'bg-gray-50 text-gray-400 group-hover:bg-white group-hover:shadow-md'}`}>
                          <FileIcon className="h-8 w-8" />
                        </div>
                        <button 
                          onClick={() => toggleSelection(file.filename)}
                          className={`transition-colors ${isSelected ? 'text-brand-accent' : 'text-gray-200 hover:text-gray-400'}`}
                        >
                          {isSelected ? <CheckSquare className="h-6 w-6" /> : <Square className="h-6 w-6" />}
                        </button>
                      </div>
                      
                      <div className="mb-8">
                        <h3 className="font-bold text-lg mb-1 leading-tight line-clamp-2" title={file.originalName}>
                          {file.originalName}
                        </h3>
                        <div className="flex items-center gap-3 text-[10px] font-mono text-gray-400 uppercase tracking-tighter">
                          <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                          <span className="text-gray-200">|</span>
                          <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handlePreview(file)}
                          className="flex items-center justify-center p-4 bg-gray-50 hover:bg-white border-none rounded-2xl text-[10px] font-bold uppercase tracking-widest text-gray-500 hover:text-brand-ink shadow-sm transition-all"
                        >
                          <Eye className="w-4 h-4 mr-2" /> View
                        </button>
                        <button 
                          onClick={() => handleDownload(file)}
                          className="flex items-center justify-center p-4 bg-brand-ink text-brand-bg rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:brightness-150 transition-all shadow-xl active:scale-95"
                        >
                          <DownloadIcon className="w-4 h-4 mr-2" /> Fetch
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        )}

        <div className="mt-24 pt-12 border-t border-brand-ink/5">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="h-px w-12 bg-brand-ink/5"></div>
              <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-300">Administrative Access</p>
              <div className="h-px w-12 bg-brand-ink/5"></div>
            </div>
            
            {!adminToken ? (
              <button 
                onClick={() => {
                  const pass = window.prompt("Admin Credentials Required:");
                  if (pass === "bgscripthub666") {
                    localStorage.setItem("adminToken", pass);
                    setAdminToken(pass);
                  } else if (pass) {
                    alert("Authentication failure.");
                  }
                }}
                className="px-8 py-3 rounded-full border border-brand-ink/5 text-[10px] font-bold text-gray-400 hover:text-brand-ink hover:border-brand-ink/10 uppercase tracking-[0.2em] transition-all"
              >
                Sign-in Security Protocol
              </button>
            ) : (
              <button 
                onClick={() => {
                  localStorage.removeItem("adminToken");
                  setAdminToken(null);
                }}
                className="px-8 py-3 rounded-full bg-red-50 text-red-500 border border-red-100 text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-xl shadow-red-500/10"
              >
                Terminate Session
              </button>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewFile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-ink/80 backdrop-blur-md"
            onClick={() => setPreviewFile(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-[40px] w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-white/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-8 border-b border-gray-100">
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="p-3 bg-brand-accent/5 text-brand-accent rounded-[18px]">
                    <FileIcon className="h-6 w-6" />
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="font-bold text-xl truncate">{previewFile.originalName}</h3>
                    <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400 uppercase tracking-tighter mt-0.5">
                      <span>{(previewFile.size / 1024 / 1024).toFixed(3)} MB</span>
                      <span className="text-gray-200">/</span>
                      <span className="text-brand-accent font-bold">LIVE STACK</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleDownload(previewFile)}
                    className="p-4 text-gray-400 hover:text-brand-ink bg-gray-50 hover:bg-white rounded-[18px] transition-all hidden sm:block shadow-sm"
                    title="Export"
                  >
                    <DownloadIcon className="h-5 w-5" />
                  </button>
                  <button 
                    onClick={() => setPreviewFile(null)}
                    className="p-4 text-gray-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 rounded-[18px] transition-all shadow-sm"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-0 overflow-hidden bg-gray-50 flex-1 flex justify-center items-center relative">
                {!previewContent ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-2 border-brand-ink/10 border-t-brand-accent"></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Loading stream...</p>
                  </div>
                ) : previewType === 'image' ? (
                  <div className="w-full h-full p-12 flex justify-center items-center bg-[#f0f0f0] pattern-bg relative overflow-hidden">
                     <style>{`
                       .pattern-bg {
                         background-color: #f5f5f5;
                         background-image: radial-gradient(var(--color-brand-line) 1px, transparent 1px);
                         background-size: 20px 20px;
                       }
                     `}</style>
                     <motion.img 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        src={previewContent} 
                        alt={previewFile.originalName} 
                        className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-2xl relative z-10" 
                      />
                  </div>
                ) : previewType === 'text' ? (
                  <div className="w-full h-full p-8 flex">
                    <div className="w-full h-full bg-white rounded-[28px] border border-brand-ink/5 shadow-2xl overflow-hidden flex flex-col">
                      <div className="flex items-center gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100">
                        <Code className="w-4 h-4 text-gray-400" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Source Buffer Intelligence</span>
                      </div>
                      <pre className="p-8 font-mono text-[11px] leading-relaxed overflow-auto scrollbar-thin scrollbar-thumb-gray-200">
                        {previewContent}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-12 max-w-sm">
                    <div className="w-24 h-24 bg-white rounded-[32px] shadow-xl flex items-center justify-center mx-auto mb-8 border border-gray-100">
                      <FileIcon className="h-10 w-10 text-gray-200" />
                    </div>
                    <h4 className="text-lg font-bold mb-3">Format Not Renderable</h4>
                    <p className="text-xs text-gray-400 leading-relaxed mb-10">This asset type requires a local environment or native application to parse its content.</p>
                    <button 
                      onClick={() => handleDownload(previewFile)}
                      className="w-full bg-brand-ink text-brand-bg py-5 rounded-[20px] font-bold uppercase tracking-widest text-xs hover:brightness-150 transition-all shadow-2xl shadow-brand-ink/20"
                    >
                      <DownloadIcon className="h-4 w-4 inline mr-2" />
                      Download Raw Asset
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
