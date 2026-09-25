# MCP 功能实现文档

## 已完成的模块

### 1. MCPClient.js - MCP 客户端核心
- 负责与单个 MCP 服务器通信
- JSON-RPC over stdio 协议实现
- 工具列表获取和调用
- 连接管理和错误处理

### 2. MCPManager.js - MCP 管理器
- 管理多个 MCP 客户端
- 配置持久化（localStorage）
- 批量连接/断开
- 工具聚合

### 3. toolHelpers.js - 工具辅助函数
- MCP 工具格式转换（Anthropic/OpenAI）
- 工具调用信息提取
- 工具结果消息构造
- UI 渲染辅助

### 4. mcp.css - MCP 样式
- 工具调用状态展示（loading/success/error）
- MCP 管理页面样式
- 服务器卡片和模态框样式

### 5. MCPPage.js - MCP 管理页面
- 服务器列表展示
- 添加/删除/启用/禁用服务器
- 连接测试
- 工具列表展示

### 6. mcpIntegration.js - 聊天集成
- 将 MCP 工具注入到聊天请求
- 处理工具调用和结果
- 递归对话处理（tool use → tool result → continue）

## 需要集成到 index.html 的部分

### 1. 引入样式
在 `<head>` 中添加：
```html
<link rel="stylesheet" href="src/styles/mcp.css">
```

### 2. 引入模块
在底部 `<script type="module">` 中添加：
```javascript
import { mcpManager } from './src/mcp/MCPManager.js';
import { renderMCPPage } from './src/mcp/MCPPage.js';
import { sendMessageWithMCP } from './src/chat/mcpIntegration.js';
```

### 3. 路由注册
在 `navigateTo` 函数中添加 MCP 页面的 case：
```javascript
case 'mcp':
  renderMCPPage();
  break;
```

### 4. 初始化
在 App 初始化时连接已启用的 MCP 服务器：
```javascript
// 连接已启用的 MCP 服务器
mcpManager.connectAll().catch(err => {
  console.error('[MCP] Connect all failed:', err);
});
```

### 5. 替换发送消息函数
将原来的 `sendMessage` 替换为 `sendMessageWithMCP`：
```javascript
// 原来
await sendMessage(messages, config, onChunk, onComplete);

// 现在
await sendMessageWithMCP(messages, config, onChunk, onComplete);
```

## 待办事项

1. **浏览器环境适配**
   - 当前实现依赖 Node.js 的 `child_process`
   - 需要实现浏览器端的 WebSocket 代理
   - 或者提供 Electron 打包方案

2. **错误处理增强**
   - 连接超时重试
   - 工具调用失败回退
   - 更友好的错误提示

3. **UI 优化**
   - 工具调用的流式展示
   - 服务器状态实时更新
   - 工具参数的可视化编辑

4. **安全性**
   - 工具调用权限控制
   - 环境变量加密存储
   - 命令注入防护

## 使用示例

### 配置一个 MCP 服务器
```javascript
mcpManager.addServer({
  name: 'filesystem',
  command: 'npx',
  args: ['-y', '@modelcontextprotocol/server-filesystem', '/home/user/docs'],
  env: {},
  enabled: true
});
```

### 在聊天中调用工具
1. 用户发送消息："帮我读取 README.md 文件"
2. AI 返回 tool_use 块
3. mcpIntegration 自动调用对应的 MCP 工具
4. 工具结果注入到对话历史
5. AI 继续生成最终回复

## 技术栈
- 纯 JavaScript（ES6+ 模块）
- JSON-RPC 2.0
- localStorage 持久化
- 流式响应处理
