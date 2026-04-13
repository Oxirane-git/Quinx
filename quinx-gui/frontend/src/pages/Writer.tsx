import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useWriterStore } from '../lib/writerStore';
import { Pencil, Send, Download, FileText, Check } from 'lucide-react';

interface Campaign { id: number; name: string; niche: string; }
interface Lead { id: number; business_name: string; email: string; city: string; status: string; }

const STEPS = [
  { label: 'INIT',     desc: 'Loading leads'         },
  { label: 'GENERATE', desc: 'Writing emails with AI' },
  { label: 'SAVE',     desc: 'Saving to database'     },
];

function deriveStep(log: string): number {
  if (log.includes('Generation complete') || log.includes('Stopped by operator')) return 4;
  if (log.includes('Saving') || log.includes('Writing to')) return 3;
  if (log.includes('Processing') || log.includes('Writing email') || log.includes('batch') || log.includes('lead')) return 2;
  if (log.includes('Starting') || log.includes('WRITER')) return 1;
  return 0;
}

export default function Writer() {
  const { log, running, error, downloadId, startWriting, stopWriting, clearError } = useWriterStore();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<number | ''>('');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [fromLead, setFromLead] = useState(0);
  const [toLead, setToLead] = useState(100);
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(1024);
  const [campaignConfig, setCampaignConfig] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);

  const activeStep = running ? deriveStep(log) : (log.includes('Generation complete') ? 4 : 0);

  useEffect(() => {
    api.get('/api/campaigns/').then(setCampaigns).catch(() => {});
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // Refresh leads table when download becomes available
  useEffect(() => {
    if (downloadId) {
      api.get(`/api/campaigns/${downloadId}/leads`).then(d => setLeads(d.leads || [])).catch(() => {});
    }
  }, [downloadId]);

  const handleCampaignChange = async (id: number | '') => {
    setSelectedCampaign(id);
    setLeads([]);
    clearError();
    if (!id) return;
    try {
      const data = await api.get(`/api/campaigns/${id}/leads`);
      setLeads(data.leads || []);
      setToLead(data.leads?.length || 100);
    } catch { /* ignore */ }
  };

  const estimatedCost = ((toLead - fromLead) * 0.01).toFixed(2);

  const handleStart = async () => {
    if (!selectedCampaign) return;
    await startWriting({
      campaign_id: selectedCampaign as number,
      from_lead: fromLead,
      to_lead: toLead,
      temperature,
      max_tokens: maxTokens,
      skip_missing: true,
      campaign_config: campaignConfig,
    });
  };

  return (
    <div className="flex gap-8 h-full animate-in fade-in duration-500 font-sans text-white">
      <div className="w-[400px] flex flex-col gap-6 flex-shrink-0">
        <header className="border-b border-divider pb-4">
          <div className="flex items-center space-x-3 mb-2">
            <Pencil className="w-6 h-6 text-matrix" />
            <h1 className="text-2xl font-bold font-mono tracking-tight uppercase">Write Emails</h1>
          </div>
          <p className="text-gray-400 text-sm pl-9">AI writes a personalised email for each lead using your campaign details.</p>
        </header>

        <div className="bg-gunmetal border border-divider p-6 space-y-6 bento-hover relative rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-matrix/5 rounded-bl-full pointer-events-none"></div>
          <div className="space-y-4 font-mono">
            <div>
              <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* Select Campaign</label>
              <select
                value={selectedCampaign}
                onChange={e => handleCampaignChange(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-black border border-zinc-800 p-3 text-sm text-white outline-none focus:border-matrix focus:ring-1 focus:ring-matrix rounded-lg appearance-none"
              >
                <option value="">-- Select a campaign --</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.niche})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">Config Override (optional)</label>
              <input
                type="text"
                value={campaignConfig}
                onChange={e => setCampaignConfig(e.target.value)}
                placeholder="e.g. default_offer"
                className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-lg"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">From (lead #)</label>
                <input type="number" value={fromLead} onChange={e => setFromLead(Number(e.target.value))} className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-lg" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 block mb-2 tracking-wider">To (lead #)</label>
                <input type="number" value={toLead} onChange={e => setToLead(Number(e.target.value))} className="w-full bg-black border border-zinc-800 p-3 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-lg" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 mb-2 flex justify-between uppercase">
                <span>Temperature</span>
                <span className="text-matrix bg-black border border-zinc-800 px-2">{temperature.toFixed(1)}</span>
              </label>
              <input type="range" min="0.3" max="1" step="0.1" value={temperature} onChange={e => setTemperature(Number(e.target.value))} className="w-full accent-matrix" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-3 tracking-wider">Email Length</label>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-matrix transition-colors">
                  <input type="radio" name="tk" checked={maxTokens === 1024} onChange={() => setMaxTokens(1024)} className="accent-matrix" /> 1024
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-matrix transition-colors">
                  <input type="radio" name="tk" checked={maxTokens === 2048} onChange={() => setMaxTokens(2048)} className="accent-matrix" /> 2048
                </label>
              </div>
            </div>
            <div className="text-xs bg-obsidian p-4 border border-divider mt-6 flex justify-between items-center text-white shadow-inner">
              <span className="tracking-wider uppercase text-gray-500">Estimated AI Cost:</span>
              <span className="text-xl font-bold text-matrix tracking-normal">${estimatedCost}</span>
            </div>
            {error && <p className="text-red-500 text-xs border border-red-500/30 bg-red-900/10 px-4 py-3 tracking-wide rounded-lg mt-2">ERR: {error}</p>}
          </div>

          <div className="flex gap-3 pt-4 border-t border-divider font-mono">
            <button
              disabled={running || !selectedCampaign}
              onClick={handleStart}
              className="flex-1 py-3 text-sm font-bold transition-all bg-matrix text-obsidian hover:bg-matrix-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gunmetal disabled:text-gray-500 disabled:border-divider border border-transparent shadow-[0_0_10px_rgba(0,255,65,0.15)] flex justify-center items-center gap-2 rounded-lg"
            >
              <Send className="w-4 h-4" />
              {running ? 'Writing...' : 'Start Writing'}
            </button>
            {running && (
              <button
                onClick={stopWriting}
                className="px-6 py-3 text-sm font-bold border border-red-500/50 text-red-500 bg-red-900/10 hover:bg-red-500 hover:text-white transition-colors rounded-lg"
              >
                SIGKILL
              </button>
            )}
          </div>

          {downloadId && (
            <button
              type="button"
              onClick={() => api.download(`/api/campaigns/${downloadId}/download/emails`, `campaign_${downloadId}_emails.xlsx`)}
              className="w-full mt-4 py-3 border border-matrix text-matrix bg-matrix/5 text-xs font-bold font-mono tracking-wider hover:bg-matrix hover:text-obsidian transition-all flex items-center justify-center gap-2 rounded-lg"
            >
              <Download className="w-4 h-4" />
              Download Emails (.xlsx)
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 h-[calc(100vh-6rem)]">
        {/* Leads table */}
        <div className="bg-gunmetal border border-divider flex-1 overflow-auto bento-hover shadow-lg rounded-lg">
          <div className="p-4 border-b border-divider bg-obsidian flex items-center justify-between font-mono text-xs uppercase tracking-widest text-gray-500 relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-matrix/10 to-transparent"></div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-matrix/50" />
              <span>Leads</span>
            </div>
            <span className={`w-2 h-2 rounded-full ${running ? 'bg-matrix animate-pulse' : 'bg-gray-600'}`}></span>
          </div>
          <table className="w-full text-left text-sm whitespace-nowrap text-white font-mono">
            <thead className="uppercase text-[10px] text-gray-500 border-b border-divider sticky top-0 bg-gunmetal">
              <tr>
                <th className="p-4 font-bold tracking-wider">#</th>
                <th className="p-4 font-bold tracking-wider">Business</th>
                <th className="p-4 font-bold tracking-wider">Email</th>
                <th className="p-4 font-bold tracking-wider">City</th>
                <th className="p-4 font-bold tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-divider/50 text-xs">
              {leads.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-gray-600 italic">Select a campaign to see leads.</td></tr>
              ) : leads.map((lead, i) => (
                <tr key={lead.id} className="hover:bg-obsidian transition-colors">
                  <td className="p-4 text-gray-500">{i + 1}</td>
                  <td className="p-4">{lead.business_name}</td>
                  <td className="p-4 text-gray-400">{lead.email}</td>
                  <td className="p-4 text-gray-500">{lead.city}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded ${lead.status === 'written' ? 'text-matrix bg-matrix/10 border border-matrix/20' : 'text-gray-500 bg-black border border-zinc-800'}`}>
                      {lead.status?.toUpperCase() || 'PENDING_EVAL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Log panel */}
        <div className="bg-black border border-zinc-800 flex flex-col shadow-lg relative bento-hover flex-shrink-0 rounded-lg overflow-hidden" style={{ height: (running || activeStep === 4) ? '11rem' : '12rem' }}>
          <div className="p-2 border-b border-divider bg-gunmetal font-mono text-[10px] uppercase text-gray-500 tracking-widest pl-4 flex items-center justify-between flex-shrink-0">
            <span>Live Output</span>
            {running && <span className="text-matrix animate-pulse text-[10px]">RUNNING...</span>}
          </div>
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-white space-y-1.5 scrollbar-thin scrollbar-thumb-divider scrollbar-track-transparent">
            {!log ? (
              <span className="text-gray-600 italic">No output yet.</span>
            ) : log.split('\n').map((l, i) => (
              <div key={i} className={l.includes('ERROR') ? 'text-red-500' : l.includes('complete') || l.includes('Success') ? 'text-matrix/90' : 'text-gray-400 font-sans tracking-wide leading-relaxed'}>
                {l}
              </div>
            ))}
            <div ref={logEndRef} className="h-4" />
          </div>
        </div>

        {/* Progress bar — below log */}
        {(running || activeStep === 4) && (
          <div className="bg-gunmetal/80 border border-divider px-5 py-4 space-y-3 font-mono flex-shrink-0 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Generation Progress</span>
              {activeStep === 4
                ? <span className="text-[10px] text-matrix font-bold uppercase tracking-wider">COMPLETE</span>
                : <span className="text-[10px] text-matrix animate-pulse font-bold uppercase tracking-wider">RUNNING...</span>
              }
            </div>

            <div className="relative h-1 bg-divider w-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-matrix transition-all duration-700 ease-out shadow-[0_0_8px_rgba(0,255,65,0.6)]"
                style={{ width: `${Math.min(100, (Math.max(0, activeStep - 1) / 3) * 100)}%` }}
              />
              {running && activeStep > 0 && activeStep < 4 && (
                <div
                  className="absolute top-0 h-full w-6 bg-gradient-to-r from-matrix to-transparent animate-pulse"
                  style={{ left: `${Math.min(95, (Math.max(0, activeStep - 1) / 3) * 100)}%` }}
                />
              )}
            </div>

            <div className="flex justify-between">
              {STEPS.map((step, i) => {
                const stepNum = i + 1;
                const done = activeStep > stepNum || activeStep === 4;
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

            {activeStep > 0 && activeStep < 4 && (
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
