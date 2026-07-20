/**
 * tests/run-tests.js
 * 自动化综合单元/集成回归测试套件
 * 验证家族修仙/官路双路线核心数据流、产出计算、战斗与高阶血脉传承机制
 */

import assert from 'assert';
import { GameContext } from '../src/core/GameContext.js';
import { AudioManager } from '../src/core/AudioManager.js';
import { FamilyManager } from '../src/family/FamilyManager.js';
import { Bloodline } from '../src/family/Bloodline.js';
import { EconomyManager } from '../src/economy/EconomyManager.js';
import { BattleManager } from '../src/battle/BattleManager.js';
import { EventEngine } from '../src/event/EventEngine.js';
import { AdManager } from '../src/ad/AdManager.js';
import { StorageManager } from '../src/storage/StorageManager.js';
import { ResourceLoop } from '../src/economy/ResourceLoop.js';

console.log('====================================================');
console.log('   家族修仙/官路 (Family Saga) 自动化回归测试启动   ');
console.log('====================================================');

// 初始化测试环境
function createTestContext(route = 'xianxia') {
  const context = new GameContext();
  context.audioManager = new AudioManager();
  context.audioManager.enabled = false; // 测试期关闭合成发声
  context.adManager = new AdManager();
  context.bloodline = new Bloodline();
  context.familyManager = new FamilyManager();
  context.economyManager = new EconomyManager();
  context.battleManager = new BattleManager();
  context.eventEngine = new EventEngine();

  context.bloodline.reset();
  context.familyManager.createInitialFamily(route);
  context.economyManager.initBuildings(route);
  context.initRoute(route);
  return context;
}

// === 测试1：修仙路线创角与基础经济循环 ===
console.log('\n[Test 1] 修仙路线 (Xianxia) 创角初始化与年度资源产出');
const xContext = createTestContext('xianxia');
assert.strictEqual(xContext.route, 'xianxia');
assert.strictEqual(xContext.year, 1);
assert.ok(xContext.spiritStones >= 1200, `灵石应当不少于1200，当前值: ${xContext.spiritStones}`);

const master = xContext.familyManager.getMaster();
assert.ok(master, '应该存在初始家主');
assert.strictEqual(master.role, 'master');
console.log(`  ✔ 初始家主：【${master.name}】 天赋: ${master.talent}  寿命上限: ${master.getMaxAge('xianxia')}`);

// 派驻族人至灵脉庄园测试
const clanMember = xContext.familyManager.getMembersByRole('clan')[0];
assert.ok(clanMember, '应该存在宗族旁系成员');
xContext.familyManager.assignMemberToBuilding(clanMember.id, 'spiritVein');
assert.strictEqual(clanMember.assignedBuilding, 'spiritVein');
const vein = xContext.economyManager.getBuilding('spiritVein');
vein.assignedMemberId = clanMember.id;

const initStones = xContext.spiritStones;
xContext.nextYear();
assert.strictEqual(xContext.year, 2);
assert.ok(xContext.spiritStones > initStones, `经过一年，灵石应增长 (初始: ${initStones}, 当前: ${xContext.spiritStones})`);
console.log(`  ✔ 年度推移正确！第 2 年灵石增长至 ${xContext.spiritStones} (增量: +${xContext.spiritStones - initStones})`);

// === 测试2：官途路线战棋战斗与建筑升级 ===
console.log('\n[Test 2] 官场路线 (Official) 建筑升级与 8x8 沙盘战棋对决');
const oContext = createTestContext('official');
assert.strictEqual(oContext.route, 'official');
assert.ok(oContext.silver >= 1800, `银两初始值应达1800+，当前值: ${oContext.silver}`);

const shop = oContext.economyManager.getBuilding('manorShop');
assert.strictEqual(shop.level, 1);
const upCost = shop.getUpgradeCost('official');
assert.strictEqual(upCost.costType, 'silver');
const okUp = oContext.economyManager.upgradeBuilding('manorShop', oContext);
assert.strictEqual(okUp, true, '商铺庄园升级应当成功');
assert.strictEqual(shop.level, 2, '商铺庄园等级应当升为 Lv.2');
console.log(`  ✔ 建筑升级正确！【${shop.getName()}】升级消耗 ${upCost.costAmount} 银两`);

// 发起对关卡1的挑战
const okBattle = oContext.battleManager.startBattle('o_dungeon_1', oContext);
assert.strictEqual(okBattle, true, '应该顺利开启黑风山剿匪关卡');
const b = oContext.battleManager.currentBattle;
assert.ok(b, '官场战棋实例不应为空');
assert.strictEqual(b.units.length >= 8, true, '8x8棋盘上我方与敌军单位总和应不少于8个');

// 测试移动与攻击
const pCmd = b.units.find((u) => u.id === 'p_cmd');
b.moveUnit(pCmd.id, 3, 6);
assert.strictEqual(pCmd.y, 6, '骑乘帅旗应移动至 Y=6');
// 测试军师锦囊烈火计
const eBoss = b.units.find((u) => u.id === 'e_boss');
const eBossHP0 = eBoss.hp;
b.useTacticCard('fire', eBoss.id);
assert.ok(eBoss.hp < eBossHP0, `烈火计对首领造成伤害 (原: ${eBossHP0}, 现: ${eBoss.hp})`);
console.log(`  ✔ 沙盘战棋方格行军与火攻计策推演校验通过！`);

// === 测试3：突发事件引擎与商业化广告全点位发放 ===
console.log('\n[Test 3] 突发事件抉择与商业化 7大视频点位大赏校验');
const event = oContext.eventEngine.triggerAnnualEvent(oContext) || oContext.eventEngine.currentEvent;
if (oContext.eventEngine.currentEvent) {
  const choiceRes = oContext.eventEngine.resolveChoice(0, oContext);
  assert.strictEqual(choiceRes.success, true);
  console.log(`  ✔ 触发事件抉择【${choiceRes.title}】：${choiceRes.msg}`);
} else {
  console.log(`  ✔ 事件引擎校验：当年为太平和平年份。`);
}

// 模拟触发广告福利
const maxAP = oContext.maxActionPoints;
oContext.actionPoints = 1;
oContext.adManager.handleAdReward('actionRecovery', oContext);
assert.ok(oContext.actionPoints > 1, `行动点在广告恢复后应高于 1 (当前: ${oContext.actionPoints}/${maxAP})`);

oContext.stamina = 10;
oContext.adManager.handleAdReward('staminaRecovery', oContext);
assert.strictEqual(oContext.stamina, oContext.maxStamina, '体力恢复广告应回满 100/100');

oContext.adManager.handleAdReward('memberBoost', oContext);
assert.strictEqual(oContext.adBonuses.productionMultiplier, 2, '产出加速应当翻倍为 2x');
console.log('  ✔ 商业化广告福利发奖 (行动点/体力/2倍产出) 触发准确无误！');

// === 测试4：跨时代寿命检测与新家主传承接任机制 ===
console.log('\n[Test 4] 跨时代传承 (Succession & Lineage Inheritance)');
const simContext = createTestContext('xianxia');
const oldMaster = simContext.familyManager.getMaster();
const oldMasterName = oldMaster.name;
const oldMasterTalent = oldMaster.talent;

// 人为将老家主寿命催至耗尽
oldMaster.age = oldMaster.getMaxAge('xianxia') + 1;
const heirResult = simContext.familyManager.advanceYear(simContext);
assert.strictEqual(heirResult.masterPassedAway, true, '当家主达到寿命极限，必触发家督大行仙逝！');

const adultChild = simContext.familyManager.members.find((m) => m.role === 'child' || m.role === 'clan');
assert.ok(adultChild, '应当有后备子嗣或旁系接替');
const childId = adultChild.id;
const childOldTalent = adultChild.talent;

// 触发选他继任
const selOk = simContext.familyManager.selectHeir(childId, simContext);
assert.strictEqual(selOk, true, '继承应当执行成功');
const newMaster = simContext.familyManager.getMaster();
assert.strictEqual(newMaster.role, 'master');
assert.strictEqual(simContext.generation, 2, '家族代数应当晋升至第 2 代！');
assert.ok(newMaster.talent >= Math.floor(childOldTalent * 0.7), `新家主继承天资系数准确计算 (${childOldTalent} -> ${newMaster.talent})`);
console.log(`  ✔ 传承大礼完毕！新任第 2 代家督：【${newMaster.name}】 天资: ${newMaster.talent}`);

// === 测试5：游戏全状态持久化存档与读盘 ===
console.log('\n[Test 5] 多周目存档序列化与快速反序列化 (Save & Load)');
StorageManager.saveGame(simContext);
assert.strictEqual(StorageManager.hasSave(), true, '存档应该被正确保存');

const loadedContext = new GameContext();
StorageManager.loadGame(loadedContext);
assert.strictEqual(loadedContext.route, simContext.route);
assert.strictEqual(loadedContext.year, simContext.year);
assert.strictEqual(loadedContext.generation, simContext.generation);
assert.strictEqual(loadedContext.spiritStones, simContext.spiritStones);
assert.strictEqual(loadedContext.familyManager.getMaster().name, newMaster.name);
console.log(`  ✔ 存档与读入完全一致！(代数: 第${loadedContext.generation}代 | 灵石: ${loadedContext.spiritStones})`);

// === 测试6：镇族传家法宝与十年一届万仙大会/殿试争霸 ===
console.log('\n[Test 6] 镇族至宝/智囊名录与十年一届万仙大比赛季争霸');
const artContext = createTestContext('xianxia');
assert.ok(artContext.artifactManager.getArtifactList().length > 0, '创角应自动获得初始传家至宝');
const mirror = artContext.artifactManager.getArtifactList()[0];
const baseMult = mirror.getPowerMultiplier();
mirror.level += 1;
assert.ok(mirror.getPowerMultiplier() > baseMult, '精炼升阶后综合战力加成倍率应当增加');

// 将年份推进至第10年触发万仙大会
artContext.year = 10;
const tInstance = artContext.tournamentEngine.checkTournamentYear(artContext);
assert.ok(tInstance, '第10年应精准触发修真万仙大会赛！');
const r1 = artContext.tournamentEngine.runNextRound(artContext);
assert.strictEqual(r1.success, true, '第一赛程角逐应该正常执行并返回赛报！');
console.log(`  ✔ 镇族至宝精炼升阶 (+${Math.floor(mirror.getPowerMultiplier() * 100)}%战力) 与十年赛大比角逐 (${r1.roundName}) 100% 校验成功！`);

console.log('\n====================================================');
console.log('        🎉 所有 6 大综合集成回归测试 100% 通过！     ');
console.log('====================================================\n');
