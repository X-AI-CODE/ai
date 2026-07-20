/**
 * Artifact.js
 * 传家本命法宝与护族灵兽/朝堂智囊系统
 * 镇族至宝代代相传，提供战斗战力倍率、领地产出强化与战棋特殊被动加成
 */

export const ARTIFACTS_CONFIG = {
  // 修仙传家宝与灵兽
  x_relic_mirror: {
    id: 'x_relic_mirror',
    name: '太极阴阳玄灵镜',
    route: 'xianxia',
    type: 'relic',
    desc: '上古仙道传承真器，装备于家主可提升 35% 综合法术战力，并减免 15% 秘境受到伤害。',
    powerBonus: 0.35,
    prodBonus: 0.1,
    costAmount: 1200,
    costType: 'spiritStones'
  },
  x_relic_sword: {
    id: 'x_relic_sword',
    name: '九天绝影飞仙剑',
    route: 'xianxia',
    type: 'relic',
    desc: '开派剑尊遗留的飞灵仙剑，战斗中暴击伤害倍率额外 +50%，攻势如雷。',
    powerBonus: 0.45,
    prodBonus: 0.05,
    costAmount: 1800,
    costType: 'spiritStones'
  },
  x_beast_qilin: {
    id: 'x_beast_qilin',
    name: '上古雷泽天雷麒麟',
    route: 'xianxia',
    type: 'beast',
    desc: '镇守家族灵脉的神兽麒麟，陪伴家主出征时每 3 回合降下天劫雷电轰击全体妖兽。',
    powerBonus: 0.50,
    prodBonus: 0.25,
    costAmount: 2500,
    costType: 'spiritStones'
  },

  // 官途镇族神器与幕僚智囊
  o_relic_seal: {
    id: 'o_relic_seal',
    name: '传国至尊九龙玉玺',
    route: 'official',
    type: 'relic',
    desc: '皇家赐予或开国镇邸至宝，统御万军，使所有沙盘战棋部队基础兵力与攻防提高 35%。',
    powerBonus: 0.35,
    prodBonus: 0.15,
    costAmount: 1500,
    costType: 'silver'
  },
  o_relic_sword: {
    id: 'o_relic_sword',
    name: '御赐尚方斩马宝剑',
    route: 'official',
    type: 'relic',
    desc: '先皇特赐尚方斩马剑，先斩后奏！沙盘战斗中对叛贼首领伤害提高 45%。',
    powerBonus: 0.45,
    prodBonus: 0.05,
    costAmount: 2000,
    costType: 'silver'
  },
  o_advisor_zhuge: {
    id: 'o_advisor_zhuge',
    name: '卧龙谋圣·诸葛神机',
    route: 'official',
    type: 'advisor',
    desc: '天下第一军师幕僚，归附家族并坐镇后方，沙盘战棋所有计策锦囊消耗减半且效果翻倍！',
    powerBonus: 0.50,
    prodBonus: 0.30,
    costAmount: 3000,
    costType: 'silver'
  }
};

export class Artifact {
  constructor(configKey, level = 1) {
    this.key = configKey;
    this.level = level;
    this.equippedMemberId = null; // 装备或绑定至哪个族人/家主
  }

  getConfig() {
    return ARTIFACTS_CONFIG[this.key] || {};
  }

  getName() {
    return `${this.getConfig().name} (+${this.level})`;
  }

  // 综合战斗加成倍率 (结合精炼等级)
  getPowerMultiplier() {
    const cfg = this.getConfig();
    const base = cfg.powerBonus || 0.2;
    return Number((base * (1 + (this.level - 1) * 0.25)).toFixed(2));
  }

  // 领地产出被动增强倍率
  getProdMultiplier() {
    const cfg = this.getConfig();
    const base = cfg.prodBonus || 0.05;
    return Number((base * (1 + (this.level - 1) * 0.2)).toFixed(2));
  }

  // 精炼升阶成本
  getRefineCost(route = 'xianxia') {
    const cfg = this.getConfig();
    const base = cfg.costAmount || 1000;
    const costAmount = Math.floor(base * Math.pow(1.5, this.level));
    const costType = route === 'xianxia' ? 'spiritStones' : 'silver';
    return { costAmount, costType };
  }

  toJSON() {
    return {
      key: this.key,
      level: this.level,
      equippedMemberId: this.equippedMemberId
    };
  }
}

export class ArtifactManager {
  constructor() {
    this.artifacts = [];
  }

  initRoute(route = 'xianxia') {
    this.artifacts = [];
    if (route === 'xianxia') {
      this.addArtifact(new Artifact('x_relic_mirror', 1));
    } else {
      this.addArtifact(new Artifact('o_relic_seal', 1));
    }
  }

  addArtifact(artifact) {
    if (artifact instanceof Artifact) {
      this.artifacts.push(artifact);
    } else {
      this.artifacts.push(new Artifact(artifact.key || artifact, artifact.level || 1));
    }
  }

  getArtifactList() {
    return this.artifacts;
  }

  // 装备或卸下法宝/灵兽
  equipToMember(artifactKey, memberId) {
    const art = this.artifacts.find((item) => item.key === artifactKey);
    if (!art) return false;
    art.equippedMemberId = memberId || null;
    return true;
  }

  // 获取指定族人或家主装备的所有宝物与灵兽
  getEquippedBy(memberId) {
    return this.artifacts.filter((item) => item.equippedMemberId === memberId);
  }

  // 传承继承：当新任家主继任时，将上一任家主的所有镇族法宝转移给新家主！
  inheritToHeir(oldMasterId, newMasterId, context) {
    let count = 0;
    this.artifacts.forEach((art) => {
      if (art.equippedMemberId === oldMasterId || !art.equippedMemberId) {
        art.equippedMemberId = newMasterId;
        count++;
      }
    });
    if (count > 0 && context) {
      context.addLog(`🛡 镇族至宝相传！上一代的 ${count} 件传家宝物/神兽悉数认主新任家督！`);
    }
  }

  // 获取家族全境所有宝物带来的产出加总倍率
  getTotalProdBonus() {
    let total = 0;
    this.artifacts.forEach((art) => {
      total += art.getProdMultiplier();
    });
    return Number(total.toFixed(2));
  }

  toJSON() {
    return {
      artifacts: this.artifacts.map((item) => item.toJSON())
    };
  }

  fromJSON(data) {
    if (!data || !data.artifacts) return;
    this.artifacts = data.artifacts.map((item) => {
      const art = new Artifact(item.key, item.level || 1);
      art.equippedMemberId = item.equippedMemberId || null;
      return art;
    });
  }
}
