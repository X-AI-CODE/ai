/**
 * EconomyManager.js
 * 家族领地经济与五大核心建筑系统控制器
 */

import { Building, BUILDINGS_CONFIG } from './Building.js';
import { ResourceLoop } from './ResourceLoop.js';
import { Adapter } from '../core/Adapter.js';

export class EconomyManager {
  constructor() {
    this.buildings = {};
  }

  // 针对路线初始化领土建筑
  initBuildings(route = 'xianxia') {
    this.buildings = {};
    if (route === 'xianxia') {
      this.buildings.spiritVein = new Building('spiritVein', 1);
      this.buildings.alchemyLab = new Building('alchemyLab', 1);
      this.buildings.cultivationRoom = new Building('cultivationRoom', 1);
      this.buildings.sutraVault = new Building('sutraVault', 1);
      this.buildings.ancestralShrine = new Building('ancestralShrine', 1);
    } else {
      this.buildings.manorShop = new Building('manorShop', 1);
      this.buildings.academy = new Building('academy', 1);
      this.buildings.trainingGrounds = new Building('trainingGrounds', 1);
      this.buildings.treasury = new Building('treasury', 1);
      this.buildings.ancestralShrine = new Building('ancestralShrine', 1);
    }
  }

  getBuildingList() {
    return Object.values(this.buildings);
  }

  getBuilding(key) {
    return this.buildings[key] || null;
  }

  // 升级指定建筑
  upgradeBuilding(key, context) {
    const building = this.getBuilding(key);
    if (!building) {
      Adapter.showToast('不存在的建筑');
      return false;
    }

    const { costAmount, costType } = building.getUpgradeCost(context.route);
    const currencyName = costType === 'spiritStones' ? '灵石' : '银两';

    if (!context.hasResource(costType, costAmount)) {
      Adapter.showToast(`升级失败：需要 ${costAmount} ${currencyName}`);
      return false;
    }

    context.consumeResource(costType, costAmount);
    building.level += 1;

    context.addLog(`▲ 宏图大展！耗资 ${costAmount} ${currencyName} 将【${building.getConfig().name}】升至 Lv.${building.level}！`);
    if (context.audioManager) context.audioManager.playSFX('levelUp');
    return true;
  }

  // 计算并征收全年度各项产出
  calculateAndCollectAnnualIncome(context) {
    const familyManager = context.familyManager;
    let mainCurrencyGained = 0;

    Object.values(this.buildings).forEach((b) => {
      const output = ResourceLoop.calculateBuildingAnnualOutput(b, familyManager, context);
      if (output.amount <= 0) return;

      if (output.type === 'spiritStones' || output.type === 'silver') {
        context.addResource(output.type, output.amount);
        mainCurrencyGained += output.amount;
      } else if (output.type === 'elixirs') {
        context.addResource('elixirs', output.amount);
      } else if (output.type === 'manuals') {
        // 碎片有几率合成完整功法
        if (Math.random() < 0.4 || output.amount >= 2) {
          context.addResource('manuals', 1);
        }
      } else if (output.type === 'merit') {
        context.addResource('merit', output.amount);
      } else if (output.type === 'connections') {
        if (Math.random() < 0.4 || output.amount >= 2) {
          context.addResource('connections', 1);
        }
      } else if (output.type === 'bloodlineExp') {
        if (context.bloodline) {
          context.bloodline.addExp(output.amount);
        }
      }
    });

    return mainCurrencyGained;
  }

  toJSON() {
    const data = {};
    Object.keys(this.buildings).forEach((key) => {
      data[key] = this.buildings[key].toJSON();
    });
    return data;
  }

  fromJSON(data) {
    if (!data) return;
    this.buildings = {};
    Object.keys(data).forEach((key) => {
      const item = data[key];
      const b = new Building(item.key, item.level || 1);
      b.assignedMemberId = item.assignedMemberId || null;
      this.buildings[key] = b;
    });
  }
}
