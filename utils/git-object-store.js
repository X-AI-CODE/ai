/**
 * GitObjectStore - Git对象存储
 * 
 * 实现Git的四种核心对象类型：
 * - blob: 文件内容
 * - tree: 目录结构
 * - commit: 提交信息
 * - tag: 标签
 * 
 * 使用SHA-1哈希进行内容寻址存储
 */

export class GitObjectStore {
  constructor(fs, basePath) {
    this.fs = fs;
    this.basePath = basePath;
  }

  // ========== Blob对象 ==========

  /**
   * 写入blob对象
   */
  writeBlob(content) {
    const hash = this._sha1(typeof content === 'string' ? content : this._arrayBufferToString(content));
    const objPath = this._getObjectPath(hash);

    try {
      this.fs.accessSync(objPath);
    } catch (e) {
      // 确保目录存在
      const dir = objPath.substring(0, objPath.lastIndexOf('/'));
      this.fs.mkdirSync(dir, true);

      // 写入对象数据（简化存储，实际Git会压缩）
      const data = `blob ${content.length}\0${typeof content === 'string' ? content : this._arrayBufferToString(content)}`;
      this.fs.writeFileSync(objPath, data);
    }

    return hash;
  }

  /**
   * 读取blob对象
   */
  readBlob(hash) {
    const objPath = this._getObjectPath(hash);
    try {
      const data = this.fs.readFileSync(objPath, 'utf-8');
      // 解析blob格式
      const nullIndex = data.indexOf('\0');
      if (nullIndex >= 0) {
        return data.substring(nullIndex + 1);
      }
      return data;
    } catch (e) {
      throw new Error(`Blob对象不存在: ${hash}`);
    }
  }

  // ========== Tree对象 ==========

  /**
   * 写入tree对象
   */
  writeTree(entries) {
    // entries: [{path, hash, mode, type}]
    const content = entries.map(e => `${e.mode} ${e.type} ${e.hash}\t${e.path}`).join('\n');
    const hash = this._sha1(`tree ${content.length}\0${content}`);
    const objPath = this._getObjectPath(hash);

    try {
      this.fs.accessSync(objPath);
    } catch (e) {
      const dir = objPath.substring(0, objPath.lastIndexOf('/'));
      this.fs.mkdirSync(dir, true);
      this.fs.writeFileSync(objPath, `tree ${content.length}\0${content}`);
    }

    return hash;
  }

  /**
   * 读取tree对象
   */
  readTree(hash) {
    const objPath = this._getObjectPath(hash);
    try {
      const data = this.fs.readFileSync(objPath, 'utf-8');
      const nullIndex = data.indexOf('\0');
      const content = data.substring(nullIndex + 1);

      return content.split('\n').filter(Boolean).map(line => {
        const match = line.match(/^(\d+) (\w+) ([a-f0-9]+)\t(.+)$/);
        if (!match) return null;
        return {
          mode: match[1],
          type: match[2],
          hash: match[3],
          path: match[4]
        };
      }).filter(Boolean);
    } catch (e) {
      return [];
    }
  }

  /**
   * 从commit获取完整文件树
   */
  readTreeFromCommit(commitHash) {
    const commit = this.readCommit(commitHash);
    if (!commit) return [];
    return this._expandTree(commit.tree, '');
  }

  /**
   * 展开tree对象获取所有文件
   */
  _expandTree(treeHash, prefix) {
    const entries = this.readTree(treeHash);
    const files = [];

    for (const entry of entries) {
      const fullPath = prefix ? `${prefix}/${entry.path}` : entry.path;
      if (entry.type === 'tree') {
        files.push(...this._expandTree(entry.hash, fullPath));
      } else {
        files.push({
          path: fullPath,
          hash: entry.hash,
          mode: entry.mode,
          type: entry.type
        });
      }
    }

    return files;
  }

  // ========== Commit对象 ==========

  /**
   * 写入commit对象
   */
  writeCommit(data) {
    const content = [
      `tree ${data.tree}`,
      data.parent ? `parent ${data.parent}` : null,
      data.parent2 ? `parent ${data.parent2}` : null,
      `author ${data.author.name} <${data.author.email}> ${data.author.timestamp} +0800`,
      `committer ${data.committer.name} <${data.committer.email}> ${data.committer.timestamp} +0800`,
      '',
      data.message
    ].filter(Boolean).join('\n');

    const hash = this._sha1(`commit ${content.length}\0${content}`);
    const objPath = this._getObjectPath(hash);

    try {
      this.fs.accessSync(objPath);
    } catch (e) {
      const dir = objPath.substring(0, objPath.lastIndexOf('/'));
      this.fs.mkdirSync(dir, true);
      this.fs.writeFileSync(objPath, `commit ${content.length}\0${content}`);
    }

    return hash;
  }

  /**
   * 读取commit对象
   */
  readCommit(hash) {
    const objPath = this._getObjectPath(hash);
    try {
      const data = this.fs.readFileSync(objPath, 'utf-8');
      const nullIndex = data.indexOf('\0');
      const content = data.substring(nullIndex + 1);

      const lines = content.split('\n');
      const commit = {
        tree: null,
        parent: null,
        parent2: null,
        author: null,
        committer: null,
        message: ''
      };

      let messageStart = false;
      const messageLines = [];

      for (const line of lines) {
        if (messageStart) {
          messageLines.push(line);
          continue;
        }

        if (line === '') {
          messageStart = true;
          continue;
        }

        if (line.startsWith('tree ')) {
          commit.tree = line.substring(5);
        } else if (line.startsWith('parent ')) {
          if (!commit.parent) {
            commit.parent = line.substring(7);
          } else {
            commit.parent2 = line.substring(7);
          }
        } else if (line.startsWith('author ')) {
          commit.author = this._parseAuthorLine(line.substring(7));
        } else if (line.startsWith('committer ')) {
          commit.committer = this._parseAuthorLine(line.substring(10));
        }
      }

      commit.message = messageLines.join('\n').trim();
      return commit;
    } catch (e) {
      return null;
    }
  }

  // ========== Tag对象 ==========

  /**
   * 写入tag对象
   */
  writeTag(name, targetHash, message, tagger) {
    const content = [
      `object ${targetHash}`,
      `type commit`,
      `tag ${name}`,
      `tagger ${tagger.name} <${tagger.email}> ${tagger.timestamp} +0800`,
      '',
      message
    ].join('\n');

    const hash = this._sha1(`tag ${content.length}\0${content}`);
    const objPath = this._getObjectPath(hash);

    const dir = objPath.substring(0, objPath.lastIndexOf('/'));
    this.fs.mkdirSync(dir, true);
    this.fs.writeFileSync(objPath, `tag ${content.length}\0${content}`);

    return hash;
  }

  /**
   * 读取tag对象
   */
  readTag(hash) {
    const objPath = this._getObjectPath(hash);
    try {
      const data = this.fs.readFileSync(objPath, 'utf-8');
      const nullIndex = data.indexOf('\0');
      const content = data.substring(nullIndex + 1);

      const lines = content.split('\n');
      const tag = { object: null, type: null, tag: null, tagger: null, message: '' };

      for (const line of lines) {
        if (line.startsWith('object ')) tag.object = line.substring(7);
        else if (line.startsWith('type ')) tag.type = line.substring(5);
        else if (line.startsWith('tag ')) tag.tag = line.substring(4);
        else if (line.startsWith('tagger ')) tag.tagger = this._parseAuthorLine(line.substring(7));
      }

      return tag;
    } catch (e) {
      return null;
    }
  }

  // ========== Pack导入（用于远程同步） ==========

  /**
   * 导入pack数据
   */
  async importPack(packData) {
    // 简化实现：解析并存储每个对象
    // 实际实现需要处理delta压缩
    if (packData.objects) {
      for (const obj of packData.objects) {
        switch (obj.type) {
          case 'blob':
            this.writeBlob(obj.content);
            break;
          case 'tree':
            this.writeTree(obj.entries);
            break;
          case 'commit':
            this.writeCommit(obj.data);
            break;
        }
      }
    }
  }

  // ========== 内部工具方法 ==========

  _getObjectPath(hash) {
    const repoPath = hash.substring(0, 2);
    const fileName = hash.substring(2);
    return `${this.basePath}/.git/objects/${repoPath}/${fileName}`;
  }

  _sha1(str) {
    // 使用微信提供的crypto API或简化实现
    // 这里使用一个简化的hash函数，实际应该用crypto模块
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // 生成40位hex字符串模拟SHA-1
    const base = Math.abs(hash).toString(16).padStart(8, '0');
    const extra = this._hashExtra(str);
    return (base + extra).substring(0, 40);
  }

  _hashExtra(str) {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    const combined = 4294967296 * (2097151 & h2) + (h1 >>> 0);
    return combined.toString(16).padStart(16, '0');
  }

  _parseAuthorLine(line) {
    const match = line.match(/^(.+?)\s+<(.+?)>\s+(\d+)\s+([+-]\d{4})$/);
    if (!match) {
      return { name: line, email: '', timestamp: Date.now(), timezone: '+0800' };
    }
    return {
      name: match[1],
      email: match[2],
      timestamp: parseInt(match[3]),
      timezone: match[4]
    };
  }

  _arrayBufferToString(buffer) {
    const uint8Array = new Uint8Array(buffer);
    let result = '';
    for (let i = 0; i < uint8Array.length; i++) {
      result += String.fromCharCode(uint8Array[i]);
    }
    return result;
  }
}
