/**
 * AdManager.js
 * 微信小游戏商业化 7大激励视频全点位管理与模拟调试引擎
 */

import { Adapter } from '../core/Adapter.js';

export class AdManager {
  constructor() {
    this.adUnitId = 'adunit-simulated-family-saga';
    this.rewardedAd = null;
    this.initDailyCounters();
  }

  initDailyCounters() {
    this.counters = Adapter.getStorage('family_saga_ad_counters', {
      date: new Date().toDateString(),
      actionRecovery: 0,
      staminaRecovery: 0,
      memberBoost: 0,
      checkinDouble: 0
    });

    if (this.counters.date !== new Date().toDateString()) {
      this.counters = {
        date: new Date().toDateString(),
        actionRecovery: 0,
        staminaRecovery: 0,
        memberBoost: 0,
        checkinDouble: 0
      };
      this.saveCounters();
    }
  }

  saveCounters() {
    Adapter.setStorage('family_saga_ad_counters', this.counters);
  }

  // 广告点位定义表与配额检查
  checkAdQuota(pointKey) {
    this.initDailyCounters();
    if (pointKey === 'actionRecovery' && this.counters.actionRecovery >= 3) {
      return { allowed: false, reason: '今日行动点恢复广告已达上限 (3次/日)' };
    }
    if (pointKey === 'staminaRecovery' && this.counters.staminaRecovery >= 3) {
      return { allowed: false, reason: '今日体力恢复广告已达上限 (3次/日)' };
    }
    if (pointKey === 'memberBoost' && this.counters.memberBoost >= 5) {
      return { allowed: false, reason: '今日族人加速广告已达上限 (5次/日)' };
    }
    if (pointKey === 'checkinDouble' && this.counters.checkinDouble >= 1) {
      return { allowed: false, reason: '今日签到双倍广告已达上限 (1次/日)' };
    }
    return { allowed: true };
  }

  // 拉起或模拟展示激励视频广告
  showRewardedAd(pointKey, { onSuccess, onFail, context }) {
    const quota = this.checkAdQuota(pointKey);
    if (!quota.allowed) {
      Adapter.showToast(quota.reason);
      if (onFail) onFail(quota.reason);
      return;
    }

    // 尝试真实微信激励视频拉起
    if (Adapter.isWeChat && typeof wx.createRewardedVideoAd === 'function') {
      try {
        if (!this.rewardedAd) {
          this.rewardedAd = wx.createRewardedVideoAd({ adUnitId: this.adUnitId });
        }
        
        const onCloseHandler = (res) => {
          if (this.rewardedAd) this.rewardedAd.offClose(onCloseHandler);
          if (res && res.isEnded || res === undefined) {
            this.handleAdReward(pointKey, context);
            if (onSuccess) onSuccess();
          } else {
            Adapter.showToast('未能完整观看视频，未获得奖励');
            if (onFail) onFail('取消观看');
          }
        };

        const onErrorHandler = (err) => {
          if (this.rewardedAd) this.rewardedAd.offError(onErrorHandler);
          console.log('[Ad] 真实广告单元不可用或未配置，自动进入开发兼容模拟流程：', err);
          this.simulateAdShow(pointKey, context, onSuccess);
        };

        this.rewardedAd.onClose(onCloseHandler);
        this.rewardedAd.onError(onErrorHandler);

        this.rewardedAd.show().catch(() => {
          this.rewardedAd.load().then(() => this.rewardedAd.show()).catch((err) => {
            onErrorHandler(err);
          });
        });
        return;
      } catch (e) {
        console.log('[Ad] createRewardedVideoAd catch:', e);
      }
    }

    // 在普通开发环境 / 测试环境进行 1~2秒模拟弹窗或立刻成功回调
    this.simulateAdShow(pointKey, context, onSuccess);
  }

  simulateAdShow(pointKey, context, onSuccess) {
    if (context && context.uiManager) {
      // 通过 UI 弹出一个简易广告模拟倒计时窗口
      context.uiManager.openModal('AdSimModal', {
        pointKey,
        onComplete: () => {
          this.handleAdReward(pointKey, context);
          if (onSuccess) onSuccess();
        }
      });
    } else {
      // 命令行/Node测试端直接发放
      this.handleAdReward(pointKey, context);
      if (onSuccess) onSuccess();
    }
  }

  // 发放 7大商业化点位专属福利奖励
  handleAdReward(pointKey, context) {
    this.initDailyCounters();

    if (pointKey === 'actionRecovery') {
      this.counters.actionRecovery += 1;
      this.saveCounters();
      const recover = Math.floor(context.maxActionPoints * 0.5);
      context.recoverActionPoints(context.actionPoints + recover - context.maxActionPoints > 0 ? null : recover);
      Adapter.showToast(`★ 广告福利：成功恢复 ${recover} 点行动点！`);
    } else if (pointKey === 'staminaRecovery') {
      this.counters.staminaRecovery += 1;
      this.saveCounters();
      context.recoverStamina(null);
      Adapter.showToast('★ 广告福利：战斗体力已全部回满 (100/100)！');
    } else if (pointKey === 'doubleDrop') {
      // 双倍掉落由战斗结算页触发，此时只需记录或返回状态
      Adapter.showToast('★ 广告福利：秘境战利品与资源已成功翻倍发放！');
    } else if (pointKey === 'memberBoost') {
      this.counters.memberBoost += 1;
      this.saveCounters();
      context.adBonuses.productionMultiplier = 2;
      context.adBonuses.productionTurnLeft = 2;
      Adapter.showToast('★ 广告福利：全庄园族人产出效率 ×2！持续 2 年！');
    } else if (pointKey === 'heirBonus') {
      context.adBonuses.inheritedExtra = true;
      Adapter.showToast('★ 广告福利：已激活传承加成，下一代家主继承天赋比例将额外 +15%！');
    } else if (pointKey === 'lifeExtension') {
      const family = context ? context.familyManager : null;
      const master = family ? family.getMaster() : null;
      if (master) {
        master.extraLife += 5;
        Adapter.showToast(`★ 广告福利：为家督延命！家主【${master.name}】成功延寿 5 年！`);
      }
    } else if (pointKey === 'checkinDouble') {
      this.counters.checkinDouble += 1;
      this.saveCounters();
      Adapter.showToast('★ 广告福利：每日签到奖励已双倍入库！');
    }

    if (context && context.audioManager) {
      context.audioManager.playSFX('levelUp');
    }
    if (context && context.bloodline) {
      context.bloodline.trackAdWatched();
      context.bloodline.checkMilestones(context);
    }
  }
}
