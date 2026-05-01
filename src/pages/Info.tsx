import { Info as InfoIcon, Shield, Zap, Globe } from "lucide-react";

export default function Info() {
  return (
    <div className="min-h-screen data-grid-bg pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-32">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-brand-accent/5 border border-brand-accent/10 text-brand-accent text-[10px] font-bold uppercase tracking-[0.2em] mb-8 cyber-glow">
            <InfoIcon className="w-3.5 h-3.5" /> Platform Documentation
          </div>
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tighter leading-none mb-6">The Hub Logic</h1>
          <p className="text-lg text-slate-500 font-medium max-w-xl mx-auto leading-relaxed">
            A high-performance architecture designed for the persistent storage and seamless distribution of data packets across the global grid.
          </p>
        </div>

        <div className="space-y-10">
          <div className="brutal-card p-10 sm:p-12 rounded-[3.5rem] flex flex-col sm:flex-row gap-10 items-start">
            <div className="bg-brand-accent/10 p-5 rounded-[1.5rem] text-brand-accent cyber-glow">
              <Shield className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 tracking-tight">Security Hardening</h2>
              <p className="text-slate-500 leading-relaxed font-medium">
                Assets are shielded behind multi-layer security protocols. Optional AES-256 equivalent server-side vaulting ensures your sensitive configurations remain strictly confidential.
              </p>
            </div>
          </div>

          <div className="brutal-card p-10 sm:p-12 rounded-[3.5rem] flex flex-col sm:flex-row gap-10 items-start">
            <div className="bg-brand-accent/10 p-5 rounded-[1.5rem] text-brand-accent cyber-glow">
              <Zap className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 tracking-tight">Latency Optimization</h2>
              <p className="text-slate-500 leading-relaxed font-medium">
                Our infrastructure utilizes edge-caching and state-of-the-art ingestion pipelines, reducing propagation delay to nearly zero. Experience instantaneous binary throughput.
              </p>
            </div>
          </div>

          <div className="brutal-card p-10 sm:p-12 rounded-[3.5rem] flex flex-col sm:flex-row gap-10 items-start">
            <div className="bg-brand-accent/10 p-5 rounded-[1.5rem] text-brand-accent cyber-glow">
              <Globe className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-4 tracking-tight">Universal Ingress</h2>
              <p className="text-slate-500 leading-relaxed font-medium">
                Designed for true decentralized accessibility. Broadcast your resources across the network with unique identification tokens, accessible from any node in the global hierarchy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
