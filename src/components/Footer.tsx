import { HardDrive } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-8 text-center text-sm tracking-wide text-gray-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-black">
          <HardDrive className="h-5 w-5" />
          <span className="font-bold">BG Script</span>
        </div>
        <p>&copy; {new Date().getFullYear()} BG Script File Hub. All rights reserved.</p>
        <p className="text-xs max-w-md mx-auto">
          Providing secure and reliable file hosting and sharing capabilities. 
          Upload locally, download globally.
        </p>
        <div className="mt-2 pt-4 border-t border-gray-100 flex flex-col sm:flex-row gap-2 sm:gap-6 justify-center items-center">
          <p className="uppercase tracking-widest text-xs">Founder: <span className="font-bold text-black">Xen</span></p>
          <p className="uppercase tracking-widest text-xs">Created by: <span className="font-bold text-black">Ransom</span></p>
        </div>
      </div>
    </footer>
  );
}
