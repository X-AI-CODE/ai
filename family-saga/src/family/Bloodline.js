/**
 * Bloodline.js
 * 家族血脉与跨越世代的长期成长系统：涵盖里程碑与成就系统
 */

export const MILESTONES_CONFIG = [
  { id: 'pop_10', title: '人丁兴旺 (人口超10人)', unlockDesc: '血脉经验+500 | 解锁：二级庄园扩建与基础英才资质池', check: (stats) => stats.totalPopulation >= 10, rewardExp: 500 },
  { id: 'pop_20', title: '名门望族 (人口超20人)', unlockDesc: '血脉经验+1500 | 解锁：四级庄园扩建与家族分支繁衍', check: (stats) => stats.totalPopulation >= 20, rewardExp: 1500 },
  { id: 'realm_3', title: '高阶栋梁 (诞生金丹/三品)', unlockDesc: '血脉经验+1000 | 解锁：金丹天幕/边疆御敌高难度关卡副本', check: (stats) => stats.maxRealmOrRank >= 3, rewardExp: 1000 },
  { id: 'realm_5', title: '威震方圆 (诞生化神/知府)', unlockDesc: '血脉经验+3000 | 解锁：化神太古仙冢/封王大决战关卡', check: (stats) => stats.maxRealmOrRank >= 5, rewardExp: 3000 },
  { id: 'res_50k', title: '家财万贯 (累计产出超5万)', unlockDesc: '血脉经验+1200 | 解锁：商铺黑市高级丹药/兵书直接兑换', check: (stats) => stats.totalResourceEarned >= 50000, rewardExp: 1200 },
  { id: 'res_200k', title: '富可敌国 (累计产出超20万)', unlockDesc: '血脉经验+4000 | 解锁：终极仙法真纪/皇家御赐匾额特权', check: (stats) => stats.totalResourceEarned >= 200000, rewardExp: 4000 },
  { id: 'heir_3', title: '薪火相传 (传承达3代)', unlockDesc: '血脉经验+1500 | 解锁：跨代天赋遗传最大比例提升至 95%', check: (stats) => stats.totalHeirsInherited >= 2, rewardExp: 1500 }
];

export const ACHIEVEMENTS_CONFIG = [
  { id: 'achieve_yuanying_3', title: '巨擘摇篮', desc: '累计培养/诞生 3 位金丹以上修士或三品以上朝堂重臣', target: 3, getCur: (stats) => stats.jindanOrRank3Count, rewardText: '永久跨周目起步灵石/银两 +500' },
  { id: 'achieve_stones_1m', title: '灵脉龙脉', desc: '家族跨世代累计赚取核心资源达到 100,000', target: 100000, getCur: (stats) => stats.totalResourceEarned, rewardText: '永久全领土庄园产出基数 +15%' },
  { id: 'achieve_gen_10', title: '千秋世家', desc: '家族薪火相传、世代不息，经历并传承达到 5 代', target: 5, getCur: (stats) => stats.totalHeirsInherited + 1, rewardText: '永久开局天资下限保底提升至 70' },
  { id: 'achieve_battle_10', title: '百战百胜', desc: '外域秘境冒险与沙盘战棋剿匪平叛累计通关达 5 次', target: 5, getCur: (stats) => stats.totalDungeonClear || 0, rewardText: '永久战斗体力恢复上限 +50' },
  { id: 'achieve_ad_20', title: '商业富豪', desc: '支持并体验商业化激励视频广告福利累计达 10 次', target: 10, getCur: (stats) => stats.totalAdWatched || 0, rewardText: '永久享受广告加速效果持续年数 +1年' }
];

export class Bloodline {
  constructor() {
    this.reset();
  }

  reset() {
    this.level = 1;            // 血脉等级 (1 ~ 10)
    this.exp = 0;              // 当前血脉经验
    this.maxExp = 1000;        // 升级所需血脉经验

    // 跨世代成就与统计
    this.stats = {
      totalPopulation: 2,       // 历史累计总人口
      maxRealmOrRank: 0,        // 达到的最高境界/官阶
      totalResourceEarned: 0,   // 累计产出的核心资源 (灵石/银两)
      totalHeirsInherited: 0,   // 经历的传承次数
      jindanOrRank3Count: 0,    // 培养出金丹修士或三品大员次数
      totalDungeonClear: 0,     // 累计通关副本关卡次数
      totalAdWatched: 0         // 累计观看商业化广告次数
    };

    // 已解锁里程碑列表
    this.unlockedMilestones = [];
    // 已达成成就列表
    this.unlockedAchievements = [];
  }

  // 获取当前天赋与资质的遗传与继承比例系数
  getInheritanceCoeff(extraBonus = false) {
    const base = Math.min(0.95, 0.5 + (this.level - 1) * 0.05);
    return extraBonus ? Math.min(1.0, base + 0.15) : base;
  }

  // 获取声望衰减留存系数
  getReputationRetentionCoeff() {
    return Math.min(0.95, 0.6 + (this.level - 1) * 0.04);
  }

  // 记录资源获取
  trackResourceGain(type, amount) {
    if (type === 'spiritStones' || type === 'silver') {
      this.stats.totalResourceEarned += amount;
      this.addExp(Math.floor(amount / 50));
    }
  }

  trackDungeonClear() {
    this.stats.totalDungeonClear = (this.stats.totalDungeonClear || 0) + 1;
  }

  trackAdWatched() {
    this.stats.totalAdWatched = (this.stats.totalAdWatched || 0) + 1;
  }

  // 增加血脉经验并检查升级
  addExp(amount) {
    if (amount <= 0 || this.level >= 10) return;
    this.exp += amount;
    while (this.exp >= this.maxExp && this.level < 10) {
      this.exp -= this.maxExp;
      this.level += 1;
      this.maxExp = Math.floor(this.maxExp * 1.8);
    }
  }

  // 年度或事件里程碑/成就检查
  checkMilestones(context) {
    const family = context.familyManager;
    if (!family) return;

    // 更新人口统计
    if (family.members.length > this.stats.totalPopulation) {
      this.stats.totalPopulation = family.members.length;
    }

    // 检查高阶人才
    let countJindanOrRank3 = 0;
    family.members.forEach((m) => {
      if (m.realmLevel > this.stats.maxRealmOrRank) {
        this.stats.maxRealmOrRank = m.realmLevel;
      }
      if (context.route === 'xianxia' && m.realmLevel >= 3) {
        countJindanOrRank3++;
      } else if (context.route === 'official' && m.realmLevel >= 7) {
        countJindanOrRank3++;
      }
    });
    this.stats.jindanOrRank3Count = Math.max(this.stats.jindanOrRank3Count, countJindanOrRank3);

    // 1. 检查里程碑 (Milestones)
    MILESTONES_CONFIG.forEach((ms) => {
      if (!this.unlockedMilestones.includes(ms.id) && ms.check(this.stats)) {
        this.unlockedMilestones.push(ms.id);
        this.addExp(ms.rewardExp);
        context.addLog(`★ 达成里程碑【${ms.title}】！${ms.unlockDesc}`);
      }
    });

    // 2. 检查长期成就 (Achievements)
    ACHIEVEMENTS_CONFIG.forEach((ach) => {
      if (!this.unlockedAchievements.includes(ach.id) && ach.getCur(this.stats) >= ach.target) {
        this.unlockedAchievements.push(ach.id);
        this.addExp(800);
        context.addLog(`🏆 达成终极成就【${ach.title}】！${ach.rewardText}`);
      }
    });
  }

  toJSON() {
    return {
      level: this.level,
      exp: this.exp,
      maxExp: this.maxExp,
      stats: this.stats,
      unlockedMilestones: this.unlockedMilestones,
      unlockedAchievements: this.unlockedAchievements
    };
  }

  fromJSON(data) {
    if (!data) return;
    this.level = data.level || 1;
    this.exp = data.exp || 0;
    this.maxExp = data.maxExp || 1000;
    if (data.stats) this.stats = data.stats;
    if (data.unlockedMilestones) this.unlockedMilestones = data.unlockedMilestones;
    if (data.unlockedAchievements) this.unlockedAchievements = data.unlockedAchievements;
  }
}
