/**
 * Minimal MCP Client for SSE transport
 * Fixes:
 *  - AbortController timeout on sendRequest (15 s) to prevent hanging fetches
 *  - Reconnect cap (max 3 attempts) with exponential back-off to avoid infinite loops
 *  - Explicit disconnected state so callers can detect a dead connection
 */
export class MCPClient {
  private eventSource: EventSource | null = null;
  private messageEndpoint: string | null = null;
  private nextId = 1;
  private reconnectAttempts = 0;
  private _isDisconnected = false;
  private static readonly MAX_RECONNECTS = 3;
  private static readonly REQUEST_TIMEOUT_MS = 15_000;

  constructor(private sseUrl: string) {}

  /** Returns true when the client has given up reconnecting. */
  isConnected(): boolean {
    return !this._isDisconnected && this.messageEndpoint !== null;
  }

  async connect(): Promise<void> {
    if (this.eventSource) return;
    this._isDisconnected = false;
    this.reconnectAttempts = 0;

    return new Promise((resolve, reject) => {
      if (import.meta.env.DEV) {
        console.info("Connecting to MCP SSE at:", this.sseUrl);
      }
      this.eventSource = new EventSource(this.sseUrl, { withCredentials: true });

      const onEndpoint = (event: MessageEvent<string>) => {
        this.messageEndpoint = event.data;
        this.reconnectAttempts = 0; // reset on successful connect
        if (import.meta.env.DEV) {
          console.info("MCP Connected. Message endpoint:", this.messageEndpoint);
        }
        this.eventSource?.removeEventListener("endpoint", onEndpoint);
        resolve();
      };

      this.eventSource.addEventListener("endpoint", onEndpoint);

      this.eventSource.onerror = (err) => {
        if (!this.messageEndpoint) {
          // Initial connection failed
          console.error("MCP Connection Failed:", err);
          this.disconnect();
          reject(err);
          return;
        }

        // Post-connect SSE error — attempt bounded reconnect
        this.reconnectAttempts++;
        if (this.reconnectAttempts > MCPClient.MAX_RECONNECTS) {
          console.warn(`MCP SSE: exceeded ${MCPClient.MAX_RECONNECTS} reconnect attempts. Giving up.`);
          this._isDisconnected = true;
          this.eventSource?.close();
          this.eventSource = null;
          return;
        }

        const delayMs = Math.min(1000 * 2 ** this.reconnectAttempts, 16_000);
        console.warn(`MCP SSE connection lost (attempt ${this.reconnectAttempts}/${MCPClient.MAX_RECONNECTS}). Retrying in ${delayMs}ms…`, err);
      };
    });
  }

  async listTools(): Promise<any[]> {
    const response = await this.sendRequest("tools/list", {});
    return response.tools || [];
  }

  async callTool<T = unknown>(name: string, args: Record<string, unknown>): Promise<T> {
    const response = await this.sendRequest("tools/call", {
      name,
      arguments: args
    });

    const text = response.content?.[0]?.text;
    if (typeof text !== "string") {
      return response as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as T;
    }
  }

  private async sendRequest(method: string, params: Record<string, unknown>): Promise<any> {
    if (!this.messageEndpoint) throw new Error("MCP not connected");
    if (this._isDisconnected) throw new Error("MCP client disconnected — reconnect required");

    const id = this.nextId++;
    let url = this.messageEndpoint;

    // Resolve relative paths against the sseUrl origin
    if (url.startsWith('/')) {
      const baseUrl = new URL(this.sseUrl);
      url = `${baseUrl.origin}${url}`;
    }

    // Timeout guard: abort after REQUEST_TIMEOUT_MS to prevent hanging fetches
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), MCPClient.REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method,
          params
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "MCP Request failed");
      return data.result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  disconnect() {
    if (this._isDisconnected && !this.eventSource) return;
    this.eventSource?.close();
    this.eventSource = null;
    this.messageEndpoint = null;
    this._isDisconnected = true;
  }
}
