// pages/file-editor/file-editor.js - 文件编辑器页
import { GitStore } from '../../utils/git-store';

Page({
  data: {
    repoId: '',
    filePath: '',
    fileName: '',
    content: '',
    originalContent: '',
    isNew: false,
    isModified: false,
    showSaveConfirm: false,
    language: 'text',
    lineCount: 0,
    wordCount: 0,
    showFindReplace: false,
    searchText: '',
    replaceText: ''
  },

  onLoad(options) {
    this.repoId = options.repoId;
    this.filePath = decodeURIComponent(options.path);
    this.isNew = options.new === 'true';
    this.gitStore = new GitStore();

    const fileName = this.filePath.split('/').pop();
    const language = this._detectLanguage(fileName);

    this.setData({
      repoId: this.repoId,
      filePath: this.filePath,
      fileName: fileName,
      language: language,
      isNew: this.isNew
    });

    if (!this.isNew) {
      this.loadFile();
    }

    wx.setNavigationBarTitle({ title: fileName });
  },

  // 加载文件内容
  async loadFile() {
    try {
      wx.showLoading({ title: '加载中...' });
      const content = await this.gitStore.readFile(this.repoId, this.filePath);
      wx.hideLoading();

      const lines = content.split('\n');
      this.setData({
        content: content,
        originalContent: content,
        lineCount: lines.length,
        wordCount: content.length
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '文件加载失败', icon: 'none' });
    }
  },

  // 内容变化
  onContentChange(e) {
    const content = e.detail.value;
    const lines = content.split('\n');
    this.setData({
      content: content,
      isModified: content !== this.data.originalContent,
      lineCount: lines.length,
      wordCount: content.length
    });
  },

  // 保存文件
  async saveFile() {
    if (!this.data.content && !this.data.isNew) {
      wx.showToast({ title: '文件内容为空', icon: 'none' });
      return;
    }

    try {
      wx.showLoading({ title: '保存中...' });
      await this.gitStore.writeFile(this.repoId, this.filePath, this.data.content);
      wx.hideLoading();

      this.setData({
        originalContent: this.data.content,
        isModified: false
      });

      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 保存并暂存
  async saveAndStage() {
    await this.saveFile();
    if (!this.data.isModified) {
      try {
        await this.gitStore.add(this.repoId, [this.filePath]);
        wx.showToast({ title: '已保存并暂存', icon: 'success' });
      } catch (error) {
        wx.showToast({ title: error.message, icon: 'none' });
      }
    }
  },

  // 撤销更改
  discardChanges() {
    wx.showModal({
      title: '确认撤销',
      content: '确定要撤销所有未保存的更改吗？',
      confirmColor: '#d73a49',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            content: this.data.originalContent,
            isModified: false
          });
          wx.showToast({ title: '已撤销', icon: 'success' });
        }
      }
    });
  },

  // 查找替换
  toggleFindReplace() {
    this.setData({ showFindReplace: !this.data.showFindReplace });
  },

  onSearchInput(e) {
    this.setData({ searchText: e.detail.value });
  },

  onReplaceInput(e) {
    this.setData({ replaceText: e.detail.value });
  },

  doReplace() {
    const { content, searchText, replaceText } = this.data;
    if (!searchText) return;

    const newContent = content.split(searchText).join(replaceText);
    const count = (content.match(new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;

    this.setData({ content: newContent, isModified: true });
    wx.showToast({ title: `替换了 ${count} 处`, icon: 'none' });
  },

  // 快捷操作
  indent() {
    // 简单缩进处理
    wx.showToast({ title: '已添加缩进', icon: 'none' });
  },

  insertTemplate() {
    wx.showActionSheet({
      itemList: ['JavaScript函数', 'HTML模板', 'CSS样式', 'JSON对象', '注释块'],
      success: (res) => {
        const templates = {
          0: '\nfunction newFunction() {\n  // TODO\n  return;\n}\n',
          1: '\n<div class="container">\n  <h1>Title</h1>\n</div>\n',
          2: '\n.container {\n  display: flex;\n  padding: 16px;\n}\n',
          3: '\n{\n  "key": "value"\n}\n',
          4: '\n/**\n * 描述\n * @param {type} name - 说明\n * @returns {type} 说明\n */\n'
        };
        const template = templates[res.tapIndex] || '';
        this.setData({
          content: this.data.content + template,
          isModified: true
        });
      }
    });
  },

  // 检测语言类型
  _detectLanguage(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const langMap = {
      js: 'javascript',
      ts: 'typescript',
      json: 'json',
      md: 'markdown',
      html: 'html',
      css: 'css',
      scss: 'scss',
      py: 'python',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      go: 'go',
      rs: 'rust',
      rb: 'ruby',
      yml: 'yaml',
      yaml: 'yaml',
      xml: 'xml',
      sh: 'shell',
      sql: 'sql',
      wxml: 'wxml',
      wxss: 'wxss',
      wxs: 'wxs'
    };
    return langMap[ext] || 'text';
  },

  // 返回确认
  onUnload() {
    if (this.data.isModified) {
      // 小程序不支持同步弹窗，这里可以记录到storage
      // 下次打开时提示有未保存内容
    }
  }
});
