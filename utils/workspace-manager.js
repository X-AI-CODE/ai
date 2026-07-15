/**
 * WorkspaceManager - 工作空间管理器
 * 
 * 支持多个工作空间，每个工作空间有独立的仓库集合
 * 例如：工作、个人、开源项目 等不同空间
 */

export class WorkspaceManager {
  constructor() {
    this.fs = wx.getFileSystemManager();
    this.baseRoot = `${wx.env.USER_DATA_PATH}/gitflow`;
    this.workspaces = [];
    this.currentWorkspaceId = null;
    this._load();
  }

  // ========== 工作空间 CRUD ==========

  /**
   * 获取所有工作空间
   */
  getAll() {
    return this.workspaces;
  }

  /**
   * 获取当前工作空间
   */
  getCurrent() {
    return this.workspaces.find(w => w.id === this.currentWorkspaceId) || this.workspaces[0] || null;
  }

  /**
   * 获取当前工作空间的文件系统路径
   */
  getCurrentPath() {
    const ws = this.getCurrent();
    if (!ws) return `${this.baseRoot}/spaces/default`;
    return ws.path;
  }

  /**
   * 创建新工作空间
   */
  create(name, options = {}) {
    if (!name || !name.trim()) {
      throw new Error('工作空间名称不能为空');
    }

    if (this.workspaces.find(w => w.name === name.trim())) {
      throw new Error(`工作空间 "${name}" 已存在`);
    }

    const id = 'ws_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
    const slug = this._slugify(name);
    const path = `${this.baseRoot}/spaces/${slug}_${id.substring(3, 7)}`;

    this.fs.mkdirSync(path, true);

    const workspace = {
      id: id,
      name: name.trim(),
      slug: slug,
      path: path,
      description: options.description || '',
      icon: options.icon || '📁',
      color: options.color || '#0366d6',
      repos: [],
      remotes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessed: Date.now()
    };

    this.workspaces.push(workspace);

    if (this.workspaces.length === 1) {
      this.currentWorkspaceId = workspace.id;
    }

    this._save();
    return workspace;
  }

  /**
   * 删除工作空间
   */
  delete(workspaceId, options = {}) {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (!ws) throw new Error('工作空间不存在');

    if (this.workspaces.length <= 1 && !options.force) {
      throw new Error('至少需要保留一个工作空间');
    }

    if (this.currentWorkspaceId === workspaceId) {
      const others = this.workspaces.filter(w => w.id !== workspaceId);
      this.currentWorkspaceId = others.length > 0 ? others[0].id : null;
    }

    if (options.deleteFiles) {
      this._rmdirSync(ws.path);
    }

    this.workspaces = this.workspaces.filter(w => w.id !== workspaceId);
    this._save();

    return { reposAffected: ws.repos.length };
  }

  /**
   * 更新工作空间信息
   */
  update(workspaceId, updates) {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (!ws) throw new Error('工作空间不存在');

    if (updates.name && updates.name !== ws.name) {
      if (this.workspaces.find(w => w.name === updates.name.trim())) {
        throw new Error(`工作空间 "${updates.name}" 已存在`);
      }
      ws.name = updates.name.trim();
      ws.slug = this._slugify(ws.name);
    }

    if (updates.description !== undefined) ws.description = updates.description;
    if (updates.icon !== undefined) ws.icon = updates.icon;
    if (updates.color !== undefined) ws.color = updates.color;
    ws.updatedAt = Date.now();

    this._save();
    return ws;
  }

  /**
   * 切换到指定工作空间
   */
  switchTo(workspaceId) {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (!ws) throw new Error('工作空间不存在');

    this.currentWorkspaceId = workspaceId;
    ws.lastAccessed = Date.now();
    this._save();
    return ws;
  }

  /**
   * 将仓库添加到指定工作空间
   */
  addRepo(workspaceId, repoId) {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (!ws) throw new Error('工作空间不存在');

    if (!ws.repos.includes(repoId)) {
      ws.repos.push(repoId);
      ws.updatedAt = Date.now();
      this._save();
    }
  }

  /**
   * 将仓库从工作空间移除（不删除仓库本身）
   */
  removeRepo(workspaceId, repoId) {
    const ws = this.workspaces.find(w => w.id === workspaceId);
    if (!ws) throw new Error('工作空间不存在');

    ws.repos = ws.repos.filter(id => id !== repoId);
    ws.updatedAt = Date.now();
    this._save();
  }

  /**
   * 查找仓库所属的工作空间
   */
  findWorkspaceForRepo(repoId) {
    for (const ws of this.workspaces) {
      if (ws.repos.includes(repoId)) {
        return ws;
      }
    }
    return null;
  }

  /**
   * 将未分配仓库归入默认工作空间
   */
  organizeOrphanRepos() {
    const allRepos = this._loadGlobalRepoList();
    const assignedIds = new Set();
    for (const ws of this.workspaces) {
      ws.repos.forEach(id => assignedIds.add(id));
    }

    const orphans = allRepos.filter(r => !assignedIds.has(r.id));
    if (orphans.length > 0) {
      let defaultWs = this.workspaces.find(w => w.name === '默认');
      if (!defaultWs) {
        defaultWs = this.create('默认', { icon: '📂', description: '默认工作空间' });
      }
      orphans.forEach(r => {
        if (!defaultWs.repos.includes(r.id)) {
          defaultWs.repos.push(r.id);
        }
      });
      this._save();
    }

    return orphans.length;
  }

  /**
   * 获取工作空间列表（带仓库数量统计）
   */
  getListWithStats() {
    const allRepos = this._loadGlobalRepoList();

    return this.workspaces.map(ws => {
      const wsRepos = allRepos.filter(r => ws.repos.includes(r.id));
      return {
        ...ws,
        repoCount: wsRepos.length,
        isCurrent: ws.id === this.currentWorkspaceId,
        lastAccessedText: this._formatTime(ws.lastAccessed)
      };
    });
  }

  // ========== 模板 ==========

  createFromTemplate(template) {
    const templates = {
      work: { name: '工作', icon: '💼', color: '#0366d6', description: '工作相关项目' },
      personal: { name: '个人', icon: '🏠', color: '#28a745', description: '个人项目' },
      opensource: { name: '开源', icon: '🌍', color: '#6f42c1', description: '开源项目贡献' },
      learning: { name: '学习', icon: '📚', color: '#e36209', description: '学习和实验项目' }
    };

    const config = templates[template];
    if (!config) throw new Error(`未知模板: ${template}`);
    return this.create(config.name, config);
  }

  // ========== 内部方法 ==========

  _load() {
    try {
      const data = wx.getStorageSync('gitflow_workspaces');
      if (data) {
        const parsed = JSON.parse(data);
        this.workspaces = parsed.workspaces || [];
        this.currentWorkspaceId = parsed.currentId || null;
      }
    } catch (e) {
      this.workspaces = [];
      this.currentWorkspaceId = null;
    }

    if (this.workspaces.length === 0) {
      this._initDefault();
    }
  }

  _save() {
    wx.setStorageSync('gitflow_workspaces', JSON.stringify({
      workspaces: this.workspaces,
      currentId: this.currentWorkspaceId
    }));
  }

  _initDefault() {
    const defaultWs = {
      id: 'ws_default',
      name: '默认',
      slug: 'default',
      path: `${this.baseRoot}/spaces/default`,
      description: '默认工作空间',
      icon: '📂',
      color: '#0366d6',
      repos: [],
      remotes: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastAccessed: Date.now()
    };

    this.fs.mkdirSync(defaultWs.path, true);
    this.workspaces.push(defaultWs);
    this.currentWorkspaceId = defaultWs.id;
    this._save();
  }

  _loadGlobalRepoList() {
    try {
      const data = wx.getStorageSync('gitflow_repos');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  _rmdirSync(dirPath) {
    try {
      const entries = this.fs.readdirSync(dirPath);
      for (const entry of entries) {
        const fullPath = `${dirPath}/${entry}`;
        const stat = this.fs.statSync(fullPath);
        if (stat.isDirectory()) {
          this._rmdirSync(fullPath);
        } else {
          this.fs.unlinkSync(fullPath);
        }
      }
      this.fs.rmdirSync(dirPath);
    } catch (e) {}
  }

  _slugify(text) {
    return text.toLowerCase()
      .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 20) || 'workspace';
  }

  _formatTime(timestamp) {
    if (!timestamp) return '从未';
    const diff = Date.now() - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diff < minute) return '刚刚';
    if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)}小时前`;
    if (diff < 30 * day) return `${Math.floor(diff / day)}天前`;
    return new Date(timestamp).toLocaleDateString();
  }
}
