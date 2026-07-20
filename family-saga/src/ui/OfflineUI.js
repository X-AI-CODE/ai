/**
 * OfflineUI.js
 * 离线闭关归来收益结算弹窗：支持直接领取与广告 3 倍翻倍领取
 */

import { OfflineIdle } from '../economy/OfflineIdle.js';

export class OfflineUI {
  static render(ctx, width, height, context, uiManager, modalData) {
    if (!modalData) return;
    const info = modalData;

    const w = Math.min(330, width - 30);
    const h = 340;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(25, 30, 44, 0.96)', '#ffd700', 12);

    ctx.save();
    ctx.fillStyle = '#ffdf00';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⏳ 离线闭关与庄园游历归来！', x + w / 2, y + 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.fillText(`您累计离线潜修了：【${info.hours} 小时 ${info.mins} 分钟】`, x + w / 2, y + 66);
    ctx.fillText('全族在职长老与弟子日夜开采打坐，为您积累了出关大礼：', x + w / 2, y + 88);
    ctx.restore();

    // 离线物资展示框
    const boxY = y + 104;
    uiManager.drawPanel(x + 16, boxY, w - 32, 92, 'rgba(38, 48, 64, 0.9)', '#10b981', 8);

    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`★ ${info.currencyName}: +${info.currencyAmount}`, x + 28, boxY + 28);
    ctx.fillText(`★ 全族打坐修为经验: +${info.expAmount}`, x + 28, boxY + 54);
    if (info.manualsOrTokens > 0) {
      const itemTitle = context.route === 'xianxia' ? '功法残卷' : '朝堂令牌';
      ctx.fillText(`★ 意外顿悟/结识: ${itemTitle} +${info.manualsOrTokens}`, x + 28, boxY + 78);
    } else {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px sans-serif';
      ctx.fillText('  (无额外残卷掉落，观看三倍可必得物资翻倍！)', x + 28, boxY + 78);
    }
    ctx.restore();

    // 操作领取按钮 (普通领取 vs 广告 3 倍)
    const btnY = y + 214;
    uiManager.drawButton(x + 20, btnY, (w - 50) / 2, 42, '直接普通领取', () => {
      OfflineIdle.claimOfflineIncome(context, info, 1);
      uiManager.closeModal();
    }, '#3b6a88', '#ffffff', 14);

    uiManager.drawButton(x + 30 + (w - 50) / 2, btnY, (w - 50) / 2, 42, '📺 广告3倍大赏领！', () => {
      if (context.adManager) {
        context.adManager.showRewardedAd('offlineDouble', {
          onSuccess: () => {
            OfflineIdle.claimOfflineIncome(context, info, 3);
            uiManager.closeModal();
          },
          context
        });
      }
    }, '#b38600', '#ffffff', 14);

    uiManager.drawButton(x + (w - 140) / 2, y + h - 38, 140, 26, '暂不领取退出', () => {
      uiManager.closeModal();
    }, '#475569', '#ffffff', 12);
  }
}
