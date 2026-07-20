/**
 * UIManager.js
 * Canvas 2D Overlay HUD 界面与交互系统总控制器
 * 负责自适应屏幕渲染顶部栏、底部导航、领地建设、角色列表、副本战斗与突发事件等弹窗
 */

import { Adapter } from '../core/Adapter.js';
import { MainHUD } from './MainHUD.js';
import { TerritoryUI } from './TerritoryUI.js';
import { FamilyUI } from './FamilyUI.js';
import { DungeonUI } from './DungeonUI.js';
import { BloodlineUI } from './BloodlineUI.js';
import { EventUI } from './EventUI.js';
import { HeirSelectUI } from './HeirSelectUI.js';
import { AdModalUI } from './AdModalUI.js';
import { BattleUI } from './BattleUI.js';
import { AssignMemberUI } from './AssignMemberUI.js';
import { SocialUI } from './SocialUI.js';
import { ArtifactUI } from './ArtifactUI.js';
import { TournamentUI } from './TournamentUI.js';

export class UIManager {
  constructor(context) {
    this.context = context;
    this.overlayCanvas = null;
    this.ctx = null;
    this.hitAreas = []; // 点击响应热区池
    this.currentTab = 'territory'; // 'territory', 'family', 'dungeon', 'bloodline'
    this.activeModal = null; // 'EventUI', 'HeirSelectUI', 'AdModalUI', 'BattleUI', 'AdSimModal'
    this.modalData = null;
    this.toastQueue = [];
    this.currentToast = null;
    this.toastTimer = 0;

    this.initCanvas();
    this.bindEvents();
  }

  initCanvas() {
    const sys = Adapter.getSystemInfo();
    this.width = sys.windowWidth;
    this.height = sys.windowHeight;
    this.pixelRatio = sys.pixelRatio || 2;

    if (typeof GameGlobal !== 'undefined' && GameGlobal.document) {
      // 创建次级 Canvas 作为 2D UI 覆盖层
      if (typeof wx !== 'undefined' && typeof wx.createCanvas === 'function') {
        this.overlayCanvas = wx.createCanvas();
      } else if (typeof document !== 'undefined') {
        let el = document.getElementById('ui-overlay');
        if (!el) {
          el = document.createElement('canvas');
          el.id = 'ui-overlay';
          el.style.position = 'absolute';
          el.style.top = '0';
          el.style.left = '0';
          el.style.zIndex = '10';
          document.body.appendChild(el);
        }
        this.overlayCanvas = el;
      }
    }

    if (this.overlayCanvas) {
      this.overlayCanvas.width = this.width * this.pixelRatio;
      this.overlayCanvas.height = this.height * this.pixelRatio;
      if (this.overlayCanvas.style) {
        this.overlayCanvas.style.width = `${this.width}px`;
        this.overlayCanvas.style.height = `${this.height}px`;
      }
      this.ctx = this.overlayCanvas.getContext('2d');
      if (this.ctx) {
        this.ctx.scale(this.pixelRatio, this.pixelRatio);
      }
    }
  }

  bindEvents() {
    const handleTouch = (x, y) => {
      // 遍历热区检测 (自顶向下，优先响应弹窗/上层元素)
      for (let i = this.hitAreas.length - 1; i >= 0; i--) {
        const h = this.hitAreas[i];
        if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
          if (h.onClick) {
            h.onClick();
          }
          return;
        }
      }
    };

    if (typeof wx !== 'undefined' && wx.onTouchEnd) {
      wx.onTouchEnd((res) => {
        if (res && res.changedTouches && res.changedTouches.length > 0) {
          const t = res.changedTouches[0];
          handleTouch(t.clientX, t.clientY);
        }
      });
    } else if (typeof window !== 'undefined') {
      window.addEventListener('touchend', (e) => {
        if (e && e.changedTouches && e.changedTouches.length > 0) {
          const t = e.changedTouches[0];
          handleTouch(t.clientX, t.clientY);
        }
      });
      window.addEventListener('mousedown', (e) => {
        handleTouch(e.clientX, e.clientY);
      });
    }
  }

  openModal(modalName, data = null) {
    this.activeModal = modalName;
    this.modalData = data;
    this.context.paused = true;
    this.refreshHUD();
  }

  closeModal() {
    this.activeModal = null;
    this.modalData = null;
    this.context.paused = false;
    this.refreshHUD();
  }

  switchTab(tabKey) {
    this.currentTab = tabKey;
    this.refreshHUD();
  }

  refreshHUD() {
    // 触发下一帧渲染即可
  }

  addHitArea(x, y, w, h, onClick, label = '') {
    this.hitAreas.push({ x, y, w, h, onClick, label });
  }

  // 主界面与弹窗联合渲染主循环
  render() {
    if (!this.ctx) return;
    this.hitAreas = []; // 每帧重构热区

    // 清空透明覆盖层
    this.ctx.clearRect(0, 0, this.width, this.height);

    // 1. 顶部状态栏及底部导航栏 (MainHUD)
    MainHUD.render(this.ctx, this.width, this.height, this.context, this);

    // 2. 当前选中主区域选项卡页面
    if (!this.activeModal) {
      if (this.currentTab === 'territory') {
        TerritoryUI.render(this.ctx, this.width, this.height, this.context, this);
      } else if (this.currentTab === 'family') {
        FamilyUI.render(this.ctx, this.width, this.height, this.context, this);
      } else if (this.currentTab === 'dungeon') {
        DungeonUI.render(this.ctx, this.width, this.height, this.context, this);
      } else if (this.currentTab === 'bloodline') {
        BloodlineUI.render(this.ctx, this.width, this.height, this.context, this);
      }
    }

    // 3. 模态对话框与弹窗渲染
    if (this.activeModal) {
      this.renderModalBackdrop();

      if (this.activeModal === 'EventUI') {
        EventUI.render(this.ctx, this.width, this.height, this.context, this, this.modalData);
      } else if (this.activeModal === 'HeirSelectUI') {
        HeirSelectUI.render(this.ctx, this.width, this.height, this.context, this);
      } else if (this.activeModal === 'AdModalUI') {
        AdModalUI.render(this.ctx, this.width, this.height, this.context, this);
      } else if (this.activeModal === 'BattleUI') {
        BattleUI.render(this.ctx, this.width, this.height, this.context, this);
      } else if (this.activeModal === 'AssignMemberUI') {
        AssignMemberUI.render(this.ctx, this.width, this.height, this.context, this, this.modalData);
      } else if (this.activeModal === 'SocialUI') {
        SocialUI.render(this.ctx, this.width, this.height, this.context, this);
      } else if (this.activeModal === 'ArtifactUI') {
        ArtifactUI.render(this.ctx, this.width, this.height, this.context, this);
      } else if (this.activeModal === 'TournamentUI') {
        TournamentUI.render(this.ctx, this.width, this.height, this.context, this, this.modalData);
      } else if (this.activeModal === 'AdSimModal') {
        this.renderAdSimModal();
      }
    }

    // 4. Toast 提示广播渲染
    this.renderToast();
  }

  renderModalBackdrop() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    this.ctx.fillRect(0, 0, this.width, this.height);
    // 背景遮罩层阻止穿透
    this.addHitArea(0, 0, this.width, this.height, () => {}, 'backdrop');
  }

  // 辅助绘制圆角面板
  drawPanel(x, y, w, h, bg = '#283644', borderColor = '#e0c068', radius = 8) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = bg;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 辅助绘制按钮与注册热区
  drawButton(x, y, w, h, text, onClick, bg = '#4a7c59', textColor = '#ffffff', fontSize = 14) {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = bg;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w / 2, y + h / 2);
    ctx.restore();

    this.addHitArea(x, y, w, h, onClick, text);
  }

  renderAdSimModal() {
    const w = Math.min(320, this.width - 40);
    const h = 220;
    const x = (this.width - w) / 2;
    const y = (this.height - h) / 2;

    this.drawPanel(x, y, w, h, '#1e2830', '#ffcc00', 10);

    const ctx = this.ctx;
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('激励视频广告播放模拟', x + w / 2, y + 35);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    ctx.fillText('[模拟开发与真机兼容层]', x + w / 2, y + 68);
    ctx.fillText(`已触发商业化广告点位：【${this.modalData ? this.modalData.pointKey : '福利点位'}】`, x + w / 2, y + 100);
    ctx.fillText('观看完 15~30秒激励视频即可获取高额福利奖励', x + w / 2, y + 130);

    this.drawButton(x + 25, y + 160, w - 50, 42, '▶ 模拟观看完毕并领取奖励！', () => {
      const cb = this.modalData ? this.modalData.onComplete : null;
      this.closeModal();
      if (cb) cb();
    }, '#d4af37', '#000000', 15);
  }

  showToast(text) {
    this.currentToast = text;
    this.toastTimer = 120; // 约 2秒
  }

  renderToast() {
    if (!this.currentToast || this.toastTimer <= 0) return;
    this.toastTimer--;
    const ctx = this.ctx;
    const text = this.currentToast;
    ctx.save();
    ctx.font = '14px sans-serif';
    const measure = ctx.measureText(text);
    const w = Math.max(200, measure.width + 36);
    const h = 40;
    const x = (this.width - w) / 2;
    const y = this.height * 0.45;

    ctx.fillStyle = 'rgba(10, 15, 20, 0.88)';
    ctx.strokeStyle = '#ffdd55';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, this.width / 2, y + h / 2);
    ctx.restore();
    if (this.toastTimer === 0) this.currentToast = null;
  }
}
