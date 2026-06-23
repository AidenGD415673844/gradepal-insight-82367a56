// Manual-SDP WebRTC DataChannel manager — no signaling server.
// Each peer pastes the other's offer / answer string to complete the handshake.
// Also tracks connection health (round-trip ping latency, sent/received counters).

export type RTCHealth = {
  state: "idle" | "offering" | "answering" | "connected" | "closed" | "failed";
  latencyMs: number | null;
  sentCount: number;
  recvCount: number;
  history: number[]; // rolling latency samples
  lastSyncTs: number | null;
};

export type RTCEnvelope =
  | { kind: "chat"; text: string; from: string; ts: number }
  | { kind: "ping"; ts: number }
  | { kind: "pong"; ts: number }
  | { kind: "notes_payload"; folderName: string; from: string; ts: number; data: string };

type Listener = (env: RTCEnvelope) => void;

export class RTCPeerLink {
  pc: RTCPeerConnection;
  channel: RTCDataChannel | null = null;
  health: RTCHealth = {
    state: "idle",
    latencyMs: null,
    sentCount: 0,
    recvCount: 0,
    history: [],
    lastSyncTs: null,
  };
  private listeners = new Set<Listener>();
  private healthListeners = new Set<() => void>();
  private pingTimer: number | null = null;

  constructor() {
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
    });
    this.pc.onconnectionstatechange = () => {
      const s = this.pc.connectionState;
      if (s === "connected") {
        this.health.state = "connected";
        this.startPing();
      } else if (s === "failed" || s === "disconnected") {
        this.health.state = "failed";
      } else if (s === "closed") {
        this.health.state = "closed";
      }
      this.notifyHealth();
    };
  }

  onMessage(l: Listener) { this.listeners.add(l); return () => this.listeners.delete(l); }
  onHealth(l: () => void) { this.healthListeners.add(l); return () => this.healthListeners.delete(l); }
  private notifyHealth() { this.healthListeners.forEach((l) => l()); }

  private wireChannel(ch: RTCDataChannel) {
    this.channel = ch;
    ch.onopen = () => { this.health.state = "connected"; this.notifyHealth(); };
    ch.onclose = () => { this.health.state = "closed"; this.notifyHealth(); };
    ch.onmessage = (e) => {
      try {
        const env = JSON.parse(e.data) as RTCEnvelope;
        this.health.recvCount += 1;
        this.health.lastSyncTs = Date.now();
        if (env.kind === "ping") {
          this.send({ kind: "pong", ts: env.ts });
        } else if (env.kind === "pong") {
          const lat = Date.now() - env.ts;
          this.health.latencyMs = lat;
          this.health.history = [...this.health.history.slice(-29), lat];
        } else {
          this.listeners.forEach((l) => l(env));
        }
        this.notifyHealth();
      } catch { /* ignore malformed */ }
    };
  }

  async createOffer(): Promise<string> {
    this.health.state = "offering";
    const ch = this.pc.createDataChannel("gc-data", { ordered: true });
    this.wireChannel(ch);
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    await this.waitIce();
    return this.encode(this.pc.localDescription!);
  }

  async acceptOfferCreateAnswer(offerToken: string): Promise<string> {
    this.health.state = "answering";
    this.pc.ondatachannel = (e) => this.wireChannel(e.channel);
    const offer = this.decode(offerToken);
    await this.pc.setRemoteDescription(offer);
    const ans = await this.pc.createAnswer();
    await this.pc.setLocalDescription(ans);
    await this.waitIce();
    return this.encode(this.pc.localDescription!);
  }

  async acceptAnswer(answerToken: string): Promise<void> {
    const ans = this.decode(answerToken);
    await this.pc.setRemoteDescription(ans);
  }

  send(env: RTCEnvelope): boolean {
    if (!this.channel || this.channel.readyState !== "open") return false;
    this.channel.send(JSON.stringify(env));
    if (env.kind !== "ping" && env.kind !== "pong") this.health.sentCount += 1;
    return true;
  }

  close() {
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    try { this.channel?.close(); } catch {}
    try { this.pc.close(); } catch {}
  }

  private startPing() {
    if (this.pingTimer) window.clearInterval(this.pingTimer);
    this.pingTimer = window.setInterval(() => {
      this.send({ kind: "ping", ts: Date.now() });
    }, 4000);
  }

  private waitIce(): Promise<void> {
    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === "complete") return resolve();
      const check = () => {
        if (this.pc.iceGatheringState === "complete") {
          this.pc.removeEventListener("icegatheringstatechange", check);
          resolve();
        }
      };
      this.pc.addEventListener("icegatheringstatechange", check);
      // Hard timeout fallback (3s) in case ICE never completes (offline use)
      setTimeout(resolve, 3000);
    });
  }

  private encode(d: RTCSessionDescription): string {
    return btoa(unescape(encodeURIComponent(JSON.stringify(d))));
  }
  private decode(s: string): RTCSessionDescriptionInit {
    return JSON.parse(decodeURIComponent(escape(atob(s.trim()))));
  }
}