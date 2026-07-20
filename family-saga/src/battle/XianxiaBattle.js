/**
 * XianxiaBattle.js
 * 修仙路线 1vN 回合制战斗核心仿真与 3D 粒子特效协调器
 */

import { Adapter } from '../core/Adapter.js';

export class XianxiaBattle {
  constructor(dungeon, context) {
    this.dungeon = dungeon;
    this.context = context;
    this.turn = 1;
    this.logs = [];
    this.finished = false;
    this.victory = false;

    // 组建玩家参战数值 (以家主为主要核心，加上家族金丹以上长老/精英战力协同)
    const family = context.familyManager;
    const master = family ? family.getMaster() : null;
    let totalPower = master ? master.getPower('xianxia') : 50;

    // 如果有其他已成年并达到筑基及以上的族人，提供助战加成
    if (family) {
      family.members.forEach((m) => {
        if (m.role !== 'master' && m.age >= 16 && m.realmLevel >= 2) {
          totalPower += Math.floor(m.getPower('xianxia') * 0.3);
        }
      });
    }

    this.playerPower = totalPower;
    this.playerMaxHP = Math.max(100, totalPower * 3);
    this.playerHP = this.playerMaxHP;
    this.buffTurns = 0; // 丹药护体/增强剩余回合
    this.buffMultiplier = 1.0;

    // 敌人数值
    this.enemyName = dungeon.enemyName || '秘境妖兽';
    this.enemyPower = dungeon.enemyPower || 50;
    this.enemyMaxHP = dungeon.enemyHP || 150;
    this.enemyHP = this.enemyMaxHP;

    this.addLog(`⚡ 战斗进入！对方【${this.enemyName}】咆哮出现，战力 ${this.enemyPower}！`);
    this.addLog(`🗡 我方参战主将【${master ? master.name : '家族修士'}】，全族剑阵综和战力 ${this.playerPower}！`);
  }

  addLog(msg) {
    this.logs.unshift(msg);
  }

  // 玩家行动：普攻 / 法术诀 / 丹药护体
  playerAction(actionType, sceneManager = null) {
    if (this.finished) return { finished: true, victory: this.victory };

    let damage = 0;
    let usedManual = false;
    let usedElixir = false;

    if (actionType === 'basic') {
      const crit = Math.random() < 0.2 ? 1.5 : 1.0;
      damage = Math.floor(this.playerPower * (0.9 + Math.random() * 0.2) * crit * this.buffMultiplier);
      this.enemyHP = Math.max(0, this.enemyHP - damage);
      this.addLog(`🗡 我方催动【五行玄真剑斩】${crit > 1 ? '「暴击！」' : ''}造成 ${damage} 点灵力伤害！(敌方剩余 ${this.enemyHP}/${this.enemyMaxHP})`);
      
      if (sceneManager && sceneManager.triggerXianxiaEffect) {
        sceneManager.triggerXianxiaEffect('sword', crit > 1);
      }
    } else if (actionType === 'skill') {
      // 消耗 1 功法碎卷或 20 行动点，造成强力范围伤害
      if (!this.context.consumeResource('manuals', 1)) {
        Adapter.showToast('功法藏卷不足，无法施展【神雷万法阵】！将自动降级为普攻。');
        return this.playerAction('basic', sceneManager);
      }
      usedManual = true;
      damage = Math.floor(this.playerPower * 2.2 * this.buffMultiplier);
      this.enemyHP = Math.max(0, this.enemyHP - damage);
      this.addLog(`💥 我方爆燃功法真意施展【太古神雷灭绝剑阵】！！天雷轰击造成 ${damage} 点毁灭伤害！(敌方剩余 ${this.enemyHP}/${this.enemyMaxHP})`);

      if (sceneManager && sceneManager.triggerXianxiaEffect) {
        sceneManager.triggerXianxiaEffect('lightning', true);
      }
    } else if (actionType === 'elixir') {
      if (!this.context.consumeResource('elixirs', 1)) {
        Adapter.showToast('丹药不足！请先在炼丹房或商城获取。');
        return this.playerAction('basic', sceneManager);
      }
      usedElixir = true;
      const heal = Math.floor(this.playerMaxHP * 0.45);
      this.playerHP = Math.min(this.playerMaxHP, this.playerHP + heal);
      this.buffTurns = 3;
      this.buffMultiplier = 1.4;
      this.addLog(`🧪 服用仙丹【九转金丹/生息丹】！立刻回复 ${heal} 点生命，并且 3 回合内攻防爆发提升 40%！`);

      if (sceneManager && sceneManager.triggerXianxiaEffect) {
        sceneManager.triggerXianxiaEffect('heal', false);
      }
    }

    if (this.context && this.context.audioManager) {
      if (actionType === 'skill') this.context.audioManager.playSFX('levelUp');
      else if (actionType === 'elixir') this.context.audioManager.playSFX('event');
      else this.context.audioManager.playSFX('click');
    }

    // 检查敌人是否死亡
    if (this.enemyHP <= 0) {
      this.finished = true;
      this.victory = true;
      this.addLog(`🌟 大捷！成功斩杀【${this.enemyName}】，秘境通关！`);
      if (this.context && this.context.audioManager) this.context.audioManager.playSFX('victory');
      return { finished: true, victory: true };
    }

    // 敌人回合反击
    this.enemyTurn(sceneManager);

    // 检查回合增益
    if (this.buffTurns > 0) {
      this.buffTurns -= 1;
      if (this.buffTurns === 0) {
        this.buffMultiplier = 1.0;
        this.addLog(`ℹ 丹药爆发状态已消散。`);
      }
    }

    this.turn += 1;
    return { finished: this.finished, victory: this.victory };
  }

  enemyTurn(sceneManager) {
    const defenseBonus = this.buffTurns > 0 ? 0.75 : 1.0;
    const isBossSkill = this.turn % 3 === 0;
    const dmg = Math.floor(this.enemyPower * (isBossSkill ? 1.5 : 1.0) * (0.85 + Math.random() * 0.3) * defenseBonus);

    this.playerHP = Math.max(0, this.playerHP - dmg);
    if (isBossSkill) {
      this.addLog(`⚠️ 妖兽大招！【${this.enemyName}】释放凶暴血气冲撞，对我方造成 ${dmg} 点重创！(我方气血 ${this.playerHP}/${this.playerMaxHP})`);
    } else {
      this.addLog(`🛡 【${this.enemyName}】挥舞利爪与法术反击，对我方造成 ${dmg} 点伤害。(我方气血 ${this.playerHP}/${this.playerMaxHP})`);
    }

    if (sceneManager && sceneManager.triggerXianxiaEffect) {
      sceneManager.triggerXianxiaEffect('enemyHit', isBossSkill);
    }

    if (this.playerHP <= 0) {
      this.finished = true;
      this.victory = false;
      this.addLog(`💔 败退...我方修士力竭重伤，不得不捏碎传送符败退撤出秘境。`);
    }
  }

  // 结算奖励 (考虑双倍广告翻倍倍率)
  calculateRewards(doubleAd = false) {
    if (!this.victory) return { spiritStones: 0, elixirs: 0, manuals: 0 };
    const cfg = this.dungeon.rewards || {};
    const multiplier = doubleAd || (this.context.adBonuses && this.context.adBonuses.dropMultiplier > 1) ? 2 : 1;

    let stones = cfg.spiritStones ? Math.floor((cfg.spiritStones.min + Math.random() * (cfg.spiritStones.max - cfg.spiritStones.min)) * multiplier) : 100;
    let elixirs = 0;
    if (cfg.elixirs && Math.random() < (cfg.elixirs.chance || 0.5)) {
      elixirs = Math.floor((cfg.elixirs.min + Math.random() * (cfg.elixirs.max - cfg.elixirs.min + 1)) * multiplier);
    }
    let manuals = 0;
    if (cfg.manuals && Math.random() < (cfg.manuals.chance || 0.3)) {
      manuals = Math.floor((cfg.manuals.min + Math.random() * (cfg.manuals.max - cfg.manuals.min + 1)) * multiplier);
    }

    return { spiritStones: stones, elixirs, manuals };
  }
}
