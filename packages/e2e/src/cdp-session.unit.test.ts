import { createServer } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  evaluateCdpExpression,
  listCdpTargets,
  pickCdpTarget,
  waitForPort,
  withCdpSession,
} from './cdp-session';
import type { JsonTarget } from './cdp-session';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTarget(overrides: Partial<JsonTarget> = {}): JsonTarget {
  return {
    id: 'default-id',
    title: 'Default Title',
    url: 'about:blank',
    type: 'page',
    webSocketDebuggerUrl: 'ws://127.0.0.1:9333/devtools/page/default-id',
    ...overrides,
  };
}

/** Open a real TCP server on an OS-assigned port. */
function openTcpServer(): Promise<{ port: number; close: () => Promise<void> }> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      resolve({ port: addr.port, close: () => new Promise(res => server.close(() => res())) });
    });
    server.on('error', reject);
  });
}

/**
 * Minimal WebSocket mock. Fires onopen on the next microtask (matching browser behaviour).
 * Use `ws.reply(obj)` to dispatch a fake CDP message event.
 */
class MockWebSocket {
  static instances: MockWebSocket[] = [];

  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    Promise.resolve().then(() => this.onopen?.());
  }

  addEventListener(event: string, handler: (e: MessageEvent) => void) {
    if (event === 'message') this.onmessage = handler as unknown as (e: { data: string }) => void;
  }

  removeEventListener(event: string, _handler: unknown) {
    if (event === 'message') this.onmessage = null;
  }

  send(data: string) { this.sent.push(data); }

  reply(response: object) {
    this.onmessage?.({ data: JSON.stringify(response) } as MessageEvent);
  }

  close() { this.closed = true; }
}

function stubMockWebSocket() {
  MockWebSocket.instances = [];
  vi.stubGlobal('WebSocket', MockWebSocket);
  return MockWebSocket;
}

function stubFetch(targets: JsonTarget[]) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => targets }));
}

afterEach(() => vi.unstubAllGlobals());

// ---------------------------------------------------------------------------
// pickCdpTarget
// ---------------------------------------------------------------------------

describe('pickCdpTarget', () => {
  it('throws on empty target list', () => {
    expect(() => pickCdpTarget([])).toThrow('No CDP targets available.');
  });

  it('returns the Obsidian-titled target by default', () => {
    const targets = [
      makeTarget({ id: 'a', title: 'DevTools' }),
      makeTarget({ id: 'b', title: 'Obsidian' }),
    ];
    expect(pickCdpTarget(targets).id).toBe('b');
  });

  it('prefers hint match by exact id over Obsidian title', () => {
    const targets = [
      makeTarget({ id: 'exact', title: 'Other' }),
      makeTarget({ id: 'b', title: 'Obsidian' }),
    ];
    expect(pickCdpTarget(targets, 'exact').id).toBe('exact');
  });

  it('matches hint as a case-insensitive title substring', () => {
    const targets = [
      makeTarget({ id: 'a', title: 'Settings Page' }),
      makeTarget({ id: 'b', title: 'Obsidian Main' }),
    ];
    expect(pickCdpTarget(targets, 'settings').id).toBe('a');
  });

  it('falls back to first non-devtools page when no Obsidian title', () => {
    const targets = [
      makeTarget({ id: 'a', title: 'Nope', url: 'devtools://bundled' }),
      makeTarget({ id: 'b', title: 'Other', url: 'about:blank' }),
    ];
    expect(pickCdpTarget(targets).id).toBe('b');
  });

  it('falls back to targets[0] as last resort', () => {
    const targets = [makeTarget({ id: 'only', title: 'Nothing Relevant', url: 'devtools://bundled' })];
    expect(pickCdpTarget(targets).id).toBe('only');
  });
});

// ---------------------------------------------------------------------------
// listCdpTargets
// ---------------------------------------------------------------------------

describe('listCdpTargets', () => {
  it('returns parsed targets from /json/list', async () => {
    const targets = [makeTarget({ id: 'x' })];
    stubFetch(targets);
    const result = await listCdpTargets('http://127.0.0.1:9333');
    expect(result).toEqual(targets);
    expect(vi.mocked(fetch)).toHaveBeenCalledWith('http://127.0.0.1:9333/json/list');
  });

  it('throws on non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    await expect(listCdpTargets('http://127.0.0.1:9333')).rejects.toThrow('CDP /json/list failed: 503');
  });
});

// ---------------------------------------------------------------------------
// waitForPort
// ---------------------------------------------------------------------------

describe('waitForPort', () => {
  it('resolves immediately when port is already open', async () => {
    const { port, close } = await openTcpServer();
    try {
      await expect(waitForPort(port, '127.0.0.1', 5000)).resolves.toBeUndefined();
    } finally {
      await close();
    }
  });

  it('resolves after port opens mid-poll', async () => {
    // Grab a free port number, then close it so we know the number but it's not listening.
    const { port, close: closeInitial } = await openTcpServer();
    await closeInitial();

    const portWait = waitForPort(port, '127.0.0.1', 5000);

    // Re-open on the same port after one polling cycle.
    await new Promise(r => setTimeout(r, 50));
    const { close } = await new Promise<{ port: number; close: () => Promise<void> }>((resolve, reject) => {
      const server = createServer();
      server.listen(port, '127.0.0.1', () => {
        const addr = server.address() as { port: number };
        resolve({ port: addr.port, close: () => new Promise(res => server.close(() => res())) });
      });
      server.on('error', reject);
    });

    try {
      await expect(portWait).resolves.toBeUndefined();
    } finally {
      await close();
    }
  });

  it('throws with informative message when timeout elapses', async () => {
    await expect(waitForPort(19999, '127.0.0.1', 100)).rejects.toThrow(
      'CDP port 127.0.0.1:19999 not available after 100ms',
    );
  });
});

// ---------------------------------------------------------------------------
// withCdpSession / evaluateCdpExpression
// ---------------------------------------------------------------------------

describe('withCdpSession', () => {
  it('calls fn with a session whose evaluate returns the CDP result', async () => {
    const WS = stubMockWebSocket();
    stubFetch([makeTarget({ webSocketDebuggerUrl: 'ws://127.0.0.1:9333/page/1' })]);
    const { port, close } = await openTcpServer();

    const result = await withCdpSession(
      { cdpPort: port, cdpHost: '127.0.0.1', timeoutMs: 5000 },
      async session => {
        const ws = WS.instances[0];
        // wsSend calls ws.send() synchronously before returning; schedule reply after.
        setTimeout(() => {
          const req = JSON.parse(ws.sent[0]);
          ws.reply({ id: req.id, result: { result: { value: 42 } } });
        }, 0);
        return session.evaluate('21 + 21');
      },
    );

    expect(result).toBe(42);
    await close();
  });

  it('wraps expression in an async IIFE before sending', async () => {
    const WS = stubMockWebSocket();
    stubFetch([makeTarget({ webSocketDebuggerUrl: 'ws://127.0.0.1:9333/page/1' })]);
    const { port, close } = await openTcpServer();

    await withCdpSession(
      { cdpPort: port, cdpHost: '127.0.0.1', timeoutMs: 5000 },
      async session => {
        const ws = WS.instances[0];
        setTimeout(() => {
          const req = JSON.parse(ws.sent[0]);
          ws.reply({ id: req.id, result: { result: { value: null } } });
        }, 0);
        await session.evaluate('myExpr');
        expect(ws.sent[0]).toContain('(async () => { return (myExpr); })()');
      },
    );

    await close();
  });

  it('rejects when CDP response has exceptionDetails', async () => {
    const WS = stubMockWebSocket();
    stubFetch([makeTarget({ webSocketDebuggerUrl: 'ws://127.0.0.1:9333/page/1' })]);
    const { port, close } = await openTcpServer();

    await expect(
      withCdpSession({ cdpPort: port, cdpHost: '127.0.0.1', timeoutMs: 5000 }, async session => {
        const ws = WS.instances[0];
        setTimeout(() => {
          const req = JSON.parse(ws.sent[0]);
          ws.reply({
            id: req.id,
            result: { exceptionDetails: { exception: { description: 'ReferenceError: x is not defined' } } },
          });
        }, 0);
        return session.evaluate('x');
      }),
    ).rejects.toThrow('ReferenceError: x is not defined');

    await close();
  });

  it('closes the WebSocket in the finally block even when fn throws', async () => {
    const WS = stubMockWebSocket();
    stubFetch([makeTarget({ webSocketDebuggerUrl: 'ws://127.0.0.1:9333/page/1' })]);
    const { port, close } = await openTcpServer();

    await expect(
      withCdpSession({ cdpPort: port, cdpHost: '127.0.0.1', timeoutMs: 5000 }, async () => {
        throw new Error('fn blew up');
      }),
    ).rejects.toThrow('fn blew up');

    expect(WS.instances[0].closed).toBe(true);
    await close();
  });
});

describe('evaluateCdpExpression', () => {
  it('opens a session, evaluates, and returns the result', async () => {
    stubMockWebSocket();
    stubFetch([makeTarget({ webSocketDebuggerUrl: 'ws://127.0.0.1:9333/page/1' })]);
    const { port, close } = await openTcpServer();

    const promise = evaluateCdpExpression(
      { cdpPort: port, cdpHost: '127.0.0.1', timeoutMs: 5000 },
      'document.title',
    );

    // Yield enough microtasks for: waitForPort → fetch → connectWs(onopen) → send
    await new Promise(r => setTimeout(r, 20));

    const ws = MockWebSocket.instances[0];
    const req = JSON.parse(ws.sent[0]);
    ws.reply({ id: req.id, result: { result: { value: 'Obsidian' } } });

    await expect(promise).resolves.toBe('Obsidian');
    await close();
  });
});
