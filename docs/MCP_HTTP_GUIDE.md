# MCP HTTP 集成指南

## 概述

with-Doux 现在支持通过 **HTTP** 协议接入 MCP 服务器。与 stdio 版本不同，HTTP 版本可以直接在浏览器中使用，无需 Node.js 环境。

## 架构

- **MCPClient.js** - HTTP 客户端，使用 `fetch()` 发送 JSON-RPC 请求
- **MCPManager.js** - 管理多个 MCP 服务器配置
- **MCPPage.js** - 服务器配置界面
- **mcpIntegration.js** - 聊天集成（将 MCP 工具转换为 Claude 可用格式）

## 与 stdio 版本的区别

| 特性 | stdio 版本 | HTTP 版本 |
|------|-----------|-----------|
| 环境要求 | Node.js + child_process | 纯浏览器 |
| 配置方式 | command + args | baseUrl + token |
| 连接方式 | 启动子进程 | HTTP POST 请求 |
| 适用场景 | 本地开发工具 | 远程服务 / 橘子岛 MCP |

## 快速开始

### 1. 添加到 HTML

在 `index.html` 的 `<head>` 中添加：

```html
<!-- MCP HTTP 核心 -->
<script type="module" src="src/mcp/MCPClient.js"></script>
<script type="module" src="src/mcp/MCPManager.js"></script>
<script type="module" src="src/mcp/MCPPage.js"></script>
<script type="module" src="src/chat/mcpIntegration.js"></script>

<!-- MCP 样式 -->
<link rel="stylesheet" href="src/styles/mcp.css">
```

### 2. 注册 MCP 页面路由

在 `src/router.js` 中添加：

```javascript
import { renderMCPPage } from './mcp/MCPPage.js';

const routes = {
  // ... 其他路由
  '/mcp': renderMCPPage,
};
```

### 3. 聊天集成

在 `src/chat/ChatPage.js` 的发送消息函数中：

```javascript
import { getMCPToolsForClaude, handleMCPToolCall } from './mcpIntegration.js';

async function sendMessage(userMessage) {
  // 1. 获取 MCP 工具
  const mcpTools = getMCPToolsForClaude();
  
  // 2. 发送请求（带工具列表）
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [...],
      tools: mcpTools,  // 👈 加上这个
      // ... 其他参数
    })
  });
  
  // 3. 处理 tool_use
  const data = await response.json();
  
  for (const block of data.content) {
    if (block.type === 'tool_use') {
      const result = await handleMCPToolCall(
        block.name,
        block.input
      );
      
      // 4. 将结果追加到消息历史，继续对话
      // ...
    }
  }
}
```

完整示例见 `src/chat/mcpIntegration.js`。

## MCP 服务器配置

### 添加服务器

1. 打开 MCP 页面
2. 点击右下角 `+` 按钮
3. 填写配置：
   - **名称**：服务器唯一标识（例如 `orangeisland-mcp`）
   - **Base URL**：HTTP 端点地址（例如 `http://localhost:3000/mcp`）
   - **Token**：可选，如果服务器需要 Bearer 认证

### 配置示例

#### 橘子岛 MCP（假设端口 3000）

```
名称: orangeisland
Base URL: http://localhost:3000/mcp
Token: (留空或填写你的 token)
```

#### 远程 MCP 服务器

```
名称: remote-mcp
Base URL: https://your-server.com/mcp
Token: your-bearer-token-here
```

### 测试连接

点击服务器卡片上的 **"测试"** 按钮，会：
1. 发送 `initialize` 请求
2. 拉取工具列表
3. 显示连接状态和工具数量

## 工具调用流程

```
1. 用户发消息
   ↓
2. getMCPToolsForClaude() 获取所有已启用服务器的工具
   ↓
3. 发送给 Claude（带 tools 参数）
   ↓
4. Claude 返回 tool_use block
   ↓
5. handleMCPToolCall() 调用对应服务器的工具
   ↓
6. 将 tool_result 追加到历史
   ↓
7. 继续对话或返回最终结果
```

## HTTP MCP 协议

### 请求格式

```json
POST /mcp
Content-Type: application/json
Authorization: Bearer <token>

{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "get_weather",
    "arguments": {
      "city": "Beijing"
    }
  }
}
```

### 响应格式

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Beijing: 22°C, sunny"
      }
    ]
  }
}
```

### 支持的方法

- `initialize` - 初始化连接
- `tools/list` - 获取工具列表
- `tools/call` - 调用工具
- `notifications/initialized` - 初始化完成通知（可选）

## 数据持久化

配置保存在 `localStorage.mcp_servers`，格式：

```json
[
  {
    "name": "orangeisland",
    "baseUrl": "http://localhost:3000/mcp",
    "token": "your-token",
    "enabled": true
  }
]
```

## 调试

打开浏览器控制台，查看日志：

```javascript
// 连接日志
[MCP HTTP] Connected to orangeisland, tools: 15

// 工具调用日志
[MCP HTTP] Calling tool: get_weather
[MCP HTTP] Tool result: { content: [...] }
```

## 常见问题

### Q: CORS 错误怎么办？

A: MCP 服务器需要配置 CORS 响应头：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Q: 连接超时？

A: 检查服务器地址和端口是否正确，服务器是否在运行。

### Q: 工具调用失败？

A: 查看控制台错误信息，可能是：
- 参数格式不对
- 服务器返回错误
- Token 不正确

### Q: 如何同时使用多个 MCP 服务器？

A: 添加多个服务器并启用即可，所有工具会合并到一起。工具名冲突时，会带上服务器名前缀。

## 性能优化

- 只启用需要的服务器
- 工具列表在启用时自动拉取，无需手动刷新
- 连接失败会自动禁用，不影响其他服务器

## 安全建议

- 不要在前端明文存储敏感 token
- 使用 HTTPS 传输
- 定期轮换 token
- 只启用信任的 MCP 服务器

## 下一步

- [ ] 支持 WebSocket / SSE 流式传输
- [ ] 工具调用历史记录
- [ ] 批量导入/导出配置
- [ ] 工具权限控制
