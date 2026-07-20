/**
 * TournamentEngine.js
 * 十年一届的修真万仙大会与朝堂六部大比/殿试争霸赛季引擎
 */

import { Adapter } from '../core/Adapter.js';

export const TOURNAMENTS_CONFIG = {
  xianxia: {
    title: '九天十地·万仙大会赛争霸',
    desc: '每十年一届的修真界巅峰盛会，各大修仙名门世家遣出精锐弟子同台竞技！',
    reqPower: 120,
    rounds: [
      { name: '初赛小组淘汰战', enemyName: '青冥剑派精英选送', enemyPower: 150, rewardStones: 500, rewardExp: 300 },
      { name: '半决赛四强对决', enemyName: '合欢谷双绝真传', enemyPower: 450, rewardStones: 1200, rewardExp: 800 },
      { name: '巅峰总决赛王座战', enemyName: '九霄天道宗首席圣子', enemyPower: 1100, rewardStones: 3000, rewardExp: 2000, rewardArtifact: 'x_relic_sword' }
    ]
  },
  official: {
    title: '三年殿试大比与六部论政大争',
    desc: '御前殿试大比，天下重臣与世家子弟齐聚太和殿辩驳施政，争夺首辅大位！',
    reqPower: 120,
    rounds: [
      { name: '郡县举荐海选辩论', enemyName: '江南盐商门阀才子', enemyPower: 140, rewardSilver: 600, rewardMerit: 100 },
      { name: '礼部尚书亲测复试', enemyName: '京畿权臣世家保举', enemyPower: 420, rewardSilver: 1400, rewardMerit: 250 },
      { name: '金殿钦点探花状元争霸', enemyName: '辅政国舅首席嫡长孙', enemyPower: 1050, rewardSilver: 3500, rewardMerit: 600, rewardArtifact: 'o_relic_sword' }
    ]
  }
};

export class TournamentEngine {
  constructor() {
    this.currentTournament = null;
  }

  // 年度检查是否达到十年大比周期
  checkTournamentYear(context) {
    if (!context || context.year < 5) return null;
    if (context.year % 10 === 0) {
      const route = context.route;
      this.currentTournament = {
        config: TOURNAMENTS_CONFIG[route] || TOURNAMENTS_CONFIG.xianxia,
        currentRound: 0,
        participants: [],
        completed: false
      };
      if (context.uiManager) {
        context.uiManager.openModal('TournamentUI', this.currentTournament);
      }
      return this.currentTournament;
    }
    return null;
  }

  // 展开比武 / 殿试下一轮
  runNextRound(context) {
    if (!this.currentTournament || this.currentTournament.completed) {
      return { success: false, msg: '大比赛事已结束' };
    }

    const t = this.currentTournament;
    const round = t.config.rounds[t.currentRound];
    if (!round) return { success: false, msg: '无更多赛程' };

    // 计算玩家派送出赛代表的总综合战力
    let playerPower = 0;
    const family = context.familyManager;
    if (family) {
      // 若玩家没有选送代表，默认以家主领衔
      const master = family.getMaster();
      playerPower += master ? master.getPower(context.route) : 80;

      // 加上装备法宝灵兽带来的额外战力
      if (context.artifactManager && master) {
        const arts = context.artifactManager.getEquippedBy(master.id);
        arts.forEach((a) => {
          playerPower = Math.floor(playerPower * (1 + a.getPowerMultiplier()));
        });
      }
    }

    // 比抗战力计算
    const crit = Math.random() < 0.25 ? 1.35 : 1.0;
    const finalPlayerScore = Math.floor(playerPower * crit * (0.9 + Math.random() * 0.2));
    const finalEnemyScore = Math.floor(round.enemyPower * (0.9 + Math.random() * 0.2));

    if (finalPlayerScore >= finalEnemyScore) {
      // 获胜晋级
      t.currentRound += 1;
      let rewardText = '';
      if (round.rewardStones) {
        context.addResource('spiritStones', round.rewardStones);
        rewardText += `灵石+${round.rewardStones} `;
      }
      if (round.rewardSilver) {
        context.addResource('silver', round.rewardSilver);
        rewardText += `银两+${round.rewardSilver} `;
      }
      if (round.rewardMerit) {
        context.addResource('merit', round.rewardMerit);
        rewardText += `政绩+${round.rewardMerit} `;
      }
      if (round.rewardArtifact && context.artifactManager) {
        context.artifactManager.addArtifact({ key: round.rewardArtifact, level: 1 });
        rewardText += `★ 获赐神兵至宝：【${round.rewardArtifact}】 `;
      }

      if (context.bloodline && round.rewardExp) {
        context.bloodline.addExp(round.rewardExp);
        rewardText += `血脉经验+${round.rewardExp} `;
      }

      context.addLog(`🏆 巅峰狂胜！成功在【${round.name}】中力压群雄！获得：${rewardText}`);

      if (t.currentRound >= t.config.rounds.length) {
        t.completed = true;
        context.addLog(`★ 荣耀登顶！本族子弟横扫天下，夺得【${t.config.title}】总冠军！名垂千古！`);
        if (context.audioManager) context.audioManager.playSFX('victory');
      } else {
        if (context.audioManager) context.audioManager.playSFX('levelUp');
      }

      return {
        success: true,
        victory: true,
        roundName: round.name,
        playerScore: finalPlayerScore,
        enemyScore: finalEnemyScore,
        rewardText,
        completed: t.completed
      };
    } else {
      // 惜败止步
      t.completed = true;
      context.addLog(`💔 惜败止步于【${round.name}】...我方选手尽力奋战 (战绩 ${finalPlayerScore} vs 对方 ${finalEnemyScore})。十年后再战！`);
      return {
        success: true,
        victory: false,
        roundName: round.name,
        playerScore: finalPlayerScore,
        enemyScore: finalEnemyScore,
        completed: true
      };
    }
  }
}
