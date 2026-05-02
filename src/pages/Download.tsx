import React, { useState, useEffect, Fragment } from "react";
import { Download as DownloadIcon, File as FileIcon, Clock, HardDrive, Search, Eye, X, CheckSquare, Square, FolderArchive, Trash2, Filter, ChevronRight, LayoutGrid, List, Code, Lock, CheckCircle, FileCode2, FileJson, FileTerminal, FileText, FileImage, FileAudio, FileVideo, FileArchive } from "lucide-react";
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

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchFiles = async (pageNum = 1, isSearch = false) => {
    try {
      if (isSearch) {
        setLoading(true);
      }
      const encrypted = activeTab === 'encrypted';
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: "20",
        search: searchQuery,
        sort: sortOption,
        encrypted: encrypted.toString()
      });
      const res = await fetch(`/api/files?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (pageNum === 1) {
          setFiles(data.files);
        } else {
          setFiles(prev => [...prev, ...data.files]);
        }
        setTotalPages(data.totalPages);
        setHasMore(pageNum < data.totalPages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error("Failed to fetch files", error);
    } finally {
      if (isSearch) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchFiles(1, true);
  }, [searchQuery, sortOption, activeTab]);

  const loadMore = () => {
    if (hasMore) {
      fetchFiles(page + 1, false);
    }
  };

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
        fetchFiles(1, true);
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

  const filteredAndSortedFiles = files; // Server-side handles filtering and sorting now

  const toggleAll = () => {
    if (selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(filteredAndSortedFiles.map(f => f.filename)));
    }
  };

  return (
    <div className="min-h-screen data-grid-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-10">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <p className="text-brand-accent font-bold uppercase tracking-[0.3em] text-[10px] mb-4 font-mono">REPOSITORY INDEX</p>
            <h1 className="text-6xl font-bold tracking-tighter leading-none">Resource Stack</h1>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex flex-col sm:flex-row gap-5 items-center backdrop-blur-md bg-white/50 p-2.5 rounded-[2rem] border border-brand-ink/5 shadow-2xl shadow-brand-ink/5"
          >
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search repository..."
                className="w-full bg-white border border-gray-100 rounded-[1.5rem] pl-14 pr-4 py-4 focus:ring-4 focus:ring-brand-accent/5 focus:border-brand-accent/30 text-[11px] font-bold uppercase tracking-widest placeholder:text-gray-300 transition-all outline-none"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2 px-2 sm:border-l border-gray-100 sm:ml-2">
              <Filter className="w-4 h-4 text-gray-400 ml-4" />
              <select 
                className="bg-transparent border-none py-4 pr-10 focus:ring-0 text-[10px] font-bold uppercase tracking-widest cursor-pointer text-slate-600 hover:text-brand-ink transition-colors"
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="name-asc">A - Z</option>
                <option value="name-desc">Z - A</option>
                <option value="size-desc">Largest</option>
                <option value="size-asc">Smallest</option>
              </select>
            </div>

            <div className="flex gap-2 bg-gray-100/50 p-1.5 rounded-2xl sm:ml-2">
              <button 
                onClick={() => setViewMode('list')}
                className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white shadow-md text-brand-accent' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode('grid')}
                className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white shadow-md text-brand-accent' : 'text-gray-400 hover:text-gray-600'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        </div>

        <div className="flex gap-10 mb-12 border-b border-brand-ink/5">
          <button
            className={`pb-5 text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative ${activeTab === 'standard' ? 'text-brand-ink' : 'text-gray-400 hover:text-brand-ink'}`}
            onClick={() => { setActiveTab('standard'); setSelectedFiles(new Set()); }}
          >
            Main Objects
            {activeTab === 'standard' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent cyber-glow" />}
          </button>
          <button
            className={`pb-5 text-[11px] font-bold uppercase tracking-[0.3em] transition-all relative flex items-center gap-3 ${activeTab === 'encrypted' ? 'text-brand-ink' : 'text-gray-400 hover:text-brand-ink'}`}
            onClick={() => { setActiveTab('encrypted'); setSelectedFiles(new Set()); }}
          >
            <Lock className="w-3.5 h-3.5" /> Secure Vault
            {activeTab === 'encrypted' && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-accent cyber-glow" />}
          </button>
        </div>

        <AnimatePresence mode="wait">
          {selectedFiles.size > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="bg-slate-900 text-white rounded-[2rem] p-6 mb-12 flex items-center justify-between shadow-2xl cyber-glow"
            >
              <div className="flex items-center gap-6 pl-6">
                <div className="p-3 bg-brand-accent rounded-xl cyber-glow text-white">
                  <FolderArchive className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[12px] font-bold uppercase tracking-[0.2em]">{selectedFiles.size} Resources Targeted</span>
                  <p className="text-[10px] text-slate-500 font-medium">Ready for batch extraction protocol</p>
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setSelectedFiles(new Set())}
                  className="px-8 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-white transition-colors"
                >
                  Clear Selection
                </button>
                <button
                  onClick={handleBulkDownload}
                  className="bg-brand-accent text-white px-10 py-4 rounded-full font-bold uppercase tracking-[0.2em] text-[10px] hover:brightness-110 shadow-xl shadow-brand-accent/20 transition-all active:scale-[0.98]"
                >
                  Execute Batch Pack
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center items-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-brand-ink/10 border-t-brand-accent"></div>
          </div>
        ) : filteredAndSortedFiles.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-40 glass-morphism rounded-[3rem] border border-brand-ink/5 shadow-sm mt-6"
          >
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <HardDrive className="h-10 w-10 text-gray-200" />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">Vortex Empty</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">No data packets matched your current search parameters in this directory.</p>
          </motion.div>
        ) : (
          <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8' : 'bg-white rounded-[2.5rem] border border-brand-ink/5 shadow-[0_32px_80px_rgba(0,0,0,0.03)] overflow-hidden'}`}>
            {viewMode === 'list' && (
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-[0.3em] font-bold text-gray-400 font-mono">
                    <th className="p-8 w-16 text-center">
                      <button onClick={toggleAll} className="hover:text-brand-accent transition-colors">
                        {selectedFiles.size === filteredAndSortedFiles.length && filteredAndSortedFiles.length > 0 ? (
                          <CheckSquare className="h-5 w-5 text-brand-accent shadow-sm" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                    </th>
                    <th className="p-8">Identification</th>
                    <th className="p-8">Magnitude</th>
                    <th className="p-8">Last Modified</th>
                    <th className="p-8 text-right">Operations</th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {filteredAndSortedFiles.map((file, idx) => {
                      const isSelected = selectedFiles.has(file.filename);
                      const isExpanded = expandedFileId === file.filename;
                      const hasVersions = file.versions && file.versions.length > 1;

                      return (
                        <Fragment key={file.filename}>
                          <motion.tr 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={`border-b border-gray-50 hover:bg-slate-50/50 transition-all group ${isSelected ? 'bg-brand-accent/[0.02]' : ''}`}
                          >
                            <td className="p-8 text-center text-gray-200">
                              <button 
                                onClick={() => toggleSelection(file.filename)}
                                className={`transition-all duration-300 transform active:scale-90 ${isSelected ? 'text-brand-accent' : 'group-hover:text-gray-400'}`}
                              >
                                {isSelected ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                              </button>
                            </td>
                            <td className="p-8">
                              <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-[1.25rem] transition-all duration-500 w-12 h-12 flex items-center justify-center ${isSelected ? 'bg-brand-accent text-white cyber-glow' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-xl group-hover:text-brand-accent'}`}>
                                  {getFileIcon(file.originalName)}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-bold text-slate-800 text-sm truncate max-w-xs md:max-w-md group-hover:text-brand-accent transition-colors" title={file.originalName}>
                                    {file.originalName}
                                  </span>
                                  {hasVersions && (
                                    <button 
                                      onClick={() => setExpandedFileId(isExpanded ? null : file.filename)}
                                      className="text-[9px] text-brand-accent font-bold uppercase tracking-widest text-left hover:underline mt-1.5 w-max opacity-80"
                                    >
                                      {isExpanded ? 'Hide Archives' : `View ${file.versions!.length} Revisions`}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-8 text-[11px] font-mono font-medium text-slate-400">
                              {(file.size / 1024 / 1024).toFixed(3)} MB
                            </td>
                            <td className="p-8 text-[11px] text-slate-400 font-mono">
                              <div className="flex items-center gap-2">
                                <Clock className="h-3.5 w-3.5 opacity-60" />
                                {new Date(file.createdAt).toLocaleDateString()}
                              </div>
                            </td>
                            <td className="p-8 text-right">
                              <div className="flex items-center justify-end gap-3">
                                <button 
                                  onClick={() => handlePreview(file)}
                                  className="p-3.5 text-slate-400 hover:text-brand-accent bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 rounded-2xl transition-all shadow-sm flex items-center gap-2 group/btn"
                                  title="Analyze"
                                >
                                  <Eye className="h-4 w-4 group-hover/btn:scale-110 transition-transform" />
                                </button>
                                {adminToken && (
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(file.filename); }}
                                    className="p-3.5 text-slate-400 hover:text-red-500 bg-gray-50 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-2xl transition-all shadow-sm"
                                    title="Purge"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                )}
                                <button 
                                  onClick={() => handleDownload(file)}
                                  className="flex items-center gap-3 bg-slate-900 text-white px-7 py-3.5 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-brand-accent transition-all shadow-xl active:scale-95 group/get"
                                >
                                  <DownloadIcon className="h-4 w-4 group-hover/get:-translate-y-0.5 transition-transform" />
                                  Fetch
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                <AnimatePresence initial={false}>
                  {filteredAndSortedFiles.map((file, idx) => {
                    const isSelected = selectedFiles.has(file.filename);
                    return (
                      <motion.div
                        key={file.filename}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className={`brutal-card rounded-[2.5rem] p-8 flex flex-col relative group overflow-hidden ${isSelected ? 'ring-2 ring-brand-accent ring-offset-4' : ''}`}
                      >
                        <div className="flex justify-between items-start mb-8">
                          <div className={`p-5 rounded-[1.5rem] transition-all duration-500 scale-110 w-14 h-14 flex items-center justify-center ${isSelected ? 'bg-brand-accent text-white cyber-glow' : 'bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-2xl group-hover:text-brand-accent'}`}>
                            {getFileIcon(file.originalName)}
                          </div>
                          <button 
                            onClick={() => toggleSelection(file.filename)}
                            className={`transition-all duration-300 transform active:scale-90 p-2 ${isSelected ? 'text-brand-accent' : 'text-gray-200 group-hover:text-gray-400'}`}
                          >
                            {isSelected ? <CheckCircle className="h-6 w-6 shadow-sm" /> : <Square className="h-6 w-6" />}
                          </button>
                        </div>
                        
                        <div className="mb-10 flex-1">
                          <h3 className="font-bold text-slate-800 text-lg leading-tight mb-2 group-hover:text-brand-accent transition-colors break-words line-clamp-2" title={file.originalName}>
                            {file.originalName}
                          </h3>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono uppercase tracking-widest">
                            <span className="font-bold text-gray-400">{(file.size / 1024 / 1024).toFixed(3)} MB</span>
                            <span className="opacity-20 text-gray-400">|</span>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 opacity-50" />
                              {new Date(file.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-auto">
                          <button 
                            onClick={() => handlePreview(file)}
                            className="flex items-center justify-center gap-2 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-all shadow-sm"
                          >
                            <Eye className="w-4 h-4" /> Analyze
                          </button>
                          <button 
                            onClick={() => handleDownload(file)}
                            className="flex items-center justify-center gap-2 bg-slate-900 text-white p-4 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-all shadow-lg shadow-brand-ink/5"
                          >
                            <DownloadIcon className="w-4 h-4" /> Fetch
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
            
            {hasMore && (
              <div className="flex justify-center mt-12 mb-8 p-4">
                <button 
                  onClick={loadMore} 
                  className="px-10 py-4 rounded-full bg-slate-900 text-white font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-brand-accent transition-all shadow-xl active:scale-95"
                >
                  Load More Files
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="mt-24 pt-16 border-t border-brand-ink/5">
          <div className="flex flex-col items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="h-px w-16 bg-brand-ink/5 shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
              <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-gray-300">Administrative Terminal</p>
              <div className="h-px w-16 bg-brand-ink/5 shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
            </div>
            
            {!adminToken ? (
              <button 
                onClick={() => {
                  const pass = window.prompt("Security Authorization Required:");
                  if (pass === "bgscripthub666") {
                    localStorage.setItem("adminToken", pass);
                    setAdminToken(pass);
                  } else if (pass) {
                    alert("Unauthorized Access Attempt Detected.");
                  }
                }}
                className="px-10 py-4 rounded-full border border-brand-ink/10 bg-white text-[11px] font-bold text-gray-400 hover:text-brand-ink hover:border-brand-ink shadow-sm hover:shadow-xl transition-all uppercase tracking-widest"
              >
                Launch Security Handshake
              </button>
            ) : (
              <div className="flex flex-col items-center gap-6">
                <div className="px-6 py-2 bg-green-50 text-green-600 border border-green-100 rounded-full text-[10px] font-bold uppercase tracking-widest cyber-glow">
                  System Authorized: ROOT_ACCESS
                </div>
                <button 
                  onClick={() => {
                    localStorage.removeItem("adminToken");
                    setAdminToken(null);
                  }}
                  className="px-8 py-3 rounded-full bg-red-50 text-red-500 border border-red-100 text-[10px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg"
                >
                  Terminate Local Session
                </button>
              </div>
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
