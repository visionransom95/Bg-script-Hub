import { useState, useEffect } from "react";
import { History as HistoryIcon, Clock, HardDrive, Trash2 } from "lucide-react";

interface HistoryEntry {
  originalName: string;
  size: number;
  downloadedAt: string;
}

export default function History() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('downloadHistory') || '[]');
      // Sort to show newest first
      setHistory(data.sort((a: HistoryEntry, b: HistoryEntry) => 
         new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
      ));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to clear your download history?")) {
      localStorage.removeItem('downloadHistory');
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen data-grid-bg pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="mb-16 border-b border-brand-ink/5 pb-12 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div>
            <p className="text-brand-accent font-bold uppercase tracking-[0.3em] text-[10px] mb-4 font-mono">LOCAL ARCHIVE</p>
            <h1 className="text-6xl font-bold tracking-tighter leading-none">Extraction Logs</h1>
          </div>
          
          {history.length > 0 && (
            <button 
              onClick={clearHistory}
              className="flex items-center gap-3 bg-red-50 text-red-600 px-8 py-4 rounded-full font-bold text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-lg active:scale-95"
            >
              <Trash2 className="h-4 w-4" />
              Purge Logs
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-40 glass-morphism rounded-[3rem] border border-brand-ink/5 shadow-sm mt-6">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <HistoryIcon className="h-10 w-10 text-gray-200" />
            </div>
            <h3 className="text-2xl font-bold mb-3 tracking-tight">No Transactions</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">Your local extraction history is currently empty or has been purged from memory.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] border border-brand-ink/5 shadow-[0_32px_80px_rgba(0,0,0,0.03)] overflow-hidden mt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] uppercase tracking-[0.3em] font-bold text-gray-400 font-mono">
                    <th className="p-8 pb-6 font-bold pl-12">Identification</th>
                    <th className="p-8 pb-6 font-bold">Magnitude</th>
                    <th className="p-8 pb-6 font-bold text-right">Synchronization Time</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((entry, idx) => (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-slate-50/50 transition-all group">
                      <td className="p-8 pl-12">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gray-100 rounded-xl text-gray-400 group-hover:bg-brand-accent group-hover:text-white transition-all shadow-sm">
                            <HardDrive className="h-4 w-4" />
                          </div>
                          <span className="font-bold text-sm text-slate-800 group-hover:text-brand-accent transition-colors">
                            {entry.originalName}
                          </span>
                        </div>
                      </td>
                      <td className="p-8 text-[11px] text-slate-400 font-mono font-medium">
                        {(entry.size / 1024 / 1024).toFixed(3)} MB
                      </td>
                      <td className="p-8 text-[11px] text-slate-400 font-mono text-right">
                        <div className="flex items-center justify-end gap-2 pr-4">
                          <Clock className="h-3.5 w-3.5 opacity-50" />
                          {new Date(entry.downloadedAt).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
