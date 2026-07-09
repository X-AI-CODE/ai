/**
 * RemoteManager - 远程仓库管理器
 * 
 * 管理多个远程Git仓库的连接和同步
 * 支持GitHub, GitLab, Gitee等主流平台
 */

export class RemoteManager {
  constructor() {
    this.remotes = this._loadRemotes();
    this.supportedServices = ['github', 'gitlab', 'gitee', 'custom'];
  }

  /**
   * 获取所有已配置的远程仓库
   */
  getAllRemotes() {
    return this.remotes;
  }

  /**
   * 添加远程仓库配置
   */
  addRemote(config) {
    const remote = {
      id: this._generateId(),
      name: config.name,
      url: config.url,
      service: this._detectService(config.url),
      token: config.token || '',
      branch: config.branch || 'main',
      autoSync: config.autoSync || false,
      syncInterval: config.syncInterval || 30,
      lastSync: null,
      addedAt: Date.now(),
      status: 'idle' // idle, syncing, error
    };

    // 验证URL
    if (!this._validateUrl(remote.url)) {
      throw new Error('无效的Git仓库URL');
    }

    this.remotes.push(remote);
    this._saveRemotes();

    return remote;
  }

  /**
   * 更新远程仓库配置
   */
  updateRemote(remoteId, updates) {
    const remote = this.remotes.find(r => r.id === remoteId);
    if (!remote) throw new Error('远程仓库不存在');

    Object.assign(remote, updates);
    this._saveRemotes();

    return remote;
  }

  /**
   * 删除远程仓库
   */
  removeRemote(remoteId) {
    this.remotes = this.remotes.filter(r => r.id !== remoteId);
    this._saveRemotes();
  }

  /**
   * 测试远程仓库连接
   */
  async testConnection(remoteId) {
    const remote = this.remotes.find(r => r.id === remoteId);
    if (!remote) throw new Error('远程仓库不存在');

    const parsed = this._parseUrl(remote.url);

    try {
      switch (parsed.service) {
        case 'github':
          return await this._testGitHub(parsed, remote.token);
        case 'gitlab':
          return await this._testGitLab(parsed, remote.token);
        case 'gitee':
          return await this._testGitee(parsed, remote.token);
        default:
          return { success: true, message: '连接成功（通用检测）' };
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * 获取远程分支列表
   */
  async getRemoteBranches(remoteId) {
    const remote = this.remotes.find(r => r.id === remoteId);
    if (!remote) throw new Error('远程仓库不存在');

    const parsed = this._parseUrl(remote.url);

    switch (parsed.service) {
      case 'github':
        return await this._getGitHubBranches(parsed, remote.token);
      case 'gitlab':
        return await this._getGitLabBranches(parsed, remote.token);
      case 'gitee':
        return await this._getGiteeBranches(parsed, remote.token);
      default:
        return [];
    }
  }

  /**
   * 获取远程仓库信息
   */
  async getRemoteInfo(remoteId) {
    const remote = this.remotes.find(r => r.id === remoteId);
    if (!remote) throw new Error('远程仓库不存在');

    const parsed = this._parseUrl(remote.url);

    switch (parsed.service) {
      case 'github':
        return await this._getGitHubInfo(parsed, remote.token);
      case 'gitlab':
        return await this._getGitLabInfo(parsed, remote.token);
      case 'gitee':
        return await this._getGiteeInfo(parsed, remote.token);
      default:
        return { name: parsed.repo, owner: parsed.owner };
    }
  }

  /**
   * 同步远程仓库
   */
  async syncRemote(remoteId, options = {}) {
    const remote = this.remotes.find(r => r.id === remoteId);
    if (!remote) throw new Error('远程仓库不存在');

    remote.status = 'syncing';
    this._saveRemotes();

    try {
      const branches = await this.getRemoteBranches(remoteId);
      remote.lastSync = Date.now();
      remote.status = 'idle';
      this._saveRemotes();

      return {
        success: true,
        branches: branches,
        syncedAt: remote.lastSync
      };
    } catch (error) {
      remote.status = 'error';
      this._saveRemotes();
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 下载远程文件
   */
  async downloadFile(remoteId, filePath, branch) {
    const remote = this.remotes.find(r => r.id === remoteId);
    if (!remote) throw new Error('远程仓库不存在');

    const parsed = this._parseUrl(remote.url);
    const targetBranch = branch || remote.branch;

    switch (parsed.service) {
      case 'github':
        return await this._downloadGitHubFile(parsed, filePath, targetBranch, remote.token);
      case 'gitlab':
        return await this._downloadGitLabFile(parsed, filePath, targetBranch, remote.token);
      case 'gitee':
        return await this._downloadGiteeFile(parsed, filePath, targetBranch, remote.token);
      default:
        throw new Error('不支持的Git服务');
    }
  }

  /**
   * 批量下载仓库文件
   */
  async downloadRepo(remoteId, options = {}) {
    const remote = this.remotes.find(r => r.id === remoteId);
    if (!remote) throw new Error('远程仓库不存在');

    const parsed = this._parseUrl(remote.url);
    const branch = options.branch || remote.branch;

    try {
      // 获取仓库文件树
      const fileTree = await this._getFileTree(parsed, branch, remote.token);

      // 过滤大文件和排除项
      const filteredFiles = fileTree.filter(f => {
        if (f.size > 1024 * 1024) return false; // 跳过1MB以上文件
        if (this._isExcluded(f.path)) return false;
        return true;
      });

      // 分批下载（避免并发过多）
      const batchSize = 5;
      const downloaded = [];
      const failed = [];

      for (let i = 0; i < filteredFiles.length; i += batchSize) {
        const batch = filteredFiles.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.map(f => this._downloadSingleFile(parsed, f, branch, remote.token))
        );

        results.forEach((result, idx) => {
          if (result.status === 'fulfilled') {
            downloaded.push({ path: batch[idx].path, content: result.value });
          } else {
            failed.push({ path: batch[idx].path, error: result.reason.message });
          }
        });
      }

      return {
        success: true,
        downloaded: downloaded,
        failed: failed,
        total: fileTree.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // ========== 平台特定方法 ==========

  async _testGitHub(parsed, token) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitFlow-MiniProgram'
      };
      if (token) headers['Authorization'] = `token ${token}`;

      wx.request({
        url: `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
        header: headers,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve({ success: true, message: `仓库: ${res.data.full_name}` });
          } else {
            reject(new Error(`GitHub返回错误: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getGitHubBranches(parsed, token) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitFlow-MiniProgram'
      };
      if (token) headers['Authorization'] = `token ${token}`;

      wx.request({
        url: `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/branches`,
        header: headers,
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.map(b => ({ name: b.name, protected: b.protected })));
          } else {
            reject(new Error(`获取分支失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getGitHubInfo(parsed, token) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitFlow-MiniProgram'
      };
      if (token) headers['Authorization'] = `token ${token}`;

      wx.request({
        url: `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
        header: headers,
        success: (res) => {
          if (res.statusCode === 200) {
            const data = res.data;
            resolve({
              name: data.name,
              fullName: data.full_name,
              description: data.description,
              defaultBranch: data.default_branch,
              language: data.language,
              stars: data.stargazers_count,
              forks: data.forks_count,
              size: data.size,
              updatedAt: data.updated_at,
              private: data.private
            });
          } else {
            reject(new Error(`获取仓库信息失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _downloadGitHubFile(parsed, filePath, branch, token) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Accept': 'application/vnd.github.v3.raw',
        'User-Agent': 'GitFlow-MiniProgram'
      };
      if (token) headers['Authorization'] = `token ${token}`;

      wx.request({
        url: `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents/${filePath}`,
        header: headers,
        data: { ref: branch },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`下载失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _testGitLab(parsed, token) {
    return new Promise((resolve, reject) => {
      const projectId = `${parsed.owner}/${parsed.repo}`;
      wx.request({
        url: `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}`,
        header: {
          'PRIVATE-TOKEN': token || '',
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve({ success: true, message: `仓库: ${res.data.name}` });
          } else {
            reject(new Error(`GitLab返回错误: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getGitLabBranches(parsed, token) {
    return new Promise((resolve, reject) => {
      const projectId = `${parsed.owner}/${parsed.repo}`;
      wx.request({
        url: `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`,
        header: {
          'PRIVATE-TOKEN': token || '',
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.map(b => ({ name: b.name, protected: b.protected })));
          } else {
            reject(new Error(`获取分支失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getGitLabInfo(parsed, token) {
    return new Promise((resolve, reject) => {
      const projectId = `${parsed.owner}/${parsed.repo}`;
      wx.request({
        url: `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}`,
        header: {
          'PRIVATE-TOKEN': token || '',
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const data = res.data;
            resolve({
              name: data.name,
              fullName: data.path_with_namespace,
              description: data.description,
              defaultBranch: data.default_branch,
              language: null,
              stars: data.star_count,
              forks: data.forks_count,
              size: data.statistics ? data.statistics.repository_size : 0,
              updatedAt: data.last_activity_at,
              private: data.visibility === 'private'
            });
          } else {
            reject(new Error(`获取仓库信息失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _downloadGitLabFile(parsed, filePath, branch, token) {
    return new Promise((resolve, reject) => {
      const projectId = `${parsed.owner}/${parsed.repo}`;
      wx.request({
        url: `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}/raw`,
        header: {
          'PRIVATE-TOKEN': token || ''
        },
        data: { ref: branch },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data);
          } else {
            reject(new Error(`下载失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _testGitee(parsed, token) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}`,
        header: { 'Content-Type': 'application/json' },
        data: token ? { access_token: token } : {},
        success: (res) => {
          if (res.statusCode === 200) {
            resolve({ success: true, message: `仓库: ${res.data.full_name}` });
          } else {
            reject(new Error(`Gitee返回错误: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getGiteeBranches(parsed, token) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}/branches`,
        header: { 'Content-Type': 'application/json' },
        data: token ? { access_token: token } : {},
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.map(b => ({ name: b.name, protected: b.protected })));
          } else {
            reject(new Error(`获取分支失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getGiteeInfo(parsed, token) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}`,
        header: { 'Content-Type': 'application/json' },
        data: token ? { access_token: token } : {},
        success: (res) => {
          if (res.statusCode === 200) {
            const data = res.data;
            resolve({
              name: data.name,
              fullName: data.full_name,
              description: data.description,
              defaultBranch: data.default_branch,
              language: data.language,
              stars: data.stargazers_count,
              forks: data.forks_count,
              size: 0,
              updatedAt: data.updated_at,
              private: data.private
            });
          } else {
            reject(new Error(`获取仓库信息失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _downloadGiteeFile(parsed, filePath, branch, token) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}/contents/${filePath}`,
        header: { 'Content-Type': 'application/json' },
        data: { ref: branch, ...(token ? { access_token: token } : {}) },
        success: (res) => {
          if (res.statusCode === 200) {
            if (res.data.content) {
              // base64解码
              const content = wx.base64 ? wx.base64.decode(res.data.content) : atob(res.data.content);
              resolve(content);
            } else {
              resolve(res.data);
            }
          } else {
            reject(new Error(`下载失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getFileTree(parsed, branch, token) {
    switch (parsed.service) {
      case 'github':
        return await this._getGitHubFileTree(parsed, branch, token);
      case 'gitlab':
        return await this._getGitLabFileTree(parsed, branch, token);
      case 'gitee':
        return await this._getGiteeFileTree(parsed, branch, token);
      default:
        return [];
    }
  }

  async _getGitHubFileTree(parsed, branch, token) {
    return new Promise((resolve, reject) => {
      const headers = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitFlow-MiniProgram'
      };
      if (token) headers['Authorization'] = `token ${token}`;

      wx.request({
        url: `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}`,
        header: headers,
        data: { recursive: 1 },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.tree.filter(t => t.type === 'blob').map(t => ({
              path: t.path,
              size: t.size || 0,
              hash: t.sha
            })));
          } else {
            reject(new Error(`获取文件树失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getGitLabFileTree(parsed, branch, token) {
    return new Promise((resolve, reject) => {
      const projectId = `${parsed.owner}/${parsed.repo}`;
      wx.request({
        url: `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/tree`,
        header: {
          'PRIVATE-TOKEN': token || '',
          'Content-Type': 'application/json'
        },
        data: { ref: branch, recursive: true, per_page: 100 },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.filter(t => t.type === 'blob').map(t => ({
              path: t.path,
              size: 0,
              hash: t.id
            })));
          } else {
            reject(new Error(`获取文件树失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _getGiteeFileTree(parsed, branch, token) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://gitee.com/api/v5/repos/${parsed.owner}/${parsed.repo}/git/trees/${branch}`,
        header: { 'Content-Type': 'application/json' },
        data: { recursive: true, ...(token ? { access_token: token } : {}) },
        success: (res) => {
          if (res.statusCode === 200) {
            resolve(res.data.tree.filter(t => t.type === 'blob').map(t => ({
              path: t.path,
              size: 0,
              hash: t.sha
            })));
          } else {
            reject(new Error(`获取文件树失败: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(err.errMsg))
      });
    });
  }

  async _downloadSingleFile(parsed, file, branch, token) {
    switch (parsed.service) {
      case 'github':
        return await this._downloadGitHubFile(parsed, file.path, branch, token);
      case 'gitlab':
        return await this._downloadGitLabFile(parsed, file.path, branch, token);
      case 'gitee':
        return await this._downloadGiteeFile(parsed, file.path, branch, token);
      default:
        throw new Error('不支持的服务');
    }
  }

  // ========== 工具方法 ==========

  _detectService(url) {
    if (url.includes('github.com')) return 'github';
    if (url.includes('gitlab.com')) return 'gitlab';
    if (url.includes('gitee.com')) return 'gitee';
    return 'custom';
  }

  _parseUrl(url) {
    const patterns = [
      { regex: /github\.com[/:]([^/]+)\/([^/.]+)/, service: 'github' },
      { regex: /gitlab\.com[/:]([^/]+)\/([^/.]+)/, service: 'gitlab' },
      { regex: /gitee\.com[/:]([^/]+)\/([^/.]+)/, service: 'gitee' }
    ];

    for (const p of patterns) {
      const match = url.match(p.regex);
      if (match) {
        return { service: p.service, owner: match[1], repo: match[2].replace('.git', '') };
      }
    }

    return { service: 'custom', owner: '', repo: '', originalUrl: url };
  }

  _validateUrl(url) {
    const patterns = [
      /github\.com[/:][^/]+\/[^/.]+/,
      /gitlab\.com[/:][^/]+\/[^/.]+/,
      /gitee\.com[/:][^/]+\/[^/.]+/,
      /^https?:\/\/.+/
    ];
    return patterns.some(p => p.test(url));
  }

  _isExcluded(path) {
    const excludePatterns = [
      'node_modules', '.git', 'dist', 'build', '__pycache__',
      '.DS_Store', 'Thumbs.db', '*.min.js', '*.min.css',
      'package-lock.json', 'yarn.lock'
    ];
    return excludePatterns.some(pattern => {
      if (pattern.startsWith('*')) {
        return path.endsWith(pattern.substring(1));
      }
      return path.includes(pattern);
    });
  }

  _generateId() {
    return 'remote_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  _loadRemotes() {
    try {
      const data = wx.getStorageSync('gitflow_remotes');
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }

  _saveRemotes() {
    wx.setStorageSync('gitflow_remotes', JSON.stringify(this.remotes));
  }
}
