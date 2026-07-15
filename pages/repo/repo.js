// pages/repo/repo.js - 仓库详情页
import { GitStore } from '../../utils/git-store';

Page({
  data: {
    repoId: '',
    repo: null,
    currentPath: '',
    files: [],
    status: null,
    currentBranch: '',
    branches: [],
    showBranchPicker: false,
    showCommitModal: false,
    commitMessage: '',
    showActionSheet: false,
    selectedFiles: [],
    currentTab: 'files', // files, status, history
    commitLog: [],
    loading: true,
    showStashModal: false,
    stashMessage: '',
    stashList: []
  },

  onLoad(options) {
    this.repoId = options.id;
    this.gitStore = new GitStore();
    this.setData({ repoId: this.repoId });
  },

  onShow() {
    this.loadRepo();
  },

  onPullDownRefresh() {
    this.loadRepo().then(() => {
      wx.stopPullDownRefresh();
    }).catch(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载仓库数据
  async loadRepo() {
    try {
      const repo = this.gitStore.openRepo(this.repoId);
      const files = await this.gitStore.listDir(this.repoId, this.data.currentPath);
      const status = await this.gitStore.getStatus(this.repoId);
      const branches = await this.gitStore.getBranches(this.repoId);
      const commitLog = await this.gitStore.getCommitLog(this.repoId, { maxCount: 20 });

      this.setData({
        repo,
        files,
        status,
        currentBranch: repo.currentBranch,
        branches,
        commitLog,
        loading: false,
        stashList: this.gitStore.getStashList(this.repoId)
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ currentTab: tab });

    if (tab === 'status') {
      this.refreshStatus();
    } else if (tab === 'history') {
      this.refreshHistory();
    }
  },

  // ========== 文件浏览 ==========

  // 进入目录
  enterDir(e) {
    const path = e.currentTarget.dataset.path;
    this.setData({ currentPath: path });
    this.loadFiles();
  },

  // 返回上级目录
  goUp() {
    const path = this.data.currentPath;
    if (!path) return;
    const parentPath = path.substring(0, path.lastIndexOf('/'));
    this.setData({ currentPath: parentPath });
    this.loadFiles();
  },

  // 加载文件列表
  async loadFiles() {
    const files = await this.gitStore.listDir(this.repoId, this.data.currentPath);
    this.setData({ files });
  },

  // 打开文件
  openFile(e) {
    const path = e.currentTarget.dataset.path;
    const filePath = this.data.currentPath ? `${this.data.currentPath}/${path}` : path;
    wx.navigateTo({
      url: `/pages/file-editor/file-editor?repoId=${this.repoId}&path=${encodeURIComponent(filePath)}`
    });
  },

  // 新建文件
  createNewFile() {
    wx.showModal({
      title: '新建文件',
      placeholderText: '输入文件名（如: src/index.js）',
      editable: true,
      success: (res) => {
        if (res.confirm && res.content) {
          const filePath = this.data.currentPath
            ? `${this.data.currentPath}/${res.content}`
            : res.content;
          wx.navigateTo({
            url: `/pages/file-editor/file-editor?repoId=${this.repoId}&path=${encodeURIComponent(filePath)}&new=true`
          });
        }
      }
    });
  },

  // 新建文件夹
  createNewFolder() {
    wx.showModal({
      title: '新建文件夹',
      placeholderText: '输入文件夹名',
      editable: true,
      success: async (res) => {
        if (res.confirm && res.content) {
          const dirPath = this.data.currentPath
            ? `${this.data.currentPath}/${res.content}`
            : res.content;
          try {
            await this.gitStore.mkdir(this.repoId, dirPath);
            await this.loadFiles();
            wx.showToast({ title: '已创建', icon: 'success' });
          } catch (error) {
            wx.showToast({ title: error.message, icon: 'none' });
          }
        }
      }
    });
  },

  // ========== 状态管理 ==========

  async refreshStatus() {
    const status = await this.gitStore.getStatus(this.repoId);
    this.setData({ status });
  },

  // 选择文件
  toggleFileSelect(e) {
    const path = e.currentTarget.dataset.path;
    const selected = [...this.data.selectedFiles];
    const index = selected.indexOf(path);
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(path);
    }
    this.setData({ selectedFiles: selected });
  },

  // 暂存选中文件
  async stageSelected() {
    if (this.data.selectedFiles.length === 0) {
      wx.showToast({ title: '请先选择文件', icon: 'none' });
      return;
    }

    try {
      await this.gitStore.add(this.repoId, this.data.selectedFiles);
      this.setData({ selectedFiles: [] });
      await this.refreshStatus();
      wx.showToast({ title: '已暂存', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 暂存全部
  async stageAll() {
    try {
      await this.gitStore.addAll(this.repoId);
      await this.refreshStatus();
      wx.showToast({ title: '已暂存全部', icon: 'success' });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 取消暂存
  async unstageFile(e) {
    const path = e.currentTarget.dataset.path;
    try {
      await this.gitStore.unstage(this.repoId, [path]);
      await this.refreshStatus();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 显示提交弹窗
  showCommit() {
    this.setData({ showCommitModal: true });
  },

  hideCommit() {
    this.setData({ showCommitModal: false, commitMessage: '' });
  },

  onCommitMessageInput(e) {
    this.setData({ commitMessage: e.detail.value });
  },

  // 提交
  async doCommit() {
    const { commitMessage } = this.data;
    if (!commitMessage.trim()) {
      wx.showToast({ title: '请输入提交信息', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    try {
      const hash = await this.gitStore.commit(this.repoId, commitMessage.trim());
      wx.hideLoading();
      wx.showToast({ title: '提交成功', icon: 'success' });
      this.hideCommit();
      await this.loadRepo();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // ========== 分支管理 ==========

  showBranchList() {
    this.setData({ showBranchPicker: true });
  },

  hideBranchList() {
    this.setData({ showBranchPicker: false });
  },

  // 切换分支
  async switchBranch(e) {
    const branch = e.currentTarget.dataset.branch;
    if (branch === this.data.currentBranch) {
      this.hideBranchList();
      return;
    }

    wx.showLoading({ title: `切换到 ${branch}...` });
    try {
      await this.gitStore.checkoutBranch(this.repoId, branch);
      wx.hideLoading();
      wx.showToast({ title: `已切换到 ${branch}`, icon: 'success' });
      this.hideBranchList();
      this.setData({ currentPath: '' });
      await this.loadRepo();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 新建分支
  createBranch() {
    wx.showModal({
      title: '新建分支',
      placeholderText: '分支名称',
      editable: true,
      success: async (res) => {
        if (res.confirm && res.content) {
          try {
            await this.gitStore.createBranch(this.repoId, res.content);
            wx.showToast({ title: '分支已创建', icon: 'success' });
            await this.loadRepo();
          } catch (error) {
            wx.showToast({ title: error.message, icon: 'none' });
          }
        }
      }
    });
  },

  // ========== 提交历史 ==========

  async refreshHistory() {
    const commitLog = await this.gitStore.getCommitLog(this.repoId, { maxCount: 50 });
    this.setData({ commitLog });
  },

  // 查看提交详情
  viewCommit(e) {
    const hash = e.currentTarget.dataset.hash;
    wx.navigateTo({
      url: `/pages/history/history?repoId=${this.repoId}&commit=${hash}`
    });
  },

  // ========== 远程同步 ==========

  // 拉取
  async pullFromRemote() {
    const repo = this.data.repo;
    if (!repo.remotes || repo.remotes.length === 0) {
      wx.showToast({ title: '未配置远程仓库', icon: 'none' });
      return;
    }

    if (repo.remotes.length === 1) {
      await this.doPull(repo.remotes[0].name);
    } else {
      // 多选远程仓库
      wx.showActionSheet({
        itemList: repo.remotes.map(r => r.name),
        success: (res) => {
          this.doPull(repo.remotes[res.tapIndex].name);
        }
      });
    }
  },

  async doPull(remoteName) {
    wx.showLoading({ title: `从 ${remoteName} 拉取...` });
    try {
      const result = await this.gitStore.pull(this.repoId, remoteName);
      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: result.message || '拉取成功', icon: 'success' });
        await this.loadRepo();
      } else {
        wx.showToast({ title: result.errors[0].message, icon: 'none' });
      }
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 推送
  async pushToRemote() {
    const repo = this.data.repo;
    if (!repo.remotes || repo.remotes.length === 0) {
      wx.showToast({ title: '未配置远程仓库', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '推送中...' });
    try {
      // 简化实现：实际需要通过API提交
      wx.hideLoading();
      wx.showToast({ title: '推送功能需要配置API Token', icon: 'none' });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // ========== 暂存(Stash) ==========

  showStash() {
    this.setData({ showStashModal: true });
  },

  hideStash() {
    this.setData({ showStashModal: false, stashMessage: '' });
  },

  onStashMessageInput(e) {
    this.setData({ stashMessage: e.detail.value });
  },

  async doStash() {
    wx.showLoading({ title: '暂存中...' });
    try {
      await this.gitStore.stash(this.repoId, this.data.stashMessage);
      wx.hideLoading();
      wx.showToast({ title: '已暂存', icon: 'success' });
      this.hideStash();
      await this.loadRepo();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  async popStash(e) {
    const index = e.currentTarget.dataset.index;
    try {
      await this.gitStore.stashPop(this.repoId, index);
      wx.showToast({ title: '已恢复', icon: 'success' });
      await this.loadRepo();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // ========== 导航 ==========

  goToBranches() {
    wx.navigateTo({
      url: `/pages/branches/branches?repoId=${this.repoId}`
    });
  },

  goToRemotes() {
    wx.navigateTo({
      url: `/pages/remote-manager/remote-manager?repoId=${this.repoId}`
    });
  },

  // 返回上级目录
  goBack() {
    if (this.data.currentPath) {
      this.goUp();
    } else {
      wx.navigateBack();
    }
  }
});
