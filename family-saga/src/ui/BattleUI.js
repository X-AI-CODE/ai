/**
 * BattleUI.js
 * 战斗交互与双倍掉落广告结算弹窗层
 * 自适应协调修仙 1vN 回合制及官途 8x8 方格战棋操作
 */

import { Adapter } from '../core/Adapter.js';

export class BattleUI {
  static render(ctx, width, height, context, uiManager) {
    const bm = context.battleManager;
    if (!bm || !bm.currentBattle) return;
    const battle = bm.currentBattle;
    const isXianxia = context.route === 'xianxia';

    // 1. 顶部战斗状态提示板 (y: 12 ~ 95)
    uiManager.drawPanel(12, 12, width - 24, 85, 'rgba(15, 20, 28, 0.9)', '#ffcc00', 10);
    ctx.save();
    ctx.fillStyle = '#ffcc00';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`⚔ 正在挑战关卡：【${battle.dungeon ? battle.dungeon.name : '战斗'}】 (第 ${battle.turn} 回合)`, width / 2, 34);

    if (isXianxia) {
      // 我方血条与敌方血条
      ctx.fillStyle = '#a8e6cf';
      ctx.font = '13px sans-serif';
      ctx.fillText(`我方气血: ${battle.playerHP}/${battle.playerMaxHP}  |  战力: ${battle.playerPower}  ${battle.buffTurns > 0 ? `(丹药爆发剩余${battle.buffTurns}回合!)` : ''}`, width / 2, 58);

      ctx.fillStyle = '#ff6347';
      ctx.fillText(`敌方【${battle.enemyName}】气血: ${battle.enemyHP}/${battle.enemyMaxHP}`, width / 2, 80);
    } else {
      // 官场战棋部队概览
      const pCount = battle.getPlayerUnits().length;
      const eCount = battle.getEnemyUnits().length;
      ctx.fillStyle = '#a8e6cf';
      ctx.font = '13px sans-serif';
      ctx.fillText(`🚩 战场军情 — 我方存活部队: ${pCount} 旗  |  敌方叛匪余党: ${eCount} 旗`, width / 2, 58);
      ctx.fillStyle = '#cccccc';
      ctx.font = '12px sans-serif';
      ctx.fillText('利用步/骑/弓兵种克制与相邻合围夹击 (+25%伤害) 彻底歼灭敌将！', width / 2, 78);
    }
    ctx.restore();

    // 2. 战斗日志展示区 (中间靠下部分)
    const logH = 135;
    const logY = height - logH - 95;
    uiManager.drawPanel(12, logY, width - 24, logH, 'rgba(10, 14, 20, 0.88)', '#5c8a8a', 8);
    ctx.save();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('📜 战场实录简报：', 22, logY + 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    const logs = battle.logs.slice(0, 5);
    logs.forEach((logItem, idx) => {
      ctx.fillText(`• ${logItem}`, 22, logY + 44 + idx * 19);
    });
    ctx.restore();

    // 3. 底部操作按钮区域 / 胜利与双倍广告结算提示 (y: height - 90)
    const ctrlY = height - 88;

    if (battle.finished) {
      // 战斗结束：胜利或失败
      if (battle.victory) {
        uiManager.drawPanel(12, ctrlY - 20, width - 24, 98, 'rgba(30, 50, 30, 0.96)', '#00ff7f', 10);
        ctx.save();
        ctx.fillStyle = '#00ff7f';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🌟 秘境大捷！敌将全军覆没，斩获丰厚战利品！', width / 2, ctrlY + 6);
        ctx.restore();

        uiManager.drawButton(24, ctrlY + 28, (width - 60) / 2, 40, '直接普通领取', () => {
          bm.claimBattleRewards(context, false);
          uiManager.closeModal();
        }, '#3b6a88', '#ffffff', 14);

        uiManager.drawButton(36 + (width - 60) / 2, ctrlY + 28, (width - 60) / 2, 40, '📺 广告双倍翻倍领！', () => {
          if (context.adManager) {
            context.adManager.showRewardedAd('doubleDrop', {
              onSuccess: () => {
                bm.claimBattleRewards(context, true);
                uiManager.closeModal();
              },
              context
            });
          }
        }, '#b38600', '#ffffff', 14);
      } else {
        uiManager.drawPanel(12, ctrlY - 20, width - 24, 98, 'rgba(50, 20, 20, 0.96)', '#ff4500', 10);
        ctx.save();
        ctx.fillStyle = '#ff6347';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('💔 战败... 我方战力不敌，被迫捏碎传送符撤离。', width / 2, ctrlY + 14);
        ctx.restore();

        uiManager.drawButton(width / 2 - 80, ctrlY + 36, 160, 38, '撤退回领地休整', () => {
          bm.exitBattle(context);
          uiManager.closeModal();
        }, '#8b0000', '#ffffff', 14);
      }
      return;
    }

    // 战斗正在进行：玩家控制回合
    if (isXianxia) {
      const btnW = (width - 48) / 3;
      uiManager.drawButton(16, ctrlY + 12, btnW, 46, '🗡 普攻剑斩', () => {
        battle.playerAction('basic', context.sceneManager);
        uiManager.refreshHUD();
      }, '#3b7a57', '#ffffff', 13);

      uiManager.drawButton(24 + btnW, ctrlY + 12, btnW, 46, '⚡ 雷斩(耗1碎卷)', () => {
        battle.playerAction('skill', context.sceneManager);
        uiManager.refreshHUD();
      }, '#4682b4', '#ffffff', 13);

      uiManager.drawButton(32 + btnW * 2, ctrlY + 12, btnW, 46, '🧪 服丹(+40%血/防)', () => {
        battle.playerAction('elixir', context.sceneManager);
        uiManager.refreshHUD();
      }, '#8b6508', '#ffffff', 13);
    } else {
      // 战棋控制：优先对最近敌方发起攻击，或施展军师神机计，或推进敌方回合
      const btnW = (width - 48) / 3;
      uiManager.drawButton(16, ctrlY + 12, btnW, 46, '⚔ 督军全军强袭', () => {
        // 为我方所有可以攻击到目标的存活单位发起攻击
        const players = battle.getPlayerUnits();
        const enemies = battle.getEnemyUnits();
        let attacked = false;
        players.forEach((p) => {
          if (!p.isAlive()) return;
          enemies.forEach((e) => {
            if (!e.isAlive() || attacked) return;
            const dist = Math.abs(p.x - e.x) + Math.abs(p.y - e.y);
            if (dist <= p.range) {
              battle.attackUnit(p.id, e.id, context.sceneManager);
              attacked = true;
            }
          });
        });
        if (!attacked) {
          // 如果没有敌人在射程内，让骑兵和长枪向敌人靠拢1步
          if (enemies.length > 0 && players.length > 0) {
            const leader = players[0];
            const target = enemies[0];
            const dx = Math.sign(target.x - leader.x);
            const dy = Math.sign(target.y - leader.y);
            let nextX = leader.x + dx;
            let nextY = leader.y;
            if (!battle.getUnitAt(nextX, nextY)) {
              battle.moveUnit(leader.id, nextX, nextY);
            } else {
              battle.moveUnit(leader.id, leader.x, leader.y + dy);
            }
          }
        }
        uiManager.refreshHUD();
      }, '#b22222', '#ffffff', 13);

      uiManager.drawButton(24 + btnW, ctrlY + 12, btnW, 46, '🔥 烈火计(耗1令牌)', () => {
        const enemies = battle.getEnemyUnits();
        if (enemies.length > 0) {
          battle.useTacticCard('fire', enemies[0].id, context.sceneManager);
          uiManager.refreshHUD();
        } else {
          Adapter.showToast('战场无存活敌军');
        }
      }, '#d2691e', '#ffffff', 13);

      uiManager.drawButton(32 + btnW * 2, ctrlY + 12, btnW, 46, '结束本轮/敌方进击➔', () => {
        battle.endPlayerTurn(context.sceneManager);
        uiManager.refreshHUD();
      }, '#4a7c59', '#ffffff', 13);
    }
  }
}
