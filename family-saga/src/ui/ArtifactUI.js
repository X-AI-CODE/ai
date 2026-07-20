/**
 * ArtifactUI.js
 * 传家至宝铸宝与护族灵兽名录：强化精炼与装备调度
 */

import { Adapter } from '../core/Adapter.js';

export class ArtifactUI {
  static render(ctx, width, height, context, uiManager) {
    const w = Math.min(340, width - 20);
    const h = 480;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(24, 30, 42, 0.96)', '#f59e0b', 12);

    ctx.save();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🛡 镇族本命法宝与神兽/智囊名录', x + w / 2, y + 36);

    ctx.fillStyle = '#e2e8f0';
    ctx.font = '12px sans-serif';
    ctx.fillText('传家至宝代代相随！提供全族战力暴击加成与领地产出强化！', x + w / 2, y + 60);
    ctx.restore();

    const am = context.artifactManager;
    if (!am) {
      uiManager.drawButton(x + (w - 120) / 2, y + h - 38, 120, 28, '✕ 返回', () => uiManager.closeModal(), '#555555', '#ffffff', 13);
      return;
    }

    const list = am.getArtifactList();
    const startY = y + 78;
    const cardH = 82;
    const gap = 10;

    if (list.length === 0) {
      ctx.save();
      ctx.fillStyle = '#94a3b8';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('暂无法宝神兵，可参与十年一届万仙大比或黑市高阶兑换获取！', x + w / 2, y + h / 2);
      ctx.restore();
    } else {
      list.slice(0, 4).forEach((art, idx) => {
        const cy = startY + idx * (cardH + gap);
        if (cy + cardH > y + h - 48) return;

        uiManager.drawPanel(x + 12, cy, w - 24, cardH, 'rgba(35, 45, 60, 0.92)', '#f59e0b', 8);

        ctx.save();
        ctx.fillStyle = '#ffdf00';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`★ 【${art.getName()}】`, x + 22, cy + 22);

        const typeBadge = art.getConfig().type === 'relic' ? '传家至宝' : '镇族灵兽/智囊';
        ctx.fillStyle = '#60a5fa';
        ctx.font = '12px sans-serif';
        ctx.fillText(`类型: [${typeBadge}]  |  综合战力倍率: +${Math.floor(art.getPowerMultiplier() * 100)}%`, x + 22, cy + 44);

        let equipStatus = art.equippedMemberId ? '状态: [已认主当代家督]' : '状态: [宝库收藏闲置]';
        ctx.fillStyle = art.equippedMemberId ? '#34d399' : '#94a3b8';
        ctx.fillText(`${equipStatus}  |  被动产出加成: +${Math.floor(art.getProdMultiplier() * 100)}%`, x + 22, cy + 64);
        ctx.restore();

        // [认主/装备] 按钮
        const master = context.familyManager ? context.familyManager.getMaster() : null;
        if (master) {
          const isEq = art.equippedMemberId === master.id;
          uiManager.drawButton(x + w - 148, cy + 14, 64, 28, isEq ? '已佩戴' : '佩戴认主', () => {
            if (!isEq) {
              am.equipToMember(art.key, master.id);
              Adapter.showToast(`★ 【${art.getName()}】已成功认主并佩戴于当代家督！战力飙升！`);
              uiManager.refreshHUD();
            }
          }, isEq ? '#059669' : '#2563eb', '#ffffff', 12);
        }

        // [精炼/升阶] 按钮
        const refCost = art.getRefineCost(context.route);
        const curName = refCost.costType === 'spiritStones' ? '灵石' : '银两';
        uiManager.drawButton(x + w - 78, cy + 14, 64, 28, `精炼(${refCost.costAmount})`, () => {
          if (context.hasResource(refCost.costType, refCost.costAmount)) {
            context.consumeResource(refCost.costType, refCost.costAmount);
            art.level += 1;
            Adapter.showToast(`★ 精炼大进！耗资 ${refCost.costAmount} ${curName}，【${art.getName()}】灵威更上一层楼！`);
            if (context.audioManager) context.audioManager.playSFX('levelUp');
            uiManager.refreshHUD();
          } else {
            Adapter.showToast(`精炼失败：需要 ${refCost.costAmount} ${curName}！`);
          }
        }, '#d97706', '#ffffff', 11);
      });
    }

    // 底部返回按钮
    uiManager.drawButton(x + (w - 140) / 2, y + h - 38, 140, 28, '✕ 返回宗族主界', () => {
      uiManager.closeModal();
    }, '#475569', '#ffffff', 13);
  }
}
