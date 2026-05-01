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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="mb-8 border-b border-gray-200 pb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-4">Download History</h1>
          <p className="text-gray-500 uppercase tracking-widest text-xs font-semibold">
            Track your recently downloaded files.
          </p>
        </div>
        
        {history.length > 0 && (
          <button 
            onClick={clearHistory}
            className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold text-sm tracking-wide hover:bg-red-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Clear History
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-gray-100 mt-6">
          <HistoryIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-xl font-bold mb-2">No history</h3>
          <p className="text-gray-500">You haven't downloaded any files yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-widest text-gray-500">
                  <th className="p-4 font-semibold pl-6">Name</th>
                  <th className="p-4 font-semibold">Size</th>
                  <th className="p-4 font-semibold">Downloaded</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, idx) => (
                  <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <span className="font-medium text-sm">
                        {entry.originalName}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-500 tabular-nums">
                      {(entry.size / 1024 / 1024).toFixed(2)} MB
                    </td>
                    <td className="p-4 text-sm text-gray-500 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
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
  );
}
