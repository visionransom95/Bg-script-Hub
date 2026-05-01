import { MessageSquare, Mail, MapPin } from "lucide-react";
import React, { useState } from "react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6">Get in Touch</h1>
          <p className="text-lg text-gray-600 mb-10 max-w-lg leading-relaxed">
            Have questions about BG Script? Need support or want to report an issue with a file? We're here to help.
          </p>
          
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <Mail className="h-6 w-6 text-black mt-1" />
              <div>
                <h3 className="font-bold text-lg">Email Us</h3>
                <p className="text-gray-500 mt-1">contact@bgscript.example.com</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <MessageSquare className="h-6 w-6 text-[#5865F2] mt-1" />
              <div>
                <h3 className="font-bold text-lg">Discord Support</h3>
                <p className="text-gray-500 mt-1">
                  <a href="https://discord.gg/Cqhb4X3xMU" target="_blank" rel="noopener noreferrer" className="text-[#5865F2] hover:text-indigo-700 font-semibold underline underline-offset-2">
                    Join our server
                  </a> for community help.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <MapPin className="h-6 w-6 text-black mt-1" />
              <div>
                <h3 className="font-bold text-lg">Office</h3>
                <p className="text-gray-500 mt-1">123 Cloud Server Lane<br />Datacenter 42</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Name</label>
              <input 
                type="text" 
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Email</label>
              <input 
                type="email" 
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                placeholder="john@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">Message</label>
              <textarea 
                rows={5}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all"
                placeholder="How can we help you?"
              ></textarea>
            </div>
            
            <button 
              type="submit"
              className="w-full bg-black text-white px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-sm hover:bg-gray-800 transition-colors"
            >
              {submitted ? "Message Sent!" : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
