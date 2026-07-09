// pages/workspace-manager/workspace-manager.js - 工作空间管理页
import { WorkspaceManager } from '../../utils/workspace-manager';

Page({
  data: {
    workspaces: [],
    currentWorkspace: null,
    showCreateModal: false,
    showEditModal: false,
    editingWorkspace: null,
    showIconPicker: false,
    showColorPicker: false,
    showTemplatePicker: false,
    // 表单
    formData: {
      name: '',
      description: '',
      icon: '📁',
      color: '#0366d6'
    },
    // 预设
    icons: ['📁', '💼', '🏠', '🌍', '📚', '🎮', '🔬', '🎨', '🚀', '💡', '🔧', '📱', '🖥️', '⚡', '🎯', '🏆'],
    colors: ['#0366d6', '#28a745', '#d73a49', '#6f42c1', '#e36209', '#f9a825', '#1b7cbb', '#24292e'],
    templates: [
      { key: 'work', icon: '💼', name: '工作', desc: '工作相关项目' },
      { key: 'personal', icon: '🏠', name: '个人', desc: '个人项目' },
      { key: 'opensource', icon: '🌍', name: '开源', desc: '开源项目贡献' },
      { key: 'learning', icon: '📚', name: '学习', desc: '学习和实验项目' }
    ]
  },

  onLoad() {
    this.workspaceManager = new WorkspaceManager();
  },

  onShow() {
    this.loadData();
  },

  loadData() {
    const workspaces = this.workspaceManager.getListWithStats();
    const currentWorkspace = this.workspaceManager.getCurrent();
    this.setData({ workspaces, currentWorkspace });
  },

  // ========== 创建工作空间 ==========

  showCreate() {
    this.setData({
      showCreateModal: true,
      formData: { name: '', description: '', icon: '📁', color: '#0366d6' }
    });
  },

  hideCreate() {
    this.setData({ showCreateModal: false });
  },

  onNameInput(e) {
    this.setData({ 'formData.name': e.detail.value });
  },

  onDescInput(e) {
    this.setData({ 'formData.description': e.detail.value });
  },

  showIconPicker() {
    this.setData({ showIconPicker: true });
  },

  hideIconPicker() {
    this.setData({ showIconPicker: false });
  },

  selectIcon(e) {
    const icon = e.currentTarget.dataset.icon;
    this.setData({ 'formData.icon': icon, showIconPicker: false });
  },

  showColorPicker() {
    this.setData({ showColorPicker: true });
  },

  hideColorPicker() {
    this.setData({ showColorPicker: false });
  },

  selectColor(e) {
    const color = e.currentTarget.dataset.color;
    this.setData({ 'formData.color': color, showColorPicker: false });
  },

  // 从模板创建
  showTemplatePicker() {
    this.setData({ showTemplatePicker: true });
  },

  hideTemplatePicker() {
    this.setData({ showTemplatePicker: false });
  },

  createFromTemplate(e) {
    const template = e.currentTarget.dataset.template;
    try {
      this.workspaceManager.createFromTemplate(template);
      this.hideTemplatePicker();
      this.hideCreate();
      wx.showToast({ title: '已创建', icon: 'success' });
      this.loadData();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // 确认创建
  doCreate() {
    const { formData } = this.data;
    if (!formData.name.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    try {
      this.workspaceManager.create(formData.name, {
        description: formData.description,
        icon: formData.icon,
        color: formData.color
      });

      wx.showToast({ title: '创建成功', icon: 'success' });
      this.hideCreate();
      this.loadData();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // ========== 编辑工作空间 ==========

  showEdit(e) {
    const workspaceId = e.currentTarget.dataset.id;
    const ws = this.workspaceManager.workspaces.find(w => w.id === workspaceId);
    if (!ws) return;

    this.setData({
      showEditModal: true,
      editingWorkspace: workspaceId,
      formData: {
        name: ws.name,
        description: ws.description,
        icon: ws.icon,
        color: ws.color
      }
    });
  },

  hideEdit() {
    this.setData({ showEditModal: false, editingWorkspace: null });
  },

  // 保存编辑
  doEdit() {
    const { editingWorkspace, formData } = this.data;
    if (!formData.name.trim()) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }

    try {
      this.workspaceManager.update(editingWorkspace, {
        name: formData.name,
        description: formData.description,
        icon: formData.icon,
        color: formData.color
      });

      wx.showToast({ title: '已保存', icon: 'success' });
      this.hideEdit();
      this.loadData();
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
    }
  },

  // ========== 切换 / 删除 ==========

  switchWorkspace(e) {
    const workspaceId = e.currentTarget.dataset.id;
    const app = getApp();
    app.switchWorkspace(workspaceId);
    wx.showToast({ title: '已切换', icon: 'success' });
    this.loadData();
  },

  deleteWorkspace(e) {
    const workspaceId = e.currentTarget.dataset.id;
    const ws = this.workspaceManager.workspaces.find(w => w.id === workspaceId);
    if (!ws) return;

    const isCurrent = workspaceId === this.workspaceManager.currentWorkspaceId;
    const isLast = this.workspaceManager.workspaces.length <= 1;

    let content = `确定要删除工作空间 "${ws.name}" 吗？`;
    if (isLast) {
      content = '这是最后一个工作空间，删除后将自动创建一个新的默认空间。';
    }
    if (isCurrent) {
      content += '\n当前正在使用此空间，删除后将切换到其他空间。';
    }

    wx.showModal({
      title: '删除工作空间',
      content: content,
      confirmColor: '#d73a49',
      success: (res) => {
        if (res.confirm) {
          wx.showActionSheet({
            itemList: ['仅移除空间（保留仓库）', '删除空间和所有文件'],
            success: (actionRes) => {
              try {
                const result = this.workspaceManager.delete(workspaceId, {
                  force: isLast,
                  deleteFiles: actionRes.tapIndex === 1
                });

                // 刷新GitStore
                const app = getApp();
                app.globalData.gitStore = new (require('../../utils/git-store').GitStore)();

                wx.showToast({ title: '已删除', icon: 'success' });
                this.loadData();
              } catch (error) {
                wx.showToast({ title: error.message, icon: 'none' });
              }
            }
          });
        }
      }
    });
  },

  // ========== 整理仓库 ==========

  organizeOrphans() {
    const count = this.workspaceManager.organizeOrphanRepos();
    if (count > 0) {
      wx.showToast({ title: `已整理 ${count} 个仓库`, icon: 'success' });
    } else {
      wx.showToast({ title: '所有仓库已分配', icon: 'none' });
    }
    this.loadData();
  }
});
