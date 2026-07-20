/**
 * StorageManager.js
 * 游戏多周目存档持久化与跨代历史荣誉殿堂管理器
 */

import { Adapter } from '../core/Adapter.js';
import { AntiCheat } from '../security/AntiCheat.js';

export const SAVE_KEY = 'family_saga_save_v1';
export const HALL_OF_FAME_KEY = 'family_saga_hall_of_fame';

export class StorageManager {
  // 保存游戏进度 (带 HMAC 安全签名)
  static saveGame(context) {
    if (!context) return false;
    const data = context.toJSON();
    data.saveTime = Date.now();
    data.version = '1.0.0';
    const signedData = AntiCheat.signSavePacket(data);
    Adapter.setStorage(SAVE_KEY, signedData || data);
    return true;
  }

  // 读取现有存档 (校验防篡改签名)
  static loadGame(context) {
    if (!context) return false;
    const data = Adapter.getStorage(SAVE_KEY, null);
    if (!data) return false;

    // 校验签名完整性 (若玩家私自用编辑器修改了 localstorage 里 JSON 的灵石或银两，HMAC 即刻校验失效)
    if (data._hmac && !AntiCheat.verifySavePacket(data)) {
      Adapter.showToast('⚠️ 警告：检测到存档被修改或损坏，拒绝加载非法数值！');
      return { success: false, corrupted: true };
    }

    context.fromJSON(data);
    return { success: true, saveTime: data.saveTime || Date.now() };
  }

  // 检查是否存在存档
  static hasSave() {
    const data = Adapter.getStorage(SAVE_KEY, null);
    return !!(data && data.year);
  }

  // 删档重玩
  static deleteSave() {
    Adapter.removeStorage(SAVE_KEY);
  }

  // 记录周目通关或世代更迭至荣誉名册 (排行榜/名册)
  static recordToHallOfFame(context, reason = '正常传承') {
    if (!context) return;
    const list = Adapter.getStorage(HALL_OF_FAME_KEY, []);
    const entry = {
      id: `hof_${Date.now()}`,
      time: new Date().toLocaleDateString(),
      route: context.route === 'xianxia' ? '修仙世家' : '官宦世家',
      generation: context.generation,
      year: context.year,
      bloodlineLevel: context.bloodline ? context.bloodline.level : 1,
      totalPopulation: context.familyManager ? context.familyManager.members.length : 0,
      reputation: context.reputation,
      reason
    };
    list.unshift(entry);
    if (list.length > 20) list.pop();
    Adapter.setStorage(HALL_OF_FAME_KEY, list);
    return entry;
  }

  static getHallOfFame() {
    return Adapter.getStorage(HALL_OF_FAME_KEY, []);
  }
}
