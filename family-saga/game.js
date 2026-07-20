/**
 * game.js
 * 家族修仙/官途 (Family Saga) — 微信小游戏主入口与主循环启动器
 */

import GameGlobal from './libs/weapp-adapter.js';
import { Adapter } from './src/core/Adapter.js';
import { GameContext } from './src/core/GameContext.js';
import { AudioManager } from './src/core/AudioManager.js';
import { SceneManager } from './src/core/SceneManager.js';
import { FamilyManager } from './src/family/FamilyManager.js';
import { Bloodline } from './src/family/Bloodline.js';
import { EconomyManager } from './src/economy/EconomyManager.js';
import { BattleManager } from './src/battle/BattleManager.js';
import { EventEngine } from './src/event/EventEngine.js';
import { AdManager } from './src/ad/AdManager.js';
import { StorageManager } from './src/storage/StorageManager.js';
import { UIManager } from './src/ui/UIManager.js';

class GameMain {
  constructor() {
    this.context = new GameContext();
    this.audioManager = new AudioManager();
    this.adManager = new AdManager();
    this.bloodline = new Bloodline();
    this.familyManager = new FamilyManager();
    this.economyManager = new EconomyManager();
    this.battleManager = new BattleManager();
    this.eventEngine = new EventEngine();

    // 绑定至上下文
    this.context.audioManager = this.audioManager;
    this.context.adManager = this.adManager;
    this.context.bloodline = this.bloodline;
    this.context.familyManager = this.familyManager;
    this.context.economyManager = this.economyManager;
    this.context.battleManager = this.battleManager;
    this.context.eventEngine = this.eventEngine;

    // 渲染管理
    this.sceneManager = new SceneManager(this.context, GameGlobal.canvas);
    this.uiManager = new UIManager(this.context);
    this.context.sceneManager = this.sceneManager;
    this.context.uiManager = this.uiManager;

    // 包装 auto-save 至 nextYear
    const origNextYear = this.context.nextYear.bind(this.context);
    this.context.nextYear = () => {
      origNextYear();
      StorageManager.saveGame(this.context);
    };

    this.init();
  }

  init() {
    // 检查是否有历史存档
    if (StorageManager.hasSave()) {
      Adapter.showModal({
        title: '家族传奇 — 发现存档',
        content: '检测到之前保存的家族进度，是否继续旧梦续盘？\n\n(选择“取消”将重选修仙/官路开创全新周目)',
        confirmText: '继续读取',
        cancelText: '全新开创',
        success: (res) => {
          if (res && res.confirm) {
            StorageManager.loadGame(this.context);
            Adapter.showToast(`欢迎回来，当代家主！当前第 ${this.context.year} 年`);
            this.startLoop();
          } else {
            this.showRouteSelection();
          }
        }
      });
    } else {
      this.showRouteSelection();
    }
  }

  showRouteSelection() {
    Adapter.showModal({
      title: '双路线创角抉择',
      content: '请选择你想要踏上的家族千秋宏图路线：\n\n【确定】-> 🌟 修仙世家 (培育真灵仙根，渡劫飞升)\n【取消】-> 🚩 官宦世家 (入朝拜相，战棋沙盘权倾朝野)',
      confirmText: '修仙世家',
      cancelText: '官宦世家',
      showCancel: true,
      success: (res) => {
        const route = (res && res.confirm) ? 'xianxia' : 'official';
        this.startNewGame(route);
      }
    });
  }

  startNewGame(route) {
    this.context.reset();
    this.bloodline.reset();
    this.familyManager.createInitialFamily(route);
    this.economyManager.initBuildings(route);
    this.context.initRoute(route);

    // 初次自动保存
    StorageManager.saveGame(this.context);
    Adapter.showToast(`【${route === 'xianxia' ? '修仙世家' : '官宦世家'}】正始开基！`);
    this.audioManager.playBGM('territory');
    this.startLoop();
  }

  startLoop() {
    const loop = () => {
      if (this.sceneManager) {
        this.sceneManager.render();
      }
      if (this.uiManager) {
        this.uiManager.render();
      }
      GameGlobal.requestAnimationFrame(loop);
    };
    GameGlobal.requestAnimationFrame(loop);
  }
}

// 启动小游戏
const mainInstance = new GameMain();
export default mainInstance;
