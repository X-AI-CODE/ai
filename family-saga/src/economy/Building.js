/**
 * Building.js
 * 五大核心建筑的配置模型与产出计算计算公式
 */

export const BUILDINGS_CONFIG = {
  // 修仙专属
  spiritVein: {
    id: 'spiritVein',
    name: '灵脉庄园',
    route: 'xianxia',
    desc: '接引天地灵气的核心庄园，每年产出大量灵石。派驻族人可大幅加速开采。',
    baseCost: 300,
    costType: 'spiritStones',
    baseOutput: 120,
    outputType: 'spiritStones'
  },
  alchemyLab: {
    id: 'alchemyLab',
    name: '造化丹房',
    route: 'xianxia',
    desc: '炼制延寿灵丹与突破丹药的圣地。派驻资质高的炼丹族人可提升产出。',
    baseCost: 400,
    costType: 'spiritStones',
    baseOutput: 2,
    outputType: 'elixirs'
  },
  cultivationRoom: {
    id: 'cultivationRoom',
    name: '玄机修炼室',
    route: 'xianxia',
    desc: '聚集高浓度灵气的静修之所，大幅加速在此修习的族人修为成长与突破。',
    baseCost: 350,
    costType: 'spiritStones',
    baseOutput: 150,
    outputType: 'expBonus'
  },
  sutraVault: {
    id: 'sutraVault',
    name: '上古藏经阁',
    route: 'xianxia',
    desc: '珍藏仙家功法与秘录，提升后代跨代传承容量，每年研习产生功法碎片。',
    baseCost: 500,
    costType: 'spiritStones',
    baseOutput: 1,
    outputType: 'manuals'
  },

  // 官路专属
  manorShop: {
    id: 'manorShop',
    name: '繁华商铺庄园',
    route: 'official',
    desc: '遍布京城与州府的商业网点，每年为家族贡献丰厚银两岁入。',
    baseCost: 350,
    costType: 'silver',
    baseOutput: 180,
    outputType: 'silver'
  },
  academy: {
    id: 'academy',
    name: '名门翰林书院',
    route: 'official',
    desc: '教育子弟四书五经与治国良策的顶尖书院，每年产出政绩与才学书卷。',
    baseCost: 400,
    costType: 'silver',
    baseOutput: 25,
    outputType: 'merit'
  },
  trainingGrounds: {
    id: 'trainingGrounds',
    name: '铁血演武场',
    route: 'official',
    desc: '演练兵法战阵与统御兵马的核心驻地，派驻子弟将迅速精进统帅谋略。',
    baseCost: 350,
    costType: 'silver',
    baseOutput: 150,
    outputType: 'expBonus'
  },
  treasury: {
    id: 'treasury',
    name: '门阀通事馆/府库',
    route: 'official',
    desc: '结交朝野上下重臣的人脉枢纽，提升人脉令牌传承并每年产出朝堂人脉。',
    baseCost: 500,
    costType: 'silver',
    baseOutput: 1,
    outputType: 'connections'
  },

  // 共通建筑
  ancestralShrine: {
    id: 'ancestralShrine',
    name: '家族千秋祠堂',
    route: 'both',
    desc: '凝聚家族精神与列祖列宗庇佑的圣地，每年产出血脉经验，并提升家族最大人口上限。',
    baseCost: 450,
    costType: 'both', // 根据当前路线决定使用 spiritStones 还是 silver
    baseOutput: 30,
    outputType: 'bloodlineExp'
  }
};

export class Building {
  constructor(configKey, level = 1) {
    this.key = configKey;
    this.level = level;
    this.assignedMemberId = null;
  }

  getConfig() {
    return BUILDINGS_CONFIG[this.key] || {};
  }

  getName() {
    return `${this.getConfig().name} (Lv.${this.level})`;
  }

  getUpgradeCost(route = 'xianxia') {
    const cfg = this.getConfig();
    const base = cfg.baseCost || 300;
    const costAmount = Math.floor(base * Math.pow(1.35, this.level - 1));
    const costType = cfg.costType === 'both' ? (route === 'xianxia' ? 'spiritStones' : 'silver') : cfg.costType;
    return { costAmount, costType };
  }

  // 获取该建筑当前基础年产出
  getBaseOutput() {
    const cfg = this.getConfig();
    return Math.floor(cfg.baseOutput * this.level);
  }

  toJSON() {
    return {
      key: this.key,
      level: this.level,
      assignedMemberId: this.assignedMemberId
    };
  }
}
