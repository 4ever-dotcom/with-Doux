/**
 * MCP Client - 负责与 MCP 服务器通信
 */
export class MCPClient {
  constructor(config) {
    this.name = config.name;
    this.command = config.command;
    this.args = config.args || [];
    this.env = config.env || {};
    this.enabled = config.enabled !== false;
    
    this.process = null;
    this.tools = [];
    this.connected = false;
    this.messageId = 0;
    this.pendingRequests = new Map();
  }

  /**
   * 启动 MCP 服务器进程并建立连接
   */
  async connect() {
    if (this.connected) return;

    try {
      // 启动子进程（需要 Node.js 环境或 Electron）
      // 浏览器环境需要后端代理
      const { spawn } = await import('child_process');
      
      this.process = spawn(this.command, this.args, {
        env: { ...process.env, ...this.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // 监听 stdout - MCP 使用 JSON-RPC over stdio
      let buffer = '';
      this.process.stdout.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 保留不完整的行

        lines.forEach(line => {
          if (!line.trim()) return;
          try {
            const message = JSON.parse(line);
            this.handleMessage(message);
          } catch (e) {
            console.error('[MCP] Parse error:', e, line);
          }
        });
      });

      this.process.stderr.on('data', (chunk) => {
        console.error('[MCP stderr]', chunk.toString());
      });

      this.process.on('exit', (code) => {
        console.log(`[MCP] Process exited with code ${code}`);
        this.connected = false;
      });

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

      console.log('[MCP] Initialize response:', initResponse);

      // 发送 initialized 通知
      this.notify('notifications/initialized');

      // 获取工具列表
      const toolsResponse = await this.request('tools/list');
      this.tools = toolsResponse.tools || [];

      this.connected = true;
      console.log(`[MCP] Connected to ${this.name}, tools:`, this.tools.length);

    } catch (error) {
      console.error('[MCP] Connect failed:', error);
      throw error;
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.connected = false;
    this.tools = [];
  }

  /**
   * 发送 JSON-RPC 请求
   */
  request(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId;
      const message = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });
      this.send(message);

      // 超时处理
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * 发送通知（不需要响应）
   */
  notify(method, params = {}) {
    const message = {
      jsonrpc: '2.0',
      method,
      params
    };
    this.send(message);
  }

  /**
   * 发送消息到 stdin
   */
  send(message) {
    if (!this.process) {
      throw new Error('Process not started');
    }
    const line = JSON.stringify(message) + '\n';
    this.process.stdin.write(line);
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(message) {
    // 响应消息
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || 'Unknown error'));
      } else {
        resolve(message.result);
      }
    }
    // 通知消息
    else if (message.method) {
      console.log('[MCP notification]', message.method, message.params);
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
}
