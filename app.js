// app.js - GitFlow 微信小程序入口
import { GitStore } from './utils/git-store';
import { RemoteManager } from './utils/remote-manager';
import { WorkspaceManager } from './utils/workspace-manager';

App({
  globalData: {
    gitStore: null,
    remoteManager: null,
    workspaceManager: null,
    userInfo: null,
    theme: 'light'
  },

  onLaunch() {
    // 初始化工作空间管理器（优先于GitStore，因为GitStore依赖当前工作空间路径）
    this.globalData.workspaceManager = new WorkspaceManager();

    // 初始化文件系统存储
    this.globalData.gitStore = new GitStore();
    this.globalData.remoteManager = new RemoteManager();

    // 检查并初始化文件系统
    this.initFileSystem();

    // 加载全局设置
    this.loadSettings();

    // 整理未分配到任何工作空间的仓库
    this.globalData.workspaceManager.organizeOrphanRepos();
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

    // 确保工作空间目录存在
    const spacesPath = `${basePath}/spaces`;
    try {
      fs.accessSync(spacesPath);
    } catch (e) {
      fs.mkdirSync(spacesPath, true);
    }

    this.globalData.basePath = basePath;
    this.globalData.fs = fs;
  },

  /**
   * 切换工作空间
   */
  switchWorkspace(workspaceId) {
    const wsManager = this.globalData.workspaceManager;
    wsManager.switchTo(workspaceId);

    // 重新初始化GitStore以使用新工作空间路径
    this.globalData.gitStore = new GitStore();

    // 触发全局回调
    if (this.workspaceChangeCallback) {
      this.workspaceChangeCallback(wsManager.getCurrent());
    }
  },

  /**
   * 注册工作空间切换监听
   */
  onWorkspaceChange(callback) {
    this.workspaceChangeCallback = callback;
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
