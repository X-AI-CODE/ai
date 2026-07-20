/**
 * EventUI.js
 * 突发随机大事件抉择与剧情交互模态弹窗
 */

import { Adapter } from '../core/Adapter.js';

export class EventUI {
  static render(ctx, width, height, context, uiManager, eventData) {
    if (!eventData) return;

    const w = Math.min(330, width - 30);
    const h = 340;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(25, 35, 48, 0.96)', '#ffcc00', 12);

    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⚡ 【突发家族大事件】：${eventData.title}`, x + w / 2, y + 36);

    // 事件详情描述 (自动折行或多行展示)
    ctx.fillStyle = '#ffffff';
    ctx.font = '14px sans-serif';
    const lines = this.splitText(ctx, eventData.desc, w - 40);
    lines.forEach((line, idx) => {
      ctx.fillText(line, x + w / 2, y + 68 + idx * 22);
    });
    ctx.restore();

    // 选项按钮展示
    const options = eventData.options || [];
    const optStartY = y + 160;
    const optH = 46;
    const gap = 12;

    options.forEach((opt, idx) => {
      const oy = optStartY + idx * (optH + gap);
      const conditionMet = opt.condition ? opt.condition(context) : true;

      uiManager.drawButton(x + 20, oy, w - 40, optH, conditionMet ? opt.label : `(条件不足) ${opt.label}`, () => {
        if (!conditionMet) {
          Adapter.showToast('条件或资源不足，无法选择此项！');
          return;
        }
        if (context.eventEngine) {
          const res = context.eventEngine.resolveChoice(idx, context);
          Adapter.showToast(res.msg);
        }
        uiManager.closeModal();
      }, conditionMet ? '#3b6a88' : '#444444', conditionMet ? '#ffffff' : '#aaaaaa', 13);
    });

    // 底部快速恢复行动点广告连接
    uiManager.drawButton(x + 35, y + h - 42, w - 70, 30, '📺 广告急需行动点：恢复 50%', () => {
      if (context.adManager) {
        context.adManager.showRewardedAd('actionRecovery', {
          onSuccess: () => uiManager.refreshHUD(),
          context
        });
      }
    }, '#8b6508', '#ffffff', 12);
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
