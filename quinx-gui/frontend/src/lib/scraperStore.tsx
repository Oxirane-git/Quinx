import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import { api } from './api';

interface ScraperState {
  logs: string[];
  isRunning: boolean;
  currentJobId: string | null;
  downloadId: number | null;
  downloadName: string;
  startScrape: (params: {
    niche: string;
    cities: string[];
    lead_limit: number;
    campaign_name: string;
  }) => Promise<void>;
  stopScrape: () => Promise<void>;
  clearDownload: () => void;
}

const ScraperContext = createContext<ScraperState | null>(null);

export function ScraperProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const [downloadName, setDownloadName] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const appendLog = (line: string) => setLogs(prev => [...prev, line]);

  const startScrape = useCallback(async (params: {
    niche: string;
    cities: string[];
    lead_limit: number;
    campaign_name: string;
  }) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setIsRunning(true);
    setDownloadId(null);
    setLogs(['[SYSTEM] Dispatching scraper task...']);

    try {
      const { job_id, campaign_id } = await api.post('/api/scraper/start-task', params);

      setCurrentJobId(job_id);
      setLogs(prev => [...prev, `[INFO] Task queued — Job ID: ${job_id}`]);

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get(`/api/campaigns/task/${job_id}/status`);

          if (status.log) {
            const lines = status.log.split('\n').filter(Boolean);
            setLogs(prev => {
              const base = prev.filter((l: string) => !l.startsWith('[PIPELINE]'));
              return [...base, ...lines.map((l: string) => `[PIPELINE] ${l}`)];
            });
          }

          if (status.status === 'SUCCESS') {
            setLogs(prev => [...prev, `[SYSTEM] Task complete. ${JSON.stringify(status.result)}`]);
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setIsRunning(false);
            setCurrentJobId(null);
            setDownloadId(campaign_id);
            setDownloadName(params.campaign_name);
          } else if (status.status === 'FAILURE') {
            setLogs(prev => [...prev, '[ERROR] Task failed.']);
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setIsRunning(false);
            setCurrentJobId(null);
          } else if (status.status === 'CANCELLED') {
            setLogs(prev => [...prev, '[SYSTEM] Task cancelled.']);
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setIsRunning(false);
            setCurrentJobId(null);
          }
        } catch {
          setLogs(prev => [...prev, '[ERROR] Failed to poll task status.']);
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setIsRunning(false);
        }
      }, 2000);
    } catch (err: unknown) {
      setLogs(prev => [...prev, `[ERROR] ${err instanceof Error ? err.message : 'Failed to start task'}`]);
      setIsRunning(false);
    }
  }, []);

  const stopScrape = useCallback(async () => {
    if (!currentJobId) return;
    try {
      await api.post(`/api/scraper/stop-task/${currentJobId}`, {});
      setLogs(prev => [...prev, '[SYSTEM] Stop signal sent...']);
    } catch {
      setLogs(prev => [...prev, '[ERROR] Failed to send stop signal.']);
    }
  }, [currentJobId]);

  const clearDownload = useCallback(() => setDownloadId(null), []);

  return (
    <ScraperContext.Provider value={{ logs, isRunning, currentJobId, downloadId, downloadName, startScrape, stopScrape, clearDownload }}>
      {children}
    </ScraperContext.Provider>
  );
}

export function useScraperStore() {
  const ctx = useContext(ScraperContext);
  if (!ctx) throw new Error('useScraperStore must be used within ScraperProvider');
  return ctx;
}
