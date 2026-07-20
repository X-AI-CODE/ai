/**
 * AncestralTree.js
 * 家族祖训与血脉自定义洗练树 (Ancestral Edicts & Genetic Tree)
 * 允许玩家消耗血脉经验自由点亮三大祖训分支：财富开采、天资遗传、长生延命
 */

export const ANCESTRAL_EDICTS_CONFIG = {
  wealth_edict: {
    id: 'wealth_edict',
    name: '商道聚鼎·财灵大祖训',
    desc: '强化全境庄园灵脉与商铺的开采效率，每级额外提供 +12% 的全领土基础资源年收入！',
    maxLevel: 10,
    baseCost: 400,
    prodBonusPerLv: 0.12
  },
  genetics_edict: {
    id: 'genetics_edict',
    name: '天道文曲·优灵遗传训',
    desc: '洗练优化家族传承基因，每级直接让新生儿与候选人的天资底限保底提高 +3 点！',
    maxLevel: 10,
    baseCost: 500,
    talentBonusPerLv: 3
  },
  longevity_edict: {
    id: 'longevity_edict',
    name: '长生久视·延年仙秘录',
    desc: '向天夺命，强化全族子弟寿元底运，每级使当代家督与全体族人的最大寿命极限增加 +2 岁！',
    maxLevel: 10,
    baseCost: 600,
    lifeBonusPerLv: 2
  }
};

export class AncestralTree {
  constructor() {
    this.edicts = {
      wealth_edict: 0,
      genetics_edict: 0,
      longevity_edict: 0
    };
  }

  getEdictLevel(key) {
    return this.edicts[key] || 0;
  }

  // 升级祖训分支 (消耗血脉经验)
  upgradeEdict(key, context) {
    const cfg = ANCESTRAL_EDICTS_CONFIG[key];
    if (!cfg || !context.bloodline) return false;

    const curLv = this.getEdictLevel(key);
    if (curLv >= cfg.maxLevel) return false;

    const costExp = Math.floor(cfg.baseCost * Math.pow(1.35, curLv));
    if (context.bloodline.exp < costExp) return false;

    context.bloodline.exp -= costExp;
    this.edicts[key] = curLv + 1;
    context.addLog(`📜 祖训大成！点亮【${cfg.name}】至 Lv.${curLv + 1}！族运飞跃！`);
    return true;
  }

  // 获取财富开采额外倍率
  getWealthMultiplier() {
    return Number((this.edicts.wealth_edict * 0.12).toFixed(2));
  }

  // 获取遗传保底天资加成
  getTalentBonus() {
    return this.edicts.genetics_edict * 3;
  }

  // 获取长生寿元加成
  getLongevityBonus() {
    return this.edicts.longevity_edict * 2;
  }

  toJSON() {
    return {
      edicts: { ...this.edicts }
    };
  }

  fromJSON(data) {
    if (!data || !data.edicts) return;
    this.edicts = { ...data.edicts };
  }
}
