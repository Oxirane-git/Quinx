import { useState, useRef, useEffect } from 'react';
import { api } from '../lib/api';
import { useScraperStore } from '../lib/scraperStore';
import { Target, Download, Server, ExternalLink } from 'lucide-react';

export default function Scraper() {
 const { logs, isRunning, downloadId, downloadName, startScrape, stopScrape } = useScraperStore();

 const [niche, setNiche] = useState('');
 const [cities, setCities] = useState('');
 const [leadLimit, setLeadLimit] = useState(60);
 const [campaignName, setCampaignName] = useState('');
 const logEndRef = useRef<HTMLDivElement>(null);

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
      <h1 className="text-2xl font-bold font-mono tracking-tight uppercase">LEAD_EXTRACTION</h1>
     </div>
     <p className="text-gray-400 text-sm pl-9">Configure and deploy scraping spiders.</p>
    </header>

    <form onSubmit={handleSubmit} className="bg-gunmetal border border-divider p-6 space-y-6 bento-hover relative">
     <div className="absolute top-0 right-0 w-16 h-16 bg-matrix/5 rounded-bl-full pointer-events-none"></div>

     <div className="space-y-4 font-mono">
      <div>
       <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">CAMPAIGN NAME (OPTIONAL)</label>
       <input
        type="text"
        value={campaignName}
        onChange={e => setCampaignName(e.target.value)}
        className="w-full bg-black border border-zinc-800 rounded-none p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white"
        placeholder="e.g. NYC_Restaurants_Q1"
       />
      </div>
      <div>
       <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* TARGET_INDUSTRY</label>
       <input
        type="text"
        value={niche}
        onChange={e => setNiche(e.target.value)}
        className="w-full bg-black border border-zinc-800 rounded-none p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white"
        placeholder="e.g. Restaurants"
        required
       />
      </div>
      <div>
       <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* TARGET CITIES (CSV)</label>
       <textarea
        value={cities}
        onChange={e => setCities(e.target.value)}
        className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white resize-none h-24"
        placeholder="New York, London, Tokyo..."
        required
       />
      </div>
      <div>
       <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">LEAD LIMIT PER CITY</label>
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
       {isRunning ? 'SPIDERS_ACTIVE...' : 'DEPLOY_SPIDERS()'}
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
       PULL_OUTPUT.XLSX
      </button>
     )}
    </form>
   </div>

   <div className="flex-1 bg-obsidian border border-divider flex flex-col shadow-2xl relative overflow-hidden bento-hover group">
    <div className={`absolute top-0 left-0 w-full h-1 ${isRunning ? 'bg-matrix animate-pulse shadow-[0_0_15px_rgba(0,255,65,0.5)]' : 'bg-gray-800'}`}></div>

    <div className="p-4 border-b border-divider bg-gunmetal/80 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-gray-500">
     <div className="flex items-center gap-2">
      <Server className="w-4 h-4" />
      <span>STDOUT // Terminal</span>
     </div>
     <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-matrix animate-pulse' : 'bg-gray-600'}`}></span>
      <span>{isRunning ? 'ACTIVE' : 'IDLE'}</span>
     </div>
    </div>

    <div className="flex-1 p-5 overflow-y-auto font-mono text-xs max-w-full space-y-1.5 scrollbar-thin scrollbar-thumb-divider scrollbar-track-transparent">
     {logs.length === 0 ? (
      <span className="text-gray-600 italic">Waiting for process dispatch...</span>
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
   </div>
  </div>
 );
}
