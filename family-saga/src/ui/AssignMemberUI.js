/**
 * AssignMemberUI.js
 * 领地庄园岗位派驻：从空闲及在职族人中挑选并派遣到指定庄园建筑加速产出
 */

import { Adapter } from '../core/Adapter.js';

export class AssignMemberUI {
  static render(ctx, width, height, context, uiManager, modalData) {
    if (!modalData || !modalData.building) return;
    const building = modalData.building;
    const bName = building.getName();

    const w = Math.min(330, width - 30);
    const h = 420;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(22, 32, 44, 0.96)', '#5c8a8a', 12);

    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`派驻族人劳作/修习：【${bName}】`, x + w / 2, y + 36);

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.fillText('选择具备高天资/高资质的族人派驻，可提升该建筑最高 200% 的产出倍率！', x + w / 2, y + 62);
    ctx.restore();

    // 如果该岗位目前有派驻，提供 [卸任/撤出岗位] 按钮
    if (building.assignedMemberId) {
      uiManager.drawButton(x + 25, y + 80, w - 50, 32, '✕ 解除当前岗位派驻 (让族人空闲休息)', () => {
        if (context.familyManager) {
          context.familyManager.assignMemberToBuilding(building.assignedMemberId, null);
          building.assignedMemberId = null;
          Adapter.showToast(`已解除【${building.getConfig().name}】的族人派驻。`);
          uiManager.closeModal();
        }
      }, '#8b0000', '#ffffff', 13);
    }

    // 列出所有成年且可工作的族人 (除年幼子嗣)
    const family = context.familyManager;
    if (!family) return;
    const workers = family.members.filter((m) => m.role !== 'child' && m.age >= 16);

    const startY = y + 124;
    const cardH = 58;
    const gap = 8;

    workers.slice(0, 4).forEach((m, idx) => {
      const cy = startY + idx * (cardH + gap);
      if (cy + cardH > y + h - 45) return;

      const isCurrent = building.assignedMemberId === m.id;
      uiManager.drawPanel(x + 14, cy, w - 28, cardH, isCurrent ? 'rgba(30, 60, 45, 0.95)' : 'rgba(35, 45, 58, 0.9)', isCurrent ? '#00ff7f' : '#888888', 6);

      ctx.save();
      ctx.fillStyle = isCurrent ? '#00ff7f' : '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${m.name} (${m.age}岁 - ${m.getTitle(context.route)})`, x + 24, cy + 20);

      const bonusPct = Math.floor(m.getProductionBonus() * 100);
      ctx.fillStyle = '#a8e6cf';
      ctx.font = '12px sans-serif';
      let workState = m.assignedBuilding ? `已在[${m.assignedBuilding}]` : '目前[完全空闲]';
      if (isCurrent) workState = '正在本建筑派驻中！';
      ctx.fillText(`预计贡献产出加成: +${bonusPct}%  |  ${workState}`, x + 24, cy + 42);
      ctx.restore();

      if (!isCurrent) {
        uiManager.drawButton(x + w - 88, cy + 14, 65, 30, '选任', () => {
          // 先清理其原来的岗位
          if (m.assignedBuilding && context.economyManager) {
            const oldB = context.economyManager.getBuilding(m.assignedBuilding);
            if (oldB && oldB.assignedMemberId === m.id) {
              oldB.assignedMemberId = null;
            }
          }
          // 同时也清理本建筑之前的派驻者
          if (building.assignedMemberId && context.familyManager) {
            const prevWorker = context.familyManager.members.find((item) => item.id === building.assignedMemberId);
            if (prevWorker) prevWorker.assignedBuilding = null;
          }

          building.assignedMemberId = m.id;
          m.assignedBuilding = building.key;
          Adapter.showToast(`★ 成功派遣【${m.name}】至【${building.getConfig().name}】劳作！产出加成 +${bonusPct}%！`);
          uiManager.closeModal();
        }, '#3b7a57', '#ffffff', 13);
      }
    });

    // 底部返回按钮
    uiManager.drawButton(x + (w - 130) / 2, y + h - 36, 130, 26, '✕ 关闭窗口', () => {
      uiManager.closeModal();
    }, '#555555', '#ffffff', 12);
  }
}
