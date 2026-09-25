/**
 * MCP 管理页面组件
 */
import { mcpManager } from './MCPManager.js';

export function renderMCPPage() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="mcp-page">
      <div class="mcp-header">
        <h1>MCP 服务器</h1>
        <p>管理和配置 Model Context Protocol 服务器</p>
      </div>
      
      <div class="mcp-content">
        <div id="server-list" class="server-list"></div>
      </div>
      
      <button class="add-server-btn" id="add-server-btn">+</button>
    </div>
  `;
  
  renderServerList();
  
  // 添加服务器按钮
  document.getElementById('add-server-btn').addEventListener('click', () => {
    showAddServerModal();
  });
}

function renderServerList() {
  const container = document.getElementById('server-list');
  const servers = mcpManager.getServers();
  
  if (servers.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: #5C3D2E; opacity: 0.6;">
        <div style="font-size: 48px; margin-bottom: 16px;">📡</div>
        <div style="font-size: 16px; margin-bottom: 8px;">还没有配置 MCP 服务器</div>
        <div style="font-size: 14px;">点击右下角 + 添加第一个服务器</div>
      </div>
    `;
    return;
  }
  
  container.innerHTML = servers.map(server => `
    <div class="server-card" data-server="${server.name}">
      <div class="server-card-header">
        <div class="server-info">
          <h3>${server.name}</h3>
          <div class="server-status">
            <span class="status-dot ${server.connected ? 'connected' : ''}"></span>
            <span>${server.connected ? '已连接' : server.enabled ? '未连接' : '已禁用'}</span>
            ${server.connected ? `<span>· ${server.toolCount} 个工具</span>` : ''}
          </div>
        </div>
        
        <div class="server-actions">
          <button class="btn-toggle ${server.enabled ? 'enabled' : ''}" 
                  onclick="toggleServer('${server.name}')">
            ${server.enabled ? '禁用' : '启用'}
          </button>
          <button class="btn-test" onclick="testServer('${server.name}')">测试</button>
          <button class="btn-delete" onclick="deleteServer('${server.name}')">删除</button>
        </div>
      </div>
      
      <div class="server-details">
        <div class="server-command">${server.command} ${server.args.join(' ')}</div>
        
        ${server.connected && server.toolCount > 0 ? `
          <details class="server-tools">
            <summary>可用工具 (${server.toolCount})</summary>
            <ul id="tools-${server.name}">
              <li style="color: #94A3B8;">加载中...</li>
            </ul>
          </details>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  // 加载工具列表
  servers.forEach(server => {
    if (server.connected && server.toolCount > 0) {
      loadServerTools(server.name);
    }
  });
}

async function loadServerTools(serverName) {
  const container = document.getElementById(`tools-${serverName}`);
  if (!container) return;
  
  try {
    const client = mcpManager.clients.get(serverName);
    const tools = client.getTools();
    
    container.innerHTML = tools.map(tool => `
      <li>
        <strong>${tool.name}</strong>
        ${tool.description ? `<br><span style="opacity: 0.7;">${tool.description}</span>` : ''}
      </li>
    `).join('');
  } catch (error) {
    container.innerHTML = `<li style="color: #F87171;">加载失败: ${error.message}</li>`;
  }
}

window.toggleServer = async function(name) {
  try {
    const servers = mcpManager.getServers();
    const server = servers.find(s => s.name === name);
    
    await mcpManager.setServerEnabled(name, !server.enabled);
    renderServerList();
  } catch (error) {
    alert(`操作失败: ${error.message}`);
  }
};

window.testServer = async function(name) {
  const btn = event.target;
  const originalText = btn.textContent;
  
  btn.textContent = '测试中...';
  btn.disabled = true;
  
  try {
    const result = await mcpManager.testConnection(name);
    
    if (result.success) {
      alert(`连接成功！\n发现 ${result.toolCount} 个工具`);
      renderServerList();
    } else {
      alert(`连接失败：\n${result.error}`);
    }
  } catch (error) {
    alert(`测试失败：\n${error.message}`);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
};

window.deleteServer = function(name) {
  if (!confirm(`确定要删除服务器 "${name}" 吗？`)) {
    return;
  }
  
  try {
    mcpManager.removeServer(name);
    renderServerList();
  } catch (error) {
    alert(`删除失败: ${error.message}`);
  }
};

function showAddServerModal() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2>添加 MCP 服务器</h2>
      </div>
      
      <div class="modal-body">
        <form id="add-server-form">
          <div class="form-group">
            <label>名称 *</label>
            <input type="text" name="name" required placeholder="例如: filesystem">
            <div class="form-hint">服务器的唯一标识</div>
          </div>
          
          <div class="form-group">
            <label>命令 *</label>
            <input type="text" name="command" required placeholder="例如: npx">
            <div class="form-hint">启动服务器的可执行文件</div>
          </div>
          
          <div class="form-group">
            <label>参数</label>
            <input type="text" name="args" placeholder="例如: -y @modelcontextprotocol/server-filesystem /path">
            <div class="form-hint">命令行参数，用空格分隔</div>
          </div>
          
          <div class="form-group">
            <label>环境变量 (JSON)</label>
            <textarea name="env" placeholder='{"KEY": "value"}'>{}</textarea>
            <div class="form-hint">可选的环境变量，JSON 格式</div>
          </div>
        </form>
      </div>
      
      <div class="modal-footer">
        <button type="button" class="btn-cancel">取消</button>
        <button type="button" class="btn-save">保存</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 点击遮罩关闭
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  // 取消按钮
  modal.querySelector('.btn-cancel').addEventListener('click', () => {
    modal.remove();
  });
  
  // 保存按钮
  modal.querySelector('.btn-save').addEventListener('click', () => {
    const form = document.getElementById('add-server-form');
    const formData = new FormData(form);
    
    try {
      const config = {
        name: formData.get('name').trim(),
        command: formData.get('command').trim(),
        args: formData.get('args').trim().split(/\s+/).filter(Boolean),
        env: JSON.parse(formData.get('env') || '{}'),
        enabled: true
      };
      
      mcpManager.addServer(config);
      modal.remove();
      renderServerList();
    } catch (error) {
      alert(`添加失败: ${error.message}`);
    }
  });
}
