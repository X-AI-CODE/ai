/**
 * HeirSelectUI.js
 * 薪火相传：家主寿终正寝/老去后挑选与强化继承人模态弹窗
 */

import { Adapter } from '../core/Adapter.js';

export class HeirSelectUI {
  static render(ctx, width, height, context, uiManager) {
    const w = Math.min(340, width - 20);
    const h = 480;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(28, 20, 20, 0.96)', '#ffd700', 12);

    ctx.save();
    ctx.fillStyle = '#ff6347';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('▲ 天命已至：家主仙逝，薪火相传！', x + w / 2, y + 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.fillText('老家主寿终正寝，请慎重挑选下一代家督带领家族前进！', x + w / 2, y + 62);

    // 广告加成状态提示
    const isAdBoosted = context.adBonuses && context.adBonuses.inheritedExtra;
    const bloodline = context.bloodline;
    const baseCoeff = bloodline ? bloodline.getInheritanceCoeff(false) : 0.7;
    const finalCoeff = bloodline ? bloodline.getInheritanceCoeff(isAdBoosted) : (isAdBoosted ? 0.85 : 0.7);

    if (isAdBoosted) {
      ctx.fillStyle = '#00ff7f';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`🌟 广告传承加持生效：当前天赋继承系数达 ${Math.floor(finalCoeff * 100)}% (+15%额外强化)`, x + w / 2, y + 86);
    } else {
      uiManager.drawButton(x + 40, y + 74, w - 80, 28, `📺 观看广告：传承比例额外 +15% (现:${Math.floor(baseCoeff * 100)}%)`, () => {
        if (context.adManager) {
          context.adManager.showRewardedAd('heirBonus', {
            onSuccess: () => uiManager.refreshHUD(),
            context
          });
        }
      }, '#b38600', '#ffffff', 12);
    }
    ctx.restore();

    // 候选人列表 (所有非家主的成年或子辈族人)
    const family = context.familyManager;
    if (!family) return;
    const candidates = family.members.filter((m) => m.role !== 'master');

    const startY = y + 115;
    const cardH = 75;
    const gap = 10;

    if (candidates.length === 0) {
      // 如果意外没有存活族人，自动生成一位保底亲子/宗族人
      family.addMember({
        name: context.route === 'xianxia' ? '萧浩然 (遗志宗亲)' : '楚继业 (遗志宗亲)',
        role: 'child',
        age: 18,
        talent: 75,
        aptitude: 75
      });
      uiManager.refreshHUD();
      return;
    }

    // 取前 4 位展示
    candidates.slice(0, 4).forEach((m, idx) => {
      const cy = startY + idx * (cardH + gap);
      if (cy + cardH > y + h - 20) return;

      uiManager.drawPanel(x + 12, cy, w - 24, cardH, 'rgba(42, 32, 32, 0.9)', '#d4af37', 8);

      ctx.save();
      ctx.fillStyle = '#ffdf00';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`【继承候选】${m.name} (${m.age}岁)`, x + 24, cy + 22);

      // 计算预计继承后的天赋和资质
      const oldMaster = family.getMaster();
      const estTalent = Math.min(100, Math.floor(m.talent * finalCoeff + (oldMaster ? oldMaster.talent * (1 - finalCoeff) * 0.5 : 0)));
      const estApt = Math.min(100, Math.floor(m.aptitude * finalCoeff + (oldMaster ? oldMaster.aptitude * (1 - finalCoeff) * 0.5 : 0)));

      ctx.fillStyle = '#a8e6cf';
      ctx.font = '12px sans-serif';
      ctx.fillText(`原有天资: ${m.talent} / ${m.aptitude}  ➔  继任预计: 天赋【${estTalent}】 | 资质【${estApt}】`, x + 24, cy + 44);
      ctx.fillText(`当前境界/头衔: ${m.getTitle(context.route)}`, x + 24, cy + 62);
      ctx.restore();

      uiManager.drawButton(x + w - 105, cy + 20, 80, 36, '继任！', () => {
        if (family.selectHeir(m.id, context)) {
          uiManager.closeModal();
          Adapter.showToast(`★ 新家督【${m.name}】顺利继位！第 ${context.generation} 代传奇开启！`);
        }
      }, '#b22222', '#ffffff', 14);
    });
  }
}
