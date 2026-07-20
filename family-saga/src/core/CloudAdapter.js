/**
 * CloudAdapter.js
 * 微信小游戏云开发 (WeChat CloudBase / wx.cloud) 混合架构封装层
 * 统括多端云存档同步、全服千秋世家榜与伪在线异步社交（跨服联姻/论道互赞/助战门客）
 */

import { Adapter } from './Adapter.js';

export const CloudAdapter = {
  isCloudReady: false,
  envId: 'family-saga-cloud-env', // 云开发环境 ID (需在微信开发者工具中配置)

  // 1. 初始化云开发环境
  init() {
    if (Adapter.isWeChat && typeof wx.cloud !== 'undefined') {
      try {
        wx.cloud.init({
          env: this.envId,
          traceUser: true
        });
        this.isCloudReady = true;
        console.log('[CloudAdapter] 微信云开发环境初始化成功');
      } catch (e) {
        console.log('[CloudAdapter] 云开发环境暂未开通或处于开发基础调试模式:', e);
        this.isCloudReady = false;
      }
    } else {
      console.log('[CloudAdapter] 处于 Web/Node 环境，启用云端异步交互模拟引擎');
      this.isCloudReady = false;
    }
  },

  // 2. 多端同步云存档 (Cloud Save Snapshot)
  async syncCloudSave(context) {
    if (!context) return false;
    const saveData = context.toJSON();
    const payload = {
      saveData,
      version: saveData.version || '1.0.0',
      timestamp: Date.now(),
      year: context.year,
      generation: context.generation,
      route: context.route
    };

    if (this.isCloudReady) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('user_saves').doc(this.getOpenId()).set({
          data: payload
        });
        console.log('[CloudAdapter] 云端存档同步成功:', res);
        return true;
      } catch (e) {
        console.error('[CloudAdapter] 云端存档同步失败，转为本地暂存队列:', e);
      }
    } else {
      // 模拟端本地暂存云端镜像
      Adapter.setStorage('sim_cloud_save_mirror', payload);
      return true;
    }
    return false;
  },

  async fetchCloudSave() {
    if (this.isCloudReady) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('user_saves').doc(this.getOpenId()).get();
        if (res && res.data) {
          return res.data;
        }
      } catch (e) {
        console.log('[CloudAdapter] 未找到云存档或网络异常:', e);
      }
    } else {
      return Adapter.getStorage('sim_cloud_save_mirror', null);
    }
    return null;
  },

  // 3. 上报与获取全服排行榜 (Global Leaderboards)
  async updateLeaderboardScore(context) {
    if (!context) return;
    const bl = context.bloodline;
    const scoreData = {
      name: context.familyManager && context.familyManager.getMaster() ? context.familyManager.getMaster().name : '神秘世家',
      route: context.route === 'xianxia' ? '修仙世家' : '官宦世家',
      generation: context.generation,
      bloodlineLevel: bl ? bl.level : 1,
      totalPopulation: context.familyManager ? context.familyManager.members.length : 0,
      reputation: context.reputation,
      updatedAt: Date.now()
    };

    if (this.isCloudReady) {
      try {
        // 调用云函数自动对比更新最高荣誉记录
        await wx.cloud.callFunction({
          name: 'updateLeaderboard',
          data: scoreData
        });
      } catch (e) {}
    } else {
      // 本地模拟排行榜数据库更新
      const list = Adapter.getStorage('sim_cloud_leaderboard', this.getMockLeaderboard());
      list.unshift({ ...scoreData, id: `u_${Date.now()}` });
      list.sort((a, b) => b.generation - a.generation || b.bloodlineLevel - a.bloodlineLevel);
      Adapter.setStorage('sim_cloud_leaderboard', list.slice(0, 50));
    }
  },

  async fetchGlobalLeaderboard(route = 'all') {
    if (this.isCloudReady) {
      try {
        const db = wx.cloud.database();
        let query = db.collection('global_leaderboard');
        if (route !== 'all') {
          query = query.where({ route: route === 'xianxia' ? '修仙世家' : '官宦世家' });
        }
        const res = await query.orderBy('generation', 'desc').orderBy('bloodlineLevel', 'desc').limit(30).get();
        return res && res.data ? res.data : [];
      } catch (e) {
        return this.getMockLeaderboard();
      }
    } else {
      return Adapter.getStorage('sim_cloud_leaderboard', this.getMockLeaderboard());
    }
  },

  // 4. 伪在线跨服联姻 (Cross-Server Marriage Pool)
  // 获取真实玩家上传的高天资单身族人作为提亲候选人
  async fetchCrossServerHeirs(route = 'xianxia') {
    if (this.isCloudReady) {
      try {
        const db = wx.cloud.database();
        const res = await db.collection('public_heirs')
          .where({ route, isMarried: false })
          .aggregate()
          .sample({ size: 4 })
          .end();
        return res && res.list ? res.list : this.getMockHeirs(route);
      } catch (e) {
        return this.getMockHeirs(route);
      }
    } else {
      return this.getMockHeirs(route);
    }
  },

  // 玩家向跨服对象提亲并发送彩礼通知
  async sendMarriageProposal(heirObj, context) {
    const cost = context.route === 'xianxia' ? 250 : 350;
    const cur = context.route === 'xianxia' ? 'spiritStones' : 'silver';
    if (!context.consumeResource(cur, cost)) {
      return { success: false, msg: `跨服提亲彩礼不足，需 ${cost} ${context.route === 'xianxia' ? '灵石' : '银两'}！` };
    }

    if (this.isCloudReady) {
      try {
        await wx.cloud.callFunction({
          name: 'crossServerMarriage',
          data: {
            targetHeirId: heirObj.id,
            ownerOpenId: heirObj.ownerId,
            proposalFamilyName: context.familyManager.getMaster().name,
            giftAmount: cost
          }
        });
      } catch (e) {}
    }

    // 将跨服候选人直接转入本族配偶
    if (context.familyManager) {
      context.familyManager.addMember({
        name: `${heirObj.name} (跨服名门)`,
        gender: heirObj.gender || 'F',
        role: 'spouse',
        age: heirObj.age || 20,
        talent: heirObj.talent || 88,
        aptitude: heirObj.aptitude || 86,
        realmLevel: heirObj.realmLevel || 1
      });
    }

    return { success: true, msg: `★ 跨服联姻成功！已将厚礼送达对方玩家【${heirObj.ownerName || '隐世家族'}】，【${heirObj.name}】喜结连理嫁入家族！` };
  },

  // 5. 拜会与游历天下世家 (Visit & Like Territory)
  async visitAndLikeFamily(targetFamily, context) {
    if (!context.spendActionPoints(1)) {
      return { success: false, msg: '行动点不足 1 点，无法游历拜会！' };
    }

    context.addResource('reputation', 25);

    if (this.isCloudReady && targetFamily && targetFamily.ownerId) {
      try {
        await wx.cloud.callFunction({
          name: 'sendLikeNotification',
          data: {
            targetOpenId: targetFamily.ownerId,
            fromFamilyName: context.familyManager.getMaster().name,
            repGift: 20
          }
        });
      } catch (e) {}
    }

    return { success: true, msg: `★ 拜会了【${targetFamily.familyName || '隐世大家'}】的千秋祠堂！论道甚欢，双方声望同时 +25！` };
  },

  getOpenId() {
    return Adapter.getStorage('user_cloud_openid', `op_${Date.now()}_${Math.floor(Math.random() * 1000)}`);
  },

  getMockLeaderboard() {
    return [
      { id: '1', name: '萧破天 (凌云仙门)', route: '修仙世家', generation: 28, bloodlineLevel: 10, totalPopulation: 38, reputation: 6800 },
      { id: '2', name: '楚明远 (辅政王府)', route: '官宦世家', generation: 25, bloodlineLevel: 9, totalPopulation: 40, reputation: 5900 },
      { id: '3', name: '叶轻舞 (青莲天宗)', route: '修仙世家', generation: 19, bloodlineLevel: 8, totalPopulation: 32, reputation: 4500 },
      { id: '4', name: '林青云 (一品太师府)', route: '官宦世家', generation: 16, bloodlineLevel: 7, totalPopulation: 28, reputation: 3800 },
      { id: '5', name: '慕容凡 (玄天剑宗)', route: '修仙世家', generation: 12, bloodlineLevel: 6, totalPopulation: 24, reputation: 2900 }
    ];
  },

  getMockHeirs(route) {
    return [
      { id: 'h1', ownerId: 'op_user_a', ownerName: '凌云仙门·萧氏', name: '萧灵素', gender: 'F', age: 19, talent: 94, aptitude: 96, realmLevel: 2 },
      { id: 'h2', ownerId: 'op_user_b', ownerName: '太师府·楚氏', name: '楚行止', gender: 'M', age: 21, talent: 91, aptitude: 90, realmLevel: 3 },
      { id: 'h3', ownerId: 'op_user_c', ownerName: '青莲宗·叶氏', name: '叶倾城', gender: 'F', age: 20, talent: 89, aptitude: 92, realmLevel: 2 },
      { id: 'h4', ownerId: 'op_user_d', ownerName: '按察使·林氏', name: '林千帆', gender: 'M', age: 22, talent: 87, aptitude: 88, realmLevel: 4 }
    ];
  }
};
