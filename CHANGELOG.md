# Changelog

## v0.3.0 (2026-09-25) - HTTP MCP 支持

### ✨ 新功能 - HTTP MCP
- **HTTP 传输协议**
  - 使用 `fetch()` API 替代 stdio，支持纯浏览器环境
  - 标准 JSON-RPC over HTTP
  - Bearer Token 认证支持
  - 完整的 MCP 协议实现（initialize, tools/list, tools/call）

- **配置方式改进**
  - 配置项：`baseUrl` + `token`（可选）
  - 适配远程 MCP 服务器（橘子岛、自建服务等）
  - 支持 HTTP/HTTPS
  - 自动保存到 localStorage

- **UI 优化**
  - 添加服务器表单更简洁（URL + Token）
  - 实时连接状态显示
  - 测试连接按钮
  - 工具列表折叠展开

### 🔄 重构
- **MCPClient.js** - 完全重写为 HTTP 客户端
- **MCPManager.js** - 配置结构适配 HTTP
- **MCPPage.js** - UI 表单适配新配置格式

### 📚 文档
- 新增 `docs/MCP_HTTP_GUIDE.md` - HTTP MCP 完整集成指南
- 包含协议说明、配置示例、调试方法

### 🚀 迁移指南（从 v0.2.0 stdio 版本）

如果你已经配置了 stdio 版本的 MCP 服务器，需要重新配置：

**旧配置（stdio）：**
```json
{
  "name": "my-mcp",
  "command": "node",
  "args": ["server.js"],
  "enabled": true
}
```

**新配置（HTTP）：**
```json
{
  "name": "my-mcp",
  "baseUrl": "http://localhost:3000/mcp",
  "token": "optional-bearer-token",
  "enabled": true
}
```

localStorage 会自动迁移，旧配置会被清空。

---

## v0.2.0 (2026-09-25)

### ✨ 新功能 - MCP 接入（stdio 版本）
- MCP 服务器管理页面
  - 添加/删除/编辑 MCP 服务器
  - 每个服务器独立启用/禁用开关
  - 连接测试 + 工具列表实时展示
- 聊天时自动调用已启用 MCP 服务器的工具
- Tool call 过程可视化
  - loading 状态（调用中）
  - success 状态（成功 + 返回结果）
  - error 状态（失败 + 错误信息）
- 配置持久化 localStorage

⚠️ **注意**：此版本使用 stdio 传输，需要 Node.js 环境。v0.3.0 已切换为 HTTP。

## v0.1.0 (2026-09-25)

### ✨ 新功能
- 完整 App 壳子：侧边栏 + 13 个页面路由（聊天/待办/日历/日记/朋友圈/共读/日报/健康/状态/工作流/仓库/MCP）
- 聊天核心功能：
  - 支持 OpenAI 兼容和 Anthropic 原生 API
  - 流式输出 + 打字光标动画
  - 支持 extended thinking / reasoning_content 折叠展开
  - 双方头像系统（点击弹出相册，全局换一次全部同步）
  - AI 消息浅色气泡 / 用户消息深色气泡
  - 基础 Markdown 渲染（代码块/粗体/斜体）
  - 配置持久化（localStorage）
  - 模型选择（设置页选模型，底栏精简）
- 锁屏：时钟 + 滑动解锁
