/**
 * DungeonConfig.js
 * 修仙境界副本与官职战棋地图分层关卡及掉落配置
 */

export const DUNGEONS_CONFIG = {
  xianxia: [
    {
      id: 'x_dungeon_1',
      name: '妖兽山脉·外围',
      desc: '低阶妖狼与幽暗毒蛇出没之地，适合练气期与凡人世家弟子初试牛刀。',
      recLevel: '练气期 (战力 35+)',
      staminaCost: 20,
      bloodlineReq: 1,
      enemyName: '狂暴巨狼王群',
      enemyPower: 45,
      enemyHP: 120,
      rewards: {
        spiritStones: { min: 80, max: 150 },
        elixirs: { min: 0, max: 1, chance: 0.5 },
        manuals: { min: 0, max: 1, chance: 0.2 }
      }
    },
    {
      id: 'x_dungeon_2',
      name: '筑基秘境·血色沼泽',
      desc: '长年生长着赤血灵草的神秘沼泽，常有邪修与筑基妖蟒设伏。',
      recLevel: '筑基期 (战力 100+)',
      staminaCost: 30,
      bloodlineReq: 2,
      enemyName: '九头血妖蟒与邪修门徒',
      enemyPower: 140,
      enemyHP: 350,
      rewards: {
        spiritStones: { min: 250, max: 450 },
        elixirs: { min: 1, max: 2, chance: 0.8 },
        manuals: { min: 0, max: 1, chance: 0.4 }
      }
    },
    {
      id: 'x_dungeon_3',
      name: '金丹天幕·上古遗迹',
      desc: '悬浮在云端之上的万年修真宗门废墟，蕴藏天道真意与护宗石人。',
      recLevel: '金丹真人 (战力 300+)',
      staminaCost: 40,
      bloodlineReq: 3,
      enemyName: '上古护宗傀儡剑神',
      enemyPower: 420,
      enemyHP: 950,
      rewards: {
        spiritStones: { min: 700, max: 1200 },
        elixirs: { min: 2, max: 4, chance: 1.0 },
        manuals: { min: 1, max: 2, chance: 0.7 }
      }
    },
    {
      id: 'x_dungeon_4',
      name: '元婴雷云·天魔地穴',
      desc: '撕裂空间裂缝产生的深渊深处，九幽域外天魔伺机欲动。',
      recLevel: '元婴老祖 (战力 900+)',
      staminaCost: 50,
      bloodlineReq: 5,
      enemyName: '九幽天魔统领与煞尸群',
      enemyPower: 1250,
      enemyHP: 2800,
      rewards: {
        spiritStones: { min: 2000, max: 3500 },
        elixirs: { min: 3, max: 6, chance: 1.0 },
        manuals: { min: 1, max: 3, chance: 0.9 }
      }
    },
    {
      id: 'x_dungeon_5',
      name: '化神虚空·太古仙冢',
      desc: '仙人陨落残留的混沌领域，通过考验者即可获得通天飞升至宝！',
      recLevel: '化神天尊及以上 (战力 2500+)',
      staminaCost: 60,
      bloodlineReq: 7,
      enemyName: '混沌古龙残魂与天劫化身',
      enemyPower: 3600,
      enemyHP: 8000,
      rewards: {
        spiritStones: { min: 6000, max: 10000 },
        elixirs: { min: 5, max: 10, chance: 1.0 },
        manuals: { min: 2, max: 5, chance: 1.0 }
      }
    }
  ],

  official: [
    {
      id: 'o_dungeon_1',
      name: '黑风山·剿匪清乡',
      desc: '山贼寇乱袭扰商路与良田，率领县令护勇前去平定以安民心。',
      recLevel: '九/八品官衔 (兵力/战力 30+)',
      staminaCost: 20,
      bloodlineReq: 1,
      enemyName: '黑风寨大当家及贼寇众',
      enemyPower: 40,
      enemyHP: 110,
      rewards: {
        silver: { min: 100, max: 200 },
        merit: { min: 30, max: 60 },
        connections: { min: 0, max: 1, chance: 0.3 }
      }
    },
    {
      id: 'o_dungeon_2',
      name: '江南水镇·平叛肃贪',
      desc: '地方豪强勾结贪官盐商造反，统领州府官兵清剿匪帮整顿盐政。',
      recLevel: '七/六品官衔 (兵力/战力 160+)',
      staminaCost: 30,
      bloodlineReq: 2,
      enemyName: '江南水贼统领与叛变的州勇',
      enemyPower: 180,
      enemyHP: 400,
      rewards: {
        silver: { min: 350, max: 600 },
        merit: { min: 80, max: 150 },
        connections: { min: 0, max: 1, chance: 0.6 }
      }
    },
    {
      id: 'o_dungeon_3',
      name: '边疆烽火·御敌北疆',
      desc: '北方蛮族铁骑侵扰边关要塞，提督精锐边军列阵迎敌守土保国！',
      recLevel: '五/四品重臣 (兵力/战力 750+)',
      staminaCost: 40,
      bloodlineReq: 3,
      enemyName: '狼夷铁骑大督军军团',
      enemyPower: 820,
      enemyHP: 1800,
      rewards: {
        silver: { min: 1200, max: 2000 },
        merit: { min: 200, max: 400 },
        connections: { min: 1, max: 2, chance: 0.8 }
      }
    },
    {
      id: 'o_dungeon_4',
      name: '京畿平乱·勤王讨逆',
      desc: '权臣图谋不轨发动兵变包围皇城，统率天下勤王大军直捣贼巢！',
      recLevel: '三/二品封疆大吏 (兵力/战力 3500+)',
      staminaCost: 50,
      bloodlineReq: 5,
      enemyName: '叛军节度使大军与御林军逆党',
      enemyPower: 3800,
      enemyHP: 7500,
      rewards: {
        silver: { min: 3500, max: 6000 },
        merit: { min: 600, max: 1200 },
        connections: { min: 2, max: 3, chance: 1.0 }
      }
    },
    {
      id: 'o_dungeon_5',
      name: '定鼎山河·封王之战',
      desc: '统一天下扫平外敌与异己最终决战，获胜即封拜异姓王，权倾千秋！',
      recLevel: '一品/辅政太师 (兵力/战力 18000+)',
      staminaCost: 60,
      bloodlineReq: 7,
      enemyName: '天命大反王与百万人马联合阵线',
      enemyPower: 22000,
      enemyHP: 45000,
      rewards: {
        silver: { min: 10000, max: 18000 },
        merit: { min: 2000, max: 4000 },
        connections: { min: 3, max: 6, chance: 1.0 }
      }
    }
  ]
};
