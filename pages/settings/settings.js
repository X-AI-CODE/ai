// pages/settings/settings.js - 设置页
Page({
  data: {
    settings: {},
    githubToken: '',
    gitlabToken: '',
    giteeToken: '',
    storageUsed: '0 MB',
    repoCount: 0,
    version: '1.0.0'
  },

  onLoad() {
    this.loadSettings();
    this.loadTokens();
    this.calculateStorage();
  },

  onShow() {
    this.loadSettings();
  },

  loadSettings() {
    const app = getApp();
    this.setData({ settings: app.globalData.settings || {} });
  },

  loadTokens() {
    this.setData({
      githubToken: wx.getStorageSync('github_token') || '',
      gitlabToken: wx.getStorageSync('gitlab_token') || '',
      giteeToken: wx.getStorageSync('gitee_token') || ''
    });
  },

  calculateStorage() {
    try {
      const res = wx.getStorageInfoSync();
      this.setData({
        storageUsed: (res.currentSize / 1024).toFixed(2) + ' MB',
        repoCount: 0
      });

      // 获取仓库数量
      const repos = wx.getStorageSync('gitflow_repos');
      if (repos) {
        this.setData({ repoCount: JSON.parse(repos).length });
      }
    } catch (e) {
      // ignore
    }
  },

  // 设置更新
  onSettingChange(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const settings = { ...this.data.settings, [field]: value };

    this.setData({ settings });

    const app = getApp();
    app.saveSettings(settings);
  },

  onDefaultBranchInput(e) {
    this.setData({ 'settings.defaultBranch': e.detail.value });
  },

  onAuthorNameInput(e) {
    this.setData({ 'settings.authorName': e.detail.value });
  },

  onAuthorEmailInput(e) {
    this.setData({ 'settings.authorEmail': e.detail.value });
  },

  onSyncIntervalInput(e) {
    this.setData({ 'settings.syncInterval': parseInt(e.detail.value) || 30 });
    const app = getApp();
    app.saveSettings(this.data.settings);
  },

  // Token设置
  onGithubTokenInput(e) {
    this.setData({ githubToken: e.detail.value });
  },

  onGitlabTokenInput(e) {
    this.setData({ gitlabToken: e.detail.value });
  },

  onGiteeTokenInput(e) {
    this.setData({ giteeToken: e.detail.value });
  },

  saveGithubToken() {
    wx.setStorageSync('github_token', this.data.githubToken);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  saveGitlabToken() {
    wx.setStorageSync('gitlab_token', this.data.gitlabToken);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  saveGiteeToken() {
    wx.setStorageSync('gitee_token', this.data.giteeToken);
    wx.showToast({ title: '已保存', icon: 'success' });
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '这将清除所有本地数据，包括仓库和设置。确定继续吗？',
      confirmColor: '#d73a49',
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '清除中...' });

          // 清除所有storage
          try {
            const keys = ['gitflow_repos', 'gitflow_remotes', 'gitflow_settings'];
            keys.forEach(key => wx.removeStorageSync(key));

            // 清除文件系统
            const fs = wx.getFileSystemManager();
            const basePath = `${wx.env.USER_DATA_PATH}/gitflow`;
            try {
              const files = fs.readdirSync(basePath);
              files.forEach(file => {
                try {
                  fs.rmdirSync(`${basePath}/${file}`, true);
                } catch (e) {}
              });
            } catch (e) {}

            wx.hideLoading();
            wx.showToast({ title: '已清除', icon: 'success' });
            this.calculateStorage();
          } catch (error) {
            wx.hideLoading();
            wx.showToast({ title: error.message, icon: 'none' });
          }
        }
      }
    });
  },

  // 导出数据
  exportData() {
    wx.showModal({
      title: '导出数据',
      content: '将导出仓库列表和设置到剪贴板。',
      success: (res) => {
        if (res.confirm) {
          const data = {
            repos: wx.getStorageSync('gitflow_repos'),
            remotes: wx.getStorageSync('gitflow_remotes'),
            settings: wx.getStorageSync('gitflow_settings'),
            exportedAt: new Date().toISOString()
          };

          wx.setClipboardData({
            data: JSON.stringify(data, null, 2),
            success: () => {
              wx.showToast({ title: '已复制到剪贴板', icon: 'success' });
            }
          });
        }
      }
    });
  },

  // 关于
  showAbout() {
    wx.showModal({
      title: '关于 GitFlow',
      content: 'GitFlow 微信小程序 v1.0.0\n\n一个运行在微信中的Git管理工具，支持本地仓库管理、远程同步和多平台Git服务集成。\n\n功能特点：\n• 本地Git仓库创建和管理\n• 完整的分支操作\n• 从GitHub/GitLab/Gitee同步\n• 文件编辑和Diff查看\n• 暂存(Stash)管理',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
