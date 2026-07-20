/**
 * OfficialBattle.js
 * 官职路线 8x8 部队方格战棋剿匪平叛沙盘推演系统
 */

import { Adapter } from '../core/Adapter.js';

export class Unit {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.team = data.team; // 'player' or 'enemy'
    this.type = data.type || 'infantry'; // 'commander'(主将), 'infantry'(长枪), 'cavalry'(铁骑), 'archer'(神射)
    this.x = data.x;
    this.y = data.y;
    this.hp = data.hp;
    this.maxHp = data.maxHp || data.hp;
    this.attack = data.attack;
    this.range = data.type === 'archer' ? 3 : 1;
    this.moved = false;
    this.acted = false;
  }

  isAlive() {
    return this.hp > 0;
  }
}

export class OfficialBattle {
  constructor(dungeon, context) {
    this.dungeon = dungeon;
    this.context = context;
    this.turn = 1;
    this.logs = [];
    this.finished = false;
    this.victory = false;
    this.gridWidth = 8;
    this.gridHeight = 8;
    this.units = [];

    // 计算玩家部队数值
    const family = context.familyManager;
    const master = family ? family.getMaster() : null;
    const baseAttack = Math.floor((master ? master.getPower('official') : 40) / 4);
    const baseHp = baseAttack * 4;

    // 我方部队排布在第6、7行 (下方)
    this.units.push(new Unit({
      id: 'p_cmd',
      name: `${master ? master.name : '统帅家主'} (帅骑)`,
      team: 'player',
      type: 'commander',
      x: 3, y: 7,
      hp: Math.floor(baseHp * 1.5), maxHp: Math.floor(baseHp * 1.5),
      attack: Math.floor(baseAttack * 1.3)
    }));
    this.units.push(new Unit({
      id: 'p_cav',
      name: '精锐骠骑营',
      team: 'player',
      type: 'cavalry',
      x: 1, y: 6,
      hp: Math.floor(baseHp * 1.2), maxHp: Math.floor(baseHp * 1.2),
      attack: Math.floor(baseAttack * 1.2)
    }));
    this.units.push(new Unit({
      id: 'p_inf',
      name: '千重长枪营',
      team: 'player',
      type: 'infantry',
      x: 4, y: 6,
      hp: Math.floor(baseHp * 1.4), maxHp: Math.floor(baseHp * 1.4),
      attack: baseAttack
    }));
    this.units.push(new Unit({
      id: 'p_arc',
      name: '神射弩箭营',
      team: 'player',
      type: 'archer',
      x: 5, y: 7,
      hp: Math.floor(baseHp * 0.9), maxHp: Math.floor(baseHp * 0.9),
      attack: Math.floor(baseAttack * 1.1)
    }));

    // 敌方部队排布在第0、1行 (上方)
    const enemyName = dungeon.enemyName || '黑风寨匪帮';
    const enemyPower = dungeon.enemyPower || 40;
    const eAtk = Math.max(15, Math.floor(enemyPower / 3));
    const eHp = eAtk * 3.5;

    this.units.push(new Unit({
      id: 'e_boss',
      name: `${enemyName}·首领`,
      team: 'enemy',
      type: 'commander',
      x: 3, y: 0,
      hp: Math.floor(eHp * 1.6), maxHp: Math.floor(eHp * 1.6),
      attack: Math.floor(eAtk * 1.3)
    }));
    this.units.push(new Unit({
      id: 'e_inf_1',
      name: '悍勇刀匪左营',
      team: 'enemy',
      type: 'infantry',
      x: 2, y: 1,
      hp: Math.floor(eHp * 1.1), maxHp: Math.floor(eHp * 1.1),
      attack: eAtk
    }));
    this.units.push(new Unit({
      id: 'e_inf_2',
      name: '悍勇刀匪右营',
      team: 'enemy',
      type: 'infantry',
      x: 4, y: 1,
      hp: Math.floor(eHp * 1.1), maxHp: Math.floor(eHp * 1.1),
      attack: eAtk
    }));
    this.units.push(new Unit({
      id: 'e_arc',
      name: '伏击弓弩手',
      team: 'enemy',
      type: 'archer',
      x: 5, y: 0,
      hp: Math.floor(eHp * 0.8), maxHp: Math.floor(eHp * 0.8),
      attack: Math.floor(eAtk * 1.1)
    }));

    this.addLog(`🚩 沙盘战役展开！敌方【${enemyName}】于上方列阵！我方部队统揽全局！`);
  }

  addLog(msg) {
    this.logs.unshift(msg);
  }

  getUnitAt(x, y) {
    return this.units.find((u) => u.isAlive() && u.x === x && u.y === y) || null;
  }

  getPlayerUnits() {
    return this.units.filter((u) => u.isAlive() && u.team === 'player');
  }

  getEnemyUnits() {
    return this.units.filter((u) => u.isAlive() && u.team === 'enemy');
  }

  // 移动指定单位到目标格子
  moveUnit(unitId, targetX, targetY) {
    if (this.finished) return false;
    const unit = this.units.find((u) => u.id === unitId);
    if (!unit || !unit.isAlive()) return false;
    if (unit.x === targetX && unit.y === targetY) return true;

    // 检查格内是否有其他存活单位
    const targetCell = this.getUnitAt(targetX, targetY);
    if (targetCell) {
      Adapter.showToast('该位置已被占用！');
      return false;
    }

    // 检查距离 (骑兵移动3格，普通步兵/弓箭手2格)
    const maxDist = unit.type === 'cavalry' ? 3 : 2;
    const dist = Math.abs(unit.x - targetX) + Math.abs(unit.y - targetY);
    if (dist > maxDist) {
      Adapter.showToast(`移动超出行程 (最大 ${maxDist} 格)`);
      return false;
    }

    unit.x = targetX;
    unit.y = targetY;
    unit.moved = true;
    this.addLog(`🏇 【${unit.name}】行军移动至 (${targetX}, ${targetY})。`);
    return true;
  }

  // 发起攻击 (含夹击判定)
  attackUnit(attackerId, targetId, sceneManager = null) {
    if (this.finished) return false;
    const attacker = this.units.find((u) => u.id === attackerId);
    const target = this.units.find((u) => u.id === targetId);
    if (!attacker || !target || !attacker.isAlive() || !target.isAlive()) return false;

    // 检查射程/攻击范围
    const dist = Math.abs(attacker.x - target.x) + Math.abs(attacker.y - target.y);
    if (dist > attacker.range) {
      Adapter.showToast(`目标超出了【${attacker.name}】的攻击范围 (${attacker.range} 格内)！`);
      return false;
    }

    // 夹击判定：查看 target 的相反方向是否有 attacker 的友军
    let flankingBonus = 1.0;
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    if (Math.abs(dx) + Math.abs(dy) === 1) { // 相邻近战
      const allyOpposite = this.getUnitAt(target.x + dx, target.y + dy);
      if (allyOpposite && allyOpposite.team === attacker.team && allyOpposite.isAlive()) {
        flankingBonus = 1.25;
        this.addLog(`💥 触发夹击战术！【${allyOpposite.name}】在背侧协同合围，伤害提高 25%！`);
      }
    }

    // 兵种克制：长枪克骑兵(1.2)，骑兵克弓手(1.2)，弓手克长枪(1.1)
    let typeBonus = 1.0;
    if (attacker.type === 'infantry' && target.type === 'cavalry') typeBonus = 1.2;
    if (attacker.type === 'cavalry' && target.type === 'archer') typeBonus = 1.2;
    if (attacker.type === 'archer' && target.type === 'infantry') typeBonus = 1.1;

    const damage = Math.floor(attacker.attack * flankingBonus * typeBonus * (0.9 + Math.random() * 0.2));
    target.hp = Math.max(0, target.hp - damage);
    attacker.acted = true;

    this.addLog(`⚔ 【${attacker.name}】对【${target.name}】发动强袭！造成 ${damage} 点谋略伤亡。(对方剩余 ${target.hp}/${target.maxHp})`);
    if (sceneManager && sceneManager.triggerTacticalEffect) {
      sceneManager.triggerTacticalEffect(target.x, target.y, 'attack');
    }

    // 检查目标存活
    if (!target.isAlive()) {
      this.addLog(`☠ 斩旗破敌！【${target.name}】全军覆没，溃退沙场！`);
    }

    this.checkBattleResult();
    return true;
  }

  // 释放战术锦囊计策 (火攻 / 锦囊)
  useTacticCard(tacticType, targetId, sceneManager = null) {
    if (this.finished) return false;
    const target = this.units.find((u) => u.id === targetId);
    if (!target || !target.isAlive()) return false;

    if (tacticType === 'fire') {
      if (!this.context.consumeResource('connections', 1)) {
        Adapter.showToast('人脉令牌不足，无法调用京畿神机营火器/火攻锦囊计！');
        return false;
      }
      const dmg = Math.floor(target.maxHp * 0.45);
      target.hp = Math.max(0, target.hp - dmg);
      this.addLog(`🔥 施展军师神机计【烈火燎原计】！火烧【${target.name}】造成 ${dmg} 点大火焚伤！`);
      if (sceneManager && sceneManager.triggerTacticalEffect) {
        sceneManager.triggerTacticalEffect(target.x, target.y, 'fire');
      }
    } else if (tacticType === 'heal') {
      const heal = Math.floor(target.maxHp * 0.5);
      target.hp = Math.min(target.maxHp, target.hp + heal);
      this.addLog(`🩺 军医亲临救治！为【${target.name}】包扎伤患，恢复 ${heal} 点兵力。`);
      if (sceneManager && sceneManager.triggerTacticalEffect) {
        sceneManager.triggerTacticalEffect(target.x, target.y, 'heal');
      }
    }

    if (!target.isAlive()) {
      this.addLog(`☠ 【${target.name}】无法承受锦囊重创，全军溃败！`);
    }

    this.checkBattleResult();
    return true;
  }

  // 检查战斗结果 (任一方全灭)
  checkBattleResult() {
    if (this.finished) return;

    const playerAlive = this.getPlayerUnits();
    const enemyAlive = this.getEnemyUnits();

    if (enemyAlive.length === 0) {
      this.finished = true;
      this.victory = true;
      this.addLog(`🌟 胜利！成功围歼全部叛匪寇敌，班师回朝！`);
      if (this.context && this.context.audioManager) this.context.audioManager.playSFX('victory');
    } else if (playerAlive.length === 0) {
      this.finished = true;
      this.victory = false;
      this.addLog(`💔 惨败...我方大军伤亡惨重，主帅下令鸣金收兵退回大营。`);
    }
  }

  // 结束我方回合，开始敌军反击 AI
  endPlayerTurn(sceneManager = null) {
    if (this.finished) return;

    // 重置我方行动状态
    this.getPlayerUnits().forEach((u) => {
      u.moved = false;
      u.acted = false;
    });

    this.addLog(`--- 第 ${this.turn} 回合敌方进击 ---`);

    // 敌人 AI 逻辑：每个存活的敌军寻找最近的我方单位，如果能打到就打，打不到就向其移动并尝试攻击
    const enemies = this.getEnemyUnits();
    const players = this.getPlayerUnits();

    enemies.forEach((enemy) => {
      if (!enemy.isAlive() || this.finished) return;

      // 寻找最近的玩家单位
      let nearest = null;
      let minDist = 999;
      players.forEach((p) => {
        if (!p.isAlive()) return;
        const d = Math.abs(enemy.x - p.x) + Math.abs(enemy.y - p.y);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      });

      if (nearest) {
        // 如果不在攻击距离内，尝试往 nearest 方向移动1步或2步
        if (minDist > enemy.range) {
          const dx = nearest.x - enemy.x;
          const dy = nearest.y - enemy.y;
          let newX = enemy.x;
          let newY = enemy.y;
          if (Math.abs(dx) > Math.abs(dy)) {
            newX += Math.sign(dx);
          } else {
            newY += Math.sign(dy);
          }
          if (!this.getUnitAt(newX, newY)) {
            enemy.x = newX;
            enemy.y = newY;
            this.addLog(`👺 敌营【${enemy.name}】逼近至 (${newX}, ${newY})。`);
            minDist = Math.abs(enemy.x - nearest.x) + Math.abs(enemy.y - nearest.y);
          }
        }

        // 移动后如果在攻击范围内，发动攻击
        if (minDist <= enemy.range && nearest.isAlive()) {
          const dmg = Math.floor(enemy.attack * (0.85 + Math.random() * 0.3));
          nearest.hp = Math.max(0, nearest.hp - dmg);
          this.addLog(`🔴 【${enemy.name}】向【${nearest.name}】出击，造成 ${dmg} 点战损！(剩余兵力 ${nearest.hp}/${nearest.maxHp})`);
          if (sceneManager && sceneManager.triggerTacticalEffect) {
            sceneManager.triggerTacticalEffect(nearest.x, nearest.y, 'attack');
          }
          if (!nearest.isAlive()) {
            this.addLog(`⚠️ 我方部将【${nearest.name}】战损溃散！`);
          }
        }
      }
    });

    this.turn += 1;
    this.checkBattleResult();
  }

  calculateRewards(doubleAd = false) {
    if (!this.victory) return { silver: 0, merit: 0, connections: 0 };
    const cfg = this.dungeon.rewards || {};
    const multiplier = doubleAd || (this.context.adBonuses && this.context.adBonuses.dropMultiplier > 1) ? 2 : 1;

    let silver = cfg.silver ? Math.floor((cfg.silver.min + Math.random() * (cfg.silver.max - cfg.silver.min)) * multiplier) : 150;
    let merit = cfg.merit ? Math.floor((cfg.merit.min + Math.random() * (cfg.merit.max - cfg.merit.min)) * multiplier) : 50;
    let connections = 0;
    if (cfg.connections && Math.random() < (cfg.connections.chance || 0.4)) {
      connections = Math.floor((cfg.connections.min + Math.random() * (cfg.connections.max - cfg.connections.min + 1)) * multiplier);
    }

    return { silver, merit, connections };
  }
}
