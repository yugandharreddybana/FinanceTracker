/**
 * Minimal MCP Client for SSE transport
 */
export class MCPClient {
  private eventSource: EventSource | null = null;
  private messageEndpoint: string | null = null;
  private nextId = 1;

  constructor(private sseUrl: string) {}

  async connect(): Promise<void> {
    if (this.eventSource) return;

    return new Promise((resolve, reject) => {
      if (import.meta.env.DEV) {
        console.info("Connecting to MCP SSE at:", this.sseUrl);
      }
      this.eventSource = new EventSource(this.sseUrl, { withCredentials: true });

      const onEndpoint = (event: MessageEvent<string>) => {
        this.messageEndpoint = event.data;
        if (import.meta.env.DEV) {
          console.info("MCP Connected. Message endpoint:", this.messageEndpoint);
        }
        this.eventSource?.removeEventListener("endpoint", onEndpoint);
        resolve();
      };

      this.eventSource.addEventListener("endpoint", onEndpoint);

      this.eventSource.onerror = (err) => {
        // Only reject if we haven't connected yet
        if (!this.messageEndpoint) {
          console.error("MCP Connection Failed:", err);
          this.disconnect();
          reject(err);
        } else {
          // EventSource will automatically try to reconnect
          console.warn("MCP SSE Connection lost, retrying...", err);
        }
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

    const id = this.nextId++;
    let url = this.messageEndpoint;
    
    // Resolve relative paths against the sseUrl origin
    if (url.startsWith('/')) {
      const baseUrl = new URL(this.sseUrl);
      url = `${baseUrl.origin}${url}`;
    }

    const response = await fetch(url, {
      method: "POST",
      credentials: "include",
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
  }

  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
    this.messageEndpoint = null;
  }
}
