// pages/index/index.js - 仓库列表页
import { GitStore } from '../../utils/git-store';
import { RemoteManager } from '../../utils/remote-manager';

Page({
  data: {
    repos: [],
    loading: true,
    searchKeyword: '',
    showCreateModal: false,
    newRepoName: '',
    newRepoDefaultBranch: 'main',
    newRepoAuthorName: '',
    newRepoAuthorEmail: '',
    isEmpty: true
  },

  onLoad() {
    this.gitStore = new GitStore();
    this.remoteManager = new RemoteManager();
  },

  onShow() {
    this.loadRepos();
  },

  onPullDownRefresh() {
    this.loadRepos();
    wx.stopPullDownRefresh();
  },

  // 加载仓库列表
  loadRepos() {
    const repos = this.gitStore.getRepoList();
    this.setData({
      repos: repos,
      loading: false,
      isEmpty: repos.length === 0
    });
  },

  // 搜索仓库
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({ searchKeyword: keyword });

    if (!keyword) {
      this.loadRepos();
      return;
    }

    const allRepos = this.gitStore.getRepoList();
    const filtered = allRepos.filter(r =>
      r.name.toLowerCase().includes(keyword.toLowerCase())
    );
    this.setData({ repos: filtered });
  },

  // 打开创建仓库弹窗
  showCreateRepo() {
    this.setData({ showCreateModal: true });
  },

  hideCreateRepo() {
    this.setData({
      showCreateModal: false,
      newRepoName: '',
      newRepoDefaultBranch: 'main'
    });
  },

  onRepoNameInput(e) {
    this.setData({ newRepoName: e.detail.value });
  },

  onDefaultBranchInput(e) {
    this.setData({ newRepoDefaultBranch: e.detail.value });
  },

  onAuthorNameInput(e) {
    this.setData({ newRepoAuthorName: e.detail.value });
  },

  onAuthorEmailInput(e) {
    this.setData({ newRepoAuthorEmail: e.detail.value });
  },

  // 创建仓库
  async createRepo() {
    const { newRepoName, newRepoDefaultBranch, newRepoAuthorName, newRepoAuthorEmail } = this.data;

    if (!newRepoName.trim()) {
      wx.showToast({ title: '请输入仓库名称', icon: 'none' });
      return;
    }

    // 检查名称合法性
    if (!/^[a-zA-Z0-9_-]+$/.test(newRepoName)) {
      wx.showToast({ title: '仓库名只能包含字母、数字、_-', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '创建中...' });

    try {
      await this.gitStore.initRepo(newRepoName.trim(), {
        defaultBranch: newRepoDefaultBranch || 'main',
        authorName: newRepoAuthorName || 'User',
        authorEmail: newRepoAuthorEmail || 'user@example.com'
      });

      wx.hideLoading();
      wx.showToast({ title: '创建成功', icon: 'success' });
      this.hideCreateRepo();
      this.loadRepos();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 进入仓库
  openRepo(e) {
    const repoId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/repo/repo?id=${repoId}`
    });
  },

  // 从远程克隆
  cloneFromRemote() {
    wx.navigateTo({
      url: '/pages/remote-manager/remote-manager?action=clone'
    });
  },

  // 删除仓库
  deleteRepo(e) {
    const repoId = e.currentTarget.dataset.id;
    const repoName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '确认删除',
      content: `确定要删除仓库 "${repoName}" 吗？此操作不可恢复。`,
      confirmColor: '#d73a49',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' });
          try {
            await this.gitStore.deleteRepo(repoId);
            wx.hideLoading();
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadRepos();
          } catch (error) {
            wx.hideLoading();
            wx.showToast({ title: error.message, icon: 'none' });
          }
        }
      }
    });
  },

  // 获取时间格式化文本
  formatTime(timestamp) {
    if (!timestamp) return '从未';
    const now = Date.now();
    const diff = now - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diff < minute) return '刚刚';
    if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
    if (diff < day) return `${Math.floor(diff / hour)}小时前`;
    if (diff < 30 * day) return `${Math.floor(diff / day)}天前`;
    return new Date(timestamp).toLocaleDateString();
  }
});
