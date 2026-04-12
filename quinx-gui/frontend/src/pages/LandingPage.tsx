import React from 'react';
import { ArrowRight, Mail, Search, Zap } from 'lucide-react';
import logo from '../assets/logo/q__2_-removebg-preview.png';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-obsidian text-white font-sans relative overflow-x-hidden selection:bg-matrix selection:text-obsidian">
      {/* Texture overlays */}
      <div className="absolute inset-0 bg-noise pointer-events-none z-0"></div>
      <div className="absolute inset-0 scanlines pointer-events-none z-0 opacity-20"></div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-divider bg-obsidian/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Q" className="h-11 w-11 object-contain opacity-90" />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/scraper')}
              className="text-sm font-mono text-white hover:text-matrix transition-colors px-4 py-2 cursor-pointer"
            >
              [LOGIN]
            </button>
            <button
              onClick={() => navigate('/scraper')}
              className="text-sm font-mono bg-matrix text-obsidian hover:bg-matrix-hover transition-colors px-4 py-2 cursor-pointer font-bold"
            >
              GET STARTED
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center border border-matrix text-matrix font-mono text-xs px-3 py-1.5 mb-8 bg-matrix/5">
            <span className="w-2 h-2 rounded-full bg-matrix animate-pulse mr-2"></span>
            COLD OUTREACH, FULLY AUTOMATED
          </div>
          <h1 className="font-mono font-bold text-5xl md:text-6xl tracking-tighter leading-[1.1] mb-6">
            Find leads.<br />Write emails.<br /><span className="text-matrix">Close deals.</span>
          </h1>
          <p className="text-[#a1a1aa] text-lg mb-8 max-w-lg leading-relaxed">
            Quinx scrapes verified business emails, writes personalised cold emails with AI, and sends them — all from one dashboard.
          </p>
          <button
            onClick={() => navigate('/scraper')}
            className="group flex items-center space-x-3 bg-matrix text-obsidian font-mono font-bold px-8 py-4 hover:bg-matrix-hover transition-colors rounded-none cursor-pointer"
          >
            <span>START FOR FREE</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Hero terminal mockup */}
        <div className="bg-gunmetal border border-divider shadow-2xl rounded-sm p-5 font-mono text-sm relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-matrix/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="flex space-x-2 mb-4 border-b border-divider pb-3">
            <div className="w-3 h-3 rounded-full bg-red-500/60"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500/60"></div>
            <div className="w-3 h-3 rounded-full bg-matrix/60"></div>
            <span className="text-gray-500 text-xs ml-2 tracking-wider">quinx — live run</span>
          </div>
          <div className="text-gray-300 space-y-2 text-xs leading-relaxed">
            <p><span className="text-matrix">✓</span> Scraped <span className="text-white font-bold">47 verified emails</span> — Restaurants, NYC</p>
            <p><span className="text-matrix">✓</span> AI wrote <span className="text-white font-bold">47 personalised emails</span> in 3m 12s</p>
            <p><span className="text-matrix">✓</span> Sent via SMTP with smart delays — <span className="text-white">0 bounces</span></p>
            <div className="border-t border-divider pt-3 mt-3 space-y-1">
              <p className="text-gray-500">Campaign: <span className="text-white">NYC_Restaurants_April</span></p>
              <p className="text-gray-500">Open rate: <span className="text-matrix font-bold">34%</span> &nbsp;·&nbsp; Replies: <span className="text-matrix font-bold">9</span></p>
            </div>
            <p className="text-matrix animate-pulse pt-1">_</p>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="mb-12">
          <h2 className="font-mono text-2xl font-bold border-b border-divider pb-4 inline-block text-white">HOW IT WORKS</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Step 1 */}
          <div className="bg-gunmetal border border-divider p-8 bento-hover group">
            <Search className="text-gray-600 group-hover:text-matrix transition-colors w-8 h-8 mb-8" />
            <h3 className="font-mono text-xl font-bold mb-3 tracking-tight">01 — Find Leads</h3>
            <p className="text-[#a1a1aa] text-sm leading-relaxed">
              Enter a niche and city. Quinx searches Google Maps and scrapes verified email addresses from business websites — no manual prospecting.
            </p>
          </div>

          {/* Step 2 */}
          <div className="bg-gunmetal border border-divider p-8 bento-hover md:col-span-2 group">
            <Zap className="text-gray-600 group-hover:text-matrix transition-colors w-8 h-8 mb-8" />
            <h3 className="font-mono text-xl font-bold mb-3 tracking-tight">02 — Write with AI</h3>
            <p className="text-[#a1a1aa] text-sm mb-6 leading-relaxed">
              Define your offer once. The AI reads each lead's website and writes a short, relevant cold email for every contact — no templates, no copy-paste.
            </p>
            <div className="bg-black border border-zinc-800 p-4 font-mono text-xs text-gray-300 rounded-sm space-y-1">
              <p><span className="text-gray-500">To:</span> owner@epochcoffee.com</p>
              <p><span className="text-gray-500">Subject:</span> Quick idea for Epoch Coffee</p>
              <p className="text-gray-400 pt-1">Hi — noticed you're running events at your Austin location. We help coffee shops like yours automate follow-ups with guests...</p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-gunmetal border border-divider p-8 bento-hover md:col-span-3 flex flex-col md:flex-row items-center gap-12 group">
            <div className="md:w-5/12 w-full">
              <Mail className="text-gray-600 group-hover:text-matrix transition-colors w-8 h-8 mb-8" />
              <h3 className="font-mono text-xl font-bold mb-3 tracking-tight">03 — Send & Track</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">
                Connect your own SMTP and hit send. Emails go out with human-like delays to protect your domain reputation. Every sent email is logged and exportable.
              </p>
            </div>
            <div className="md:w-7/12 w-full bg-black border border-zinc-800 p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 rounded-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-matrix/5 rounded-full blur-3xl"></div>
              <div className="border border-divider p-4 bg-gunmetal/30">
                <div className="text-xs text-gray-500 mb-2 font-mono">LEADS/RUN</div>
                <div className="font-mono text-xl font-bold tracking-tight">500+</div>
              </div>
              <div className="border border-divider p-4 bg-gunmetal/30">
                <div className="text-xs text-gray-500 mb-2 font-mono">AI EMAILS</div>
                <div className="font-mono text-xl font-bold text-matrix tracking-tight">100%</div>
              </div>
              <div className="border border-divider p-4 bg-gunmetal/30">
                <div className="text-xs text-gray-500 mb-2 font-mono">BOUNCE RATE</div>
                <div className="font-mono text-xl font-bold tracking-tight">{"<"}2%</div>
              </div>
              <div className="border border-divider p-4 bg-gunmetal/30">
                <div className="text-xs text-gray-500 mb-2 font-mono">STATUS</div>
                <div className="font-mono text-xl font-bold text-matrix tracking-tight flex items-center">
                  <span className="w-1.5 h-1.5 bg-matrix rounded-full mr-2 animate-pulse"></span>
                  LIVE
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-divider bg-obsidian py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-gray-600 gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Quinx" className="h-5 object-contain opacity-50" />
            <span>© {new Date().getFullYear()} — ALL RIGHTS RESERVED</span>
          </div>
          <div className="flex space-x-6">
            <span className="hover:text-matrix cursor-pointer transition-colors">PRICING</span>
            <span className="hover:text-matrix cursor-pointer transition-colors">DOCS</span>
            <span className="hover:text-matrix cursor-pointer transition-colors">CONTACT</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
