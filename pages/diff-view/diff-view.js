// pages/diff-view/diff-view.js - Diff查看页
import { GitStore } from '../../utils/git-store';

Page({
  data: {
    repoId: '',
    filePath: '',
    commitHash: '',
    diff: null,
    viewMode: 'unified', // unified, split
    loading: true
  },

  onLoad(options) {
    this.repoId = options.repoId;
    this.filePath = decodeURIComponent(options.path);
    this.commitHash = options.commit;
    this.gitStore = new GitStore();

    wx.setNavigationBarTitle({
      title: this.filePath.split('/').pop()
    });

    this.loadDiff();
  },

  async loadDiff() {
    try {
      const diff = await this.gitStore.getFileDiff(this.repoId, this.filePath);
      this.setData({ diff, loading: false });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  switchViewMode(e) {
    const mode = e.currentTarget.dataset.mode;
    this.setData({ viewMode: mode });
  }
});
