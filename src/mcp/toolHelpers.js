/**
 * 将 MCP 工具转换为 Anthropic 工具格式
 */
export function convertMCPToolToAnthropic(mcpTool) {
  return {
    name: mcpTool.name,
    description: mcpTool.description || '',
    input_schema: mcpTool.inputSchema || {
      type: 'object',
      properties: {},
      required: []
    }
  };
}

/**
 * 将 MCP 工具转换为 OpenAI 工具格式
 */
export function convertMCPToolToOpenAI(mcpTool) {
  return {
    type: 'function',
    function: {
      name: mcpTool.name,
      description: mcpTool.description || '',
      parameters: mcpTool.inputSchema || {
        type: 'object',
        properties: {},
        required: []
      }
    }
  };
}

/**
 * 从 tool use 块中提取工具调用信息
 */
export function extractToolCalls(content) {
  const toolCalls = [];
  
  if (Array.isArray(content)) {
    content.forEach(block => {
      if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input
        });
      }
    });
  }
  
  return toolCalls;
}

/**
 * 构造工具调用结果消息
 */
export function buildToolResultMessage(toolUseId, result, isError = false) {
  return {
    role: 'user',
    content: [
      {
        type: 'tool_result',
        tool_use_id: toolUseId,
        content: isError ? `Error: ${result}` : JSON.stringify(result),
        is_error: isError
      }
    ]
  };
}

/**
 * 渲染工具调用状态
 */
export function renderToolCall(toolCall, status = 'loading') {
  const container = document.createElement('div');
  container.className = `tool-call tool-call-${status}`;
  container.dataset.toolId = toolCall.id;
  
  const icon = status === 'loading' ? '⏳' : 
               status === 'success' ? '✅' : '❌';
  
  let html = `
    <div class="tool-call-header">
      <span class="tool-icon">${icon}</span>
      <span class="tool-name">${toolCall.name}</span>
      <span class="tool-status">${
        status === 'loading' ? '调用中...' :
        status === 'success' ? '成功' : '失败'
      }</span>
    </div>
  `;
  
  if (toolCall.input && Object.keys(toolCall.input).length > 0) {
    html += `
      <details class="tool-input">
        <summary>输入参数</summary>
        <pre>${JSON.stringify(toolCall.input, null, 2)}</pre>
      </details>
    `;
  }
  
  if (toolCall.result !== undefined) {
    const resultStr = typeof toolCall.result === 'string' 
      ? toolCall.result 
      : JSON.stringify(toolCall.result, null, 2);
    
    html += `
      <details class="tool-result" ${status === 'success' ? '' : 'open'}>
        <summary>${status === 'error' ? '错误信息' : '返回结果'}</summary>
        <pre>${resultStr}</pre>
      </details>
    `;
  }
  
  container.innerHTML = html;
  return container;
}

/**
 * 更新工具调用状态
 */
export function updateToolCallStatus(toolId, status, result = null) {
  const container = document.querySelector(`[data-tool-id="${toolId}"]`);
  if (!container) return;
  
  container.className = `tool-call tool-call-${status}`;
  
  const icon = container.querySelector('.tool-icon');
  const statusText = container.querySelector('.tool-status');
  
  if (status === 'success') {
    icon.textContent = '✅';
    statusText.textContent = '成功';
  } else if (status === 'error') {
    icon.textContent = '❌';
    statusText.textContent = '失败';
  }
  
  if (result !== null) {
    let resultContainer = container.querySelector('.tool-result');
    if (!resultContainer) {
      resultContainer = document.createElement('details');
      resultContainer.className = 'tool-result';
      container.appendChild(resultContainer);
    }
    
    resultContainer.open = status === 'error';
    const resultStr = typeof result === 'string' 
      ? result 
      : JSON.stringify(result, null, 2);
    
    resultContainer.innerHTML = `
      <summary>${status === 'error' ? '错误信息' : '返回结果'}</summary>
      <pre>${resultStr}</pre>
    `;
  }
}
