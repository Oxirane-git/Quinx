import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import { api } from './api';

interface WriterState {
  log: string;
  running: boolean;
  jobId: string | null;
  error: string;
  downloadId: number | null;
  startWriting: (params: {
    campaign_id: number;
    from_lead: number;
    to_lead: number;
    temperature: number;
    max_tokens: number;
    skip_missing: boolean;
    campaign_config: string;
  }) => Promise<void>;
  stopWriting: () => Promise<void>;
  clearDownload: () => void;
  clearError: () => void;
}

const WriterContext = createContext<WriterState | null>(null);

export function WriterProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState('');
  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [downloadId, setDownloadId] = useState<number | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startWriting = useCallback(async (params: {
    campaign_id: number;
    from_lead: number;
    to_lead: number;
    temperature: number;
    max_tokens: number;
    skip_missing: boolean;
    campaign_config: string;
  }) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setError('');
    setRunning(true);
    setLog('[WRITER] Starting email generation...');
    setDownloadId(null);

    try {
      const { job_id } = await api.post('/api/writer/start-task', params);
      setJobId(job_id);

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get(`/api/campaigns/task/${job_id}/status`);
          if (status.log) setLog(status.log);
          if (status.status === 'SUCCESS') {
            setLog(prev => prev + '\n[WRITER] Generation complete.');
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setRunning(false);
            setJobId(null);
            setDownloadId(params.campaign_id);
          } else if (status.status === 'FAILURE') {
            const msg = status.result?.error || 'Writer task failed.';
            setLog(prev => prev + `\n[ERROR] ${msg}`);
            setError(msg);
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setRunning(false);
            setJobId(null);
          } else if (status.status === 'CANCELLED') {
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setRunning(false);
            setJobId(null);
          }
        } catch {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setRunning(false);
          setJobId(null);
        }
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start writer';
      setError(msg);
      setRunning(false);
    }
  }, []);

  const stopWriting = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    if (jobId) await api.post(`/api/writer/stop-task/${jobId}`, {}).catch(() => {});
    setLog(prev => prev + '\n[WRITER] Stopped by operator.');
    setRunning(false);
    setJobId(null);
  }, [jobId]);

  const clearDownload = useCallback(() => setDownloadId(null), []);
  const clearError = useCallback(() => setError(''), []);

  return (
    <WriterContext.Provider value={{ log, running, jobId, error, downloadId, startWriting, stopWriting, clearDownload, clearError }}>
      {children}
    </WriterContext.Provider>
  );
}

export function useWriterStore() {
  const ctx = useContext(WriterContext);
  if (!ctx) throw new Error('useWriterStore must be used within WriterProvider');
  return ctx;
}
