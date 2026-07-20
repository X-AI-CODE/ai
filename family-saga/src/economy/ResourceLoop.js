/**
 * ResourceLoop.js
 * 资源循环与经济产出计算引擎
 * 灵石/银两 -> 升级建筑 -> 提高产出 -> 采购丹药/装备 -> 提升战力 -> 通关副本 -> 更高产出
 */

import { BUILDINGS_CONFIG } from './Building.js';

export class ResourceLoop {
  // 计算某个单体建筑当年的综合产出 (经过派驻族人加成与广告倍率强化)
  static calculateBuildingAnnualOutput(building, familyManager, context) {
    const cfg = building.getConfig();
    if (!cfg) return { type: 'none', amount: 0 };

    const baseAmount = building.getBaseOutput();
    
    // 检查是否有族人派驻
    let memberBonus = 0;
    if (building.assignedMemberId && familyManager) {
      const member = familyManager.members.find((m) => m.id === building.assignedMemberId && m.assignedBuilding === building.key);
      if (member) {
        memberBonus = member.getProductionBonus(); // 例如 0.5 ~ 2.0 (50% ~ 200% 加成)
      }
    }

    // 广告加速倍率 (例如 2倍)
    const adMultiplier = context && context.adBonuses ? (context.adBonuses.productionMultiplier || 1) : 1;

    // 祖训树与法宝加成倍率
    const ancestralBonus = context && context.ancestralTree ? context.ancestralTree.getWealthMultiplier() : 0;
    const artifactBonus = context && context.artifactManager ? context.artifactManager.getTotalProdBonus() : 0;

    // 综合产出 = 基础 × (1 + 族人加成 + 祖训加成 + 法宝加成) × 广告倍率
    const finalAmount = Math.floor(baseAmount * (1 + memberBonus + ancestralBonus + artifactBonus) * adMultiplier);

    return {
      type: cfg.outputType,
      amount: finalAmount,
      memberBonus: Math.floor(memberBonus * 100),
      adBonus: adMultiplier > 1
    };
  }

  // 商铺采购丹药/兵书资源交换
  static tradeMarketItem(context, itemKey) {
    const route = context.route;
    const currency = route === 'xianxia' ? 'spiritStones' : 'silver';
    const currencyName = route === 'xianxia' ? '灵石' : '银两';

    if (itemKey === 'elixir_or_merit') {
      const cost = route === 'xianxia' ? 300 : 350;
      if (!context.hasResource(currency, cost)) {
        return { success: false, msg: `${currencyName}不足，需 ${cost} ${currencyName}！` };
      }
      context.consumeResource(currency, cost);
      if (route === 'xianxia') {
        context.addResource('elixirs', 1);
        return { success: true, msg: `成功消耗 ${cost} 灵石，购得【九转延寿/突破丹】×1！` };
      } else {
        context.addResource('merit', 50);
        return { success: true, msg: `成功消耗 ${cost} 银两，捐资助学，获得【政绩/卷宗】×50！` };
      }
    } else if (itemKey === 'manual_or_connection') {
      const cost = route === 'xianxia' ? 800 : 900;
      if (!context.hasResource(currency, cost)) {
        return { success: false, msg: `${currencyName}不足，需 ${cost} ${currencyName}！` };
      }
      context.consumeResource(currency, cost);
      if (route === 'xianxia') {
        context.addResource('manuals', 1);
        return { success: true, msg: `成功拍卖获得珍稀【真法残卷/心法】×1！` };
      } else {
        context.addResource('connections', 1);
        return { success: true, msg: `结识重臣！成功消耗 ${cost} 银两，打通朝堂，获得【人脉令牌】×1！` };
      }
    } else if (itemKey === 'stamina_potion') {
      const cost = route === 'xianxia' ? 200 : 250;
      if (!context.hasResource(currency, cost)) {
        return { success: false, msg: `${currencyName}不足，需 ${cost} ${currencyName}！` };
      }
      context.consumeResource(currency, cost);
      context.recoverStamina(50);
      return { success: true, msg: `服用补气灵茶/行军参汤，立刻恢复 50 点战斗体力！` };
    }

    return { success: false, msg: '未知商品或无法交易' };
  }
}
