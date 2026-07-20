/**
 * EventDatabase.js
 * 30+ 种丰富的家族内部与外部突发大事件与历史变迁事件库
 */

export const EVENTS_DATABASE = [
  // 修仙路线专属事件
  {
    id: 'x_abandoned_infant',
    route: 'xianxia',
    title: '天降奇才弃婴',
    desc: '巡山族人在后山风雷洞中发现一名襁褓中的弃婴，浑身环绕五行灵光，疑似拥有传闻中的天品灵根！',
    options: [
      {
        label: '收养入族并悉心栽培 (耗资 150 灵石)',
        condition: (context) => context.hasResource('spiritStones', 150),
        effect: (context) => {
          context.consumeResource('spiritStones', 150);
          if (context.familyManager) {
            context.familyManager.addMember({
              name: '萧风雷 (奇才弃婴)',
              role: 'clan',
              age: 1,
              talent: 95,
              aptitude: 98,
              realmLevel: 0
            });
          }
          context.addLog('★ 收养天品灵根奇才【萧风雷】，家族未来必定大放异彩！');
          return '成功收养奇才！消耗 150 灵石，家族增添一位绝世天才子弟！';
        }
      },
      {
        label: '引荐送往上游修真宗门结善缘',
        condition: () => true,
        effect: (context) => {
          context.addResource('reputation', 80);
          context.addResource('elixirs', 2);
          context.addLog('将奇才引荐给天道宗，获赠良药与极高名誉！');
          return '上门长老欣喜万分，赐予家族 80 声望与 2 枚极品灵丹！';
        }
      }
    ]
  },
  {
    id: 'x_spirit_tide',
    route: 'xianxia',
    title: '天地灵气潮汐',
    desc: '每隔数十年一次的大型灵脉潮汐席卷全境，浓郁的灵气雾霭化雨落在了家族庄园之中。',
    options: [
      {
        label: '全员闭关打坐，汲取天道仙雨 (全体修为+300)',
        condition: () => true,
        effect: (context) => {
          if (context.familyManager) {
            context.familyManager.members.forEach((m) => m.gainExp(300, 'xianxia', context));
          }
          context.addLog('★ 全体族人吸纳灵气潮汐，修为突飞猛进！');
          return '全族沐浴仙雨，每个人获赠 300 点修为经验！';
        }
      },
      {
        label: '开启聚灵灵阵疯狂开采凝聚灵石',
        condition: () => true,
        effect: (context) => {
          context.addResource('spiritStones', 650);
          context.addLog('凝聚潮汐灵雨，产出 650 极品灵石！');
          return '成功凝聚潮汐精华，库房暴增 650 颗灵石！';
        }
      }
    ]
  },
  {
    id: 'x_beast_raid',
    route: 'xianxia',
    title: '妖王袭扰庄园',
    desc: '十万大山深处一头筑基巅峰的妖虎王带领群兽突袭我们灵脉庄园，意图抢夺丹药与灵草！',
    options: [
      {
        label: '率领全体修士出阵斩杀 (需主家主战力超100)',
        condition: (context) => {
          const m = context.familyManager ? context.familyManager.getMaster() : null;
          return m && m.getPower('xianxia') >= 100;
        },
        effect: (context) => {
          context.addResource('spiritStones', 450);
          context.addResource('manuals', 1);
          context.addLog('★ 家主率众一剑封喉斩杀妖虎王，剥取妖丹与秘籍！');
          return '大获全胜！获得 450 灵石与【妖虎护体诀】残卷！';
        }
      },
      {
        label: '开启护山大阵严守待援 (消耗 200 灵石)',
        condition: (context) => context.hasResource('spiritStones', 200),
        effect: (context) => {
          context.consumeResource('spiritStones', 200);
          context.addLog('消耗阵法灵石严密防守，群虎久攻不下自行退去。');
          return '护山大阵固若金汤，消耗 200 灵石保全了全族平安。';
        }
      }
    ]
  },
  {
    id: 'x_alchemist_visit',
    route: 'xianxia',
    title: '云游炼丹大师造访',
    desc: '一位身披道袍的五品云游炼丹大师路过家族，见我方丹房灵火旺盛，提出用丹药换取灵石补给。',
    options: [
      {
        label: '出资赞助大师炼丹 (花费 350 灵石换 3 丹药)',
        condition: (context) => context.hasResource('spiritStones', 350),
        effect: (context) => {
          context.consumeResource('spiritStones', 350);
          context.addResource('elixirs', 3);
          context.addLog('与云游炼丹大师相见恨晚，以 350 灵石易得 3 枚高阶仙丹。');
          return '顺利换得 3 枚珍贵灵丹！';
        }
      },
      {
        label: '虚心求教炼丹与养生真义',
        condition: () => true,
        effect: (context) => {
          const m = context.familyManager ? context.familyManager.getMaster() : null;
          if (m) m.gainExp(250, 'xianxia', context);
          context.addResource('reputation', 30);
          return '家主聆听大道真谛，修为经验大幅增长，家族名望提升。';
        }
      }
    ]
  },

  // 官职路线专属事件
  {
    id: 'o_imperial_exam',
    route: 'official',
    title: '三年一届三年大比/科举大典',
    desc: '朝廷开科取士，天下英才进京赶考，正是我族子弟考取功名、封官进爵的千载良机！',
    options: [
      {
        label: '资助家族顶尖才子赴京考取进士 (耗资 300 银两)',
        condition: (context) => context.hasResource('silver', 300),
        effect: (context) => {
          context.consumeResource('silver', 300);
          context.addResource('merit', 160);
          context.addResource('reputation', 60);
          context.addLog('★ 家族才子高中一甲探花！政绩+160，名动京华！');
          return '科举大捷！金榜题名，家族政绩激增 160，声望大振！';
        }
      },
      {
        label: '在地方开办文会招揽四方俊才',
        condition: () => true,
        effect: (context) => {
          context.addResource('connections', 1);
          context.addResource('reputation', 40);
          context.addLog('在郡县主办文人雅集，结交朝野权臣密客。');
          return '名声斐然，获赠【人脉令牌】×1 与名望 40 点！';
        }
      }
    ]
  },
  {
    id: 'o_flood_relief',
    route: 'official',
    title: '江南发水赈灾急令',
    desc: '连日暴雨导致黄河与淮河提坝决口，朝廷特颁十万火急命令，号召各地门阀急赈灾民。',
    options: [
      {
        label: '开仓放粮，大举捐银赈济天下 (耗资 500 银两)',
        condition: (context) => context.hasResource('silver', 500),
        effect: (context) => {
          context.consumeResource('silver', 500);
          context.addResource('merit', 250);
          context.addResource('reputation', 120);
          context.addLog('★ 大举捐银施粥赈灾，百姓立长生牌位，万民称颂！');
          return '善举感动朝野，天子下旨嘉奖，政绩+250，名声威震州县！';
        }
      },
      {
        label: '派遣族人带领壮丁抢修堤坝防险',
        condition: (context) => context.actionPoints >= 3,
        effect: (context) => {
          context.spendActionPoints(3);
          context.addResource('merit', 80);
          context.addLog('派遣劳工抢修灾区堤岸，保一方平安。');
          return '消耗 3 点行动力，抢修工程顺利完工，获得 80 政绩。';
        }
      }
    ]
  },
  {
    id: 'o_corrupt_official',
    route: 'official',
    title: '密折举报贪赃知府',
    desc: '邻县知府贪赃枉法、剥削民脂民膏，甚至将黑手伸向了我族开设的庄园商铺，掌握了其确凿罪证！',
    options: [
      {
        label: '向御史台联名呈递铁证密折直接弹劾',
        condition: () => true,
        effect: (context) => {
          context.addResource('merit', 150);
          context.addResource('reputation', 70);
          context.addLog('★ 御史大夫据实弹劾，贪官落马，我族扬眉吐气！');
          return '正义昭彰！贪官被查抄，朝廷封赏 150 政绩。';
        }
      },
      {
        label: '私下以罪证威逼知府妥协赔款偿失',
        condition: () => true,
        effect: (context) => {
          context.addResource('silver', 700);
          context.addLog('以把柄逼迫知府退还全部侵吞银两并重金赔礼。');
          return '收缴巨额赔礼与私款，家族入库 700 银两！';
        }
      }
    ]
  },
  {
    id: 'o_royal_favor',
    route: 'official',
    title: '钦差大臣亲临赐匾',
    desc: '钦差大臣代表当今圣上巡视州府，听闻我族治家严谨、功在社稷，特亲临府邸赐予皇家匾额！',
    options: [
      {
        label: '摆大宴款待钦差，奉上厚礼结好 (耗资 400 银两)',
        condition: (context) => context.hasResource('silver', 400),
        effect: (context) => {
          context.consumeResource('silver', 400);
          context.addResource('connections', 2);
          context.addResource('merit', 100);
          context.addLog('★ 钦差大臣大喜，回京在御前极力保举，人脉广开！');
          return '结下通天人脉！获得【人脉令牌】×2 与 100 政绩！';
        }
      },
      {
        label: '恭敬迎送，展示千秋祠堂家训风骨',
        condition: () => true,
        effect: (context) => {
          context.addResource('reputation', 100);
          context.addLog('不卑不亢，钦差感叹真乃国之栋梁也。');
          return '获赐皇家至高匾额，家族名望飙升 100！';
        }
      }
    ]
  },

  // 共通随机事件
  {
    id: 'c_merchant_caravan',
    route: 'both',
    title: '西域奇货大商队途经',
    desc: '来自天山与西域各地庞大的远行商队路过我们的家族领地，兜售异域奇珍异宝与古籍名贵。',
    options: [
      {
        label: '花费重金收购极品传家奇物 (耗费 450 资源换取属性提升)',
        condition: (context) => {
          const cur = context.route === 'xianxia' ? 'spiritStones' : 'silver';
          return context.hasResource(cur, 450);
        },
        effect: (context) => {
          const cur = context.route === 'xianxia' ? 'spiritStones' : 'silver';
          context.consumeResource(cur, 450);
          if (context.route === 'xianxia') {
            context.addResource('elixirs', 2);
            context.addResource('manuals', 1);
          } else {
            context.addResource('merit', 120);
            context.addResource('connections', 1);
          }
          return '贸易满载而归，获得极品珍品补给包！';
        }
      },
      {
        label: '提供领地商铺休整便利赚取过路租费',
        condition: () => true,
        effect: (context) => {
          if (context.route === 'xianxia') {
            context.addResource('spiritStones', 200);
          } else {
            context.addResource('silver', 300);
          }
          return '商队在庄园休整采购，为家族留下了一笔丰厚利润租金！';
        }
      }
    ]
  }
];
