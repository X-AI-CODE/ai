/**
 * Member.js
 * 家族成员角色模型：家主与一众族人的属性、修炼境界与官场品阶及派驻加速计算。
 */

export const XIANXIA_REALMS = [
  { level: 0, name: '凡人', maxExp: 100, bonusStamina: 0, bonusLife: 0, power: 10 },
  { level: 1, name: '练气期', maxExp: 300, bonusStamina: 20, bonusLife: 15, power: 35 },
  { level: 2, name: '筑基期', maxExp: 800, bonusStamina: 50, bonusLife: 40, power: 100 },
  { level: 3, name: '金丹真人', maxExp: 2000, bonusStamina: 100, bonusLife: 100, power: 300 },
  { level: 4, name: '元婴老祖', maxExp: 5000, bonusStamina: 200, bonusLife: 300, power: 900 },
  { level: 5, name: '化神天尊', maxExp: 12000, bonusStamina: 400, bonusLife: 600, power: 2500 },
  { level: 6, name: '炼虚道君', maxExp: 30000, bonusStamina: 800, bonusLife: 1200, power: 7000 },
  { level: 7, name: '渡劫大能', maxExp: 80000, bonusStamina: 1500, bonusLife: 2500, power: 20000 },
  { level: 8, name: '飞升仙尊', maxExp: 999999, bonusStamina: 3000, bonusLife: 5000, power: 60000 }
];

export const OFFICIAL_RANKS = [
  { level: 0, name: '秀才白丁', maxExp: 100, bonusStamina: 0, bonusLife: 0, power: 10, salary: 50 },
  { level: 1, name: '九品主簿', maxExp: 300, bonusStamina: 10, bonusLife: 0, power: 30, salary: 150 },
  { level: 2, name: '八品县丞', maxExp: 700, bonusStamina: 20, bonusLife: 0, power: 70, salary: 350 },
  { level: 3, name: '七品知县', maxExp: 1500, bonusStamina: 30, bonusLife: 5, power: 160, salary: 800 },
  { level: 4, name: '六品同知', maxExp: 3200, bonusStamina: 45, bonusLife: 5, power: 350, salary: 1800 },
  { level: 5, name: '五品知府', maxExp: 7000, bonusStamina: 60, bonusLife: 10, power: 750, salary: 4000 },
  { level: 6, name: '四品按察使', maxExp: 15000, bonusStamina: 80, bonusLife: 10, power: 1600, salary: 9000 },
  { level: 7, name: '三品布政使', maxExp: 32000, bonusStamina: 100, bonusLife: 15, power: 3500, salary: 20000 },
  { level: 8, name: '二品总督/尚书', maxExp: 70000, bonusStamina: 130, bonusLife: 20, power: 8000, salary: 45000 },
  { level: 9, name: '一品内阁大学士', maxExp: 150000, bonusStamina: 160, bonusLife: 25, power: 18000, salary: 100000 },
  { level: 10, name: '辅政太师/异姓王', maxExp: 999999, bonusStamina: 200, bonusLife: 30, power: 50000, salary: 250000 }
];

export class Member {
  constructor(data = {}) {
    this.id = data.id || `m_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    this.name = data.name || this.generateRandomName(data.gender);
    this.gender = data.gender || (Math.random() > 0.5 ? 'M' : 'F');
    this.role = data.role || 'clan'; // 'master' (家主), 'spouse' (配偶), 'child' (子女/候选人), 'clan' (普通旁系)
    this.age = data.age !== undefined ? data.age : 18;
    
    // 初始寿命 60-80岁
    this.baseMaxAge = data.baseMaxAge !== undefined ? data.baseMaxAge : Math.floor(60 + Math.random() * 21);
    this.extraLife = data.extraLife || 0; // 丹药延寿或广告延寿

    // 资质与天赋
    this.talent = data.talent !== undefined ? data.talent : Math.floor(30 + Math.random() * 61); // 0-100 天赋 (修炼速度/政务效率)
    this.aptitude = data.aptitude !== undefined ? data.aptitude : Math.floor(20 + Math.random() * 71); // 0-100 资质 (灵根/才学)

    // 境界与经验
    this.realmLevel = data.realmLevel || 0; // 对应 XIANXIA_REALMS 或 OFFICIAL_RANKS 下标
    this.exp = data.exp || 0;

    // 分配的建筑岗位
    this.assignedBuilding = data.assignedBuilding || null; // 建筑 ID，如 'spiritVein', 'alchemyLab', etc.
  }

  generateRandomName(gender = 'M') {
    const surnames = ['萧', '林', '楚', '叶', '顾', '陆', '风', '沈', '慕容', '云', '方', '李', '苏'];
    const maleNames = ['天昊', '凡', '晨', '长风', '绝', '破天', '傲君', '洛', '明远', '行止', '千帆', '云起', '子衡'];
    const femaleNames = ['清璇', '若水', '语嫣', '芷溪', '轻舞', '灵素', '倾城', '静宜', '玉莹', '妙音', '婉秋', '雨霏'];
    const s = surnames[Math.floor(Math.random() * surnames.length)];
    const n = gender === 'M' ? maleNames[Math.floor(Math.random() * maleNames.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
    return s + n;
  }

  // 获取当前最大允许寿命
  getMaxAge(route = 'xianxia') {
    if (route === 'xianxia') {
      const realmInfo = XIANXIA_REALMS[Math.min(this.realmLevel, XIANXIA_REALMS.length - 1)];
      return this.baseMaxAge + realmInfo.bonusLife + this.extraLife;
    } else {
      const rankInfo = OFFICIAL_RANKS[Math.min(this.realmLevel, OFFICIAL_RANKS.length - 1)];
      return this.baseMaxAge + rankInfo.bonusLife + this.extraLife;
    }
  }

  // 检查是否在世
  isAlive(route = 'xianxia') {
    return this.age < this.getMaxAge(route);
  }

  // 获取头衔名称
  getTitle(route = 'xianxia') {
    if (route === 'xianxia') {
      return XIANXIA_REALMS[Math.min(this.realmLevel, XIANXIA_REALMS.length - 1)].name;
    } else {
      return OFFICIAL_RANKS[Math.min(this.realmLevel, OFFICIAL_RANKS.length - 1)].name;
    }
  }

  // 获取当前角色总战力
  getPower(route = 'xianxia') {
    const basePower = route === 'xianxia'
      ? XIANXIA_REALMS[Math.min(this.realmLevel, XIANXIA_REALMS.length - 1)].power
      : OFFICIAL_RANKS[Math.min(this.realmLevel, OFFICIAL_RANKS.length - 1)].power;
    // 资质与天赋加成
    const talentBonus = 1 + (this.talent + this.aptitude) / 100;
    return Math.floor(basePower * talentBonus);
  }

  // 获取产出加速倍率 (派驻建筑时对建筑基础效率的加成)
  getProductionBonus() {
    // 例如资质100、天赋100的族人可贡献 +100% (2.0x) 的产出加成
    return Number(((this.talent * 0.6 + this.aptitude * 0.4) / 100).toFixed(2));
  }

  // 获取每年修炼/学习获得的经验成长
  gainExp(baseGain = 100, route = 'xianxia', context = null) {
    // 效率受天赋影响
    const eff = 1 + (this.talent / 100);
    const gained = Math.floor(baseGain * eff);
    this.exp += gained;

    const list = route === 'xianxia' ? XIANXIA_REALMS : OFFICIAL_RANKS;
    const currentInfo = list[Math.min(this.realmLevel, list.length - 1)];
    
    // 如果达到了升级所需经验，且未满级
    if (this.exp >= currentInfo.maxExp && this.realmLevel < list.length - 1) {
      this.realmLevel += 1;
      this.exp = 0;
      return { promoted: true, newTitle: this.getTitle(route) };
    }
    return { promoted: false };
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      gender: this.gender,
      role: this.role,
      age: this.age,
      baseMaxAge: this.baseMaxAge,
      extraLife: this.extraLife,
      talent: this.talent,
      aptitude: this.aptitude,
      realmLevel: this.realmLevel,
      exp: this.exp,
      assignedBuilding: this.assignedBuilding
    };
  }
}
