/**
 * IndexManager - Git暂存区管理
 * 
 * 管理index/staging area，跟踪文件的暂存状态
 * 每个仓库维护一个index.json文件记录暂存区内容
 */

export class IndexManager {
  constructor(fs, basePath) {
    this.fs = fs;
    this.basePath = basePath;
  }

  /**
   * 初始化index
   */
  init(repoPath) {
    const indexPath = `${repoPath}/.git/index.json`;
    const index = {
      version: 1,
      entries: [],
      updatedAt: Date.now()
    };
    this.fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }

  /**
   * 添加文件到暂存区
   */
  add(repoPath, filePath, hash) {
    const index = this._readIndex(repoPath);
    const existingIndex = index.entries.findIndex(e => e.path === filePath);

    const entry = {
      path: filePath,
      hash: hash,
      mode: '100644',
      stagedAt: Date.now()
    };

    if (existingIndex >= 0) {
      index.entries[existingIndex] = entry;
    } else {
      index.entries.push(entry);
    }

    index.updatedAt = Date.now();
    this._writeIndex(repoPath, index);
  }

  /**
   * 从暂存区移除文件
   */
  remove(repoPath, filePath) {
    const index = this._readIndex(repoPath);
    index.entries = index.entries.filter(e => e.path !== filePath);
    index.updatedAt = Date.now();
    this._writeIndex(repoPath, index);
  }

  /**
   * 获取所有已暂存的文件
   */
  getStagedFiles(repoPath) {
    const index = this._readIndex(repoPath);
    return index.entries;
  }

  /**
   * 检查文件是否已暂存
   */
  isStaged(repoPath, filePath) {
    const index = this._readIndex(repoPath);
    return index.entries.some(e => e.path === filePath);
  }

  /**
   * 获取文件在暂存区中的hash
   */
  getStagedHash(repoPath, filePath) {
    const index = this._readIndex(repoPath);
    const entry = index.entries.find(e => e.path === filePath);
    return entry ? entry.hash : null;
  }

  /**
   * 清空暂存区
   */
  clear(repoPath) {
    const index = this._readIndex(repoPath);
    index.entries = [];
    index.updatedAt = Date.now();
    this._writeIndex(repoPath, index);
  }

  /**
   * 获取暂存区文件数量
   */
  getCount(repoPath) {
    const index = this._readIndex(repoPath);
    return index.entries.length;
  }

  // ========== 内部方法 ==========

  _readIndex(repoPath) {
    const indexPath = `${repoPath}/.git/index.json`;
    try {
      const data = this.fs.readFileSync(indexPath, 'utf-8');
      return JSON.parse(data);
    } catch (e) {
      return { version: 1, entries: [], updatedAt: Date.now() };
    }
  }

  _writeIndex(repoPath, index) {
    const indexPath = `${repoPath}/.git/index.json`;
    this.fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  }
}
