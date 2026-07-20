/**
 * Adapter.js
 * 统一封装微信小游戏 wx API 与浏览器/Node.js 降级适配层
 */

export const Adapter = {
  isWeChat: typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function',
  _memoryStore: {},

  // 获取系统屏幕尺寸
  getSystemInfo() {
    if (this.isWeChat) {
      try {
        const info = wx.getSystemInfoSync();
        return {
          windowWidth: info.windowWidth || 375,
          windowHeight: info.windowHeight || 667,
          pixelRatio: info.pixelRatio || 2,
          platform: info.platform || 'devtools'
        };
      } catch (e) {
        // fallback
      }
    }
    if (typeof window !== 'undefined' && window.innerWidth) {
      return {
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        pixelRatio: window.devicePixelRatio || 1,
        platform: 'browser'
      };
    }
    return {
      windowWidth: 375,
      windowHeight: 667,
      pixelRatio: 2,
      platform: 'node'
    };
  },

  // 本地持久化存储
  setStorage(key, value) {
    const dataStr = typeof value === 'string' ? value : JSON.stringify(value);
    if (this.isWeChat && typeof wx.setStorageSync === 'function') {
      try {
        wx.setStorageSync(key, dataStr);
      } catch (e) {
        console.error('wx.setStorageSync error:', e);
      }
      return;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, dataStr);
      } catch (e) {
        console.error('localStorage error:', e);
      }
      return;
    }
    this._memoryStore[key] = dataStr;
  },

  getStorage(key, defaultValue = null) {
    if (this.isWeChat && typeof wx.getStorageSync === 'function') {
      try {
        const val = wx.getStorageSync(key);
        if (val) {
          try { return JSON.parse(val); } catch (e) { return val; }
        }
      } catch (e) {
        console.error('wx.getStorageSync error:', e);
      }
      return defaultValue;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        const val = localStorage.getItem(key);
        if (val) {
          try { return JSON.parse(val); } catch (e) { return val; }
        }
      } catch (e) {
        console.error('localStorage error:', e);
      }
      return defaultValue;
    }
    if (this._memoryStore[key] !== undefined) {
      try { return JSON.parse(this._memoryStore[key]); } catch (e) { return this._memoryStore[key]; }
    }
    return defaultValue;
  },

  removeStorage(key) {
    if (this.isWeChat && typeof wx.removeStorageSync === 'function') {
      wx.removeStorageSync(key);
    } else if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    } else {
      delete this._memoryStore[key];
    }
  },

  // 震动反馈
  vibrateShort() {
    if (this.isWeChat && typeof wx.vibrateShort === 'function') {
      wx.vibrateShort({ type: 'light' });
    }
  },

  // Toast 提示
  showToast(title, icon = 'none') {
    if (this.isWeChat && typeof wx.showToast === 'function') {
      wx.showToast({ title, icon, duration: 2000 });
    } else {
      console.log(`[TOAST]: ${title}`);
      // 触发 UI 全局提示广播
      if (typeof window !== 'undefined' && window.__showHUDToast) {
        window.__showHUDToast(title);
      }
    }
  },

  // 弹窗确认
  showModal({ title, content, confirmText = '确定', cancelText = '取消', showCancel = true, success }) {
    if (this.isWeChat && typeof wx.showModal === 'function') {
      wx.showModal({
        title, content, confirmText, cancelText, showCancel,
        success: (res) => {
          if (success) success(res);
        }
      });
    } else {
      // 浏览器 / Node 下降级
      if (typeof window !== 'undefined' && typeof window.confirm === 'function' && showCancel) {
        const ok = window.confirm(`${title}\n\n${content}`);
        if (success) success({ confirm: ok, cancel: !ok });
      } else {
        console.log(`[MODAL]: ${title} - ${content}`);
        if (success) success({ confirm: true, cancel: false });
      }
    }
  }
};
