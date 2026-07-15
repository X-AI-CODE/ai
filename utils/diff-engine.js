/**
 * DiffEngine - 差异计算引擎
 * 
 * 实现文件差异计算：
 * - 行级diff（类似git diff输出）
 * - 文件树diff（检测增删改）
 * - 三方合并（用于merge操作）
 */

export class DiffEngine {
  constructor() {
    this.MAX_DIFF_LINES = 5000; // 防止大文件导致性能问题
  }

  /**
   * 计算两个文件树之间的差异
   */
  computeDiff(oldTree, newTree) {
    const changes = [];
    const oldMap = new Map();
    const newMap = new Map();

    // 建立文件路径到hash的映射
    for (const entry of oldTree) {
      oldMap.set(entry.path, entry);
    }
    for (const entry of newTree) {
      newMap.set(entry.path, entry);
    }

    // 检测新增和修改
    for (const [path, newEntry] of newMap) {
      const oldEntry = oldMap.get(path);
      if (!oldEntry) {
        changes.push({
          type: 'added',
          path: path,
          newHash: newEntry.hash
        });
      } else if (oldEntry.hash !== newEntry.hash) {
        changes.push({
          type: 'modified',
          path: path,
          oldHash: oldEntry.hash,
          newHash: newEntry.hash
        });
      }
    }

    // 检测删除
    for (const [path, oldEntry] of oldMap) {
      if (!newMap.has(path)) {
        changes.push({
          type: 'deleted',
          path: path,
          oldHash: oldEntry.hash
        });
      }
    }

    return changes;
  }

  /**
   * 计算行级diff（Myers算法简化版）
   */
  computeLineDiff(oldText, newText) {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');

    // 限制行数防止性能问题
    if (oldLines.length > this.MAX_DIFF_LINES || newLines.length > this.MAX_DIFF_LINES) {
      return {
        type: 'binary',
        message: '文件过大，无法显示差异',
        hunks: []
      };
    }

    // 使用LCS（最长公共子序列）算法
    const lcs = this._computeLCS(oldLines, newLines);
    const hunks = this._buildHunks(oldLines, newLines, lcs);

    return {
      type: 'text',
      hunks: hunks,
      stats: {
        additions: hunks.reduce((sum, h) => sum + h.additions, 0),
        deletions: hunks.reduce((sum, h) => sum + h.deletions, 0),
        files: 1
      }
    };
  }

  /**
   * 三方合并
   */
  threeWayMerge(baseTree, localTree, remoteTree) {
    const baseMap = new Map();
    const localMap = new Map();
    const remoteMap = new Map();

    for (const e of baseTree) baseMap.set(e.path, e);
    for (const e of localTree) localMap.set(e.path, e);
    for (const e of remoteTree) remoteMap.set(e.path, e);

    const mergedTree = [];
    const conflicts = [];
    let hasConflicts = false;

    // 收集所有文件路径
    const allPaths = new Set([...baseMap.keys(), ...localMap.keys(), ...remoteMap.keys()]);

    for (const path of allPaths) {
      const base = baseMap.get(path);
      const local = localMap.get(path);
      const remote = remoteMap.get(path);

      const baseHash = base ? base.hash : null;
      const localHash = local ? local.hash : null;
      const remoteHash = remote ? remote.hash : null;

      // 三方合并逻辑
      if (localHash === remoteHash) {
        // 两边相同，取任一方
        if (local) mergedTree.push(local);
      } else if (localHash === baseHash) {
        // 本地未修改，取远程
        if (remote) mergedTree.push(remote);
      } else if (remoteHash === baseHash) {
        // 远程未修改，取本地
        if (local) mergedTree.push(local);
      } else {
        // 双方都修改了，需要冲突处理
        // 简化处理：标记为冲突
        hasConflicts = true;
        conflicts.push({
          path: path,
          baseHash: baseHash,
          localHash: localHash,
          remoteHash: remoteHash,
          resolution: null
        });

        // 默认使用本地版本（实际应该进行文本合并）
        if (local) {
          mergedTree.push({
            ...local,
            conflicted: true
          });
        }
      }
    }

    return {
      mergedTree: mergedTree.map(e => ({
        path: e.path,
        hash: e.hash,
        mode: e.mode || '100644',
        type: e.type || 'blob'
      })),
      hasConflicts,
      conflicts
    };
  }

  /**
   * 生成unified diff格式输出
   */
  generateUnifiedDiff(oldText, newText, oldFileName, newFileName) {
    const diff = this.computeLineDiff(oldText, newText);
    let output = '';

    output += `diff --git a/${oldFileName} b/${newFileName}\n`;
    output += `--- a/${oldFileName}\n`;
    output += `+++ b/${newFileName}\n`;

    for (const hunk of diff.hunks) {
      output += `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@\n`;

      for (const line of hunk.lines) {
        output += line + '\n';
      }
    }

    return output;
  }

  // ========== 内部算法 ==========

  /**
   * 计算最长公共子序列
   */
  _computeLCS(a, b) {
    const m = a.length;
    const n = b.length;

    // 对于大文件使用优化算法
    if (m * n > 1000000) {
      return this._computeLCSOptimized(a, b);
    }

    // 标准DP
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // 回溯获取LCS
    const result = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        result.unshift({ oldIndex: i - 1, newIndex: j - 1 });
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return result;
  }

  /**
   * 优化的LCS算法（用于大文件）
   */
  _computeLCSOptimized(a, b) {
    // 使用hash map加速
    const bMap = new Map();
    for (let j = 0; j < b.length; j++) {
      if (!bMap.has(b[j])) bMap.set(b[j], []);
      bMap.get(b[j]).push(j);
    }

    const result = [];
    let lastIndex = -1;

    for (let i = 0; i < a.length; i++) {
      const positions = bMap.get(a[i]) || [];
      // 找到大于lastIndex的最小位置
      for (const j of positions) {
        if (j > lastIndex) {
          result.push({ oldIndex: i, newIndex: j });
          lastIndex = j;
          break;
        }
      }
    }

    return result;
  }

  /**
   * 从LCS构建diff hunks
   */
  _buildHunks(oldLines, newLines, lcs) {
    const hunks = [];
    let currentHunk = null;
    let lcsIndex = 0;
    let oldIdx = 0;
    let newIdx = 0;

    const flushHunk = () => {
      if (currentHunk && currentHunk.lines.length > 0) {
        currentHunk.oldLines = currentHunk.lines.filter(l => l.startsWith('-') || l.startsWith(' ')).length;
        currentHunk.newLines = currentHunk.lines.filter(l => l.startsWith('+') || l.startsWith(' ')).length;
        currentHunk.additions = currentHunk.lines.filter(l => l.startsWith('+')).length;
        currentHunk.deletions = currentHunk.lines.filter(l => l.startsWith('-')).length;
        hunks.push(currentHunk);
      }
    };

    while (oldIdx < oldLines.length || newIdx < newLines.length) {
      if (lcsIndex < lcs.length &&
          lcs[lcsIndex].oldIndex === oldIdx &&
          lcs[lcsIndex].newIndex === newIdx) {
        // 匹配行
        if (!currentHunk) {
          currentHunk = {
            oldStart: oldIdx + 1,
            newStart: newIdx + 1,
            lines: []
          };
        }
        currentHunk.lines.push(` ${oldLines[oldIdx]}`);
        oldIdx++;
        newIdx++;
        lcsIndex++;
      } else {
        // 不匹配
        if (!currentHunk) {
          currentHunk = {
            oldStart: oldIdx + 1,
            newStart: newIdx + 1,
            lines: []
          };
        }

        // 先输出删除行
        if (lcsIndex < lcs.length && oldIdx < lcs[lcsIndex].oldIndex) {
          while (oldIdx < lcs[lcsIndex].oldIndex) {
            currentHunk.lines.push(`-${oldLines[oldIdx]}`);
            oldIdx++;
          }
        } else if (oldIdx < oldLines.length && (lcsIndex >= lcs.length || oldIdx < lcs[lcsIndex].oldIndex)) {
          // 如果还有old行但没有对应的LCS
          if (lcsIndex < lcs.length) {
            currentHunk.lines.push(`-${oldLines[oldIdx]}`);
            oldIdx++;
            continue;
          }
        }

        // 输出新增行
        if (lcsIndex < lcs.length && newIdx < lcs[lcsIndex].newIndex) {
          while (newIdx < lcs[lcsIndex].newIndex) {
            currentHunk.lines.push(`+${newLines[newIdx]}`);
            newIdx++;
          }
        } else if (newIdx < newLines.length && (lcsIndex >= lcs.length || newIdx < lcs[lcsIndex].newIndex)) {
          if (lcsIndex < lcs.length) {
            currentHunk.lines.push(`+${newLines[newIdx]}`);
            newIdx++;
            continue;
          }
        }

        // 处理剩余行
        if (lcsIndex >= lcs.length) {
          while (oldIdx < oldLines.length) {
            currentHunk.lines.push(`-${oldLines[oldIdx]}`);
            oldIdx++;
          }
          while (newIdx < newLines.length) {
            currentHunk.lines.push(`+${newLines[newIdx]}`);
            newIdx++;
          }
        }

        // hunk分隔
        if (currentHunk && currentHunk.lines.length > 3) {
          flushHunk();
          currentHunk = null;
        }
      }
    }

    flushHunk();

    // 如果没有变化，返回空hunks
    if (hunks.length === 0 && oldLines.join('\n') !== newLines.join('\n')) {
      hunks.push({
        oldStart: 1,
        newStart: 1,
        oldLines: oldLines.length,
        newLines: newLines.length,
        additions: newLines.length,
        deletions: oldLines.length,
        lines: [...oldLines.map(l => `-${l}`), ...newLines.map(l => `+${l}`)]
      });
    }

    return hunks;
  }
}
