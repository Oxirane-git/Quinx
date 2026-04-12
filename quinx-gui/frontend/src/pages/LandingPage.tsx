import React from 'react';
import { ArrowRight, Terminal, Cpu, Database, Network } from 'lucide-react';
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
          <div className="flex items-center space-x-2">
            <Terminal className="text-matrix w-5 h-5" />
            <span className="font-mono font-bold text-lg tracking-tight">QUINX_AI</span>
          </div>
          <div className="flex space-x-4">
            <button 
              onClick={() => navigate('/campaign')} 
              className="text-sm font-mono text-white hover:text-matrix transition-colors px-4 py-2 cursor-pointer"
            >
              [LOGIN]
            </button>
            <button 
              onClick={() => navigate('/campaign')} 
              className="text-sm font-mono bg-pure-white text-obsidian hover:bg-matrix transition-colors px-4 py-2 cursor-pointer"
            >
              INIT_SESSION
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-32 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center border border-matrix text-matrix font-mono text-xs px-3 py-1.5 mb-8 bg-matrix/5">
            <span className="w-2 h-2 rounded-full bg-matrix animate-pulse mr-2"></span>
            STATUS: PIPELINE_ACTIVE
          </div>
          <h1 className="font-mono font-bold text-5xl md:text-6xl tracking-tighter leading-[1.1] mb-6">
            Automated lead enrichment via Gemini 2.5 Flash
          </h1>
          <p className="text-[#a1a1aa] text-lg mb-8 max-w-lg leading-relaxed">
            Execute high-throughput cold outreach pipelines with 1.2s per-record data extraction. A pure engineering approach to B2B outbound.
          </p>
          <button 
            onClick={() => navigate('/campaign')}
            className="group flex items-center space-x-3 bg-matrix text-obsidian font-mono font-bold px-8 py-4 hover:bg-matrix-hover transition-colors rounded-none cursor-pointer"
          >
            <span>DEPLOY_PIPELINE()</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Hero Code Snippet */}
        <div className="bg-gunmetal border border-divider shadow-2xl rounded-sm p-5 font-mono text-sm relative group">
          <div className="absolute inset-0 bg-gradient-to-tr from-matrix/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="flex space-x-2 mb-4 border-b border-divider pb-3">
            <div className="w-3 h-3 rounded-full bg-divider"></div>
            <div className="w-3 h-3 rounded-full bg-divider"></div>
            <div className="w-3 h-3 rounded-full bg-divider"></div>
            <span className="text-gray-500 text-xs ml-2 tracking-wider">bash - run_pipeline.py</span>
          </div>
          <div className="text-gray-300 space-y-2">
            <p><span className="text-matrix">$</span> python3 run_pipeline.py --target="SaaS Founders"</p>
            <p className="text-gray-500">[2026-04-12 14:02:11] INITIALIZING OUTREACH ENGINE</p>
            <p><span className="text-[#60a5fa]">INFO</span>: Loading Gemini 2.5 Flash constraints...</p>
            <p><span className="text-[#60a5fa]">INFO</span>: Querying Google Maps API for source parameters...</p>
            <p className="text-matrix">SUCCESS: 4,021 raw records loaded.</p>
            <p><span className="text-[#60a5fa]">INFO</span>: Executing <span className="text-white">enrich_lead.py</span> batch #1...</p>
            <p className="text-[#fbbf24]">WAIT: Internal stagger (10-15s delay) to preserve domain reputation...</p>
            <p><span className="text-[#60a5fa]">INFO</span>: Generating tailored payloads...</p>
            <p className="text-matrix animate-pulse">_</p>
          </div>
        </div>
      </section>

      {/* Bento Box Feature Grid */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-32">
        <div className="mb-12">
          <h2 className="font-mono text-2xl font-bold border-b border-divider pb-4 inline-block text-white">/CORE_MODULES</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* The Source */}
          <div className="bg-gunmetal border border-divider p-8 bento-hover group">
            <Network className="text-gray-600 group-hover:text-matrix transition-colors w-8 h-8 mb-8" />
            <h3 className="font-mono text-xl font-bold mb-3 tracking-tight">The Source</h3>
            <p className="text-[#a1a1aa] text-sm leading-relaxed">
              Direct connection to Google Maps API data. Pulls deep local data vectors to establish an initial unpolluted dataset before enrichment bridging.
            </p>
          </div>

          {/* The Brain */}
          <div className="bg-gunmetal border border-divider p-8 bento-hover md:col-span-2 group">
            <Cpu className="text-gray-600 group-hover:text-matrix transition-colors w-8 h-8 mb-8" />
            <h3 className="font-mono text-xl font-bold mb-3 tracking-tight">The Brain</h3>
            <p className="text-[#a1a1aa] text-sm mb-6 leading-relaxed">
              Advanced execution logic utilizing <span className="text-white font-mono">enrich_lead.py</span>. We rely on Gemini 2.5 Flash to compute highly accurate "Pain Scores" based on unstructured web data. No generic filler.
            </p>
            <div className="bg-black border border-zinc-800 p-4 font-mono text-xs text-matrix/80 rounded-sm">
              <span className="text-[#c084fc]">const</span> payload = gemini.<span className="text-[#60a5fa]">extract_pain_points</span>({'{'} <br/>
              &nbsp;&nbsp;url: target_domain, <br/>
              &nbsp;&nbsp;max_tokens: 1024 <br/>
              {'}'});
            </div>
          </div>

          {/* The Engine */}
          <div className="bg-gunmetal border border-divider p-8 bento-hover md:col-span-3 lg:col-span-3 flex flex-col md:flex-row items-center gap-12 group">
            <div className="md:w-5/12 w-full">
              <Database className="text-gray-600 group-hover:text-matrix transition-colors w-8 h-8 mb-8" />
              <h3 className="font-mono text-xl font-bold mb-3 tracking-tight">The Engine</h3>
              <p className="text-[#a1a1aa] text-sm leading-relaxed">
                Asynchronous dispatch with zero compromises on deliverability. Hardware-level enforced 10-15s random delays block carrier throttling and bypass standard heuristic spam filters.
              </p>
            </div>
            <div className="md:w-7/12 w-full bg-black border border-zinc-800 p-6 grid grid-cols-2 lg:grid-cols-4 gap-4 rounded-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 w-32 h-32 bg-matrix/5 rounded-full blur-3xl"></div>
              
              <div className="border border-divider p-4 bg-gunmetal/30">
                <div className="text-xs text-gray-500 mb-2 font-mono">THROUGHPUT</div>
                <div className="font-mono text-xl font-bold tracking-tight">2.4k/hr</div>
              </div>
              <div className="border border-divider p-4 bg-gunmetal/30">
                <div className="text-xs text-gray-500 mb-2 font-mono break-words">SAFETY_DELAY</div>
                <div className="font-mono text-xl font-bold text-matrix tracking-tight">12.4s avg</div>
              </div>
              <div className="border border-divider p-4 bg-gunmetal/30">
                <div className="text-xs text-gray-500 mb-2 font-mono">BOUNCE_RATE</div>
                <div className="font-mono text-xl font-bold tracking-tight">{"<"}0.1%</div>
              </div>
              <div className="border border-divider p-4 bg-gunmetal/30 relative">
                <div className="text-xs text-gray-500 mb-2 font-mono">STATUS</div>
                <div className="font-mono text-xl font-bold text-matrix tracking-tight flex items-center">
                  <span className="w-1.5 h-1.5 bg-matrix rounded-full mr-2"></span>
                  ONLINE
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-divider bg-obsidian py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center text-xs font-mono text-gray-600 gap-4">
          <div>QUINX_AI MINIMAL OUTREACH PLATFORM © {new Date().getFullYear()}</div>
          <div className="flex space-x-6">
            <span className="hover:text-matrix cursor-pointer transition-colors">API_DOCS</span>
            <span className="hover:text-matrix cursor-pointer transition-colors">SERVICE_STATUS</span>
            <span>SYSTEM_VERSION: 1.0.3</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
