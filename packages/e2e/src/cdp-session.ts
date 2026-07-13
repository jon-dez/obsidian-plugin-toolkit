import { createConnection } from 'node:net';

// ---------------------------------------------------------------------------
// Port utility
// ---------------------------------------------------------------------------

/**
 * Wait until a TCP port is accepting connections, polling every 400 ms.
 * Throws if the port is not reachable within `timeoutMs`.
 */
export async function waitForPort(port: number, host: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = createConnection({ port, host }, () => { socket.end(); resolve(); });
        socket.on('error', reject);
      });
      return;
    } catch {
      await new Promise(r => setTimeout(r, 400));
    }
  }
  throw new Error(`CDP port ${host}:${port} not available after ${timeoutMs}ms`);
}

// ---------------------------------------------------------------------------
// CDP target discovery
// ---------------------------------------------------------------------------

/** A debuggable target returned by the CDP `/json/list` endpoint. */
export type JsonTarget = {
  id: string;
  title: string;
  url: string;
  type: string;
  webSocketDebuggerUrl?: string;
};

/**
 * Fetch the list of debuggable targets from a running Obsidian CDP endpoint.
 *
 * @param browserUrl - Base URL of the CDP endpoint, e.g. `http://127.0.0.1:9333`.
 */
export async function listCdpTargets(browserUrl: string): Promise<JsonTarget[]> {
  const res = await fetch(`${browserUrl}/json/list`);
  if (!res.ok) throw new Error(`CDP /json/list failed: ${res.status}`);
  return res.json() as Promise<JsonTarget[]>;
}

/**
 * Pick the most relevant target from a CDP target list.
 *
 * Priority order:
 * 1. Target whose `id` or `title` matches `hint` (if provided).
 * 2. First target whose title contains "obsidian" (case-insensitive).
 * 3. First non-devtools page target.
 * 4. The first target in the list.
 *
 * @param targets - List of targets from {@link listCdpTargets}.
 * @param hint    - Optional target id or title substring to prefer.
 */
export function pickCdpTarget(targets: JsonTarget[], hint?: string): JsonTarget {
  if (targets.length === 0) throw new Error('No CDP targets available.');
  if (hint) {
    const lower = hint.toLowerCase();
    const match = targets.find(t => t.id === hint || t.title.toLowerCase().includes(lower));
    if (match) return match;
  }
  return (
    targets.find(t => /obsidian/i.test(t.title)) ??
    targets.find(t => t.type === 'page' && !t.url.startsWith('devtools://')) ??
    targets[0]
  );
}

// ---------------------------------------------------------------------------
// CDP session
// ---------------------------------------------------------------------------

/**
 * An active CDP session connected to an Obsidian window.
 * Obtain one via {@link withCdpSession}.
 */
export type CdpSession = {
  /**
   * Evaluate a JavaScript expression in the Obsidian window's execution context.
   * The expression may be async — Promises are awaited before the result is returned.
   *
   * @param expression - Any valid JS expression, e.g. `'document.title'` or
   *                     `'(() => ({ url: location.href }))()'`.
   */
  evaluate(expression: string): Promise<unknown>;
};

export type CdpConnectionOptions = {
  /** CDP port Obsidian is listening on. Default `9333`. */
  cdpPort?: number;
  /** CDP host. Default `'127.0.0.1'`. */
  cdpHost?: string;
  /** How long to wait for the port before throwing. Default `120000` ms. */
  timeoutMs?: number;
  /** Target id or title substring to prefer when selecting the Obsidian window. */
  targetHint?: string;
};

function connectWs(wsUrl: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => resolve(ws);
    ws.onerror = () => reject(new Error(`CDP WebSocket failed to connect: ${wsUrl}`));
  });
}

function wsSend(ws: WebSocket, id: number, expression: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const onMessage = (event: MessageEvent) => {
      const msg = JSON.parse(event.data as string) as {
        id: number;
        result?: { result?: { value?: unknown }; exceptionDetails?: { text?: string; exception?: { description?: string } } };
      };
      if (msg.id !== id) return;
      ws.removeEventListener('message', onMessage);
      const ex = msg.result?.exceptionDetails;
      if (ex) {
        reject(new Error(ex.exception?.description ?? ex.text ?? 'CDP evaluation error'));
      } else {
        resolve(msg.result?.result?.value);
      }
    };
    ws.addEventListener('message', onMessage);
    ws.send(JSON.stringify({
      id,
      method: 'Runtime.evaluate',
      params: {
        expression: `(async () => { return (${expression}); })()`,
        awaitPromise: true,
        returnByValue: true,
      },
    }));
  });
}

/**
 * Connect to a running Obsidian CDP session, invoke `fn` with a {@link CdpSession},
 * then disconnect. Waits for the port to become reachable first.
 *
 * @example
 * const title = await withCdpSession({ cdpPort: 9333 }, session =>
 *   session.evaluate('document.title'),
 * );
 */
export async function withCdpSession<T>(
  options: CdpConnectionOptions,
  fn: (session: CdpSession) => Promise<T>,
): Promise<T> {
  const { cdpPort = 9333, cdpHost = '127.0.0.1', timeoutMs = 120000, targetHint } = options;
  const browserUrl = `http://${cdpHost}:${cdpPort}`;
  await waitForPort(cdpPort, cdpHost, timeoutMs);

  const targets = await listCdpTargets(browserUrl);
  const target = pickCdpTarget(targets, targetHint);
  if (!target.webSocketDebuggerUrl) {
    throw new Error(`Target has no webSocketDebuggerUrl: ${target.title}`);
  }

  const ws = await connectWs(target.webSocketDebuggerUrl);
  let msgId = 0;
  try {
    return await fn({ evaluate: expr => wsSend(ws, ++msgId, expr) });
  } finally {
    ws.close();
  }
}

/**
 * Evaluate a single JavaScript expression in a running Obsidian CDP session.
 * Opens a connection, evaluates, then disconnects.
 *
 * For multiple expressions in one connection, use {@link withCdpSession} directly.
 *
 * @example
 * const title = await evaluateCdpExpression({ cdpPort: 9333 }, 'document.title');
 */
export async function evaluateCdpExpression(
  options: CdpConnectionOptions,
  expression: string,
): Promise<unknown> {
  return withCdpSession(options, session => session.evaluate(expression));
}
