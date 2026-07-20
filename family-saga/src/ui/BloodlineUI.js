/**
 * BloodlineUI.js
 * 血脉与里程碑及成就选项卡：家族跨世代荣誉殿堂、长线成就大赏与编年史大览
 */

import { MILESTONES_CONFIG, ACHIEVEMENTS_CONFIG } from '../family/Bloodline.js';

export class BloodlineUI {
  static render(ctx, width, height, context, uiManager) {
    const topY = 82;
    const bottomY = height - 60;
    const panelH = bottomY - topY;
    const pad = 12;

    uiManager.drawPanel(pad, topY, width - pad * 2, panelH, 'rgba(20, 30, 42, 0.88)', '#d4af37', 10);

    const bl = context.bloodline;
    if (!bl) return;

    ctx.save();
    ctx.fillStyle = '#ffdf00';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`【家族血脉传承与千秋功业】— 当前血脉等级: Lv.${bl.level}`, width / 2, topY + 24);

    // 血脉经验条
    ctx.fillStyle = '#cccccc';
    ctx.font = '13px sans-serif';
    ctx.fillText(`血脉经验: ${bl.exp}/${bl.maxExp} (每升级加成: 传承保留系数 +5% | 起始资源增多)`, width / 2, topY + 44);
    ctx.restore();

    // 绘制经验条条框
    const barW = Math.min(280, width - 80);
    const barX = (width - barW) / 2;
    const barY = topY + 54;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(barX, barY, barW, 12);
    ctx.fillStyle = '#ffd700';
    const fillW = Math.max(2, Math.floor((bl.exp / bl.maxExp) * barW));
    ctx.fillRect(barX, barY, fillW, 12);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(barX, barY, barW, 12);
    ctx.restore();

    // 跨世代统计卡片
    const statsY = topY + 74;
    uiManager.drawPanel(pad + 8, statsY, width - pad * 2 - 16, 48, 'rgba(32, 48, 64, 0.8)', '#888888', 6);
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`跨世代荣誉：  |  历经世代/传承: ${bl.stats.totalHeirsInherited} 次  |  历史最高人口: ${bl.stats.totalPopulation} 人`, pad + 18, statsY + 18);
    ctx.fillText(`最高境界/官衔阶: ${bl.stats.maxRealmOrRank}  |  累计开采财富: ${bl.stats.totalResourceEarned}  |  通关副本: ${bl.stats.totalDungeonClear || 0}次`, pad + 18, statsY + 36);
    ctx.restore();

    // 1. 里程碑名册 (Milestones - 解锁副本/资质/天赋)
    const msStart = statsY + 56;
    const msH = 155;
    uiManager.drawPanel(pad + 8, msStart, width - pad * 2 - 16, msH, 'rgba(32, 48, 64, 0.8)', '#888888', 6);
    ctx.save();
    ctx.fillStyle = '#ffdf00';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('★ 里程碑系统 (达成立刻提升血脉经验并解锁游戏新玩法与关卡)：', pad + 18, msStart + 20);
    ctx.restore();

    uiManager.drawButton(width - 135, msStart + 8, 115, 26, '📜 祖训/基因树', () => {
      uiManager.openModal('AncestralUI');
    }, '#9333ea', '#ffffff', 12);

    ctx.save();
    let row = 0;
    let col = 0;
    MILESTONES_CONFIG.forEach((ms) => {
      if (row >= 5) return;
      const isUnlocked = bl.unlockedMilestones.includes(ms.id);
      ctx.fillStyle = isUnlocked ? '#00ff7f' : '#bbbbbb';
      ctx.font = 'bold 12px sans-serif';
      const mx = pad + 18 + col * ((width - 40) / 2);
      const my = msStart + 42 + row * 24;
      ctx.fillText(`${isUnlocked ? '✔ [已达成]' : '✖ [进行中]'} ${ms.title}`, mx, my);

      ctx.fillStyle = isUnlocked ? '#a8e6cf' : '#777777';
      ctx.font = '11px sans-serif';
      ctx.fillText(`  ↳ ${ms.unlockDesc}`, mx, my + 13);

      col++;
      if (col > 1) {
        col = 0;
        row++;
      }
    });
    ctx.restore();

    // 2. 长线成就与荣誉殿堂 (Achievements - 跨周目永久大赏)
    const achStart = msStart + msH + 8;
    const achH = 145;
    if (achStart + achH <= bottomY) {
      uiManager.drawPanel(pad + 8, achStart, width - pad * 2 - 16, achH, 'rgba(38, 28, 44, 0.88)', '#9370db', 6);
      ctx.save();
      ctx.fillStyle = '#ffcc00';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('🏆 终极成就名录 (达成可解锁跨代/跨周目永久特权与殿堂荣誉)：', pad + 18, achStart + 20);

      ACHIEVEMENTS_CONFIG.slice(0, 3).forEach((ach, i) => {
        const isUnlocked = bl.unlockedAchievements.includes(ach.id);
        const curVal = ach.getCur(bl.stats);
        const ay = achStart + 42 + i * 36;
        if (ay + 30 > achStart + achH) return;

        ctx.fillStyle = isUnlocked ? '#00ff7f' : '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`${isUnlocked ? '🏆 [已解锁]' : '🔒 [未解锁]'} 【${ach.title}】(${curVal}/${ach.target}) - ${ach.desc}`, pad + 18, ay);

        ctx.fillStyle = isUnlocked ? '#ffd700' : '#a8a8a8';
        ctx.font = '11px sans-serif';
        ctx.fillText(`  ★ 专属大赏: ${ach.rewardText}`, pad + 18, ay + 15);
      });
      ctx.restore();
    }
  }
}
