/**
 * OfflineIdle.js
 * 离线挂机与闭关修炼收益计算引擎
 * 玩家关闭小游戏离线后，家主与族人继续开采庄园与打坐闭关，再次上线时计算收益并提供广告 3 倍领取！
 */

import { ResourceLoop } from './ResourceLoop.js';
import { Adapter } from '../core/Adapter.js';

export class OfflineIdle {
  // 计算上次存档到现在经历的离线收益
  static calculateOfflineIncome(context, lastSaveTime) {
    if (!lastSaveTime || !context) return null;
    const now = Date.now();
    const offlineMs = now - lastSaveTime;

    // 至少离线满 5 分钟 (300,000 毫秒) 才触发离线大礼，最多结算 24 小时 (86,400,000 毫秒)
    if (offlineMs < 300000) return null;

    const effectiveMs = Math.min(86400000, offlineMs);
    const hours = Number((effectiveMs / 3600000).toFixed(1));
    const mins = Math.floor((effectiveMs % 3600000) / 60000);

    // 估算每小时产出：相当于游戏中大约推演 2 年的庄园产出
    const economy = context.economyManager;
    let annualStonesOrSilver = 0;
    if (economy) {
      Object.values(economy.buildings).forEach((b) => {
        const out = ResourceLoop.calculateBuildingAnnualOutput(b, context.familyManager, context);
        if (out.type === 'spiritStones' || out.type === 'silver') {
          annualStonesOrSilver += out.amount;
        }
      });
    }
    if (annualStonesOrSilver === 0) annualStonesOrSilver = context.route === 'xianxia' ? 200 : 300;

    const baseStonesOrSilver = Math.floor(annualStonesOrSilver * hours * 1.5);
    const baseExp = Math.floor(150 * hours);
    const baseManualsOrTokens = Math.random() < (0.2 * hours) ? Math.max(1, Math.floor(hours / 3)) : 0;

    return {
      hours,
      mins,
      currencyType: context.route === 'xianxia' ? 'spiritStones' : 'silver',
      currencyName: context.route === 'xianxia' ? '灵石' : '银两',
      currencyAmount: Math.max(100, baseStonesOrSilver),
      expAmount: Math.max(50, baseExp),
      manualsOrTokens: baseManualsOrTokens
    };
  }

  // 领取离线收益入库 (支持广告 3 倍翻倍)
  static claimOfflineIncome(context, incomeInfo, multiplier = 1) {
    if (!context || !incomeInfo) return;

    const finalCurrency = Math.floor(incomeInfo.currencyAmount * multiplier);
    const finalExp = Math.floor(incomeInfo.expAmount * multiplier);
    const finalManuals = Math.floor(incomeInfo.manualsOrTokens * multiplier);

    context.addResource(incomeInfo.currencyType, finalCurrency);
    if (finalManuals > 0) {
      context.addResource(context.route === 'xianxia' ? 'manuals' : 'connections', finalManuals);
    }

    // 给予全族在职族人修为/学识经验成长
    if (context.familyManager) {
      context.familyManager.members.forEach((m) => {
        if (m.age >= 16) m.gainExp(finalExp, context.route, context);
      });
    }

    context.addLog(`★ 离线闭关归来 (${incomeInfo.hours}小时)！${multiplier > 1 ? `(广告${multiplier}倍大赏)` : ''} 获得：${incomeInfo.currencyName}+${finalCurrency} | 全员修为+${finalExp}`);
    Adapter.showToast(`离线大礼领取成功：${incomeInfo.currencyName} +${finalCurrency}`);
    if (context.audioManager) context.audioManager.playSFX('victory');
  }
}
