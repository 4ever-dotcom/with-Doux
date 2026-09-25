/**
 * 集成 MCP 到聊天功能
 */
import { mcpManager } from './mcp/MCPManager.js';
import { 
  convertMCPToolToAnthropic, 
  convertMCPToolToOpenAI,
  extractToolCalls,
  buildToolResultMessage,
  renderToolCall,
  updateToolCallStatus
} from './mcp/toolHelpers.js';

/**
 * 获取所有可用的 MCP 工具（根据 API 类型格式化）
 */
export function getMCPTools(apiType = 'anthropic') {
  const mcpTools = mcpManager.getAllTools();
  
  if (apiType === 'anthropic') {
    return mcpTools.map(convertMCPToolToAnthropic);
  } else {
    return mcpTools.map(convertMCPToolToOpenAI);
  }
}

/**
 * 处理工具调用（支持 Anthropic 的 tool_use 格式）
 */
export async function handleToolCalls(content, messageElement) {
  const toolCalls = extractToolCalls(content);
  if (toolCalls.length === 0) return [];
  
  const toolResults = [];
  
  for (const toolCall of toolCalls) {
    // 渲染工具调用状态
    const toolCallElement = renderToolCall(toolCall, 'loading');
    messageElement.appendChild(toolCallElement);
    
    try {
      // 查找工具所属的服务器
      const allTools = mcpManager.getAllTools();
      const toolInfo = allTools.find(t => t.name === toolCall.name);
      
      if (!toolInfo) {
        throw new Error(`Tool not found: ${toolCall.name}`);
      }
      
      // 调用 MCP 工具
      const result = await mcpManager.callTool(
        toolInfo.serverName,
        toolCall.name,
        toolCall.input
      );
      
      // 更新状态为成功
      updateToolCallStatus(toolCall.id, 'success', result);
      
      // 构造工具结果消息
      toolResults.push(buildToolResultMessage(toolCall.id, result, false));
      
    } catch (error) {
      console.error('[Tool Call Error]', error);
      
      // 更新状态为失败
      updateToolCallStatus(toolCall.id, 'error', error.message);
      
      // 构造错误结果消息
      toolResults.push(buildToolResultMessage(toolCall.id, error.message, true));
    }
  }
  
  return toolResults;
}

/**
 * 修改后的发送消息函数（集成 MCP）
 */
export async function sendMessageWithMCP(messages, config, onChunk, onComplete) {
  const apiType = config.apiType || 'anthropic';
  
  // 获取 MCP 工具
  const mcpTools = getMCPTools(apiType);
  
  // 如果有可用工具，添加到请求中
  const requestConfig = { ...config };
  if (mcpTools.length > 0) {
    if (apiType === 'anthropic') {
      requestConfig.tools = mcpTools;
    } else {
      requestConfig.tools = mcpTools;
    }
  }
  
  try {
    // 发送请求
    const response = await streamChat(messages, requestConfig, onChunk);
    
    // 检查是否有工具调用
    if (response.content) {
      const toolCalls = extractToolCalls(response.content);
      
      if (toolCalls.length > 0) {
        // 处理工具调用
        const messageElement = document.querySelector('.message:last-child .message-content');
        const toolResults = await handleToolCalls(response.content, messageElement);
        
        // 如果有工具结果，继续对话
        if (toolResults.length > 0) {
          const newMessages = [
            ...messages,
            response, // AI 的工具调用消息
            ...toolResults // 工具结果消息
          ];
          
          // 递归调用，继续对话
          return await sendMessageWithMCP(newMessages, config, onChunk, onComplete);
        }
      }
    }
    
    if (onComplete) {
      onComplete(response);
    }
    
    return response;
    
  } catch (error) {
    console.error('[Send Message Error]', error);
    throw error;
  }
}

/**
 * 原始的流式聊天函数（不包含 MCP 逻辑）
 */
async function streamChat(messages, config, onChunk) {
  // 这里是原来的 API 调用逻辑
  // 保持不变，只是提取出来以便复用
  
  if (config.apiType === 'anthropic') {
    return await streamAnthropicChat(messages, config, onChunk);
  } else {
    return await streamOpenAIChat(messages, config, onChunk);
  }
}

// 省略 streamAnthropicChat 和 streamOpenAIChat 的实现
// 这些函数应该已经在现有代码中了
