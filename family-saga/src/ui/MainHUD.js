/**
 * MainHUD.js
 * 顶部资源状态底栏与底部主要导航选项卡渲染器
 */

export class MainHUD {
  static render(ctx, width, height, context, uiManager) {
    if (uiManager.activeModal === 'BattleUI') return; // 战斗界面下隐藏主HUD

    // 1. 顶部资源导航栏 (y: 0 ~ 72)
    ctx.save();
    ctx.fillStyle = 'rgba(18, 28, 38, 0.92)';
    ctx.fillRect(0, 0, width, 72);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 72);
    ctx.lineTo(width, 72);
    ctx.stroke();

    // 路线与年份徽章
    const routeName = context.route === 'xianxia' ? '修仙世家' : '官宦世家';
    ctx.fillStyle = '#ffdf00';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`【${routeName}】第 ${context.year} 年 (代数:${context.generation})`, 12, 22);

    // 广告福利与签到小图标按钮
    uiManager.drawButton(width - 85, 8, 75, 26, '🎁 福利/签到', () => {
      uiManager.openModal('AdModalUI');
    }, '#c08000', '#ffffff', 12);

    uiManager.drawButton(width - 170, 8, 80, 26, '🌐 云排行/社交', () => {
      uiManager.openModal('SocialUI');
    }, '#2563eb', '#ffffff', 12);

    // 核心资源显示行 (y: 38)
    const curName = context.route === 'xianxia' ? '灵石' : '银两';
    const curVal = context.getResource(context.route === 'xianxia' ? 'spiritStones' : 'silver');
    const item1Name = context.route === 'xianxia' ? '功法' : '令牌';
    const item1Val = context.getResource(context.route === 'xianxia' ? 'manuals' : 'connections');
    const item2Name = context.route === 'xianxia' ? '丹药' : '政绩';
    const item2Val = context.getResource(context.route === 'xianxia' ? 'elixirs' : 'merit');
    const repVal = context.getResource('reputation');

    ctx.fillStyle = '#ffffff';
    ctx.font = '13px sans-serif';
    ctx.fillText(`${curName}:${curVal}  |  ${item1Name}:${item1Val}  |  ${item2Name}:${item2Val}  |  声望:${repVal}`, 12, 44);

    // 行动点与战斗体力条 (y: 54)
    ctx.fillStyle = '#a8e6cf';
    ctx.fillText(`行动点: ${context.actionPoints}/${context.maxActionPoints}`, 12, 64);
    uiManager.drawButton(118, 52, 24, 18, '+', () => {
      if (context.adManager) {
        context.adManager.showRewardedAd('actionRecovery', {
          onSuccess: () => uiManager.refreshHUD(),
          context
        });
      }
    }, '#3b7a57', '#ffffff', 13);

    ctx.fillStyle = '#ffd3b6';
    ctx.fillText(`战斗体力: ${context.stamina}/${context.maxStamina}`, 155, 64);
    uiManager.drawButton(268, 52, 24, 18, '+', () => {
      if (context.adManager) {
        context.adManager.showRewardedAd('staminaRecovery', {
          onSuccess: () => uiManager.refreshHUD(),
          context
        });
      }
    }, '#b35428', '#ffffff', 13);

    ctx.restore();

    // 2. 底部 5个导航选项卡 (y: height - 52 ~ height)
    const tabH = 52;
    const tabY = height - tabH;
    ctx.save();
    ctx.fillStyle = 'rgba(18, 28, 38, 0.95)';
    ctx.fillRect(0, tabY, width, tabH);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, tabY);
    ctx.lineTo(width, tabY);
    ctx.stroke();

    const tabs = [
      { key: 'territory', label: '领地经营' },
      { key: 'family', label: '家族名录' },
      { key: 'dungeon', label: '外域冒险' },
      { key: 'bloodline', label: '血脉成就' },
      { key: 'nextYear', label: '下一年 ➔', special: true }
    ];

    const tabW = width / tabs.length;
    tabs.forEach((tab, index) => {
      const tx = index * tabW;
      const isSelected = uiManager.currentTab === tab.key;

      if (isSelected) {
        ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
        ctx.fillRect(tx, tabY, tabW, tabH);
      } else if (tab.special) {
        ctx.fillStyle = 'rgba(180, 50, 50, 0.35)';
        ctx.fillRect(tx, tabY, tabW, tabH);
      }

      ctx.fillStyle = isSelected || tab.special ? '#ffdf00' : '#cccccc';
      ctx.font = isSelected ? 'bold 15px sans-serif' : '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(tab.label, tx + tabW / 2, tabY + tabH / 2);

      uiManager.addHitArea(tx, tabY, tabW, tabH, () => {
        if (tab.key === 'nextYear') {
          context.nextYear();
        } else {
          uiManager.switchTab(tab.key);
          if (context.sceneManager) {
            context.sceneManager.switchScene('territory');
          }
        }
      }, tab.label);
    });

    ctx.restore();
  }
}
