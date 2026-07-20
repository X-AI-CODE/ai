/**
 * TerritoryUI.js
 * 领地经营选项卡：五大核心建筑管理、族人派驻加速与市场资源采购交易渲染
 */

import { ResourceLoop } from '../economy/ResourceLoop.js';
import { Adapter } from '../core/Adapter.js';

export class TerritoryUI {
  static render(ctx, width, height, context, uiManager) {
    const topY = 82;
    const bottomY = height - 60;
    const panelH = bottomY - topY;
    const pad = 12;

    // 半透明深色底框，展示建筑名录
    uiManager.drawPanel(pad, topY, width - pad * 2, panelH, 'rgba(20, 30, 42, 0.88)', '#5c8a8a', 10);

    ctx.save();
    ctx.fillStyle = '#ffdf00';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('五大核心庄园建筑与领地运作', width / 2, topY + 24);

    // 顶部加速广告通告栏
    const isBoosted = context.adBonuses && context.adBonuses.productionMultiplier > 1;
    if (isBoosted) {
      ctx.fillStyle = '#00ff7f';
      ctx.font = '13px sans-serif';
      ctx.fillText(`⚡ 广告族人加速生效中：全境产出 ×2 (剩余 ${context.adBonuses.productionTurnLeft} 年)`, width / 2, topY + 46);
    } else {
      uiManager.drawButton(width / 2 - 100, topY + 34, 200, 26, '📺 观看广告：全产出翻倍×2持续2年', () => {
        if (context.adManager) {
          context.adManager.showRewardedAd('memberBoost', {
            onSuccess: () => uiManager.refreshHUD(),
            context
          });
        }
      }, '#b38600', '#ffffff', 13);
    }
    ctx.restore();

    // 建筑卡片列表显示
    const economy = context.economyManager;
    if (!economy) return;
    const buildings = economy.getBuildingList();
    const startY = topY + 65;
    const cardH = 58;
    const gap = 6;

    buildings.forEach((b, idx) => {
      const cy = startY + idx * (cardH + gap);
      if (cy + cardH > bottomY - 60) return; // 避免超过市场区域

      const cfg = b.getConfig();
      const outputInfo = ResourceLoop.calculateBuildingAnnualOutput(b, context.familyManager, context);
      const outNameMap = { spiritStones: '灵石', silver: '银两', elixirs: '丹药', manuals: '功法卷', merit: '政绩', connections: '令牌', expBonus: '修为增幅', bloodlineExp: '血脉经验' };
      const outUnit = outNameMap[outputInfo.type] || outputInfo.type;

      // 建筑卡片底框
      uiManager.drawPanel(pad + 8, cy, width - pad * 2 - 16, cardH, 'rgba(32, 48, 64, 0.85)', '#7a9a9a', 6);

      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${b.getName()} - 年产:${outputInfo.amount} ${outUnit}`, pad + 18, cy + 20);

      // 派驻族人信息
      let assignText = '派驻:[空闲] (无加成)';
      if (b.assignedMemberId && context.familyManager) {
        const member = context.familyManager.members.find((m) => m.id === b.assignedMemberId);
        if (member) {
          assignText = `派驻:【${member.name}】(+${Math.floor(member.getProductionBonus() * 100)}%加速)`;
        }
      }
      ctx.fillStyle = b.assignedMemberId ? '#a8e6cf' : '#cccccc';
      ctx.font = '12px sans-serif';
      ctx.fillText(assignText, pad + 18, cy + 42);
      ctx.restore();

      // [派驻] 按钮
      uiManager.drawButton(width - 165, cy + 16, 60, 26, '派驻', () => {
        uiManager.openModal('AssignMemberUI', { building: b });
      }, '#3b6a88', '#ffffff', 12);

      // [升级] 按钮
      const costInfo = b.getUpgradeCost(context.route);
      const curTitle = costInfo.costType === 'spiritStones' ? '灵石' : '银两';
      uiManager.drawButton(width - 98, cy + 16, 80, 26, `升(${costInfo.costAmount}${curTitle})`, () => {
        economy.upgradeBuilding(b.key, context);
        uiManager.refreshHUD();
      }, '#4a7c59', '#ffffff', 12);
    });

    // 底部商铺/黑市快捷兑换区
    const marketY = bottomY - 56;
    uiManager.drawPanel(pad + 8, marketY, width - pad * 2 - 16, 48, 'rgba(40, 30, 20, 0.9)', '#d4af37', 6);
    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('【商铺黑市交易】', pad + 16, marketY + 28);
    ctx.restore();

    const curName = context.route === 'xianxia' ? '灵石' : '银两';
    const item1Cost = context.route === 'xianxia' ? 300 : 350;
    const item1Label = context.route === 'xianxia' ? `换丹药(${item1Cost}${curName})` : `换政绩(${item1Cost}${curName})`;
    uiManager.drawButton(width - 240, marketY + 11, 105, 26, item1Label, () => {
      const res = ResourceLoop.tradeMarketItem(context, 'elixir_or_merit');
      Adapter.showToast(res.msg);
      uiManager.refreshHUD();
    }, '#8b6508', '#ffffff', 12);

    const item2Cost = context.route === 'xianxia' ? 200 : 250;
    uiManager.drawButton(width - 128, marketY + 11, 105, 26, `买50体力(${item2Cost}${curName})`, () => {
      const res = ResourceLoop.tradeMarketItem(context, 'stamina_potion');
      Adapter.showToast(res.msg);
      uiManager.refreshHUD();
    }, '#8b6508', '#ffffff', 12);
  }
}
