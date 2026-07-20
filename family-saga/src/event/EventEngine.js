/**
 * EventEngine.js
 * 随机事件引擎：年度流逝与奇遇触发控制器
 */

import { EVENTS_DATABASE } from './EventDatabase.js';

export class EventEngine {
  constructor() {
    this.currentEvent = null;
  }

  // 触发当年的随机事件 (概率触发或每1~2年必定触发一次)
  triggerAnnualEvent(context) {
    if (Math.random() < 0.2) return null; // 20%概率平安无事

    const route = context.route;
    const pool = EVENTS_DATABASE.filter((e) => e.route === route || e.route === 'both');
    if (pool.length === 0) return null;

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.currentEvent = chosen;

    if (context.audioManager) {
      context.audioManager.playSFX('event');
    }

    if (context.uiManager) {
      context.uiManager.openModal('EventUI', chosen);
    }

    return chosen;
  }

  // 玩家作出抉择
  resolveChoice(choiceIndex, context) {
    if (!this.currentEvent) return { success: false, msg: '当前无事件' };
    const option = this.currentEvent.options[choiceIndex];
    if (!option) return { success: false, msg: '无效选项' };

    if (option.condition && !option.condition(context)) {
      return { success: false, msg: '资源或条件不足，无法执行该抉择！' };
    }

    const resultMsg = option.effect(context);
    const eventTitle = this.currentEvent.title;
    this.currentEvent = null;

    return { success: true, msg: resultMsg, title: eventTitle };
  }
}
