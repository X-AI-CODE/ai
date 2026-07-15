// pages/branches/branches.js - 分支管理页
import { GitStore } from '../../utils/git-store';

Page({
  data: {
    repoId: '',
    branches: [],
    currentBranch: '',
    loading: true,
    showCreateModal: false,
    newBranchName: '',
    newBranchBase: ''
  },

  onLoad(options) {
    this.repoId = options.repoId;
    this.gitStore = new GitStore();
    this.loadBranches();
  },

  onShow() {
    this.loadBranches();
  },

  async loadBranches() {
    try {
      const repo = this.gitStore.openRepo(this.repoId);
      const branches = await this.gitStore.getBranches(this.repoId);
      this.setData({
        branches,
        currentBranch: repo.currentBranch,
        newBranchBase: repo.currentBranch,
        loading: false
      });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  // 切换到分支
  async checkoutBranch(e) {
    const branchName = e.currentTarget.dataset.branch;
    if (branchName === this.data.currentBranch) return;

    wx.showLoading({ title: '切换分支...' });
    try {
      await this.gitStore.checkoutBranch(this.repoId, branchName);
      wx.hideLoading();
      wx.showToast({ title: `已切换到 ${branchName}`, icon: 'success' });
      this.loadBranches();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 显示新建分支
  showCreate() {
    this.setData({ showCreateModal: true });
  },

  hideCreate() {
    this.setData({ showCreateModal: false, newBranchName: '' });
  },

  onBranchNameInput(e) {
    this.setData({ newBranchName: e.detail.value });
  },

  // 创建分支
  async createBranch() {
    const { newBranchName } = this.data;
    if (!newBranchName.trim()) {
      wx.showToast({ title: '请输入分支名', icon: 'none' });
      return;
    }

    try {
      await this.gitStore.createBranch(this.repoId, newBranchName.trim());
      wx.showToast({ title: '分支已创建', icon: 'success' });
      this.hideCreate();
      this.loadBranches();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 删除分支
  deleteBranch(e) {
    const branchName = e.currentTarget.dataset.branch;

    if (branchName === this.data.currentBranch) {
      wx.showToast({ title: '不能删除当前分支', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '删除分支',
      content: `确定要删除分支 "${branchName}" 吗？`,
      confirmColor: '#d73a49',
      success: async (res) => {
        if (res.confirm) {
          try {
            await this.gitStore.deleteBranch(this.repoId, branchName);
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadBranches();
          } catch (error) {
            wx.showToast({ title: error.message, icon: 'none' });
          }
        }
      }
    });
  },

  // 合并分支到当前分支
  mergeBranch(e) {
    const branchName = e.currentTarget.dataset.branch;

    if (branchName === this.data.currentBranch) {
      wx.showToast({ title: '不能合并当前分支到自身', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '合并分支',
      content: `将 "${branchName}" 合并到 "${this.data.currentBranch}" 吗？`,
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '合并中...' });
          try {
            const result = await this.gitStore.merge(this.repoId, branchName);
            wx.hideLoading();

            if (result.success) {
              wx.showToast({ title: result.message || '合并成功', icon: 'success' });
              this.loadBranches();
            } else {
              if (result.conflicts) {
                wx.showModal({
                  title: '合并冲突',
                  content: `有 ${result.conflicts.length} 个文件存在冲突，需要手动解决。`,
                  showCancel: false
                });
              } else {
                wx.showToast({ title: '合并失败', icon: 'none' });
              }
            }
          } catch (error) {
            wx.hideLoading();
            wx.showToast({ title: error.message, icon: 'none' });
          }
        }
      }
    });
  }
});
