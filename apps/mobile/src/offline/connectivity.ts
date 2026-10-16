/**
 * Lightweight connectivity probe (zero new dependencies).
 *
 * Uses a short-timeout fetch against the API health endpoint. The app treats
 * any device-level fetch failure as offline and recovers automatically: every
 * successful server response flips the state back online, plus a periodic
 * poll re-checks while offline so sync resumes when connectivity returns.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_BASE } from '../api/apiBase';

export type ConnectivityState = 'online' | 'offline' | 'checking';

async function probeOnline(timeoutMs = 4000): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    // Any HTTP response (even 5xx) proves the network path works.
    return response.status > 0;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

export function useConnectivity(pollWhileOfflineMs = 15000) {
  const [state, setState] = useState<ConnectivityState>('checking');
  const stateRef = useRef(state);
  stateRef.current = state;

  const recheck = useCallback(async () => {
    setState('checking');
    const online = await probeOnline();
    setState(online ? 'online' : 'offline');
    return online;
  }, []);

  const markOnline = useCallback(() => setState('online'), []);
  const markOffline = useCallback(() => setState('offline'), []);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    void probeOnline().then((online) => {
      if (!cancelled) setState(online ? 'online' : 'offline');
    });
    timer = setInterval(() => {
      if (stateRef.current === 'offline' || stateRef.current === 'checking') {
        void probeOnline().then((online) => {
          if (!cancelled && online) setState('online');
          else if (!cancelled && stateRef.current === 'checking') setState('offline');
        });
      }
    }, pollWhileOfflineMs);
    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [pollWhileOfflineMs]);

  return {
    connectivity: state,
    isOnline: state === 'online',
    isOffline: state === 'offline',
    recheck,
    markOnline,
    markOffline,
  };
}

export { probeOnline };
