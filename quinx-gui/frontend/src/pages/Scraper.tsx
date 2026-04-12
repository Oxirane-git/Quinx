import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { useScraperStore } from '../lib/scraperStore';
import { Target, Download, Server, ExternalLink, Check } from 'lucide-react';

const STEPS = [
  { label: 'MAPS_SEARCH', desc: 'Querying Google Maps' },
  { label: 'WEB_SCRAPE',  desc: 'Scraping websites'   },
  { label: 'BUILD_CSV',   desc: 'Compiling leads'     },
  { label: 'EXPORT',      desc: 'Writing output'      },
];

function deriveStep(logs: string[]): number {
  const text = logs.join('\n');
  if (text.includes('Step 4')) return 4;
  if (text.includes('Step 3')) return 3;
  if (text.includes('Step 2')) return 2;
  if (text.includes('Step 1') || text.includes('[SEARCH]')) return 1;
  return 0;
}

export default function Scraper() {
 const { logs, isRunning, downloadId, downloadName, startScrape, stopScrape } = useScraperStore();

 const [niche, setNiche] = useState('');
 const [cities, setCities] = useState('');
 const [leadLimit, setLeadLimit] = useState(60);
 const [campaignName, setCampaignName] = useState('');
 const logEndRef = useRef<HTMLDivElement>(null);

 const activeStep = isRunning ? deriveStep(logs) : (logs.some(l => l.includes('Task complete') || l.includes('SUCCESS')) ? 5 : 0);

 useEffect(() => {
  logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
 }, [logs]);

 const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
  const cityList = cities.split(',').map(c => c.trim()).filter(Boolean);
  const name = campaignName || `${niche}_${Date.now()}`;
  await startScrape({ niche, cities: cityList, lead_limit: leadLimit, campaign_name: name });
 };

 return (
  <div className="flex gap-8 h-full animate-in fade-in duration-500 font-sans text-white">
   <div className="w-[400px] flex flex-col gap-6 flex-shrink-0">
    <header className="border-b border-divider pb-4">
     <div className="flex items-center space-x-3 mb-2">
      <Target className="w-6 h-6 text-matrix" />
      <h1 className="text-2xl font-bold font-mono tracking-tight uppercase">Find Leads</h1>
     </div>
     <p className="text-gray-400 text-sm pl-9">Enter a niche and cities to scrape verified business emails.</p>
    </header>

    <form onSubmit={handleSubmit} className="bg-gunmetal border border-divider p-6 space-y-6 bento-hover relative">
     <div className="absolute top-0 right-0 w-16 h-16 bg-matrix/5 rounded-bl-full pointer-events-none"></div>

     <div className="space-y-4 font-mono">
      <div>
       <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">Campaign Name (optional)</label>
       <input
        type="text"
        value={campaignName}
        onChange={e => setCampaignName(e.target.value)}
        className="w-full bg-black border border-zinc-800 rounded-none p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white"
        placeholder="e.g. Austin_CoffeeShops_May"
       />
      </div>
      <div>
       <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* Business Type</label>
       <input
        type="text"
        value={niche}
        onChange={e => setNiche(e.target.value)}
        className="w-full bg-black border border-zinc-800 rounded-none p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white"
        placeholder="e.g. Coffee Shops"
        required
       />
      </div>
      <div>
       <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* Cities</label>
       <textarea
        value={cities}
        onChange={e => setCities(e.target.value)}
        className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white resize-none h-24"
        placeholder="Austin, Chicago, Miami..."
        required
       />
      </div>
      <div>
       <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">Emails to find per city</label>
       <input
        type="number"
        value={leadLimit}
        onChange={e => setLeadLimit(Number(e.target.value))}
        max="500"
        className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white"
       />
      </div>
     </div>

     <div className="flex gap-3 pt-4 border-t border-divider font-mono">
      <button
       disabled={isRunning}
       type="submit"
       className="flex-1 py-3 text-sm font-bold transition-all bg-matrix text-obsidian hover:bg-matrix-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gunmetal disabled:text-gray-500 disabled:border-divider border border-transparent shadow-[0_0_10px_rgba(0,255,65,0.15)] flex justify-center items-center gap-2"
      >
       <ExternalLink className="w-4 h-4" />
       {isRunning ? 'Scraping...' : 'Start Scraping'}
      </button>
      {isRunning && (
       <button
        type="button"
        onClick={stopScrape}
        className="px-6 py-3 text-sm font-bold border border-red-500/50 text-red-500 bg-red-900/10 hover:bg-red-500 hover:text-white transition-colors"
       >
        SIGKILL
       </button>
      )}
     </div>

     {downloadId && (
      <button
       type="button"
       onClick={() => api.download(`/api/campaigns/${downloadId}/download/leads`, `${downloadName}_leads.xlsx`)}
       className="w-full mt-4 py-3 border border-matrix text-matrix bg-matrix/5 text-xs font-bold font-mono tracking-wider hover:bg-matrix hover:text-obsidian transition-all flex items-center justify-center gap-2"
      >
       <Download className="w-4 h-4" />
       Download Leads (.xlsx)
      </button>
     )}
    </form>
   </div>

   <div className="flex-1 bg-obsidian border border-divider flex flex-col shadow-2xl relative overflow-hidden bento-hover group">
    <div className={`absolute top-0 left-0 w-full h-1 ${isRunning ? 'bg-matrix animate-pulse shadow-[0_0_15px_rgba(0,255,65,0.5)]' : 'bg-gray-800'}`}></div>

    <div className="p-4 border-b border-divider bg-gunmetal/80 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-gray-500">
     <div className="flex items-center gap-2">
      <Server className="w-4 h-4" />
      <span>Live Output</span>
     </div>
     <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-matrix animate-pulse' : 'bg-gray-600'}`}></span>
      <span>{isRunning ? 'ACTIVE' : 'IDLE'}</span>
     </div>
    </div>

    <div className="flex-1 p-5 overflow-y-auto font-mono text-xs max-w-full space-y-1.5 scrollbar-thin scrollbar-thumb-divider scrollbar-track-transparent">
     {logs.length === 0 ? (
      <span className="text-gray-600 italic">Output will appear here once you start scraping...</span>
     ) : (
      logs.map((l, i) => {
       const isError = l.includes('ERROR');
       const isSuccess = l.includes('SUCCESS') || l.includes('[INFO]') || l.includes('Task complete');
       const isSystem = l.includes('SYSTEM');

       let textColor = 'text-gray-400';
       if (isError) textColor = 'text-red-500';
       else if (isSuccess) textColor = 'text-matrix/90';
       else if (isSystem) textColor = 'text-blue-400';

       return (
        <div key={i} className={`flex gap-3 leading-relaxed break-words hover:bg-gunmetal/30 px-1 -mx-1 rounded-sm ${textColor}`}>
         <span className="text-gray-600 flex-shrink-0 select-none">
          [{new Date().toISOString().split('T')[1].substring(0, 8)}]
         </span>
         <span className="break-all">{l}</span>
        </div>
       );
      })
     )}
     <div ref={logEndRef} className="h-4" />
    </div>

    {/* Pipeline progress — below terminal */}
    {(isRunning || activeStep === 5) && (
     <div className="border-t border-divider bg-gunmetal/80 px-5 py-4 space-y-3 font-mono flex-shrink-0">
      <div className="flex items-center justify-between">
       <span className="text-[10px] text-gray-500 uppercase tracking-widest">Pipeline Progress</span>
       {activeStep === 5
        ? <span className="text-[10px] text-matrix font-bold uppercase tracking-wider">COMPLETE</span>
        : <span className="text-[10px] text-matrix animate-pulse font-bold uppercase tracking-wider">RUNNING...</span>
       }
      </div>

      {/* Track bar */}
      <div className="relative h-1 bg-divider w-full overflow-hidden">
       <div
        className="absolute left-0 top-0 h-full bg-matrix transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,255,65,0.6)]"
        style={{ width: `${Math.min(100, (Math.max(0, activeStep - 1) / 4) * 100)}%` }}
       />
       {isRunning && activeStep > 0 && activeStep < 5 && (
        <div
         className="absolute top-0 h-full w-6 bg-gradient-to-r from-matrix to-transparent animate-pulse"
         style={{ left: `${Math.min(95, (Math.max(0, activeStep - 1) / 4) * 100)}%` }}
        />
       )}
      </div>

      {/* Step nodes */}
      <div className="flex justify-between">
       {STEPS.map((step, i) => {
        const stepNum = i + 1;
        const done = activeStep > stepNum || activeStep === 5;
        const active = activeStep === stepNum;
        return (
         <div key={step.label} className="flex flex-col items-center gap-1.5 flex-1">
          <div className={`w-6 h-6 flex items-center justify-center border text-[10px] font-bold transition-all duration-300
           ${done   ? 'border-matrix bg-matrix text-obsidian shadow-[0_0_8px_rgba(0,255,65,0.5)]' : ''}
           ${active ? 'border-matrix text-matrix animate-pulse shadow-[0_0_12px_rgba(0,255,65,0.4)]' : ''}
           ${!done && !active ? 'border-divider text-gray-600' : ''}
          `}>
           {done ? <Check className="w-3 h-3" /> : stepNum}
          </div>
          <span className={`text-[8px] uppercase tracking-wider text-center leading-tight transition-colors duration-300
           ${done ? 'text-matrix' : active ? 'text-matrix/80' : 'text-gray-600'}
          `}>
           {step.label}
          </span>
         </div>
        );
       })}
      </div>

      {activeStep > 0 && activeStep < 5 && (
       <p className="text-[10px] text-gray-500 text-center pt-1 border-t border-divider">
        <span className="text-matrix">▶</span> {STEPS[activeStep - 1]?.desc}
        <span className="inline-flex ml-1">
         <span className="animate-[bounce_1s_infinite_0ms]">.</span>
         <span className="animate-[bounce_1s_infinite_150ms]">.</span>
         <span className="animate-[bounce_1s_infinite_300ms]">.</span>
        </span>
       </p>
      )}
     </div>
    )}
   </div>
  </div>
 );
}
