/**
 * BattleManager.js
 * 战斗系统统一分发调度与副本冒险管理器
 */

import { DUNGEONS_CONFIG } from './DungeonConfig.js';
import { XianxiaBattle } from './XianxiaBattle.js';
import { OfficialBattle } from './OfficialBattle.js';
import { Adapter } from '../core/Adapter.js';

export class BattleManager {
  constructor() {
    this.currentBattle = null;
    this.battleType = 'xianxia'; // 'xianxia' or 'official'
  }

  getDungeonList(route = 'xianxia') {
    return DUNGEONS_CONFIG[route] || [];
  }

  getDungeon(route, id) {
    const list = this.getDungeonList(route);
    return list.find((item) => item.id === id) || null;
  }

  // 发起对某个关卡副本的挑战
  startBattle(dungeonId, context) {
    const route = context.route;
    const dungeon = this.getDungeon(route, dungeonId);
    if (!dungeon) {
      Adapter.showToast('该关卡副本不存在！');
      return false;
    }

    // 检查血脉门槛
    if (context.bloodline && context.bloodline.level < dungeon.bloodlineReq) {
      Adapter.showToast(`无法进入！需要家族血脉等级达到 Lv.${dungeon.bloodlineReq}！`);
      return false;
    }

    // 检查体力是否足够
    if (!context.spendStamina(dungeon.staminaCost)) {
      // 提示可以通过激励广告一键恢复体力
      return false;
    }

    this.battleType = route;
    if (route === 'xianxia') {
      this.currentBattle = new XianxiaBattle(dungeon, context);
      if (context.sceneManager) {
        context.sceneManager.switchScene('xianxia_battle');
      }
    } else {
      this.currentBattle = new OfficialBattle(dungeon, context);
      if (context.sceneManager) {
        context.sceneManager.switchScene('official_battle', this.currentBattle);
      }
    }

    if (context.audioManager) {
      context.audioManager.playBGM('battle');
    }

    // 唤起战斗 UI
    if (context.uiManager) {
      context.uiManager.openModal('BattleUI');
    }

    return true;
  }

  // 结算当前战斗奖励
  claimBattleRewards(context, doubleByAd = false) {
    if (!this.currentBattle || !this.currentBattle.victory) return null;

    const rewards = this.currentBattle.calculateRewards(doubleByAd);
    
    if (rewards.spiritStones) context.addResource('spiritStones', rewards.spiritStones);
    if (rewards.silver) context.addResource('silver', rewards.silver);
    if (rewards.elixirs) context.addResource('elixirs', rewards.elixirs);
    if (rewards.manuals) context.addResource('manuals', rewards.manuals);
    if (rewards.merit) context.addResource('merit', rewards.merit);
    if (rewards.connections) context.addResource('connections', rewards.connections);

    // 给予参战主家主与族人实战修为/功绩经验
    const family = context.familyManager;
    if (family) {
      const master = family.getMaster();
      if (master) master.gainExp(250, context.route, context);
    }

    // 记录编年史日志
    let rewardText = '';
    if (rewards.spiritStones) rewardText += `灵石+${rewards.spiritStones} `;
    if (rewards.silver) rewardText += `银两+${rewards.silver} `;
    if (rewards.elixirs) rewardText += `丹药+${rewards.elixirs} `;
    if (rewards.manuals) rewardText += `功法卷+${rewards.manuals} `;
    if (rewards.merit) rewardText += `政绩+${rewards.merit} `;
    if (rewards.connections) rewardText += `令牌+${rewards.connections} `;

    context.addLog(`★ 通关【${this.currentBattle.dungeon.name}】！获得战利品：${rewardText}${doubleByAd ? '(广告双倍)' : ''}`);
    if (context.bloodline) {
      context.bloodline.trackDungeonClear();
      context.bloodline.checkMilestones(context);
    }
    
    // 返回家园场景
    this.exitBattle(context);
    return rewards;
  }

  exitBattle(context) {
    this.currentBattle = null;
    if (context.sceneManager) {
      context.sceneManager.switchScene('territory');
    }
    if (context.audioManager) {
      context.audioManager.playBGM('territory');
    }
  }
}
