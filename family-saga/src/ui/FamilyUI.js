/**
 * FamilyUI.js
 * 家族名录选项卡：家族成员属性、寿命检测、联姻与繁衍子嗣渲染
 */

import { Adapter } from '../core/Adapter.js';

export class FamilyUI {
  static render(ctx, width, height, context, uiManager) {
    const topY = 82;
    const bottomY = height - 60;
    const panelH = bottomY - topY;
    const pad = 12;

    uiManager.drawPanel(pad, topY, width - pad * 2, panelH, 'rgba(20, 30, 42, 0.88)', '#6b8e23', 10);

    const family = context.familyManager;
    if (!family) return;

    ctx.save();
    ctx.fillStyle = '#ffdf00';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    const popCount = family.members.length;
    const maxPop = 10 + (context.economyManager && context.economyManager.getBuilding('ancestralShrine') ? context.economyManager.getBuilding('ancestralShrine').level * 3 : 3);
    ctx.fillText(`家族宗族名册 (人口: ${popCount}/${maxPop}  |  代数: 第${context.generation}代)`, width / 2, topY + 24);
    ctx.restore();

    // 顶部操作栏按钮
    const moneyCost = context.route === 'xianxia' ? '150灵石' : '200银两';
    uiManager.drawButton(pad + 12, topY + 36, 110, 28, `💞 联姻(${moneyCost})`, () => {
      if (family.marryNewSpouse(context)) {
        uiManager.refreshHUD();
      }
    }, '#c71585', '#ffffff', 12);

    uiManager.drawButton(width / 2 - 55, topY + 36, 110, 28, '🛡 传家至宝/神兽', () => {
      uiManager.openModal('ArtifactUI');
    }, '#d97706', '#ffffff', 12);

    uiManager.drawButton(width - pad - 122, topY + 36, 110, 28, '👶 繁衍培育后代', () => {
      const spouseCount = family.getMembersByRole('spouse').length;
      if (spouseCount === 0) {
        Adapter.showToast('请先为家主完成联姻娶妻！');
        return;
      }
      if (popCount >= maxPop) {
        Adapter.showToast('家族人口已达上限，请先升级【千秋祠堂】！');
        return;
      }
      if (family.giveBirth(context)) {
        Adapter.showToast('喜添新子！传承候选人增添一员猛将！');
        uiManager.refreshHUD();
      }
    }, '#2e8b57', '#ffffff', 12);

    // 族人卡片滚动显示
    const members = family.members;
    const startY = topY + 74;
    const cardH = 68;
    const gap = 6;

    members.forEach((m, idx) => {
      const cy = startY + idx * (cardH + gap);
      if (cy + cardH > bottomY - 10) return;

      const roleBadgeMap = { master: '★ [当代家督]', spouse: '❤ [结发配偶]', child: '👶 [嫡系候选]', clan: '👤 [宗族旁系]' };
      const roleBadge = roleBadgeMap[m.role] || '[族人]';
      const isMaster = m.role === 'master';
      const maxAge = m.getMaxAge(context.route);
      const isAging = m.age >= maxAge - 5;

      // 族人底框 (家主使用金色边线提示)
      uiManager.drawPanel(pad + 8, cy, width - pad * 2 - 16, cardH, isMaster ? 'rgba(50, 42, 20, 0.9)' : 'rgba(32, 48, 64, 0.85)', isMaster ? '#ffd700' : '#7a9a9a', 6);

      ctx.save();
      ctx.fillStyle = isMaster ? '#ffd700' : '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${roleBadge} ${m.name} (${m.gender === 'M' ? '♂' : '♀'})`, pad + 18, cy + 20);

      // 头衔与岁数
      ctx.fillStyle = isAging ? '#ff6347' : '#a8e6cf';
      ctx.font = '12px sans-serif';
      ctx.fillText(`境界/官衔: 【${m.getTitle(context.route)}】  |  寿命: ${m.age}/${maxAge}岁 ${isAging ? '(寿元将尽!)' : ''}`, pad + 18, cy + 40);

      // 天赋与资质、派驻状态
      let workStr = m.assignedBuilding ? `派驻: ${m.assignedBuilding}` : '状态: [空闲/静修]';
      ctx.fillStyle = '#cccccc';
      ctx.fillText(`天赋: ${m.talent}  |  资质: ${m.aptitude}  |  ${workStr}`, pad + 18, cy + 58);
      ctx.restore();

      // 如果是家主且残年 <= 3岁，显示延寿广告提示
      if (isMaster && maxAge - m.age <= 3) {
        uiManager.drawButton(width - 125, cy + 20, 100, 28, '📺 广告延寿+5年', () => {
          if (context.adManager) {
            context.adManager.showRewardedAd('lifeExtension', {
              onSuccess: () => uiManager.refreshHUD(),
              context
            });
          }
        }, '#b30000', '#ffffff', 11);
      } else if (isMaster) {
        uiManager.drawButton(width - 110, cy + 20, 88, 28, '闭关(+EXP)', () => {
          if (context.spendActionPoints(2)) {
            const prom = m.gainExp(150, context.route, context);
            Adapter.showToast(`潜心修习！家主【${m.name}】修为大进！${prom.promoted ? `晋升至 ${prom.newTitle}` : ''}`);
            uiManager.refreshHUD();
          }
        }, '#8b6508', '#ffffff', 12);
      } else if (!m.assignedBuilding && m.role !== 'child' && m.age >= 16) {
        uiManager.drawButton(width - 85, cy + 20, 60, 28, '去派驻', () => {
          uiManager.switchTab('territory');
          Adapter.showToast(`请在领地页面为【${m.name}】选择岗位`);
        }, '#3b6a88', '#ffffff', 12);
      }
    });
  }
}
