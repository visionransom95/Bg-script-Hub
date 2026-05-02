import { Link, useLocation } from "react-router-dom";
import { HardDrive, Menu, X } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  const navItems = [
    { name: "Terminal", path: "/" },
    { name: "Repository", path: "/download" },
    { name: "Telemetry", path: "/history" },
    { name: "System", path: "/info" },
    { name: "Protocol", path: "/contact" }
  ];

  const NavLinks = () => (
    <>
      {navItems.map(item => (
        <Link 
          key={item.name}
          to={item.path} 
          className={`text-[10px] uppercase tracking-[0.3em] font-bold transition-all py-2 lg:py-0 relative ${
            location.pathname === item.path ? 'text-brand-accent' : 'text-gray-400 hover:text-brand-ink'
          }`}
        >
          {item.name}
          {location.pathname === item.path && (
            <motion.div layoutId="navUnderline" className="absolute -bottom-1 left-0 right-0 h-0.5 bg-brand-accent hidden lg:block" />
          )}
        </Link>
      ))}
    </>
  );

  return (
    <nav className="fixed top-6 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="glass-morphism rounded-[2.5rem] px-8 h-20 flex justify-between items-center shadow-2xl shadow-brand-ink/5 border border-brand-ink/5">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.div 
                whileHover={{ scale: 1.05 }}
                className="w-10 h-10 bg-brand-ink rounded-xl shadow-lg shadow-brand-ink/10 flex items-center justify-center overflow-hidden"
              >
                <img 
                  src="/logo.png" 
                  alt="BG Script Hub" 
                  className="w-full h-full object-cover" 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>'; 
                    (e.target as HTMLImageElement).className = 'w-6 h-6 object-contain';
                  }}
                />
              </motion.div>
              <div className="flex flex-col -space-y-1">
                <span className="font-bold text-xl tracking-tighter text-brand-ink">BG SCRIPT</span>
                <span className="text-[9px] font-bold text-brand-accent uppercase tracking-widest font-mono">STABLE v2.4</span>
              </div>
            </Link>
          </div>
          
          <div className="hidden lg:flex items-center space-x-12">
            <NavLinks />
            <div className="h-6 w-px bg-brand-ink/10 ml-2 mr-2"></div>
            <Link 
              to="/admin" 
              className="px-6 py-2.5 rounded-full bg-brand-ink text-brand-bg text-[10px] font-bold uppercase tracking-widest hover:bg-brand-accent transition-all shadow-xl shadow-brand-ink/5"
            >
              Control Panel
            </Link>
          </div>
          
          <div className="flex items-center lg:hidden gap-4">
            <button onClick={toggleMenu} className="text-gray-500 hover:text-brand-ink p-2">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-b border-brand-ink/5 overflow-hidden"
          >
            <div className="px-6 pt-4 pb-8 space-y-4 flex flex-col">
              <NavLinks />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
