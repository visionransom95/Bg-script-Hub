import { Link, useLocation } from "react-router-dom";
import { HardDrive, Menu, X, Cpu } from "lucide-react";
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
                whileHover={{ rotate: 90 }}
                className="p-2.5 bg-brand-ink rounded-2xl group-hover:bg-brand-accent transition-colors shadow-lg shadow-brand-ink/10"
              >
                <Cpu className="h-5 w-5 text-brand-bg" />
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
             <Link 
              to="/admin" 
              className="p-2.5 rounded-xl bg-brand-ink text-brand-bg"
            >
              <Cpu className="w-4 h-4" />
            </Link>
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
