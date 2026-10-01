/* ============================================================
 *  Real-time transport — how the host and the players' phones exchange messages.
 *  Two routes behind one interface, used at the same time:
 *   · BroadcastChannel — tabs/windows of the same browser (works offline; Big Screen windows, testing)
 *   · PeerJS / WebRTC — other devices; only the handshake goes through PeerJS' public broker,
 *     the data channel itself is peer-to-peer. Needs an internet connection.
 *  Identity is the client id in every message (`from`), never the connection, so a player
 *  reachable over both routes is still one player.
 * ============================================================ */

const PEERJS_URL = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
const QRCODE_URL = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';

const _scriptPromises = {};
const loadScript = (url) => {
  if (!_scriptPromises[url]) {
    _scriptPromises[url] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => resolve();
      s.onerror = () => { delete _scriptPromises[url]; reject(new Error('Could not load ' + url)); };
      document.head.appendChild(s);
    });
  }
  return _scriptPromises[url];
};

/* Event vocabulary shared by host and players */
const RT = {
  JOIN: 'PLAYER_JOIN', LEAVE: 'PLAYER_LEFT', READY: 'PLAYER_READY', ACTION: 'PLAYER_ACTION', PING: 'PING',
  STATE: 'STATE', PONG: 'PONG', FULL: 'PARTY_FULL', END: 'PARTY_ENDED', REJOIN: 'REJOIN',
};

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const genRoomCode = () => Array.from({ length: 6 }, () => ROOM_ALPHABET[randInt(ROOM_ALPHABET.length)]).join('');
const hostPeerId = (code) => `pg-${code}-host`;
const joinUrl = (code) => `${baseUrl()}#join=${code}`;

/* ---------- host side ---------- */
function createHostTransport(code, handlers) {
  const routes = new Map(); // route id → send(msg)
  let closed = false;
  const deliver = (routeId, m) => { if (m && m.type && m.from) handlers.onMessage(m.from, m, routeId); };

  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('pg-' + code) : null;
  if (bc) {
    bc.onmessage = (e) => {
      const m = e.data;
      if (!m || m.to !== 'host') return;
      const id = 'bc:' + m.from;
      if (!routes.has(id)) routes.set(id, (msg) => bc.postMessage({ ...msg, from: 'host', to: m.from }));
      deliver(id, m);
    };
  }

  let peer = null;
  const startPeer = async () => {
    try {
      await loadScript(PEERJS_URL);
      if (closed) return;
      peer = new Peer(hostPeerId(code), { debug: 0 });
      peer.on('open', () => handlers.onStatus('online'));
      peer.on('connection', (c) => {
        const id = 'p:' + c.peer;
        routes.set(id, (msg) => { if (c.open) c.send({ ...msg, from: 'host', to: 'all' }); });
        c.on('data', (m) => deliver(id, m));
        c.on('close', () => { routes.delete(id); handlers.onRouteClosed(id); });
      });
      peer.on('disconnected', () => { handlers.onStatus('reconnecting'); if (!closed) setTimeout(() => { try { peer.reconnect(); } catch (e) {} }, 1500); });
      peer.on('error', (e) => handlers.onStatus(e && e.type === 'unavailable-id' ? 'taken' : 'offline'));
    } catch (e) {
      handlers.onStatus('offline');
    }
  };
  startPeer();

  return {
    send: (routeId, msg) => { const r = routes.get(routeId); if (r) r(msg); },
    sendTo: (routeIds, msg) => routeIds.forEach((id) => { const r = routes.get(id); if (r) r(msg); }),
    broadcast: (msg) => routes.forEach((send) => send(msg)),
    close: () => { closed = true; if (bc) bc.close(); if (peer) peer.destroy(); routes.clear(); },
  };
}

/* ---------- player side ---------- */
function createPlayerTransport(code, clientId, handlers) {
  let closed = false;
  let conn = null;
  let peer = null;
  const queue = [];
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('pg-' + code) : null;
  if (bc) bc.onmessage = (e) => { const m = e.data; if (m && m.from === 'host' && (m.to === clientId || m.to === 'all')) handlers.onMessage(m); };

  const flush = () => { while (queue.length && conn && conn.open) conn.send(queue.shift()); };
  const connectPeer = async () => {
    try {
      await loadScript(PEERJS_URL);
      if (closed) return;
      if (peer) { try { peer.destroy(); } catch (e) {} }
      peer = new Peer(undefined, { debug: 0 });
      peer.on('open', () => {
        conn = peer.connect(hostPeerId(code), { reliable: true });
        conn.on('open', () => { handlers.onStatus('online'); flush(); handlers.onReconnect(); });
        conn.on('data', (m) => handlers.onMessage(m));
        conn.on('close', () => { handlers.onStatus('reconnecting'); if (!closed) setTimeout(connectPeer, 2500); });
      });
      peer.on('error', () => { handlers.onStatus('reconnecting'); if (!closed) setTimeout(connectPeer, 4000); });
    } catch (e) {
      handlers.onStatus('offline');
    }
  };
  connectPeer();

  return {
    send: (msg) => {
      const m = { ...msg, from: clientId, to: 'host', ts: Date.now() };
      if (bc) bc.postMessage(m);
      if (conn && conn.open) conn.send(m); else queue.push(m);
    },
    close: () => { closed = true; if (bc) bc.close(); if (peer) peer.destroy(); },
  };
}
