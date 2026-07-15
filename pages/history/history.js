// pages/history/history.js - 提交历史/详情页
import { GitStore } from '../../utils/git-store';

Page({
  data: {
    repoId: '',
    commitHash: '',
    commit: null,
    loading: true
  },

  onLoad(options) {
    this.repoId = options.repoId;
    this.commitHash = options.commit;
    this.gitStore = new GitStore();
    this.loadCommitDetail();
  },

  async loadCommitDetail() {
    try {
      const commit = await this.gitStore.getCommitDetail(this.repoId, this.commitHash);
      this.setData({
        commit,
        loading: false
      });
      wx.setNavigationBarTitle({ title: commit.hash.substring(0, 7) });
    } catch (error) {
      wx.showToast({ title: error.message, icon: 'none' });
      this.setData({ loading: false });
    }
  },

  viewDiff(e) {
    const path = e.currentTarget.dataset.path;
    wx.navigateTo({
      url: `/pages/diff-view/diff-view?repoId=${this.repoId}&path=${encodeURIComponent(path)}&commit=${this.commitHash}`
    });
  }
});
