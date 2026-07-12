declare module 'pm2' {
  interface Process {
    name: string;
    pm_id: number;
    pid: number;
    monit: {
      cpu: number;
      memory: number;
    };
    pm2_env: {
      status: string;
      pm_uptime: number;
      restart_time: number;
      exec_mode: string;
      instances: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  interface Bus {
    on(event: string, callback: (data: unknown) => void): void;
    close(): void;
  }

  const connect: (callback: (err: Error | null) => void) => void;
  const list: (callback: (err: Error | null, list: Process[]) => void) => void;
  const launchBus: (callback: (err: Error | null, bus: Bus) => void) => void;
  const restart: (id: number, callback: (err: Error | null) => void) => void;
  const stop: (id: number, callback: (err: Error | null) => void) => void;
  const start: (id: number, callback: (err: Error | null) => void) => void;
  const reload: (id: number, callback: (err: Error | null) => void) => void;
  const deleteProc: (id: number, callback: (err: Error | null) => void) => void;
  const flush: (id: number, callback: (err: Error | null) => void) => void;
  const scale: (name: string, scale: string, callback: (err: Error | null) => void) => void;
  const disconnect: () => void;
}
