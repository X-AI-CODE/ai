/**
 * SocialUI.js
 * 伪在线异步社交与云端交互模态弹窗：
 * 全服千秋世家排行榜、跨服联姻提亲、多端云同步与游历天下世家
 */

import { CloudAdapter } from '../core/CloudAdapter.js';
import { Adapter } from '../core/Adapter.js';

export class SocialUI {
  static render(ctx, width, height, context, uiManager) {
    const w = Math.min(350, width - 16);
    const h = 520;
    const x = (width - w) / 2;
    const y = (height - h) / 2;

    uiManager.drawPanel(x, y, w, h, 'rgba(16, 26, 38, 0.96)', '#3b82f6', 12);

    ctx.save();
    ctx.fillStyle = '#60a5fa';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🌐 云端天下名门与排行榜社交中心', x + w / 2, y + 34);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText('结合微信云开发 (wx.cloud) 实现全服争霸、跨服姻缘与云存档', x + w / 2, y + 56);
    ctx.restore();

    // 顶部子功能栏 (3个快捷标签/区域按钮)
    const sectionTop = y + 68;
    
    // 1. 全服千秋排行榜展示区 (y: 68 ~ 230)
    uiManager.drawPanel(x + 12, sectionTop, w - 24, 155, 'rgba(28, 38, 54, 0.9)', '#ffd700', 8);
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🏆 全服千秋世家榜 (TOP 名录)：', x + 22, sectionTop + 22);

    // 异步拉取或从缓存展示排行榜数据
    let leaderboard = CloudAdapter.getMockLeaderboard();
    try {
      const cached = Adapter.getStorage('sim_cloud_leaderboard', null);
      if (cached && cached.length > 0) leaderboard = cached;
    } catch (e) {}

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    leaderboard.slice(0, 4).forEach((item, idx) => {
      const ly = sectionTop + 44 + idx * 22;
      const rankColor = idx === 0 ? '#ffdf00' : (idx === 1 ? '#e2e8f0' : (idx === 2 ? '#f6ad55' : '#cbd5e1'));
      ctx.fillStyle = rankColor;
      ctx.fillText(`TOP ${idx + 1}. 【${item.name}】(${item.route}) - 第${item.generation}代 - Lv.${item.bloodlineLevel}`, x + 22, ly);
    });
    ctx.restore();

    // 一键同步我的成绩上榜按钮
    uiManager.drawButton(x + 22, sectionTop + 122, w - 44, 26, '📤 一键同步上报本族当前荣耀至全服榜单', () => {
      CloudAdapter.updateLeaderboardScore(context);
      Adapter.showToast('★ 本族最新世代与声望数据已成功上报同步至云端！');
      uiManager.refreshHUD();
    }, '#2563eb', '#ffffff', 12);

    // 2. 跨服姻缘与门客寻访 (y: 232 ~ 380)
    const marriageTop = sectionTop + 163;
    uiManager.drawPanel(x + 12, marriageTop, w - 24, 142, 'rgba(40, 24, 36, 0.92)', '#f43f5e', 8);
    ctx.save();
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('💍 跨服姻缘池 (迎娶真实玩家名门后卫)：', x + 22, marriageTop + 22);

    const heirs = CloudAdapter.getMockHeirs(context.route);
    heirs.slice(0, 2).forEach((heir, idx) => {
      const hy = marriageTop + 46 + idx * 45;
      ctx.fillStyle = '#fecdd3';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`• ${heir.name} (${heir.gender === 'M' ? '♂' : '♀'} ${heir.age}岁 - ${heir.ownerName})`, x + 22, hy);
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '11px sans-serif';
      ctx.fillText(`  ↳ 天赋:${heir.talent} 资质:${heir.aptitude} 境界:Lv.${heir.realmLevel}`, x + 22, hy + 16);

      const curTitle = context.route === 'xianxia' ? '250灵石' : '350银两';
      uiManager.drawButton(x + w - 110, hy - 4, 80, 28, `提亲(${curTitle})`, () => {
        CloudAdapter.sendMarriageProposal(heir, context).then((res) => {
          Adapter.showToast(res.msg);
          uiManager.refreshHUD();
        });
      }, '#be123c', '#ffffff', 11);
    });
    ctx.restore();

    // 3. 多端同步云端存档管理 (y: 382 ~ 466)
    const saveTop = marriageTop + 150;
    uiManager.drawPanel(x + 12, saveTop, w - 24, 82, 'rgba(20, 35, 30, 0.92)', '#10b981', 8);
    ctx.save();
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('☁ 多端双向云同步与容灾备份：', x + 22, saveTop + 22);
    ctx.restore();

    uiManager.drawButton(x + 22, saveTop + 36, (w - 52) / 2, 34, '☁ 上传本地至云端', () => {
      CloudAdapter.syncCloudSave(context).then(() => {
        Adapter.showToast('★ 当前进度的最新镜像已成功上传备份至云数据库！');
      });
    }, '#059669', '#ffffff', 12);

    uiManager.drawButton(x + 28 + (w - 52) / 2, saveTop + 36, (w - 52) / 2, 34, '📥 从云端恢复进度', () => {
      CloudAdapter.fetchCloudSave().then((cloudData) => {
        if (cloudData && cloudData.saveData) {
          context.fromJSON(cloudData.saveData);
          Adapter.showToast('★ 成功从云端下载并恢复了您的最新家族进度！');
          uiManager.closeModal();
        } else {
          Adapter.showToast('未在云端检测到历史备份，已保留当前本地进度。');
        }
      });
    }, '#0d9488', '#ffffff', 12);

    // 底部返回按钮
    uiManager.drawButton(x + (w - 140) / 2, y + h - 38, 140, 28, '✕ 返回主界面', () => {
      uiManager.closeModal();
    }, '#555555', '#ffffff', 13);
  }
}
