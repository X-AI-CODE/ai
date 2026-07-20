/**
 * AncestralUI.js
 * 家族祖训与基因洗练天赋树交互弹窗：
 * 自由分配血脉经验强化财富开采、天资底限保底与寿元极限！
 */

import { ANCESTRAL_EDICTS_CONFIG } from '../family/AncestralTree.js';
import { Adapter } from '../core/Adapter.js';

export class AncestralUI {
  static render(ctx, width, height, context, uiManager) {
    const w = Math.min(340, width - 18);
    const h = 480;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(22, 28, 40, 0.96)', '#a855f7', 12);

    ctx.save();
    ctx.fillStyle = '#c084fc';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📜 千秋祖训与血脉基因自定义树', x + w / 2, y + 36);

    const bl = context.bloodline;
    const curExp = bl ? bl.exp : 0;
    ctx.fillStyle = '#ffd700';
    ctx.font = '13px sans-serif';
    ctx.fillText(`当前可用血脉经验: 【${curExp}】 点 (可通过达成里程碑/大比狂揽)`, x + w / 2, y + 62);
    ctx.restore();

    const at = context.ancestralTree;
    if (!at) {
      uiManager.drawButton(x + (w - 120) / 2, y + h - 38, 120, 28, '✕ 返回', () => uiManager.closeModal(), '#555555', '#ffffff', 13);
      return;
    }

    const edictKeys = Object.keys(ANCESTRAL_EDICTS_CONFIG);
    const startY = y + 80;
    const cardH = 104;
    const gap = 12;

    edictKeys.forEach((key, idx) => {
      const cy = startY + idx * (cardH + gap);
      if (cy + cardH > y + h - 45) return;

      const cfg = ANCESTRAL_EDICTS_CONFIG[key];
      const curLv = at.getEdictLevel(key);
      const isMax = curLv >= cfg.maxLevel;
      const costExp = Math.floor(cfg.baseCost * Math.pow(1.35, curLv));
      const canBuy = !isMax && curExp >= costExp;

      uiManager.drawPanel(x + 12, cy, w - 24, cardH, 'rgba(32, 42, 58, 0.92)', isMax ? '#10b981' : (canBuy ? '#c084fc' : '#64748b'), 8);

      ctx.save();
      ctx.fillStyle = isMax ? '#10b981' : '#ffdf00';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`★ 【${cfg.name}】 Lv.${curLv}/${cfg.maxLevel}`, x + 24, cy + 24);

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      const lines = this.splitText(ctx, cfg.desc, w - 50);
      lines.slice(0, 2).forEach((line, li) => {
        ctx.fillText(line, x + 24, cy + 45 + li * 18);
      });

      // 实时累成效果显示
      let bonusText = '';
      if (key === 'wealth_edict') bonusText = `全领土基础财收已永久提升 +${Math.floor(at.getWealthMultiplier() * 100)}%！`;
      if (key === 'genetics_edict') bonusText = `天资遗传底限已永久保底额外 +${at.getTalentBonus()} 点！`;
      if (key === 'longevity_edict') bonusText = `当代家督与全体族人寿元已增加 +${at.getLongevityBonus()} 岁！`;

      ctx.fillStyle = '#34d399';
      ctx.fillText(`效果: ${bonusText}`, x + 24, cy + 85);
      ctx.restore();

      if (!isMax) {
        uiManager.drawButton(x + w - 96, cy + 18, 76, 32, `升(${costExp}EXP)`, () => {
          if (at.upgradeEdict(key, context)) {
            Adapter.showToast(`★ 祖训升级成功！【${cfg.name}】升至 Lv.${curLv + 1}！`);
            if (context.audioManager) context.audioManager.playSFX('levelUp');
            uiManager.refreshHUD();
          } else if (curExp < costExp) {
            Adapter.showToast(`血脉经验不足！需要 ${costExp} 点经验！`);
          }
        }, canBuy ? '#9333ea' : '#475569', '#ffffff', 12);
      } else {
        uiManager.drawButton(x + w - 96, cy + 18, 76, 32, '已满级', () => {
          Adapter.showToast('该祖训已参悟至巅峰满级！');
        }, '#059669', '#ffffff', 12);
      }
    });

    // 底部返回按钮
    uiManager.drawButton(x + (w - 140) / 2, y + h - 38, 140, 28, '✕ 返回血脉界', () => {
      uiManager.closeModal();
    }, '#475569', '#ffffff', 13);
  }

  static splitText(ctx, text, maxW) {
    if (!text) return [];
    const chars = text.split('');
    const lines = [];
    let current = '';
    chars.forEach((c) => {
      if (ctx.measureText(current + c).width > maxW) {
        lines.push(current);
        current = c;
      } else {
        current += c;
      }
    });
    if (current) lines.push(current);
    return lines;
  }
}
