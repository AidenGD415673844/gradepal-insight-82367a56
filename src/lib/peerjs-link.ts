// Lightweight PeerJS wrapper — uses free public PeerJS cloud server. All grade
// data still lives in localStorage; PeerJS only handles handshake + message
// transport. Errors are routed through notifyPeerError → sliding toast.

import Peer, { type DataConnection } from "peerjs";
import { notifyPeerError } from "./peerjs-toast";

export type PJMessage = { kind: string; ts: number; [k: string]: unknown };

export class PeerJSLink {
  peer: Peer | null = null;
  myId: string | null = null;
  conns = new Map<string, DataConnection>();
  private listeners = new Set<(from: string, msg: PJMessage) => void>();
  private readyListeners = new Set<(id: string) => void>();

  init(id?: string) {
    try {
      this.peer = id ? new Peer(id) : new Peer();
      this.peer.on("open", (assigned) => {
        this.myId = assigned;
        this.readyListeners.forEach((l) => l(assigned));
      });
      this.peer.on("connection", (conn) => this.wire(conn));
      this.peer.on("error", (err: any) => {
        notifyPeerError(err?.type);
      });
      this.peer.on("disconnected", () => notifyPeerError("disconnected"));
    } catch (e) {
      notifyPeerError("unknown", e);
    }
  }

  private wire(conn: DataConnection) {
    this.conns.set(conn.peer, conn);
    conn.on("data", (data) => {
      try {
        const msg = typeof data === "string" ? JSON.parse(data) : (data as PJMessage);
        this.listeners.forEach((l) => l(conn.peer, msg));
      } catch {
        /* ignore malformed */
      }
    });
    conn.on("error", (err: any) => notifyPeerError(err?.type));
    conn.on("close", () => this.conns.delete(conn.peer));
  }

  connectTo(peerId: string) {
    if (!this.peer) return;
    try {
      const c = this.peer.connect(peerId, { reliable: true });
      c.on("open", () => this.wire(c));
    } catch (e) {
      notifyPeerError("peer-not-found", e);
    }
  }

  send(peerId: string, msg: PJMessage): boolean {
    const c = this.conns.get(peerId);
    if (!c || !c.open) return false;
    try {
      c.send(JSON.stringify(msg));
      return true;
    } catch {
      return false;
    }
  }

  onMessage(cb: (from: string, msg: PJMessage) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
  onReady(cb: (id: string) => void) {
    this.readyListeners.add(cb);
    if (this.myId) cb(this.myId);
    return () => this.readyListeners.delete(cb);
  }

  destroy() {
    try { this.peer?.destroy(); } catch { /* noop */ }
    this.peer = null;
    this.conns.clear();
  }
}