// app.js - GitFlow 微信小程序入口
import { GitStore } from './utils/git-store';
import { RemoteManager } from './utils/remote-manager';

App({
  globalData: {
    gitStore: null,
    remoteManager: null,
    userInfo: null,
    theme: 'light'
  },

  onLaunch() {
    // 初始化文件系统存储
    this.globalData.gitStore = new GitStore();
    this.globalData.remoteManager = new RemoteManager();

    // 检查并初始化文件系统
    this.initFileSystem();

    // 加载全局设置
    this.loadSettings();
  },

  // 初始化微信文件系统
  async initFileSystem() {
    const fs = wx.getFileSystemManager();
    const basePath = `${wx.env.USER_DATA_PATH}/gitflow`;

    try {
      fs.accessSync(basePath);
      console.log('[GitFlow] 工作目录已存在');
    } catch (e) {
      fs.mkdirSync(basePath, true);
      console.log('[GitFlow] 创建工作目录:', basePath);
    }

    this.globalData.basePath = basePath;
    this.globalData.fs = fs;
  },

  // 加载全局设置
  loadSettings() {
    const settings = wx.getStorageSync('gitflow_settings');
    if (settings) {
      this.globalData.settings = JSON.parse(settings);
    } else {
      this.globalData.settings = {
        defaultBranch: 'main',
        autoSync: false,
        syncInterval: 30, // 分钟
        maxRepoSize: 50, // MB
        theme: 'light'
      };
    }
  },

  // 保存设置
  saveSettings(settings) {
    this.globalData.settings = settings;
    wx.setStorageSync('gitflow_settings', JSON.stringify(settings));
  }
});
