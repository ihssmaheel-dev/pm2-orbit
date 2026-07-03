import type { Tick } from '@/types/api';

type Listener = (tick: Tick) => void;
type StatusListener = (status: 'connecting' | 'connected' | 'disconnected') => void;

const MAX_RECONNECT_DELAY = 10000;
const INITIAL_RECONNECT_DELAY = 1000;

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners = new Set<Listener>();
  private statusListeners = new Set<StatusListener>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private pendingTicks: Tick[] = [];
  private rafId: number | null = null;
  private token: string | null = null;

  constructor(url: string, token?: string) {
    this.url = url;
    this.token = token || null;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionalClose = false;
    this.emitStatus('connecting');

    try {
      const wsUrl = this.token
        ? `${this.url}?token=${encodeURIComponent(this.token)}`
        : this.url;
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emitStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const tick: Tick = JSON.parse(event.data);
        this.pendingTicks.push(tick);
        this.scheduleFlush();
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      if (!this.intentionalClose) {
        this.emitStatus('disconnected');
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.pendingTicks = [];
    this.ws?.close();
    this.ws = null;
    this.emitStatus('disconnected');
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn: StatusListener): () => void {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  private flush() {
    this.rafId = null;
    const ticks = this.pendingTicks;
    this.pendingTicks = [];

    for (const tick of ticks) {
      for (const listener of this.listeners) {
        listener(tick);
      }
    }
  }

  private scheduleFlush() {
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => this.flush());
    }
  }

  private emitStatus(status: 'connecting' | 'connected' | 'disconnected') {
    for (const fn of this.statusListeners) {
      fn(status);
    }
  }

  private scheduleReconnect() {
    if (this.intentionalClose) return;

    const delay = Math.min(
      INITIAL_RECONNECT_DELAY * Math.pow(2, this.reconnectAttempts),
      MAX_RECONNECT_DELAY,
    );
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}
