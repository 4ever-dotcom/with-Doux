/**
 * MCP Manager - 管理多个 MCP 客户端
 */
import { MCPClient } from './MCPClient.js';

export class MCPManager {
  constructor() {
    this.clients = new Map();
    this.loadConfig();
  }

  /**
   * 从 localStorage 加载配置
   */
  loadConfig() {
    try {
      const saved = localStorage.getItem('mcp_servers');
      if (saved) {
        const configs = JSON.parse(saved);
        configs.forEach(config => {
          const client = new MCPClient(config);
          this.clients.set(config.name, client);
        });
      }
    } catch (error) {
      console.error('[MCP Manager] Load config failed:', error);
    }
  }

  /**
   * 保存配置到 localStorage
   */
  saveConfig() {
    try {
      const configs = Array.from(this.clients.values()).map(client => ({
        name: client.name,
        command: client.command,
        args: client.args,
        env: client.env,
        enabled: client.enabled
      }));
      localStorage.setItem('mcp_servers', JSON.stringify(configs));
    } catch (error) {
      console.error('[MCP Manager] Save config failed:', error);
    }
  }

  /**
   * 添加 MCP 服务器
   */
  addServer(config) {
    if (this.clients.has(config.name)) {
      throw new Error(`Server already exists: ${config.name}`);
    }

    const client = new MCPClient(config);
    this.clients.set(config.name, client);
    this.saveConfig();
    return client;
  }

  /**
   * 删除 MCP 服务器
   */
  removeServer(name) {
    const client = this.clients.get(name);
    if (client) {
      if (client.connected) {
        client.disconnect();
      }
      this.clients.delete(name);
      this.saveConfig();
    }
  }

  /**
   * 更新服务器配置
   */
  updateServer(name, newConfig) {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Server not found: ${name}`);
    }

    // 如果连接中，先断开
    if (client.connected) {
      client.disconnect();
    }

    // 更新配置
    Object.assign(client, {
      name: newConfig.name || client.name,
      command: newConfig.command || client.command,
      args: newConfig.args || client.args,
      env: newConfig.env || client.env,
      enabled: newConfig.enabled !== undefined ? newConfig.enabled : client.enabled
    });

    // 如果名字变了，更新 Map key
    if (newConfig.name && newConfig.name !== name) {
      this.clients.delete(name);
      this.clients.set(newConfig.name, client);
    }

    this.saveConfig();
  }

  /**
   * 启用/禁用服务器
   */
  setServerEnabled(name, enabled) {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Server not found: ${name}`);
    }

    client.enabled = enabled;
    
    if (enabled && !client.connected) {
      return client.connect();
    } else if (!enabled && client.connected) {
      client.disconnect();
    }

    this.saveConfig();
  }

  /**
   * 连接所有已启用的服务器
   */
  async connectAll() {
    const promises = [];
    for (const client of this.clients.values()) {
      if (client.enabled && !client.connected) {
        promises.push(
          client.connect().catch(err => {
            console.error(`[MCP Manager] Failed to connect ${client.name}:`, err);
          })
        );
      }
    }
    await Promise.all(promises);
  }

  /**
   * 断开所有连接
   */
  disconnectAll() {
    for (const client of this.clients.values()) {
      if (client.connected) {
        client.disconnect();
      }
    }
  }

  /**
   * 获取所有可用工具（来自所有已连接的服务器）
   */
  getAllTools() {
    const tools = [];
    for (const client of this.clients.values()) {
      if (client.connected && client.enabled) {
        client.getTools().forEach(tool => {
          tools.push({
            ...tool,
            serverName: client.name
          });
        });
      }
    }
    return tools;
  }

  /**
   * 调用工具
   */
  async callTool(serverName, toolName, args) {
    const client = this.clients.get(serverName);
    if (!client) {
      throw new Error(`Server not found: ${serverName}`);
    }

    if (!client.connected) {
      throw new Error(`Server not connected: ${serverName}`);
    }

    return await client.callTool(toolName, args);
  }

  /**
   * 获取服务器列表
   */
  getServers() {
    return Array.from(this.clients.values()).map(client => ({
      name: client.name,
      command: client.command,
      args: client.args,
      env: client.env,
      enabled: client.enabled,
      connected: client.connected,
      toolCount: client.tools.length
    }));
  }

  /**
   * 测试服务器连接
   */
  async testConnection(name) {
    const client = this.clients.get(name);
    if (!client) {
      throw new Error(`Server not found: ${name}`);
    }

    try {
      await client.connect();
      const tools = client.getTools();
      return {
        success: true,
        toolCount: tools.length,
        tools: tools
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// 全局实例
export const mcpManager = new MCPManager();
