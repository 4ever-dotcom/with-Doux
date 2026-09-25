/**
 * HTTP MCP Client - 通过 HTTP 与 MCP 服务器通信
 * 支持标准 MCP HTTP transport 和自定义 HTTP 端点
 */
export class MCPClient {
  constructor(config) {
    this.name = config.name;
    this.baseUrl = config.baseUrl; // HTTP 端点，例如 http://localhost:3000
    this.token = config.token || ''; // Bearer token（可选）
    this.enabled = config.enabled !== false;
    
    this.tools = [];
    this.connected = false;
    this.messageId = 0;
  }

  /**
   * 连接到 MCP 服务器（HTTP 版本）
   */
  async connect() {
    if (this.connected) return;

    try {
      // 发送 initialize 请求
      const initResponse = await this.request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {
          roots: { listChanged: true },
          sampling: {}
        },
        clientInfo: {
          name: 'with-Doux',
          version: '0.2.0'
        }
      });

      console.log('[MCP HTTP] Initialize response:', initResponse);

      // 发送 initialized 通知（可选，取决于服务器实现）
      await this.notify('notifications/initialized');

      // 获取工具列表
      const toolsResponse = await this.request('tools/list');
      this.tools = toolsResponse.tools || [];

      this.connected = true;
      console.log(`[MCP HTTP] Connected to ${this.name}, tools:`, this.tools.length);

    } catch (error) {
      console.error('[MCP HTTP] Connect failed:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.connected = false;
    this.tools = [];
  }

  /**
   * 发送 JSON-RPC 请求（HTTP POST）
   */
  async request(method, params = {}) {
    const id = ++this.messageId;
    const message = {
      jsonrpc: '2.0',
      id,
      method,
      params
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    // 如果有 token，添加 Authorization header
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Unknown error');
      }

      return data.result;
    } catch (error) {
      console.error('[MCP HTTP] Request failed:', error);
      throw error;
    }
  }

  /**
   * 发送通知（不需要响应）
   */
  async notify(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      method,
      params
    };

    const headers = {
      'Content-Type': 'application/json'
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      await fetch(this.baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('[MCP HTTP] Notify failed:', error);
    }
  }

  /**
   * 调用工具
   */
  async callTool(toolName, args) {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const result = await this.request('tools/call', {
      name: toolName,
      arguments: args
    });

    return result;
  }

  /**
   * 获取所有可用工具
   */
  getTools() {
    return this.tools;
  }

  /**
   * 测试连接
   */
  async testConnection() {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { 'Authorization': `Bearer ${this.token}` })
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: {
              name: 'with-Doux',
              version: '0.2.0'
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return !data.error;
    } catch (error) {
      console.error('[MCP HTTP] Test connection failed:', error);
      return false;
    }
  }
}
