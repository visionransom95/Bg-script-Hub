import React, { useState, useRef } from "react";
import { UploadCloud, CheckCircle, AlertCircle, File as FileIcon, Lock, X, Layout, Code, Database, Globe, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

export default function Home() {
  const [uploadQueue, setUploadQueue] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error' | 'partial'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [envInfo, setEnvInfo] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    fetch("/api/health")
      .then(r => r.json())
      .then(data => setEnvInfo(data))
      .catch(err => console.error("Health check failed", err));
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setUploadQueue(prev => [...prev, ...Array.from(e.target.files!)]);
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploadQueue(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage('');
    }
  };

  const removeFile = (index: number) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index));
    if (uploadQueue.length === 1) setUploadStatus('idle');
  };

  const handleUpload = async () => {
    if (uploadQueue.length === 0) return;

    setUploading(true);
    setUploadStatus('idle');
    setUploadProgress(0);
    setErrorMessage('');

    let successCount = 0;
    
    for (let i = 0; i < uploadQueue.length; i++) {
        const file = uploadQueue[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("isEncrypted", isEncrypted.toString());

        try {
            // Vercel Serverless Function limit is 4.5MB total request size.
            // We use 4.0MB to account for multipart/form-data overhead.
            const isVercel = envInfo?.environment?.isVercel || window.location.hostname.includes('vercel.app');
            const VERCEL_LIMIT = 4.0 * 1024 * 1024;
            
            if (isVercel && file.size > VERCEL_LIMIT) {
                const limitErr = `${file.name} is too large for Vercel (max ~4MB). Vercel serverless functions have a strict 4.5MB request body limit. Please use a smaller file or host on a platform with higher limits.`;
                setErrorMessage(prev => prev ? prev + "\n" + limitErr : limitErr);
                continue;
            }

            // check if storage is missing on vercel
            if (isVercel && envInfo?.storage && !envInfo.storage.firebase && !envInfo.storage.drive && !envInfo.storage.blob) {
                const storageErr = "No persistent storage (Firebase/Blob/Drive) configured for Vercel. Files will be lost when the serverless function restarts.";
                setErrorMessage(prev => prev || storageErr);
            }

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            if (res.ok) {
                successCount++;
            } else {
                let errorText = 'Unknown server error';
                try {
                    const errorData = await res.json();
                    errorText = errorData.error || errorData.message || 'Unknown server error';
                } catch (e) {
                    // If not JSON, it might be a Vercel text error (like 413 Payload Too Large)
                    const text = await res.text().catch(() => '');
                    if (res.status === 413) {
                        errorText = "File too large (Vercel 4.5MB limit exceeded)";
                    } else if (text.includes('Payload Too Large')) {
                        errorText = "Payload Too Large";
                    } else if (text.length > 0 && text.length < 200) {
                        errorText = text;
                    }
                }
                console.error("Failed to upload", file.name, errorText);
                setErrorMessage(prev => prev ? prev + "\n" + `Failed to upload ${file.name}: ${errorText}` : `Failed to upload ${file.name}: ${errorText}`);
            }
            
            // Artificial progress calculation since fetch doesn't have onUploadProgress out of the box easily
            const overallProg = ((i + 1) * 100) / uploadQueue.length;
            setUploadProgress(Math.round(overallProg));
        } catch (error: any) {
             console.error("Failed to upload", file.name, error);
             const connErr = `Connection error for ${file.name}: ${error.message || 'Unknown error'}`;
             setErrorMessage(prev => prev ? prev + "\n" + connErr : connErr);
        }
    }

    setUploading(false);
    
    if (successCount === uploadQueue.length) {
        setUploadStatus('success');
        setUploadQueue([]);
    } else if (successCount > 0) {
        setUploadStatus('partial');
        setErrorMessage(prev => prev || `Uploaded ${successCount} files, but ${uploadQueue.length - successCount} failed.`);
        setUploadQueue([]);
    } else {
        setUploadStatus('error');
        setErrorMessage(prev => prev || "Error uploading files. Please try again.");
    }
    
    setTimeout(() => setUploadProgress(0), 1000);
  };

  return (
    <div className="min-h-screen data-grid-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand-accent/5 border border-brand-accent/10 text-brand-accent text-[10px] font-bold uppercase tracking-[0.2em] mb-8 cyber-glow">
              <Globe className="w-3.5 h-3.5" /> High-Density Infrastructure
            </div>
            <h1 className="text-8xl sm:text-9xl font-bold tracking-tighter leading-[0.8] mb-10 text-brand-ink">
              BG<br />
              <span className="bg-gradient-to-r from-brand-accent to-indigo-600 bg-clip-text text-transparent">Script Hub</span>
            </h1>
            <p className="text-xl text-gray-500 mb-12 max-w-lg leading-relaxed font-medium">
              A high-performance repository for your scripts, files, and configuration data. Optimized for speed, security, and architectural permanence.
            </p>
            
            <div className="flex flex-wrap gap-5 mb-16">
              <button 
                onClick={() => document.getElementById('upload-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-brand-ink text-brand-bg px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-brand-accent transition-all shadow-2xl shadow-brand-ink/20 transform hover:-translate-y-1 active:scale-[0.98]"
              >
                Launch Interface
              </button>
              <Link 
                to="/download"
                className="bg-white border border-brand-ink/10 px-10 py-5 rounded-full font-bold uppercase tracking-widest text-[11px] hover:bg-gray-50 transition-all flex items-center gap-3 group shadow-lg shadow-brand-ink/5"
              >
                Browse Data <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-6 max-w-md">
              <div className="p-6 brutal-card rounded-[2.5rem]">
                <Database className="w-7 h-7 text-brand-accent mb-4" />
                <h4 className="font-bold text-xs uppercase mb-2 tracking-widest">Metadata Core</h4>
                <p className="text-[10px] text-gray-400 leading-normal font-medium">Atomic synchronization powered by Firestore persistence. Real-time updates.</p>
              </div>
              <div className="p-6 brutal-card rounded-[2.5rem]">
                <Lock className="w-7 h-7 text-brand-accent mb-4" />
                <h4 className="font-bold text-xs uppercase mb-2 tracking-widest">Security Protocol</h4>
                <p className="text-[10px] text-gray-400 leading-normal font-medium">Optional AES-256 equivalent server-side encryption for sensitive payloads.</p>
              </div>
            </div>
          </motion.div>

          <motion.div 
            id="upload-section"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
            className="bg-white p-10 rounded-[3rem] shadow-[0_32px_80px_rgba(0,0,0,0.08)] border border-brand-ink/5 relative overflow-hidden"
          >
            {uploading && (
               <div className="absolute top-0 left-0 h-1.5 bg-gray-100 w-full z-20">
                 <motion.div 
                   className="h-full bg-brand-accent"
                   initial={{ width: 0 }}
                   animate={{ width: `${uploadProgress}%` }}
                 />
               </div>
            )}
            
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-bold tracking-tight">Upload Protocol</h2>
              <div className="px-4 py-1.5 rounded-full bg-gray-100 text-[10px] font-bold uppercase tracking-widest text-gray-500 border border-gray-200">
                ACTIVE HANDSHAKE
              </div>
            </div>
            
            <div 
              className={`border-2 border-dashed rounded-[2.5rem] p-16 text-center transition-all cursor-pointer ${
                uploadQueue.length > 0 ? 'border-brand-accent bg-brand-accent/5' : 'border-gray-100 hover:border-brand-accent/30 hover:bg-gray-50'
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
              {uploadQueue.length > 0 ? (
                <div className="flex flex-col gap-6 w-full">
                  <div className="flex items-center justify-between px-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent">{uploadQueue.length} Assets in Buffer</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setUploadQueue([]); }}
                      className="text-[10px] font-bold uppercase tracking-[0.2em] text-red-500 hover:text-red-700 transition-colors"
                    >
                      Purge Buffer
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                    <AnimatePresence initial={false}>
                      {uploadQueue.map((file, idx) => (
                        <motion.div 
                          key={`${file.name}-${idx}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex items-center justify-between p-5 bg-white border border-gray-100 rounded-[24px] shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-4 overflow-hidden">
                            <div className="p-3 bg-brand-accent/10 rounded-xl text-brand-accent">
                              <FileIcon className="h-5 w-5 shrink-0" />
                            </div>
                            <div className="text-left overflow-hidden">
                              <p className="font-bold text-slate-800 text-xs truncate max-w-[120px] sm:max-w-[200px]">{file.name}</p>
                              <p className="text-[10px] text-gray-400 font-mono mt-0.5">{(file.size / 1024 / 1024).toFixed(3)} MB</p>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                            className="p-2 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="p-5 border-2 border-dashed border-gray-100 rounded-[24px] text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:border-brand-accent/30 hover:text-brand-accent transition-all bg-gray-50/50"
                  >
                    + Register more assets
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-6 py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-2 shadow-inner">
                    <UploadCloud className="h-10 w-10 text-brand-accent/40" />
                  </div>
                  <div className="space-y-2">
                    <span className="block text-slate-800 text-lg font-bold tracking-tight">Drop resources here</span>
                    <span className="block text-[10px] text-gray-400 uppercase tracking-[0.3em] font-bold">or browse local secure directory</span>
                  </div>
                  <div className="flex gap-3 mt-4">
                    {['JS', 'PY', 'LUA', 'TS'].map(ext => (
                      <span key={ext} className="px-3 py-1.5 rounded-lg bg-gray-100/50 border border-gray-100 text-[10px] font-mono text-gray-500 font-bold">{ext}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {uploadQueue.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 p-6 rounded-[2.5rem] bg-slate-900 border border-slate-800 flex items-center justify-between shadow-xl"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl transition-all ${isEncrypted ? 'bg-brand-accent text-white cyber-glow' : 'bg-slate-800 text-slate-500'}`}>
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-widest">End-to-End Vault</p>
                    <p className="text-[10px] text-slate-500 font-medium">Encrypt payloads before ingestion</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEncrypted(!isEncrypted)}
                  className={`w-14 h-7 rounded-full transition-all relative ${isEncrypted ? 'bg-brand-accent' : 'bg-slate-700'}`}
                >
                  <motion.div 
                    className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-lg"
                    animate={{ x: isEncrypted ? 28 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </motion.div>
            )}

            <div className="mt-10">
              <button 
                onClick={handleUpload}
                disabled={uploadQueue.length === 0 || uploading}
                className="w-full bg-brand-accent text-white py-6 rounded-[2.5rem] font-bold uppercase tracking-[0.2em] text-[11px] disabled:opacity-20 disabled:grayscale hover:brightness-110 active:scale-[0.98] transition-all shadow-2xl shadow-brand-accent/20 overflow-hidden relative group"
              >
                <div className="relative z-10 flex items-center justify-center gap-3">
                  {uploading ? (
                    <>
                      <div className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
                      <span>Writing to Database... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Execute Synchronization</span>
                    </>
                  )}
                </div>
              </button>
            </div>

            {uploadStatus !== 'idle' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-6 p-5 rounded-2xl border flex items-start gap-4 ${
                  uploadStatus === 'success' ? 'bg-green-50 border-green-100 text-green-800' : 
                  uploadStatus === 'partial' ? 'bg-yellow-50 border-yellow-100 text-yellow-800' :
                  'bg-red-50 border-red-100 text-red-800'
                }`}
              >
                {uploadStatus === 'success' ? <CheckCircle className="shrink-0 w-5 h-5 mt-0.5" /> : <AlertCircle className="shrink-0 w-5 h-5 mt-0.5" />}
                <div>
                  <p className="font-bold text-xs uppercase mb-1">
                    {uploadStatus === 'success' ? 'Synchronized' : (uploadStatus === 'error' ? 'System Warning' : 'Operational Status')}
                  </p>
                  <p className="text-xs opacity-80 leading-relaxed">
                    {uploadStatus === 'success' ? 'All assets successfully committed to the cloud repository.' : errorMessage}
                  </p>
                  {uploadStatus === 'success' && (
                    <Link to="/download" className="inline-flex items-center gap-2 mt-3 font-bold text-[10px] uppercase tracking-wider text-green-700 hover:underline">
                      View Directory <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Showcase Section */}
        <div className="mt-32">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <p className="text-brand-accent font-bold uppercase tracking-[0.2em] text-[10px] mb-2">INTERFACE SHOWCASE</p>
              <h2 className="text-4xl font-bold tracking-tighter">Engineered for Performance</h2>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-gray-500 max-w-sm text-sm"
            >
              Our interface is designed with a technical focus, providing detailed metadata and robust file management tools.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="md:col-span-2 group relative"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-accent to-purple-600 rounded-[40px] blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative bg-white rounded-[38px] border border-brand-ink/5 p-4 sm:p-8 aspect-video overflow-hidden shadow-2xl">
                <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                  </div>
                  <div className="ml-4 px-3 py-1 rounded bg-gray-50 border border-gray-200 text-[10px] font-mono text-gray-400 truncate flex-1 md:max-w-xs">/root/system/repository/index.js</div>
                </div>
                <div className="grid grid-cols-12 gap-8">
                  <div className="col-span-3 space-y-4 hidden sm:block">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="h-3 w-full bg-gray-100 rounded-full" />
                    ))}
                    <div className="h-20 w-full bg-brand-accent/5 rounded-2xl border border-brand-accent/10" />
                  </div>
                  <div className="col-span-12 sm:col-span-9 space-y-3 font-mono text-[10px] text-brand-ink/70">
                    <p className="text-blue-500 font-bold">import <span className="text-gray-900">{`{ Repository }`}</span> from <span className="text-brand-accent">"./core"</span>;</p>
                    <p className="pl-4">const config = <span className="text-gray-900">{`{`}</span></p>
                    <p className="pl-8">version: <span className="text-orange-500">"2.0.1"</span>,</p>
                    <p className="pl-8">status: <span className="text-green-500">"ACTIVE"</span>,</p>
                    <p className="pl-8">integrity: <span className="text-blue-500">true</span></p>
                    <p className="pl-4 text-gray-900">{`};`}</p>
                    <p className="mt-4 text-gray-300">// Initializing secure storage handshake...</p>
                    <p className="text-purple-600">export default <span className="text-gray-900">async</span> function connect() {` {`}</p>
                    <div className="h-4 w-1/2 bg-gray-50 rounded" />
                    <div className="h-4 w-3/4 bg-gray-50 rounded" />
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-brand-ink text-brand-bg rounded-[32px] p-8 shadow-2xl relative overflow-hidden group"
              >
                <div className="relative z-10">
                  <Layout className="w-8 h-8 text-brand-accent mb-4" />
                  <h3 className="text-lg font-bold mb-2">Modern Panel</h3>
                  <p className="text-[10px] text-gray-400 leading-relaxed font-medium">Adaptive GUI optimized for both desktop heavy-duty management and mobile quick-access previews.</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-brand-accent/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white border border-brand-ink/5 rounded-[32px] p-8 shadow-sm group hover:shadow-xl transition-all"
              >
                <Code className="w-8 h-8 text-brand-accent mb-4" />
                <h3 className="text-lg font-bold mb-2">Metadata Deep-Dive</h3>
                <p className="text-[10px] text-gray-500 leading-relaxed">Full visibility into version history, physical storage paths, and cryptographic integrity checks.</p>
                <div className="mt-6 flex gap-2 overflow-hidden">
                  <div className="px-2 py-0.5 rounded bg-brand-accent/10 text-[8px] font-bold text-brand-accent font-mono uppercase tracking-tighter">REACT</div>
                  <div className="px-2 py-0.5 rounded bg-orange-100 text-[8px] font-bold text-orange-600 font-mono uppercase tracking-tighter">PYTHON</div>
                  <div className="px-2 py-0.5 rounded bg-blue-100 text-[8px] font-bold text-blue-600 font-mono uppercase tracking-tighter">TS</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
