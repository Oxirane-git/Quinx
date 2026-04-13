import { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useSenderStore } from '../lib/senderStore';
import { Send, Server, Activity, Check } from 'lucide-react';

interface Campaign { id: number; name: string; niche: string; }
interface EmailAccount { id: number; provider: string; email: string; host: string; port: string; }

const STEPS = [
  { label: 'CONNECT', desc: 'Connecting SMTP relay'  },
  { label: 'DISPATCH', desc: 'Sending emails'         },
  { label: 'DONE',    desc: 'Finalising records'      },
];

function deriveStep(log: string): number {
  if (log.includes('Dispatch complete') || log.includes('aborted')) return 4;
  if (log.includes('Sent') || log.includes('sent') || log.includes('Sending')) return 2;
  if (log.includes('Initiating') || log.includes('SYSTEM')) return 1;
  return 0;
}

export default function Sender() {
  const { log, running, error, startDispatch, stopDispatch, clearError } = useSenderStore();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [campaignId, setCampaignId] = useState<number | ''>('');
  const [accountId, setAccountId] = useState<number | ''>('');
  const [minDelay, setMinDelay] = useState(15);
  const [maxDelay, setMaxDelay] = useState(45);
  const [fromLead, setFromLead] = useState(0);
  const [toLead, setToLead] = useState(100);
  const logEndRef = useRef<HTMLDivElement>(null);

  const activeStep = running ? deriveStep(log) : (log.includes('Dispatch complete') ? 4 : 0);

  useEffect(() => {
    api.get('/api/campaigns/').then(setCampaigns).catch(() => {});
    api.get('/api/users/settings/email-accounts').then(setAccounts).catch(() => {});
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  const accountLabel = (acc: EmailAccount) => `${acc.email || '—'} (${acc.provider})`;

  const handleDispatch = async () => {
    if (!campaignId || !accountId) return;
    clearError();
    await startDispatch({
      campaign_id: campaignId as number,
      from_lead: fromLead,
      to_lead: toLead,
      account_id: accountId as number,
      min_delay: minDelay,
      max_delay: maxDelay,
    });
  };

  return (
    <div className="flex gap-8 h-full animate-in fade-in duration-500 font-sans text-white">
      <div className="w-[400px] flex flex-col gap-6 flex-shrink-0">
        <header className="border-b border-divider pb-4">
          <div className="flex items-center space-x-3 mb-2">
            <Send className="w-6 h-6 text-matrix" />
            <h1 className="text-2xl font-bold font-mono tracking-tight uppercase">Send Emails</h1>
          </div>
          <p className="text-gray-400 text-sm pl-9">Choose a campaign and email account, then send.</p>
        </header>

        <div className="bg-gunmetal border border-divider p-6 space-y-6 bento-hover relative rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 bg-matrix/5 rounded-bl-full pointer-events-none"></div>

          <div className="space-y-5 font-mono">
            <div>
              <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* Campaign</label>
              <select
                value={campaignId}
                onChange={e => setCampaignId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-black border border-zinc-800 p-3 text-sm text-white outline-none focus:border-matrix focus:ring-1 focus:ring-matrix rounded-lg appearance-none"
              >
                <option value="">-- Select a campaign --</option>
                {campaigns.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-matrix block mb-2 tracking-wider">* Email Account</label>
              <select
                value={accountId}
                onChange={e => setAccountId(e.target.value ? Number(e.target.value) : '')}
                className="w-full bg-black border border-zinc-800 p-3 text-sm text-white outline-none focus:border-matrix focus:ring-1 focus:ring-matrix rounded-lg appearance-none"
              >
                <option value="">-- Select an email account --</option>
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{accountLabel(a)}</option>
                ))}
              </select>
              {accounts.length === 0 && (
                <p className="text-yellow-500/70 text-xs mt-2 italic flex gap-2"><Activity className="w-4 h-4" /> No outbound relays detected. Config in Settings.</p>
              )}
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
            <div className="flex gap-4 bg-black border border-zinc-800 p-4 shadow-inner rounded-lg">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-matrix block mb-2 tracking-wider uppercase">Min Delay (s)</label>
                <input type="number" value={minDelay} onChange={e => setMinDelay(Number(e.target.value))} className="w-full bg-gunmetal border border-divider p-2 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-lg" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-matrix block mb-2 tracking-wider uppercase">Max Delay (s)</label>
                <input type="number" value={maxDelay} onChange={e => setMaxDelay(Number(e.target.value))} className="w-full bg-gunmetal border border-divider p-2 text-sm focus:border-matrix focus:ring-1 focus:ring-matrix outline-none text-white rounded-lg" />
              </div>
            </div>
            {error && <p className="text-red-500 text-xs border border-red-500/30 bg-red-900/10 px-4 py-3 tracking-wide rounded-lg mt-2">ERR: {error}</p>}
          </div>

          <div className="flex gap-3 pt-4 border-t border-divider font-mono">
            <button
              disabled={running || !campaignId || !accountId}
              onClick={handleDispatch}
              className="flex-1 py-3 text-sm font-bold transition-all bg-matrix text-obsidian hover:bg-matrix-hover disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gunmetal disabled:text-gray-500 disabled:border-divider border border-transparent shadow-[0_0_10px_rgba(0,255,65,0.15)] flex justify-center items-center gap-2 rounded-lg"
            >
              <Send className="w-4 h-4" />
              {running ? 'Sending...' : 'Send Emails'}
            </button>
            {running && (
              <button
                onClick={stopDispatch}
                className="px-6 py-3 text-sm font-bold border border-red-500/50 text-red-500 bg-red-900/10 hover:bg-red-500 hover:text-white transition-colors rounded-lg"
              >
                SIGKILL
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right panel — log + progress */}
      <div className="flex-1 flex flex-col gap-0 shadow-2xl">
        {/* Terminal */}
        <div className="flex-1 bg-black border border-zinc-800 flex flex-col relative overflow-hidden bento-hover rounded-t-lg">
          <div className={`absolute top-0 left-0 w-full h-1 ${running ? 'bg-matrix animate-pulse shadow-[0_0_15px_rgba(0,255,65,0.5)]' : 'bg-gray-800'}`}></div>

          <div className="p-4 border-b border-divider bg-gunmetal/80 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-gray-500">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4" />
              <span>Live Output</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${running ? 'bg-matrix animate-pulse' : 'bg-gray-600'}`}></span>
              <span>{running ? 'Sending' : 'Idle'}</span>
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto font-mono text-xs max-w-full space-y-1.5 scrollbar-thin scrollbar-thumb-divider scrollbar-track-transparent">
            {!log ? (
              <span className="text-gray-600 italic">No active dispatch routines...</span>
            ) : log.split('\n').map((l, i) => {
              const isError = l.includes('ERROR');
              const isSuccess = l.includes('complete') || l.includes('SUCCESS');
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
            })}
            <div ref={logEndRef} className="h-4" />
          </div>
        </div>

        {/* Progress bar — below terminal */}
        {(running || activeStep === 4) && (
          <div className="border border-t-0 border-zinc-800 bg-gunmetal/80 px-5 py-4 space-y-3 font-mono flex-shrink-0 rounded-b-lg">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Dispatch Progress</span>
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
