/**
 * weapp-adapter.js
 * 微信小游戏轻量级全局 DOM & Canvas 适配层
 * 保证 Three.js 与 Canvas 2D Overlay 在微信小游戏和普通浏览器/Node测试环境双向兼容。
 */

const GameGlobal = typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {});

// 如果在微信环境（具备 wx 对象且无标准 window）
if (typeof wx !== 'undefined' && typeof window === 'undefined') {
  GameGlobal.window = GameGlobal;
  GameGlobal.navigator = {
    userAgent: 'WeChatMiniGame',
    platform: 'Mobile'
  };

  // 创建默认主 Canvas
  if (!GameGlobal.canvas) {
    GameGlobal.canvas = wx.createCanvas();
  }

  GameGlobal.document = {
    createElement: function (tagName) {
      if (tagName === 'canvas') {
        return wx.createCanvas();
      } else if (tagName === 'img' || tagName === 'image') {
        return wx.createImage();
      } else if (tagName === 'audio') {
        return wx.createInnerAudioContext();
      }
      return {
        style: {},
        addEventListener: function () {},
        removeEventListener: function () {},
        appendChild: function () {},
        removeChild: function () {}
      };
    },
    createElementNS: function (ns, tagName) {
      return this.createElement(tagName);
    },
    getElementById: function (id) {
      if (id === 'canvas' || id === 'main-canvas') {
        return GameGlobal.canvas;
      }
      return null;
    },
    body: {
      appendChild: function () {},
      removeChild: function () {}
    },
    addEventListener: function (type, listener) {
      if (type === 'touchstart') wx.onTouchStart(listener);
      if (type === 'touchmove') wx.onTouchMove(listener);
      if (type === 'touchend') wx.onTouchEnd(listener);
    },
    removeEventListener: function (type, listener) {
      if (type === 'touchstart' && wx.offTouchStart) wx.offTouchStart(listener);
      if (type === 'touchmove' && wx.offTouchMove) wx.offTouchMove(listener);
      if (type === 'touchend' && wx.offTouchEnd) wx.offTouchEnd(listener);
    }
  };

  GameGlobal.requestAnimationFrame = GameGlobal.requestAnimationFrame || function (callback) {
    if (typeof wx.requestAnimationFrame === 'function') {
      return wx.requestAnimationFrame(callback);
    }
    return setTimeout(callback, 16);
  };

  GameGlobal.cancelAnimationFrame = GameGlobal.cancelAnimationFrame || function (id) {
    if (typeof wx.cancelAnimationFrame === 'function') {
      return wx.cancelAnimationFrame(id);
    }
    clearTimeout(id);
  };

  GameGlobal.addEventListener = GameGlobal.document.addEventListener;
  GameGlobal.removeEventListener = GameGlobal.document.removeEventListener;
  GameGlobal.innerWidth = GameGlobal.canvas ? GameGlobal.canvas.width : 375;
  GameGlobal.innerHeight = GameGlobal.canvas ? GameGlobal.canvas.height : 667;
  GameGlobal.devicePixelRatio = wx.getSystemInfoSync ? (wx.getSystemInfoSync().pixelRatio || 2) : 2;
  GameGlobal.Image = function () { return wx.createImage(); };
} else if (typeof window !== 'undefined') {
  // 浏览器或Web模拟环境
  GameGlobal.window = window;
  GameGlobal.document = document;
  GameGlobal.requestAnimationFrame = window.requestAnimationFrame.bind(window);
  GameGlobal.cancelAnimationFrame = window.cancelAnimationFrame.bind(window);
} else {
  // Node 测试模拟环境
  GameGlobal.window = GameGlobal;
  GameGlobal.navigator = { userAgent: 'NodeTest', platform: 'Server' };
  GameGlobal.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  GameGlobal.cancelAnimationFrame = (id) => clearTimeout(id);
  GameGlobal.document = {
    createElement: (tag) => ({
      style: {},
      getContext: () => ({
        fillRect: () => {}, clearRect: () => {}, fillText: () => {}, measureText: () => ({ width: 100 }),
        beginPath: () => {}, moveTo: () => {}, lineTo: () => {}, stroke: () => {}, fill: () => {},
        arc: () => {}, save: () => {}, restore: () => {}, clip: () => {}, drawImage: () => {}
      }),
      width: 375, height: 667, addEventListener: () => {}
    }),
    body: { appendChild: () => {} },
    addEventListener: () => {}
  };
}

export default GameGlobal;
