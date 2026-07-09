// pages/remote-manager/remote-manager.js - 远程仓库管理页
import { GitStore } from '../../utils/git-store';
import { RemoteManager } from '../../utils/remote-manager';

Page({
  data: {
    repoId: '',
    isCloneMode: false,
    // 仓库关联的远程
    repoRemotes: [],
    // 全局远程仓库列表
    globalRemotes: [],
    // 表单
    showAddModal: false,
    formData: {
      name: '',
      url: '',
      token: '',
      branch: 'main',
      autoSync: false
    },
    // 连接测试
    testing: false,
    testResult: null,
    // 克隆模式
    cloneUrl: '',
    cloneTargetPath: '',
    cloning: false,
    cloneProgress: 0,
    // 远程信息
    remoteInfo: null,
    remoteBranches: [],
    showRemoteDetail: false,
    selectedRemoteId: ''
  },

  onLoad(options) {
    this.repoId = options.repoId || '';
    this.isCloneMode = options.action === 'clone';
    this.gitStore = new GitStore();
    this.remoteManager = new RemoteManager();

    this.setData({
      repoId: this.repoId,
      isCloneMode: this.isCloneMode
    });

    this.loadData();
  },

  onShow() {
    this.loadData();
  },

  async loadData() {
    const globalRemotes = this.remoteManager.getAllRemotes();

    if (this.repoId) {
      const repo = this.gitStore.openRepo(this.repoId);
      this.setData({
        repoRemotes: repo.remotes || [],
        globalRemotes
      });
    } else {
      this.setData({ globalRemotes });
    }
  },

  // ========== 添加远程 ==========

  showAddRemote() {
    this.setData({
      showAddModal: true,
      formData: { name: '', url: '', token: '', branch: 'main', autoSync: false }
    });
  },

  hideAddRemote() {
    this.setData({ showAddModal: false });
  },

  onFormInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value });
  },

  onAutoSyncChange(e) {
    this.setData({ 'formData.autoSync': e.detail.value });
  },

  // 添加远程到仓库
  async addRemoteToRepo() {
    const { name, url } = this.data.formData;
    if (!name.trim() || !url.trim()) {
      wx.showToast({ title: '请填写名称和URL', icon: 'none' });
      return;
    }

    try {
      await this.gitStore.addRemote(this.repoId, name.trim(), url.trim());
      wx.showToast({ title: '已添加', icon: 'success' });
      this.hideAddRemote();
      this.loadData();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 添加全局远程
  addGlobalRemote() {
    const { formData } = this.data;
    if (!formData.name.trim() || !formData.url.trim()) {
      wx.showToast({ title: '请填写名称和URL', icon: 'none' });
      return;
    }

    try {
      this.remoteManager.addRemote(formData);
      wx.showToast({ title: '已添加', icon: 'success' });
      this.hideAddRemote();
      this.loadData();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // ========== 远程操作 ==========

  // 查看远程详情
  async viewRemoteDetail(e) {
    const remoteId = e.currentTarget.dataset.id;
    this.setData({ selectedRemoteId: remoteId, showRemoteDetail: true });

    try {
      const info = await this.remoteManager.getRemoteInfo(remoteId);
      const branches = await this.remoteManager.getRemoteBranches(remoteId);
      this.setData({ remoteInfo: info, remoteBranches: branches });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  hideRemoteDetail() {
    this.setData({ showRemoteDetail: false, remoteInfo: null, remoteBranches: [] });
  },

  // 测试连接
  async testConnection(e) {
    const remoteId = e.currentTarget.dataset.id;
    this.setData({ testing: true });

    try {
      const result = await this.remoteManager.testConnection(remoteId);
      this.setData({ testResult: result, testing: false });

      wx.showToast({
        title: result.success ? '连接成功' : '连接失败',
        icon: result.success ? 'success' : 'none'
      });
    } catch (error) {
      this.setData({ testing: false });
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 同步远程
  async syncRemote(e) {
    const remoteId = e.currentTarget.dataset.id;

    wx.showLoading({ title: '同步中...' });
    try {
      const result = await this.remoteManager.syncRemote(remoteId);
      wx.hideLoading();

      if (result.success) {
        wx.showToast({ title: '同步成功', icon: 'success' });
      } else {
        wx.showToast({ title: result.error, icon: 'none' });
      }
      this.loadData();
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 删除远程
  removeRemote(e) {
    const remoteId = e.currentTarget.dataset.id;
    const remoteName = e.currentTarget.dataset.name;

    wx.showModal({
      title: '删除远程仓库',
      content: `确定要移除 "${remoteName}" 吗？`,
      confirmColor: '#d73a49',
      success: (res) => {
        if (res.confirm) {
          this.remoteManager.removeRemote(remoteId);
          wx.showToast({ title: '已移除', icon: 'success' });
          this.loadData();
        }
      }
    });
  },

  // ========== 克隆模式 ==========

  onCloneUrlInput(e) {
    this.setData({ cloneUrl: e.detail.value });
  },

  onClonePathInput(e) {
    this.setData({ cloneTargetPath: e.detail.value });
  },

  async cloneRepo() {
    const { cloneUrl, cloneTargetPath } = this.data;

    if (!cloneUrl.trim()) {
      wx.showToast({ title: '请输入仓库URL', icon: 'none' });
      return;
    }

    // 从URL解析仓库名
    let repoName = cloneTargetPath;
    if (!repoName) {
      const match = cloneUrl.match(/([^/]+?)(\.git)?$/);
      repoName = match ? match[1] : 'cloned-repo';
    }

    this.setData({ cloning: true, cloneProgress: 0 });

    try {
      // 步骤1: 创建本地仓库
      const repo = await this.gitStore.initRepo(repoName);
      this.setData({ cloneProgress: 20 });

      // 步骤2: 添加远程
      await this.gitStore.addRemote(repo.id, 'origin', cloneUrl);
      this.setData({ cloneProgress: 40 });

      // 步骤3: 拉取远程数据
      const result = await this.gitStore.fetch(repo.id, 'origin');
      this.setData({ cloneProgress: 80 });

      if (result.errors && result.errors.length > 0) {
        wx.showToast({ title: '克隆部分完成: ' + result.errors[0].message, icon: 'none', duration: 3000 });
      } else {
        wx.showToast({ title: '克隆成功', icon: 'success' });
      }

      this.setData({ cloning: false, cloneProgress: 100 });

      // 跳转到仓库页
      setTimeout(() => {
        wx.redirectTo({
          url: `/pages/repo/repo?id=${repo.id}`
        });
      }, 1000);

    } catch (error) {
      this.setData({ cloning: false });
      wx.showToast({ title: '克隆失败: ' + error.message, icon: 'none' });
    }
  },

  // 从全局远程列表克隆
  cloneFromGlobal(e) {
    const remoteId = e.currentTarget.dataset.id;
    const remote = this.remoteManager.getAllRemotes().find(r => r.id === remoteId);
    if (remote) {
      this.setData({ cloneUrl: remote.url });
    }
  }
});
