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
      console.log("Connecting to MCP SSE at:", this.sseUrl);
      this.eventSource = new EventSource(this.sseUrl, { withCredentials: true });

      const onEndpoint = (event: any) => {
        this.messageEndpoint = event.data;
        console.log("MCP Connected. Message endpoint:", this.messageEndpoint);
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

  async callTool(name: string, args: any): Promise<any> {
    const response = await this.sendRequest("tools/call", {
      name,
      arguments: args
    });
    return response.content?.[0]?.text || "";
  }

  private async sendRequest(method: string, params: any): Promise<any> {
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
  }
}
