/**
 * FamilyManager.js
 * 家族成员综合管理器：繁衍联姻、角色分配、寿命与升迁检查及跨代血脉传承核心机制
 */

import { Member } from './Member.js';
import { Adapter } from '../core/Adapter.js';

export class FamilyManager {
  constructor() {
    this.members = [];
  }

  // 创角初始化家族
  createInitialFamily(route = 'xianxia') {
    this.members = [];
    const master = new Member({
      name: route === 'xianxia' ? '萧天昊 (初代家主)' : '楚青云 (初代家督)',
      gender: 'M',
      role: 'master',
      age: 24,
      baseMaxAge: route === 'xianxia' ? 70 : 65,
      talent: 78,
      aptitude: 75,
      realmLevel: route === 'xianxia' ? 1 : 1
    });

    const spouse = new Member({
      name: route === 'xianxia' ? '慕容清璇' : '林婉秋',
      gender: 'F',
      role: 'spouse',
      age: 22,
      baseMaxAge: route === 'xianxia' ? 68 : 65,
      talent: 65,
      aptitude: 68,
      realmLevel: route === 'xianxia' ? 1 : 0
    });

    const child = new Member({
      name: route === 'xianxia' ? '萧凡 (长子)' : '楚明远 (长子)',
      gender: 'M',
      role: 'child',
      age: 1,
      baseMaxAge: 70,
      talent: Math.floor((master.talent + spouse.talent) / 2) + Math.floor(Math.random() * 10 - 5),
      aptitude: Math.floor((master.aptitude + spouse.aptitude) / 2) + Math.floor(Math.random() * 10 - 5),
      realmLevel: 0
    });

    const clanMember = new Member({
      name: route === 'xianxia' ? '萧长风 (二叔)' : '楚二叔',
      gender: 'M',
      role: 'clan',
      age: 38,
      baseMaxAge: 66,
      talent: 60,
      aptitude: 55,
      realmLevel: route === 'xianxia' ? 1 : 1
    });

    this.members.push(master, spouse, child, clanMember);
  }

  getMaster() {
    return this.members.find((m) => m.role === 'master');
  }

  getMembersByRole(role) {
    return this.members.filter((m) => m.role === role);
  }

  getIdleMembers() {
    return this.members.filter((m) => !m.assignedBuilding && m.role !== 'child' && m.age >= 16);
  }

  getWorkingMembers() {
    return this.members.filter((m) => !!m.assignedBuilding);
  }

  addMember(member) {
    if (member instanceof Member) {
      this.members.push(member);
    } else {
      this.members.push(new Member(member));
    }
  }

  removeMember(id) {
    this.members = this.members.filter((m) => m.id !== id);
  }

  // 安排族人去建筑工作/修炼
  assignMemberToBuilding(memberId, buildingId) {
    const m = this.members.find((item) => item.id === memberId);
    if (m) {
      if (m.age < 16) {
        Adapter.showToast('族人年幼（未满16岁），不宜派驻劳作！');
        return false;
      }
      m.assignedBuilding = buildingId || null;
      return true;
    }
    return false;
  }

  // 联姻娶妻/招赘
  marryNewSpouse(context) {
    const costRep = 20;
    const costMoney = context.route === 'xianxia' ? 150 : 200;
    const resName = context.route === 'xianxia' ? '灵石' : '银两';

    if (!context.hasResource('reputation', costRep) || !context.hasResource(context.route === 'xianxia' ? 'spiritStones' : 'silver', costMoney)) {
      Adapter.showToast(`联姻需要至少 ${costRep} 家族声望与 ${costMoney} ${resName}！`);
      return false;
    }

    context.consumeResource('reputation', costRep);
    context.consumeResource(context.route === 'xianxia' ? 'spiritStones' : 'silver', costMoney);

    const master = this.getMaster();
    const newSpouse = new Member({
      gender: master && master.gender === 'M' ? 'F' : 'M',
      role: 'spouse',
      age: Math.floor(18 + Math.random() * 8),
      talent: Math.floor(50 + Math.random() * 41),
      aptitude: Math.floor(50 + Math.random() * 41),
      realmLevel: 0
    });
    this.addMember(newSpouse);
    context.addLog(`结下良缘！新婚配偶【${newSpouse.name}】嫁入家族，天资聪颖！`);
    Adapter.showToast(`联姻成功：${newSpouse.name}`);
    return true;
  }

  // 诞生子嗣
  giveBirth(context) {
    const master = this.getMaster();
    const spouse = this.getMembersByRole('spouse')[0];
    if (!master || !spouse) return false;

    // 基础资质受双亲遗传加血脉加成
    const bloodlineBonus = context.bloodline ? context.bloodline.level * 3 : 0;
    const parentTalentAvg = (master.talent + spouse.talent) / 2;
    const parentAptitudeAvg = (master.aptitude + spouse.aptitude) / 2;

    const child = new Member({
      role: 'child',
      age: 1,
      talent: Math.min(100, Math.floor(parentTalentAvg + bloodlineBonus + Math.random() * 16 - 8)),
      aptitude: Math.min(100, Math.floor(parentAptitudeAvg + bloodlineBonus + Math.random() * 16 - 8)),
      realmLevel: 0
    });

    this.addMember(child);
    context.addLog(`喜添麟儿/千金！【${child.name}】诞生，天赋 ${child.talent}，资质 ${child.aptitude}！`);
    if (context.audioManager) context.audioManager.playSFX('event');
    return true;
  }

  // 年度演进：全员岁数增长、经验积累、检查坐化/寿终
  advanceYear(context) {
    let masterPassedAway = false;
    const deceasedIds = [];

    this.members.forEach((m) => {
      m.age += 1;

      // 成长经验加成：若被分配在“修炼室”或“演武场/书院”，获得大量额外经验
      let expGain = 80;
      if (m.assignedBuilding === 'cultivationRoom' || m.assignedBuilding === 'trainingGrounds') {
        expGain += 150;
      } else if (m.assignedBuilding === 'academy') {
        expGain += 120;
      }
      const prom = m.gainExp(expGain, context.route, context);
      if (prom.promoted) {
        context.addLog(`★ 突破飞跃！族人【${m.name}】成功晋升至 ${prom.newTitle}！`);
      }

      // 检查寿命是否终结
      if (!m.isAlive(context.route)) {
        deceasedIds.push(m.id);
        if (m.role === 'master') {
          masterPassedAway = true;
          context.addLog(`▲ 天命已至：家主【${m.name}】仙逝/寿终正寝，享年 ${m.age} 岁！急需从后辈挑选继承人！`);
        } else {
          context.addLog(`族人【${m.name}】寿终正寝辞世，享年 ${m.age} 岁。`);
        }
      }
    });

    // 移除已去世的非家主族人 (家主在挑选新家主后才处理或转为祖先)
    this.members = this.members.filter((m) => m.role === 'master' || !deceasedIds.includes(m.id));

    // 如果未婚未育，且有足够声望，随机触发新生或来投
    if (!masterPassedAway && Math.random() < 0.35 && this.members.length < 15) {
      if (this.getMembersByRole('spouse').length > 0 && Math.random() < 0.6) {
        this.giveBirth(context);
      } else {
        // 旁系亲族或门客投奔
        const visitor = new Member({
          role: 'clan',
          age: Math.floor(18 + Math.random() * 15),
          talent: Math.floor(40 + Math.random() * 45),
          aptitude: Math.floor(40 + Math.random() * 45)
        });
        this.addMember(visitor);
        context.addLog(`有贤士/远房亲族【${visitor.name}】慕名而来，投靠了家族！`);
      }
    }

    return { masterPassedAway };
  }

  // 挑选并执行传承
  selectHeir(heirId, context) {
    const oldMaster = this.getMaster();
    const heir = this.members.find((m) => m.id === heirId);

    if (!heir) {
      Adapter.showToast('无法找到选定的继承人');
      return false;
    }

    const bloodline = context.bloodline;
    const coeff = bloodline ? bloodline.getInheritanceCoeff(context.adBonuses.inheritedExtra) : 0.7;
    const repCoeff = bloodline ? bloodline.getReputationRetentionCoeff() : 0.7;

    // 新家主继承并强化属性
    heir.role = 'master';
    if (heir.age < 18) heir.age = 18; // 成年继任
    heir.talent = Math.min(100, Math.floor(heir.talent * coeff + (oldMaster ? oldMaster.talent * (1 - coeff) * 0.5 : 0)));
    heir.aptitude = Math.min(100, Math.floor(heir.aptitude * coeff + (oldMaster ? oldMaster.aptitude * (1 - coeff) * 0.5 : 0)));
    
    // 如果继承人在之前是子辈或旁系，名称去除旧标签
    heir.name = heir.name.replace(/ \(.*?\)/g, '') + ' (新一代家督)';

    // 将老家主从列表中清理
    if (oldMaster) {
      this.removeMember(oldMaster.id);
    }

    // 资产与声望继承与保留
    context.reputation = Math.floor(context.reputation * repCoeff);
    context.generation += 1;
    if (bloodline) {
      bloodline.stats.totalHeirsInherited += 1;
    }

    // 转移镇族法宝至宝
    if (context.artifactManager && oldMaster) {
      context.artifactManager.inheritToHeir(oldMaster.id, heir.id, context);
    }

    // 重置传承广告加成状态
    context.adBonuses.inheritedExtra = false;

    context.addLog(`★ 薪火传承！【${heir.name}】接任第 ${context.generation} 代家督，带领家族继续前行！`);
    if (context.audioManager) context.audioManager.playSFX('victory');
    return true;
  }

  toJSON() {
    return {
      members: this.members.map((m) => m.toJSON())
    };
  }

  fromJSON(data) {
    if (!data || !data.members) return;
    this.members = data.members.map((item) => new Member(item));
  }
}
