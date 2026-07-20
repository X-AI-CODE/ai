/**
 * DungeonUI.js
 * 外域冒险关卡列表选项卡：秘境副本选关、战力评估与挑战出征
 */

import { DUNGEONS_CONFIG } from '../battle/DungeonConfig.js';
import { Adapter } from '../core/Adapter.js';

export class DungeonUI {
  static render(ctx, width, height, context, uiManager) {
    const topY = 82;
    const bottomY = height - 60;
    const panelH = bottomY - topY;
    const pad = 12;

    uiManager.drawPanel(pad, topY, width - pad * 2, panelH, 'rgba(20, 30, 42, 0.88)', '#9370db', 10);

    ctx.save();
    ctx.fillStyle = '#ffdf00';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const title = context.route === 'xianxia' ? '外域仙境试炼与伏魔秘境' : '剿匪平叛与保家卫国沙盘战役';
    ctx.fillText(title, width / 2, topY + 24);
    ctx.restore();

    const route = context.route;
    const dungeons = DUNGEONS_CONFIG[route] || [];
    const startY = topY + 42;
    const cardH = 80;
    const gap = 8;

    const family = context.familyManager;
    const master = family ? family.getMaster() : null;
    const myPower = master ? master.getPower(route) : 40;

    dungeons.forEach((d, idx) => {
      const cy = startY + idx * (cardH + gap);
      if (cy + cardH > bottomY - 10) return;

      const canEnter = context.bloodline ? context.bloodline.level >= d.bloodlineReq : true;

      uiManager.drawPanel(pad + 8, cy, width - pad * 2 - 16, cardH, 'rgba(32, 48, 64, 0.85)', canEnter ? '#9370db' : '#555555', 6);

      ctx.save();
      ctx.fillStyle = canEnter ? '#ffffff' : '#888888';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`【关卡 ${idx + 1}】${d.name}`, pad + 18, cy + 20);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = canEnter ? '#a8e6cf' : '#888888';
      ctx.fillText(`敌方: ${d.enemyName} (战力:${d.enemyPower})  |  推荐: ${d.recLevel}`, pad + 18, cy + 38);

      // 掉落与门槛
      const curTitle = route === 'xianxia' ? '灵石' : '银两';
      ctx.fillStyle = '#cccccc';
      ctx.fillText(`通关奖励: 丰厚${curTitle} + 稀有战利品  |  血脉要求: Lv.${d.bloodlineReq}`, pad + 18, cy + 56);

      // 战力对比提示
      let powerTip = myPower >= d.enemyPower ? '胜算较稳' : '极度凶险';
      ctx.fillStyle = myPower >= d.enemyPower ? '#00ff7f' : '#ff4500';
      ctx.fillText(`[我方战力评估: ${powerTip}]`, pad + 18, cy + 72);
      ctx.restore();

      if (canEnter) {
        uiManager.drawButton(width - 110, cy + 24, 86, 32, `⚔ 出征(-${d.staminaCost}体力)`, () => {
          if (!context.battleManager) {
            Adapter.showToast('战斗模块未装配');
            return;
          }
          if (context.stamina < d.staminaCost) {
            Adapter.showToast('体力不足！可点击顶栏广告 [+] 按钮快速恢复全部体力！');
            return;
          }
          context.battleManager.startBattle(d.id, context);
        }, '#b22222', '#ffffff', 13);
      } else {
        uiManager.drawButton(width - 110, cy + 24, 86, 32, `需血脉Lv.${d.bloodlineReq}`, () => {
          Adapter.showToast(`该秘境被禁制封印，需要家族血脉提升至 Lv.${d.bloodlineReq} 才能开启！`);
        }, '#555555', '#cccccc', 12);
      }
    });
  }
}
