import { Info as InfoIcon, Shield, Zap, Globe } from "lucide-react";

export default function Info() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <InfoIcon className="h-12 w-12 mx-auto mb-4" />
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">About BG Script Hub</h1>
        <p className="text-gray-500 uppercase tracking-widest text-sm font-semibold max-w-xl mx-auto">
          We provide a robust, no-nonsense file hosting and sharing platform for developers and users.
        </p>
      </div>

      <div className="space-y-12">
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-8 items-start">
          <div className="bg-blue-50 p-4 rounded-full">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">Secure Storage</h2>
            <p className="text-gray-600 leading-relaxed">
              Files are stored securely on our reliable backend servers. We do not inspect the contents of your files, prioritizing privacy and security above all else.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-8 items-start">
          <div className="bg-green-50 p-4 rounded-full">
            <Zap className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">Lightning Fast</h2>
            <p className="text-gray-600 leading-relaxed">
              Our infrastructure is optimized for speed, so you spend less time waiting for uploads and downloads, and more time getting things done.
            </p>
          </div>
        </div>

        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-8 items-start">
          <div className="bg-purple-50 p-4 rounded-full">
            <Globe className="h-8 w-8 text-purple-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold mb-3">Global Access</h2>
            <p className="text-gray-600 leading-relaxed">
              Share your uploaded files with anyone around the world. Just send them to the download page and they can grab what they need instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
