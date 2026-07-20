/**
 * TournamentUI.js
 * 十年一届修仙万仙赛 / 朝堂六部大比争霸赛季弹窗
 */

import { Adapter } from '../core/Adapter.js';

export class TournamentUI {
  static render(ctx, width, height, context, uiManager, modalData) {
    if (!modalData || !modalData.config) return;
    const t = modalData;
    const cfg = t.config;

    const w = Math.min(340, width - 20);
    const h = 460;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(30, 20, 40, 0.96)', '#ffd700', 12);

    ctx.save();
    ctx.fillStyle = '#ffdf00';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🏆 ${cfg.title}`, x + w / 2, y + 36);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '13px sans-serif';
    ctx.fillText('十年磨一剑！派选最强家主与装备至宝同台竞技，夺天下冠军！', x + w / 2, y + 62);
    ctx.restore();

    // 赛程列表与晋级状态
    const rounds = cfg.rounds || [];
    const startY = y + 84;
    const cardH = 80;
    const gap = 12;

    rounds.forEach((round, idx) => {
      const cy = startY + idx * (cardH + gap);
      const isCurrent = idx === t.currentRound && !t.completed;
      const isPassed = idx < t.currentRound;

      let borderColor = '#64748b';
      let bg = 'rgba(20, 25, 38, 0.88)';
      if (isCurrent) {
        borderColor = '#ffdf00';
        bg = 'rgba(50, 40, 20, 0.95)';
      } else if (isPassed) {
        borderColor = '#10b981';
        bg = 'rgba(15, 35, 25, 0.9)';
      }

      uiManager.drawPanel(x + 14, cy, w - 28, cardH, bg, borderColor, 8);

      ctx.save();
      ctx.fillStyle = isCurrent ? '#ffdf00' : (isPassed ? '#10b981' : '#94a3b8');
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      const statusText = isPassed ? '✔ [晋级胜出]' : (isCurrent ? '⚔ [当前赛程]' : '⏳ [等待挑战]');
      ctx.fillText(`${statusText} 第 ${idx + 1} 轮: ${round.name}`, x + 24, cy + 22);

      ctx.fillStyle = '#ffffff';
      ctx.font = '12px sans-serif';
      ctx.fillText(`对手阵营: 【${round.enemyName}】 (估算战力:${round.enemyPower})`, x + 24, cy + 44);

      let rewSummary = round.rewardStones ? `灵石+${round.rewardStones} ` : (round.rewardSilver ? `银两+${round.rewardSilver} ` : '');
      if (round.rewardArtifact) rewSummary += '★ 极品传家法宝至宝！';
      ctx.fillStyle = '#a8e6cf';
      ctx.fillText(`晋级优赏: ${rewSummary || '丰厚物资+血脉经验'}`, x + 24, cy + 64);
      ctx.restore();

      if (isCurrent) {
        uiManager.drawButton(x + w - 105, cy + 24, 80, 34, '⚔ 展开对决', () => {
          if (context.tournamentEngine) {
            const res = context.tournamentEngine.runNextRound(context);
            Adapter.showToast(res.msg || (res.victory ? `狂胜晋级 ${res.roundName}！` : `止步于 ${res.roundName}`));
            uiManager.refreshHUD();
          }
        }, '#b22222', '#ffffff', 13);
      }
    });

    // 底部关闭按钮
    uiManager.drawButton(x + (w - 140) / 2, y + h - 38, 140, 28, t.completed ? '🏆 领取全赛程荣耀返回' : '暂缓比赛退出', () => {
      uiManager.closeModal();
    }, '#4a5568', '#ffffff', 13);
  }
}
