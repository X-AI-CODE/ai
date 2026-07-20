/**
 * AdModalUI.js
 * 福利与每日签到中心模态弹窗：支持全部7大激励视频点位体验与双倍签到
 */

import { Adapter } from '../core/Adapter.js';

export class AdModalUI {
  static render(ctx, width, height, context, uiManager) {
    const w = Math.min(340, width - 20);
    const h = 460;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(22, 32, 44, 0.96)', '#ffcc00', 12);

    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🎁 家族福利与商业化广告特权中心', x + w / 2, y + 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.fillText('全部纯激励视频设计，不强弹、零氪金，助您畅玩千秋家族传奇！', x + w / 2, y + 60);
    ctx.restore();

    // 1. 每日签到双倍专区
    const signY = y + 75;
    uiManager.drawPanel(x + 14, signY, w - 28, 95, 'rgba(45, 35, 20, 0.9)', '#ffd700', 8);
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('★ 每日签到专属大礼包：', x + 24, signY + 24);

    const curName = context.route === 'xianxia' ? '灵石' : '银两';
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`今日基础奖励：${curName} +250，行动点 +5，家族声望 +30`, x + 24, signY + 46);
    ctx.restore();

    uiManager.drawButton(x + 24, signY + 58, 120, 28, '直接领取签到', () => {
      if (!this.checkSignedToday()) {
        const cur = context.route === 'xianxia' ? 'spiritStones' : 'silver';
        context.addResource(cur, 250);
        context.recoverActionPoints(5);
        context.addResource('reputation', 30);
        this.markSignedToday();
        Adapter.showToast('基础签到成功！奖励已入库！');
        uiManager.refreshHUD();
      } else {
        Adapter.showToast('今日已完成签到，请明日再来！');
      }
    }, '#3b6a88', '#ffffff', 12);

    uiManager.drawButton(x + 154, signY + 58, 150, 28, '📺 观看广告：双倍领取！', () => {
      if (!this.checkSignedToday()) {
        if (context.adManager) {
          context.adManager.showRewardedAd('checkinDouble', {
            onSuccess: () => {
              const cur = context.route === 'xianxia' ? 'spiritStones' : 'silver';
              context.addResource(cur, 500);
              context.recoverActionPoints(10);
              context.addResource('reputation', 60);
              this.markSignedToday();
              Adapter.showToast('★ 双倍签到成功！获取双倍物资大赏！');
              uiManager.refreshHUD();
            },
            context
          });
        }
      } else {
        Adapter.showToast('今日已完成签到，请明日再来！');
      }
    }, '#b38600', '#ffffff', 12);

    // 2. 四大日常激励点位快捷入口
    const ads = [
      { key: 'actionRecovery', title: '【行动点急救】', desc: '恢复 50% 行动点 (日限3次)' },
      { key: 'staminaRecovery', title: '【体力回满】', desc: '瞬间回满 100/100 体力 (日限3次)' },
      { key: 'memberBoost', title: '【庄园全速加速】', desc: '全领土产出 ×2 持续 2 年 (日限5次)' },
      { key: 'lifeExtension', title: '【家督延命金丹】', desc: '为当家家主逆天延寿 5 年 (每代1次)' }
    ];

    const adStartY = signY + 110;
    const adH = 55;
    const gap = 8;

    ads.forEach((item, idx) => {
      const ay = adStartY + idx * (adH + gap);
      if (ay + adH > y + h - 45) return;

      uiManager.drawPanel(x + 14, ay, w - 28, adH, 'rgba(30, 42, 55, 0.88)', '#6c8c8c', 6);
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(item.title, x + 24, ay + 20);

      ctx.fillStyle = '#a8e6cf';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.desc, x + 24, ay + 38);
      ctx.restore();

      uiManager.drawButton(x + w - 110, ay + 12, 85, 30, '📺 立即观看', () => {
        if (context.adManager) {
          context.adManager.showRewardedAd(item.key, {
            onSuccess: () => uiManager.refreshHUD(),
            context
          });
        }
      }, '#8b6508', '#ffffff', 12);
    });

    // 底部关闭按钮
    uiManager.drawButton(x + (w - 140) / 2, y + h - 38, 140, 28, '✕ 返回主界面', () => {
      uiManager.closeModal();
    }, '#555555', '#ffffff', 13);
  }

  static checkSignedToday() {
    const key = 'family_saga_signed_date';
    return Adapter.getStorage(key, '') === new Date().toDateString();
  }

  static markSignedToday() {
    Adapter.setStorage('family_saga_signed_date', new Date().toDateString());
  }
}
