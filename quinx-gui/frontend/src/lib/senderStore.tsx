import { createContext, useContext, useRef, useState, useCallback, ReactNode } from 'react';
import { api } from './api';

interface SenderState {
  log: string;
  running: boolean;
  jobId: string | null;
  error: string;
  startDispatch: (params: {
    campaign_id: number;
    from_lead: number;
    to_lead: number;
    account_id: number;
    min_delay: number;
    max_delay: number;
  }) => Promise<void>;
  stopDispatch: () => Promise<void>;
  clearError: () => void;
}

const SenderContext = createContext<SenderState | null>(null);

export function SenderProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState('');
  const [running, setRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDispatch = useCallback(async (params: {
    campaign_id: number;
    from_lead: number;
    to_lead: number;
    account_id: number;
    min_delay: number;
    max_delay: number;
  }) => {
    if (pollRef.current) clearInterval(pollRef.current);
    setError('');
    setRunning(true);
    setLog('[SYSTEM] Initiating dispatch sequence...');

    try {
      const { job_id } = await api.post('/api/sender/start-task', params);
      setJobId(job_id);

      pollRef.current = setInterval(async () => {
        try {
          const status = await api.get(`/api/campaigns/task/${job_id}/status`);
          if (status.log) setLog(status.log);
          if (status.status === 'SUCCESS') {
            setLog(prev => prev + '\n[SYSTEM] Dispatch complete.');
            clearInterval(pollRef.current!);
            pollRef.current = null;
            setRunning(false);
            setJobId(null);
          } else if (status.status === 'FAILURE') {
            const msg = status.result?.error || 'Dispatch task failed.';
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
          setLog(prev => prev + '\n[ERROR] Lost contact with relay.');
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setRunning(false);
          setJobId(null);
        }
      }, 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to start dispatch';
      setLog(`[ERROR] ${msg}`);
      setError(msg);
      setRunning(false);
    }
  }, []);

  const stopDispatch = useCallback(async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    if (jobId) await api.post(`/api/sender/stop-task/${jobId}`, {}).catch(() => {});
    setLog(prev => prev + '\n[SYSTEM] Transmission aborted by operator.');
    setRunning(false);
    setJobId(null);
  }, [jobId]);

  const clearError = useCallback(() => setError(''), []);

  return (
    <SenderContext.Provider value={{ log, running, jobId, error, startDispatch, stopDispatch, clearError }}>
      {children}
    </SenderContext.Provider>
  );
}

export function useSenderStore() {
  const ctx = useContext(SenderContext);
  if (!ctx) throw new Error('useSenderStore must be used within SenderProvider');
  return ctx;
}
