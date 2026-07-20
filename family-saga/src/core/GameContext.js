/**
 * GameContext.js
 * 游戏全局状态中心，统括资源、时间（年份）、行动力与体力、血脉传承与核心主循环。
 */

import { Adapter } from './Adapter.js';
import { FamilyManager } from '../family/FamilyManager.js';
import { EconomyManager } from '../economy/EconomyManager.js';
import { Bloodline } from '../family/Bloodline.js';

export class GameContext {
  constructor() {
    this.reset();
  }

  reset() {
    this.route = 'xianxia'; // 'xianxia' (修仙) or 'official' (官职)
    this.year = 1;          // 当前年份
    this.generation = 1;    // 家族代数

    // 行动与体力
    this.actionPoints = 10;
    this.maxActionPoints = 10;
    this.stamina = 100;
    this.maxStamina = 100;

    // 修仙资源
    this.spiritStones = 1000;   // 灵石
    this.manuals = 2;           // 功法/藏经
    this.elixirs = 5;           // 丹药
    
    // 官路资源
    this.silver = 1500;         // 银两
    this.merit = 100;           // 政绩
    this.connections = 3;       // 人脉/令牌

    // 共通资源
    this.reputation = 100;      // 家族声望
    this.logs = [];             // 历年大事件编年史

    // 广告福利与状态
    this.adBonuses = {
      productionMultiplier: 1,  // 产出倍率 (如族人加速翻倍)
      productionTurnLeft: 0,    // 加速剩余回合(年)
      dropMultiplier: 1,        // 副本掉落倍率
      inheritedExtra: false     // 传承加成 15%
    };

    // 子子系统引用 (在 main 或初始化时装配)
    this.familyManager = null;
    this.economyManager = null;
    this.battleManager = null;
    this.eventEngine = null;
    this.bloodline = null;
    this.uiManager = null;
    this.sceneManager = null;
    this.audioManager = null;

    this.paused = false;
  }

  initRoute(route = 'xianxia') {
    this.route = route;
    if (route === 'xianxia') {
      this.spiritStones = 1200 + (this.bloodline ? this.bloodline.level * 300 : 0);
      this.manuals = 2;
      this.elixirs = 5;
      this.reputation = 100 + (this.bloodline ? this.bloodline.level * 20 : 0);
    } else {
      this.silver = 1800 + (this.bloodline ? this.bloodline.level * 400 : 0);
      this.merit = 120;
      this.connections = 3;
      this.reputation = 100 + (this.bloodline ? this.bloodline.level * 20 : 0);
    }
    this.addLog(`第1年：${route === 'xianxia' ? '修仙' : '官宦'}家族正始开基，立下千秋鸿业！`);
  }

  // 资源操作通用方法
  getResource(type) {
    return this[type] !== undefined ? this[type] : 0;
  }

  addResource(type, amount) {
    if (this[type] !== undefined) {
      this[type] = Math.max(0, Math.floor(this[type] + amount));
      if (this.bloodline) {
        this.bloodline.trackResourceGain(type, amount);
      }
    }
  }

  consumeResource(type, amount) {
    if (this[type] !== undefined && this[type] >= amount) {
      this[type] = Math.max(0, Math.floor(this[type] - amount));
      return true;
    }
    return false;
  }

  hasResource(type, amount) {
    return this[type] !== undefined && this[type] >= amount;
  }

  // 消耗行动点
  spendActionPoints(cost = 1) {
    if (this.actionPoints >= cost) {
      this.actionPoints -= cost;
      return true;
    }
    Adapter.showToast('行动点不足，可观看激励广告快速恢复或结束本年！');
    return false;
  }

  // 消耗体力
  spendStamina(cost = 20) {
    if (this.stamina >= cost) {
      this.stamina -= cost;
      return true;
    }
    Adapter.showToast('体力耗尽，可观看激励视频恢复或下一年回满！');
    return false;
  }

  // 恢复行动点 / 体力 (广告或跨年)
  recoverActionPoints(amount = null) {
    if (amount === null) {
      this.actionPoints = this.maxActionPoints;
    } else {
      this.actionPoints = Math.min(this.maxActionPoints, this.actionPoints + amount);
    }
  }

  recoverStamina(amount = null) {
    if (amount === null) {
      this.stamina = this.maxStamina;
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    }
  }

  // 年度推移 (核心主循环一步)
  nextYear() {
    this.year += 1;
    this.recoverActionPoints();
    this.recoverStamina();

    // 广告加速倒计时检查
    if (this.adBonuses.productionTurnLeft > 0) {
      this.adBonuses.productionTurnLeft -= 1;
      if (this.adBonuses.productionTurnLeft === 0) {
        this.adBonuses.productionMultiplier = 1;
        Adapter.showToast('族人产出加速效果已结束');
      }
    }

    // 结算经营产出
    let annualIncome = 0;
    if (this.economyManager) {
      annualIncome = this.economyManager.calculateAndCollectAnnualIncome(this);
    }

    // 族人岁数增长，检查寿命与突破/升迁
    let heirTriggered = false;
    if (this.familyManager) {
      const result = this.familyManager.advanceYear(this);
      if (result && result.masterPassedAway) {
        heirTriggered = true;
      }
    }

    // 记录日常编年史
    const resName = this.route === 'xianxia' ? '灵石' : '银两';
    this.addLog(`第${this.year}年：春去秋来，领地岁收增加 ${annualIncome} ${resName}。`);

    // 触发年度随机事件
    if (!heirTriggered && this.eventEngine) {
      this.eventEngine.triggerAnnualEvent(this);
    }

    // 检查血脉与里程碑升级
    if (this.bloodline) {
      this.bloodline.checkMilestones(this);
    }

    // 如果家主去世，触发选定继承人 UI
    if (heirTriggered && this.uiManager) {
      this.uiManager.openModal('HeirSelectUI');
    } else if (this.uiManager) {
      this.uiManager.refreshHUD();
    }
  }

  addLog(message) {
    this.logs.unshift(message);
    if (this.logs.length > 50) this.logs.pop();
  }

  toJSON() {
    return {
      route: this.route,
      year: this.year,
      generation: this.generation,
      actionPoints: this.actionPoints,
      maxActionPoints: this.maxActionPoints,
      stamina: this.stamina,
      maxStamina: this.maxStamina,
      spiritStones: this.spiritStones,
      manuals: this.manuals,
      elixirs: this.elixirs,
      silver: this.silver,
      merit: this.merit,
      connections: this.connections,
      reputation: this.reputation,
      logs: this.logs.slice(0, 30),
      adBonuses: this.adBonuses,
      familyData: this.familyManager ? this.familyManager.toJSON() : null,
      economyData: this.economyManager ? this.economyManager.toJSON() : null,
      bloodlineData: this.bloodline ? this.bloodline.toJSON() : null
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.route = data.route || 'xianxia';
    this.year = data.year || 1;
    this.generation = data.generation || 1;
    this.actionPoints = data.actionPoints !== undefined ? data.actionPoints : 10;
    this.maxActionPoints = data.maxActionPoints || 10;
    this.stamina = data.stamina !== undefined ? data.stamina : 100;
    this.maxStamina = data.maxStamina || 100;
    this.spiritStones = data.spiritStones || 0;
    this.manuals = data.manuals || 0;
    this.elixirs = data.elixirs || 0;
    this.silver = data.silver || 0;
    this.merit = data.merit || 0;
    this.connections = data.connections || 0;
    this.reputation = data.reputation !== undefined ? data.reputation : 100;
    this.logs = data.logs || [];
    if (data.adBonuses) {
      this.adBonuses = data.adBonuses;
    }

    if (data.familyData) {
      if (!this.familyManager) this.familyManager = new FamilyManager();
      this.familyManager.fromJSON(data.familyData);
    }
    if (data.economyData) {
      if (!this.economyManager) this.economyManager = new EconomyManager();
      this.economyManager.fromJSON(data.economyData);
    }
    if (data.bloodlineData) {
      if (!this.bloodline) this.bloodline = new Bloodline();
      this.bloodline.fromJSON(data.bloodlineData);
    }
  }
}
