/**
 * GitStore - 本地仓库存储管理
 * 
 * 管理微信小程序本地文件系统中的Git仓库
 * 基于微信文件系统API实现类Git操作
 */

import { GitObjectStore } from './git-object-store';
import { IndexManager } from './index-manager';
import { DiffEngine } from './diff-engine';

export class GitStore {
  constructor() {
    this.fs = wx.getFileSystemManager();
    this.basePath = `${wx.env.USER_DATA_PATH}/gitflow`;
    this.objectStore = new GitObjectStore(this.fs, this.basePath);
    this.indexManager = new IndexManager(this.fs, this.basePath);
    this.diffEngine = new DiffEngine();
    this.repos = [];
    this.currentRepo = null;
    this._loadRepoList();
  }

  // ========== 仓库管理 ==========

  /**
   * 获取所有仓库列表
   */
  getRepoList() {
    return this.repos;
  }

  /**
   * 初始化新仓库
   */
  async initRepo(name, options = {}) {
    const repoPath = `${this.basePath}/${name}`;
    const gitDir = `${repoPath}/.git`;

    // 创建目录结构
    this.fs.mkdirSync(repoPath, true);
    this.fs.mkdirSync(gitDir, true);
    this.fs.mkdirSync(`${gitDir}/objects`, true);
    this.fs.mkdirSync(`${gitDir}/objects/pack`, true);
    this.fs.mkdirSync(`${gitDir}/refs`, true);
    this.fs.mkdirSync(`${gitDir}/refs/heads`, true);
    this.fs.mkdirSync(`${gitDir}/refs/remotes`, true);
    this.fs.mkdirSync(`${gitDir}/refs/tags`, true);
    this.fs.mkdirSync(`${gitDir}/logs`, true);

    // 写入HEAD
    const defaultBranch = options.defaultBranch || 'main';
    this.fs.writeFileSync(`${gitDir}/HEAD`, `ref: refs/heads/${defaultBranch}`);

    // 写入config
    const config = this._generateGitConfig(name, options);
    this.fs.writeFileSync(`${gitDir}/config`, config);

    // 创建仓库元数据
    const repoMeta = {
      id: this._generateId(),
      name: name,
      path: repoPath,
      defaultBranch: defaultBranch,
      currentBranch: defaultBranch,
      remotes: options.remotes || [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastSync: null,
      size: 0
    };

    // 创建初始提交（空树）
    const emptyTreeHash = this.objectStore.writeTree([]);
    const initialCommitHash = this.objectStore.writeCommit({
      tree: emptyTreeHash,
      message: 'Initial commit',
      author: {
        name: options.authorName || 'User',
        email: options.authorEmail || 'user@example.com',
        timestamp: Date.now()
      }
    });

    // 更新分支指向
    this.fs.writeFileSync(`${gitDir}/refs/heads/${defaultBranch}`, initialCommitHash);

    // 初始化index
    this.indexManager.init(repoPath);

    // 保存仓库元数据
    this.repos.push(repoMeta);
    this._saveRepoList();

    return repoMeta;
  }

  /**
   * 删除仓库
   */
  async deleteRepo(repoId) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    // 递归删除文件
    this._rmdirSync(repo.path);

    // 从列表中移除
    this.repos = this.repos.filter(r => r.id !== repoId);
    this._saveRepoList();
  }

  /**
   * 打开仓库
   */
  openRepo(repoId) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');
    this.currentRepo = repo;
    return repo;
  }

  // ========== 分支操作 ==========

  /**
   * 获取所有分支
   */
  async getBranches(repoId) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const gitDir = `${repo.path}/.git`;
    const branches = [];

    try {
      const files = this.fs.readdirSync(`${gitDir}/refs/heads`);
      for (const file of files) {
        const hash = this.fs.readFileSync(`${gitDir}/refs/heads/${file}`, 'utf-8').trim();
        branches.push({
          name: file,
          hash: hash,
          isCurrent: file === repo.currentBranch
        });
      }
    } catch (e) {
      console.warn('[GitStore] 读取分支失败:', e);
    }

    return branches;
  }

  /**
   * 创建新分支
   */
  async createBranch(repoId, branchName, startPoint) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const gitDir = `${repo.path}/.git`;
    const startHash = startPoint || this._getCurrentCommitHash(gitDir, repo.currentBranch);

    this.fs.writeFileSync(`${gitDir}/refs/heads/${branchName}`, startHash);

    // 记录到reflog
    this._writeReflog(gitDir, branchName, startHash, `branch: Created from ${repo.currentBranch}`);
  }

  /**
   * 切换分支
   */
  async checkoutBranch(repoId, branchName) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const gitDir = `${repo.path}/.git`;

    // 检查分支是否存在
    try {
      this.fs.accessSync(`${gitDir}/refs/heads/${branchName}`);
    } catch (e) {
      throw new Error(`分支 "${branchName}" 不存在`);
    }

    // 检查未提交的更改
    const status = await this.getStatus(repoId);
    if (status.modified.length > 0 || status.staged.length > 0) {
      throw new Error('请先提交或暂存当前更改');
    }

    // 切换HEAD
    const newCommitHash = this.fs.readFileSync(`${gitDir}/refs/heads/${branchName}`, 'utf-8').trim();
    this.fs.writeFileSync(`${gitDir}/HEAD`, `ref: refs/heads/${branchName}`);

    // 恢复工作区文件
    await this._restoreWorkingTree(repo, newCommitHash);

    // 更新仓库记录
    repo.currentBranch = branchName;
    repo.updatedAt = Date.now();
    this._saveRepoList();
  }

  /**
   * 删除分支
   */
  async deleteBranch(repoId, branchName) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    if (branchName === repo.currentBranch) {
      throw new Error('不能删除当前分支');
    }

    const gitDir = `${repo.path}/.git`;
    this.fs.unlinkSync(`${gitDir}/refs/heads/${branchName}`);
  }

  // ========== 文件状态 ==========

  /**
   * 获取仓库状态
   */
  async getStatus(repoId) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const gitDir = `${repo.path}/.git`;
    const currentHash = this._getCurrentCommitHash(gitDir, repo.currentBranch);

    // 获取HEAD中的文件列表
    const headFiles = this.objectStore.readTreeFromCommit(currentHash);

    // 获取暂存区(index)中的文件列表
    const stagedFiles = this.indexManager.getStagedFiles(repo.path);

    // 获取工作区文件列表
    const workTreeFiles = this._listWorkTreeFiles(repo.path);

    // 计算状态
    const status = {
      staged: [],      // 已暂存的更改
      modified: [],    // 工作区修改
      untracked: [],   // 未跟踪的文件
      deleted: [],     // 已删除的文件
      conflicted: [],  // 冲突文件
      ahead: 0,        // 领先远程的提交数
      behind: 0        // 落后远程的提交数
    };

    // 对比HEAD和index，找出staged
    for (const file of stagedFiles) {
      const headFile = headFiles.find(f => f.path === file.path);
      if (!headFile) {
        status.staged.push({ path: file.path, status: 'added' });
      } else if (file.hash !== headFile.hash) {
        status.staged.push({ path: file.path, status: 'modified' });
      }
    }

    // 对比index和工作区，找出modified和untracked
    for (const workFile of workTreeFiles) {
      const stagedFile = stagedFiles.find(f => f.path === workFile.path);
      if (!stagedFile) {
        const headFile = headFiles.find(f => f.path === workFile.path);
        if (!headFile) {
          status.untracked.push({ path: workFile.path });
        } else {
          // 比较内容
          const workContent = this.fs.readFileSync(workFile.fullPath, 'utf-8');
          const headContent = this.objectStore.readBlob(headFile.hash);
          if (workContent !== headContent) {
            status.modified.push({ path: workFile.path });
          }
        }
      }
    }

    // 检查已删除的文件
    for (const headFile of headFiles) {
      const workFile = workTreeFiles.find(f => f.path === headFile.path);
      if (!workFile) {
        status.deleted.push({ path: headFile.path });
      }
    }

    return status;
  }

  // ========== 暂存操作 ==========

  /**
   * 添加文件到暂存区
   */
  async add(repoId, filePaths) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    for (const filePath of filePaths) {
      const fullPath = `${repo.path}/${filePath}`;
      const content = this.fs.readFileSync(fullPath);
      const hash = this.objectStore.writeBlob(content);

      this.indexManager.add(repo.path, filePath, hash);
    }
  }

  /**
   * 从暂存区移除文件
   */
  async unstage(repoId, filePaths) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    for (const filePath of filePaths) {
      this.indexManager.remove(repo.path, filePath);
    }
  }

  /**
   * 暂存所有更改
   */
  async addAll(repoId) {
    const status = await this.getStatus(repoId);
    const allFiles = [
      ...status.modified.map(f => f.path),
      ...status.untracked.map(f => f.path)
    ];
    await this.add(repoId, allFiles);
  }

  // ========== 提交操作 ==========

  /**
   * 创建提交
   */
  async commit(repoId, message, options = {}) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const gitDir = `${repo.path}/.git`;

    // 构建tree对象
    const stagedFiles = this.indexManager.getStagedFiles(repo.path);
    const treeHash = this._buildTreeFromIndex(stagedFiles);

    // 获取父提交
    const parentHash = this._getCurrentCommitHash(gitDir, repo.currentBranch);

    // 创建commit对象
    const commitHash = this.objectStore.writeCommit({
      tree: treeHash,
      parent: parentHash,
      message: message,
      author: {
        name: options.authorName || 'User',
        email: options.authorEmail || 'user@example.com',
        timestamp: Date.now()
      },
      committer: {
        name: options.committerName || 'User',
        email: options.committerEmail || 'user@example.com',
        timestamp: Date.now()
      }
    });

    // 更新分支引用
    this.fs.writeFileSync(`${gitDir}/refs/heads/${repo.currentBranch}`, commitHash);

    // 更新reflog
    this._writeReflog(gitDir, repo.currentBranch, commitHash, `commit: ${message}`);

    // 更新仓库信息
    repo.updatedAt = Date.now();
    this._saveRepoList();

    return commitHash;
  }

  // ========== 提交历史 ==========

  /**
   * 获取提交历史
   */
  async getCommitLog(repoId, options = {}) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const gitDir = `${repo.path}/.git`;
    const branch = options.branch || repo.currentBranch;
    const maxCount = options.maxCount || 50;
    const skip = options.skip || 0;

    let currentHash = this._getCurrentCommitHash(gitDir, branch);
    const commits = [];
    let count = 0;
    let skipped = 0;

    while (currentHash && count < maxCount) {
      const commit = this.objectStore.readCommit(currentHash);
      if (!commit) break;

      if (skipped < skip) {
        skipped++;
      } else {
        commits.push({
          hash: currentHash,
          shortHash: currentHash.substring(0, 7),
          message: commit.message,
          author: commit.author,
          committer: commit.committer,
          parent: commit.parent,
          tree: commit.tree
        });
        count++;
      }

      currentHash = commit.parent || null;
    }

    return commits;
  }

  /**
   * 获取单个提交详情
   */
  async getCommitDetail(repoId, commitHash) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const commit = this.objectStore.readCommit(commitHash);
    if (!commit) throw new Error('提交不存在');

    // 获取diff
    let diff = [];
    if (commit.parent) {
      const parentCommit = this.objectStore.readCommit(commit.parent);
      const parentTree = this.objectStore.readTreeFromCommit(commit.parent);
      const currentTree = this.objectStore.readTree(commit.tree);
      diff = this.diffEngine.computeDiff(parentTree, currentTree);
    }

    return {
      hash: commitHash,
      message: commit.message,
      author: commit.author,
      committer: commit.committer,
      parent: commit.parent,
      diff: diff
    };
  }

  // ========== 远程操作 ==========

  /**
   * 添加远程仓库
   */
  async addRemote(repoId, name, url) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    // 检查是否已存在
    if (repo.remotes.find(r => r.name === name)) {
      throw new Error(`远程仓库 "${name}" 已存在`);
    }

    repo.remotes.push({
      name: name,
      url: url,
      addedAt: Date.now()
    });

    // 创建远程引用目录
    const gitDir = `${repo.path}/.git`;
    this.fs.mkdirSync(`${gitDir}/refs/remotes/${name}`, true);

    this._saveRepoList();
  }

  /**
   * 删除远程仓库
   */
  async removeRemote(repoId, name) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    repo.remotes = repo.remotes.filter(r => r.name !== name);
    this._saveRepoList();
  }

  /**
   * 从远程拉取（通过HTTPS API）
   */
  async fetch(repoId, remoteName, options = {}) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const remote = repo.remotes.find(r => r.name === remoteName);
    if (!remote) throw new Error(`远程仓库 "${remoteName}" 不存在`);

    const gitDir = `${repo.path}/.git`;
    const results = {
      fetched: [],
      errors: []
    };

    try {
      // 使用GitHub API或其他Git托管服务API获取数据
      const apiData = await this._fetchFromRemoteAPI(remote.url, options);

      // 处理获取到的引用
      for (const ref of apiData.refs) {
        // 将远程分支存储到refs/remotes/<name>/<branch>
        const refPath = `${gitDir}/refs/remotes/${remoteName}/${ref.name}`;
        this.fs.writeFileSync(refPath, ref.hash);
        results.fetched.push(ref.name);
      }

      // 下载pack数据并解压到对象存储
      if (apiData.packs) {
        for (const pack of apiData.packs) {
          await this.objectStore.importPack(pack);
        }
      }

      // 更新同步时间
      repo.lastSync = Date.now();
      this._saveRepoList();

    } catch (error) {
      results.errors.push({
        remote: remoteName,
        message: error.message
      });
    }

    return results;
  }

  /**
   * 拉取并合并（pull = fetch + merge）
   */
  async pull(repoId, remoteName, options = {}) {
    const fetchResult = await this.fetch(repoId, remoteName, options);
    if (fetchResult.errors.length > 0) {
      return { success: false, errors: fetchResult.errors };
    }

    const repo = this.repos.find(r => r.id === repoId);
    const gitDir = `${repo.path}/.git`;

    // 获取远程分支的最新提交
    const remoteBranch = options.branch || repo.defaultBranch;
    const remoteRefPath = `${gitDir}/refs/remotes/${remoteName}/${remoteBranch}`;

    try {
      const remoteHash = this.fs.readFileSync(remoteRefPath, 'utf-8').trim();
      const localHash = this._getCurrentCommitHash(gitDir, repo.currentBranch);

      if (remoteHash === localHash) {
        return { success: true, message: 'Already up to date', changed: false };
      }

      // 尝试快进合并
      const canFastForward = await this._canFastForward(gitDir, localHash, remoteHash);

      if (canFastForward) {
        // 快进合并
        this.fs.writeFileSync(`${gitDir}/refs/heads/${repo.currentBranch}`, remoteHash);
        await this._restoreWorkingTree(repo, remoteHash);
        return { success: true, message: 'Fast-forward merge', changed: true };
      } else {
        // 需要三方合并
        const mergeResult = await this._threeWayMerge(repo, localHash, remoteHash);
        return mergeResult;
      }
    } catch (e) {
      return { success: false, errors: [{ message: e.message }] };
    }
  }

  /**
   * 同步所有远程仓库
   */
  async syncAll(repoId) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const results = [];
    for (const remote of repo.remotes) {
      const result = await this.fetch(repoId, remote.name);
      results.push({ remote: remote.name, ...result });
    }

    repo.lastSync = Date.now();
    this._saveRepoList();

    return results;
  }

  // ========== 文件操作 ==========

  /**
   * 读取文件内容
   */
  async readFile(repoId, filePath) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const fullPath = `${repo.path}/${filePath}`;
    try {
      return this.fs.readFileSync(fullPath, 'utf-8');
    } catch (e) {
      throw new Error(`文件不存在: ${filePath}`);
    }
  }

  /**
   * 写入文件
   */
  async writeFile(repoId, filePath, content) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const fullPath = `${repo.path}/${filePath}`;

    // 确保目录存在
    const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
    this.fs.mkdirSync(dir, true);

    this.fs.writeFileSync(fullPath, content, 'utf-8');
  }

  /**
   * 删除文件
   */
  async deleteFile(repoId, filePath) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const fullPath = `${repo.path}/${filePath}`;
    this.fs.unlinkSync(fullPath);
  }

  /**
   * 创建目录
   */
  async mkdir(repoId, dirPath) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const fullPath = `${repo.path}/${dirPath}`;
    this.fs.mkdirSync(fullPath, true);
  }

  /**
   * 列出目录内容
   */
  async listDir(repoId, dirPath = '') {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const fullPath = dirPath ? `${repo.path}/${dirPath}` : repo.path;
    const gitDir = `${repo.path}/.git`;

    try {
      const entries = this.fs.readdirSync(fullPath);
      const items = [];

      for (const entry of entries) {
        if (entry === '.git') continue; // 隐藏.git目录

        const entryPath = dirPath ? `${dirPath}/${entry}` : entry;
        const entryFullPath = `${fullPath}/${entry}`;
        const stat = this.fs.statSync(entryFullPath);

        items.push({
          name: entry,
          path: entryPath,
          fullPath: entryFullPath,
          isDirectory: stat.isDirectory(),
          size: stat.size,
          modifiedTime: stat.mtime
        });
      }

      // 排序：目录在前
      items.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      return items;
    } catch (e) {
      return [];
    }
  }

  /**
   * 移动/重命名文件
   */
  async moveFile(repoId, srcPath, destPath) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const srcFullPath = `${repo.path}/${srcPath}`;
    const destFullPath = `${repo.path}/${destPath}`;

    // 确保目标目录存在
    const destDir = destFullPath.substring(0, destFullPath.lastIndexOf('/'));
    this.fs.mkdirSync(destDir, true);

    this.fs.renameSync(srcFullPath, destFullPath);
  }

  // ========== 合并操作 ==========

  /**
   * 合并分支
   */
  async merge(repoId, sourceBranch, options = {}) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const gitDir = `${repo.path}/.git`;
    const currentHash = this._getCurrentCommitHash(gitDir, repo.currentBranch);
    const sourceHash = this._getCurrentCommitHash(gitDir, sourceBranch);

    if (currentHash === sourceHash) {
      return { success: true, message: 'Already up to date' };
    }

    // 尝试快进
    const canFF = await this._canFastForward(gitDir, currentHash, sourceHash);
    if (canFF && !options.noFastForward) {
      this.fs.writeFileSync(`${gitDir}/refs/heads/${repo.currentBranch}`, sourceHash);
      await this._restoreWorkingTree(repo, sourceHash);
      return { success: true, message: 'Fast-forward', changed: true };
    }

    // 三方合并
    return await this._threeWayMerge(repo, currentHash, sourceHash);
  }

  // ========== Diff操作 ==========

  /**
   * 获取文件diff
   */
  async getFileDiff(repoId, filePath, options = {}) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const gitDir = `${repo.path}/.git`;
    const currentHash = this._getCurrentCommitHash(gitDir, repo.currentBranch);

    // 获取HEAD版本
    let oldContent = '';
    try {
      const headFiles = this.objectStore.readTreeFromCommit(currentHash);
      const fileEntry = headFiles.find(f => f.path === filePath);
      if (fileEntry) {
        oldContent = this.objectStore.readBlob(fileEntry.hash);
      }
    } catch (e) {
      // 新文件
    }

    // 获取工作区版本
    let newContent = '';
    try {
      newContent = this.fs.readFileSync(`${repo.path}/${filePath}`, 'utf-8');
    } catch (e) {
      // 文件已删除
    }

    return this.diffEngine.computeLineDiff(oldContent, newContent);
  }

  // ========== 暂存(stash)操作 ==========

  /**
   * 保存暂存
   */
  async stash(repoId, message) {
    const repo = this.repos.find(r => r.id === repoId);
    if (!repo) throw new Error('仓库不存在');

    const status = await this.getStatus(repoId);
    const stashData = {
      id: this._generateId(),
      message: message || `WIP on ${repo.currentBranch}`,
      timestamp: Date.now(),
      branch: repo.currentBranch,
      modified: [],
      untracked: []
    };

    // 保存修改的文件内容
    for (const file of status.modified) {
      const content = this.fs.readFileSync(`${repo.path}/${file.path}`, 'utf-8');
      stashData.modified.push({ path: file.path, content });
    }

    // 保存未跟踪的文件
    for (const file of status.untracked) {
      const content = this.fs.readFileSync(`${repo.path}/${file.path}`, 'utf-8');
      stashData.untracked.push({ path: file.path, content });
    }

    // 保存stash到本地存储
    const stashes = this._getStashList(repoId);
    stashes.unshift(stashData);
    this._saveStashList(repoId, stashes);

    // 恢复工作区
    await this._restoreWorkingTree(repo, this._getCurrentCommitHash(`${repo.path}/.git`, repo.currentBranch));

    // 删除未跟踪的文件
    for (const file of status.untracked) {
      this.fs.unlinkSync(`${repo.path}/${file.path}`);
    }

    return stashData;
  }

  /**
   * 恢复暂存
   */
  async stashPop(repoId, stashIndex = 0) {
    const stashes = this._getStashList(repoId);
    if (stashIndex >= stashes.length) throw new Error('暂存不存在');

    const stash = stashes[stashIndex];
    const repo = this.repos.find(r => r.id === repoId);

    // 恢复文件
    for (const file of stash.modified) {
      const fullPath = `${repo.path}/${file.path}`;
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      this.fs.mkdirSync(dir, true);
      this.fs.writeFileSync(fullPath, file.content, 'utf-8');
    }

    for (const file of stash.untracked) {
      const fullPath = `${repo.path}/${file.path}`;
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      this.fs.mkdirSync(dir, true);
      this.fs.writeFileSync(fullPath, file.content, 'utf-8');
    }

    // 移除已恢复的stash
    stashes.splice(stashIndex, 1);
    this._saveStashList(repoId, stashes);
  }

  /**
   * 获取暂存列表
   */
  getStashList(repoId) {
    return this._getStashList(repoId);
  }

  // ========== 内部方法 ==========

  _loadRepoList() {
    try {
      const data = wx.getStorageSync('gitflow_repos');
      this.repos = data ? JSON.parse(data) : [];
    } catch (e) {
      this.repos = [];
    }
  }

  _saveRepoList() {
    wx.setStorageSync('gitflow_repos', JSON.stringify(this.repos));
  }

  _generateId() {
    return 'repo_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
  }

  _generateGitConfig(name, options) {
    return `[core]
  repositoryformatversion = 0
  filemode = true
  bare = false
  logallrefupdates = true
[remote]
${(options.remotes || []).map(r => `[remote "${r.name}"]
  url = ${r.url}
  fetch = +refs/heads/*:refs/remotes/${r.name}/*`).join('\n')}
[branch "${options.defaultBranch || 'main'}"]
  remote = ${(options.remotes && options.remotes[0]) ? options.remotes[0].name : 'origin'}
  merge = refs/heads/${options.defaultBranch || 'main'}
`;
  }

  _getCurrentCommitHash(gitDir, branch) {
    try {
      return this.fs.readFileSync(`${gitDir}/refs/heads/${branch}`, 'utf-8').trim();
    } catch (e) {
      return null;
    }
  }

  _listWorkTreeFiles(repoPath) {
    const files = [];
    const walk = (dir, prefix) => {
      try {
        const entries = this.fs.readdirSync(dir);
        for (const entry of entries) {
          if (entry === '.git') continue;
          const fullPath = `${dir}/${entry}`;
          const relativePath = prefix ? `${prefix}/${entry}` : entry;
          const stat = this.fs.statSync(fullPath);
          if (stat.isDirectory()) {
            walk(fullPath, relativePath);
          } else {
            files.push({ path: relativePath, fullPath });
          }
        }
      } catch (e) {
        // skip
      }
    };
    walk(repoPath, '');
    return files;
  }

  _buildTreeFromIndex(stagedFiles) {
    const treeEntries = stagedFiles.map(f => ({
      path: f.path,
      hash: f.hash,
      mode: '100644',
      type: 'blob'
    }));
    return this.objectStore.writeTree(treeEntries);
  }

  async _restoreWorkingTree(repo, commitHash) {
    const files = this.objectStore.readTreeFromCommit(commitHash);

    for (const file of files) {
      const content = this.objectStore.readBlob(file.hash);
      const fullPath = `${repo.path}/${file.path}`;
      const dir = fullPath.substring(0, fullPath.lastIndexOf('/'));
      this.fs.mkdirSync(dir, true);
      this.fs.writeFileSync(fullPath, content, 'utf-8');
    }
  }

  async _canFastForward(gitDir, baseHash, targetHash) {
    // 简单实现：检查base是否是target的祖先
    let current = targetHash;
    const maxDepth = 1000;
    let depth = 0;

    while (current && depth < maxDepth) {
      if (current === baseHash) return true;
      const commit = this.objectStore.readCommit(current);
      if (!commit) break;
      current = commit.parent || null;
      depth++;
    }

    return false;
  }

  async _threeWayMerge(repo, localHash, remoteHash) {
    // 找到共同祖先
    const baseHash = await this._findMergeBase(repo.path + '/.git', localHash, remoteHash);

    if (!baseHash) {
      return { success: false, errors: [{ message: '无法找到共同祖先' }] };
    }

    // 获取三个版本的树
    const baseTree = this.objectStore.readTreeFromCommit(baseHash);
    const localTree = this.objectStore.readTreeFromCommit(localHash);
    const remoteTree = this.objectStore.readTreeFromCommit(remoteHash);

    // 三方合并
    const mergeResult = this.diffEngine.threeWayMerge(baseTree, localTree, remoteTree);

    if (mergeResult.hasConflicts) {
      return {
        success: false,
        conflicts: mergeResult.conflicts,
        message: '合并冲突，需要手动解决'
      };
    }

    // 创建合并提交
    const mergedTreeHash = this.objectStore.writeTree(mergeResult.mergedTree);
    const mergeCommitHash = this.objectStore.writeCommit({
      tree: mergedTreeHash,
      parent: localHash,
      parent2: remoteHash, // merge commit有两个parent
      message: `Merge branch '${repo.currentBranch}'`,
      author: {
        name: 'User',
        email: 'user@example.com',
        timestamp: Date.now()
      }
    });

    const gitDir = `${repo.path}/.git`;
    this.fs.writeFileSync(`${gitDir}/refs/heads/${repo.currentBranch}`, mergeCommitHash);
    await this._restoreWorkingTree(repo, mergeCommitHash);

    return { success: true, message: '合并成功', changed: true };
  }

  async _findMergeBase(gitDir, hash1, hash2) {
    // 获取hash1的所有祖先
    const ancestors1 = new Set();
    let current = hash1;
    while (current) {
      ancestors1.add(current);
      const commit = this.objectStore.readCommit(current);
      if (!commit) break;
      current = commit.parent || null;
    }

    // 从hash2向上查找第一个在ancestors1中的提交
    current = hash2;
    while (current) {
      if (ancestors1.has(current)) return current;
      const commit = this.objectStore.readCommit(current);
      if (!commit) break;
      current = commit.parent || null;
    }

    return null;
  }

  _writeReflog(gitDir, ref, hash, message) {
    const logPath = `${gitDir}/logs/refs/heads/${ref}`;
    const entry = `${hash} ${message} ${Date.now()}\n`;
    try {
      const existing = this.fs.readFileSync(logPath, 'utf-8');
      this.fs.writeFileSync(logPath, existing + entry);
    } catch (e) {
      this.fs.writeFileSync(logPath, entry);
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
    } catch (e) {
      // skip
    }
  }

  async _fetchFromRemoteAPI(url, options) {
    // 解析Git托管服务URL并调用API
    // 支持GitHub, GitLab, Gitee等
    const parsed = this._parseGitUrl(url);

    switch (parsed.service) {
      case 'github':
        return await this._fetchFromGitHub(parsed, options);
      case 'gitlab':
        return await this._fetchFromGitLab(parsed, options);
      case 'gitee':
        return await this._fetchFromGitee(parsed, options);
      default:
        throw new Error('不支持的Git服务');
    }
  }

  _parseGitUrl(url) {
    // 解析各种git URL格式
    const patterns = [
      { regex: /github\.com[/:]([^/]+)\/([^/.]+)/, service: 'github' },
      { regex: /gitlab\.com[/:]([^/]+)\/([^/.]+)/, service: 'gitlab' },
      { regex: /gitee\.com[/:]([^/]+)\/([^/.]+)/, service: 'gitee' }
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern.regex);
      if (match) {
        return {
          service: pattern.service,
          owner: match[1],
          repo: match[2].replace('.git', ''),
          originalUrl: url
        };
      }
    }

    throw new Error('无法解析Git URL');
  }

  async _fetchFromGitHub(parsed, options) {
    const { owner, repo } = parsed;
    const token = options.token || wx.getStorageSync('github_token');

    const headers = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitFlow-MiniProgram'
    };
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    // 获取分支列表
    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://api.github.com/repos/${owner}/${repo}/git/refs/heads`,
        header: headers,
        success: (res) => {
          if (res.statusCode === 200) {
            const refs = res.data.map(ref => ({
              name: ref.ref.replace('refs/heads/', ''),
              hash: ref.object.sha
            }));
            resolve({ refs, packs: [] });
          } else {
            reject(new Error(`GitHub API错误: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(`网络请求失败: ${err.errMsg}`))
      });
    });
  }

  async _fetchFromGitLab(parsed, options) {
    const { owner, repo } = parsed;
    const projectId = `${owner}/${repo}`;
    const token = options.token || wx.getStorageSync('gitlab_token');

    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://gitlab.com/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`,
        header: {
          'PRIVATE-TOKEN': token || '',
          'Content-Type': 'application/json'
        },
        success: (res) => {
          if (res.statusCode === 200) {
            const refs = res.data.map(branch => ({
              name: branch.name,
              hash: branch.commit.id
            }));
            resolve({ refs, packs: [] });
          } else {
            reject(new Error(`GitLab API错误: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(`网络请求失败: ${err.errMsg}`))
      });
    });
  }

  async _fetchFromGitee(parsed, options) {
    const { owner, repo } = parsed;
    const token = options.token || wx.getStorageSync('gitee_token');

    return new Promise((resolve, reject) => {
      wx.request({
        url: `https://gitee.com/api/v5/repos/${owner}/${repo}/branches`,
        header: {
          'Content-Type': 'application/json'
        },
        data: token ? { access_token: token } : {},
        success: (res) => {
          if (res.statusCode === 200) {
            const refs = res.data.map(branch => ({
              name: branch.name,
              hash: branch.commit.sha
            }));
            resolve({ refs, packs: [] });
          } else {
            reject(new Error(`Gitee API错误: ${res.statusCode}`));
          }
        },
        fail: (err) => reject(new Error(`网络请求失败: ${err.errMsg}`))
      });
    });
  }

  _getStashList(repoId) {
    const data = wx.getStorageSync(`gitflow_stash_${repoId}`);
    return data ? JSON.parse(data) : [];
  }

  _saveStashList(repoId, stashes) {
    wx.setStorageSync(`gitflow_stash_${repoId}`, JSON.stringify(stashes));
  }
}
