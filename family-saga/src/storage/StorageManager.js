/**
 * StorageManager.js
 * 游戏多周目存档持久化与跨代历史荣誉殿堂管理器
 */

import { Adapter } from '../core/Adapter.js';

export const SAVE_KEY = 'family_saga_save_v1';
export const HALL_OF_FAME_KEY = 'family_saga_hall_of_fame';

export class StorageManager {
  // 保存游戏进度
  static saveGame(context) {
    if (!context) return false;
    const data = context.toJSON();
    data.saveTime = Date.now();
    data.version = '1.0.0';
    Adapter.setStorage(SAVE_KEY, data);
    return true;
  }

  // 读取现有存档
  static loadGame(context) {
    if (!context) return false;
    const data = Adapter.getStorage(SAVE_KEY, null);
    if (!data) return false;
    context.fromJSON(data);
    return true;
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
