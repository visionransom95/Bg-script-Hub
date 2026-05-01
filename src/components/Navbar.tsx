import { Link } from "react-router-dom";
import { HardDrive, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => setIsOpen(!isOpen);

  const NavLinks = () => (
    <>
      <Link to="/" className="text-sm uppercase tracking-widest font-semibold hover:text-blue-600 transition-colors py-2 lg:py-0">Home</Link>
      <Link to="/download" className="text-sm uppercase tracking-widest font-semibold hover:text-blue-600 transition-colors py-2 lg:py-0">Download</Link>
      <Link to="/history" className="text-sm uppercase tracking-widest font-semibold hover:text-blue-600 transition-colors py-2 lg:py-0">History</Link>
      <Link to="/info" className="text-sm uppercase tracking-widest font-semibold hover:text-blue-600 transition-colors py-2 lg:py-0">Info</Link>
      <Link to="/contact" className="text-sm uppercase tracking-widest font-semibold hover:text-blue-600 transition-colors py-2 lg:py-0">Contact</Link>
    </>
  );

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <HardDrive className="h-6 w-6 text-black" />
              <span className="font-bold text-xl tracking-tight">BG Script</span>
            </Link>
          </div>
          
          <div className="hidden lg:flex items-center space-x-8">
            <NavLinks />
          </div>
          
          <div className="flex items-center lg:hidden">
            <button onClick={toggleMenu} className="text-gray-500 hover:text-black">
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200">
          <div className="px-4 pt-2 pb-4 space-y-1 flex flex-col">
            <NavLinks />
          </div>
        </div>
      )}
    </nav>
  );
}
