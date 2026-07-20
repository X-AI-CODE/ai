/**
 * SafeNumber.js
 * 内存动态异或与哈希校验数值防护类 (In-Memory XOR & Integrity Guard)
 * 防止黑客通过 GG修改器 (GameGuardian) / Cheat Engine 搜索并直接篡改内存中的灵石/银两数值！
 */

export class SafeNumber {
  constructor(initialValue = 0) {
    this.set(initialValue);
  }

  set(val) {
    const cleanVal = Math.max(0, Math.floor(Number(val) || 0));
    // 动态随机掩码 (0 ~ 0x7fffffff)
    this._mask = Math.floor(Math.random() * 0x7fffffff);
    // 异或混淆存储，内存中搜索明文 1000 将毫无结果
    this._valEnc = cleanVal ^ this._mask;
    // 独立完整性哈希校验，防止盲改内存
    this._checkHash = this._computeHash(cleanVal);
  }

  get() {
    const realVal = this._valEnc ^ this._mask;
    if (this._computeHash(realVal) !== this._checkHash) {
      // 触发内存拦截！说明 _valEnc 在内存中被外部修改器强制篡改
      console.error('[AntiCheat] 严重告警：检测到非法内存篡改！已触发防作弊拦截并重置数值。');
      this.set(0);
      return 0;
    }
    return realVal;
  }

  add(amount) {
    const cur = this.get();
    this.set(cur + Number(amount || 0));
    return this.get();
  }

  sub(amount) {
    const cur = this.get();
    const next = Math.max(0, cur - Number(amount || 0));
    this.set(next);
    return next;
  }

  _computeHash(val) {
    // 乘法散列与移位校验
    return ((val * 2654435761) ^ 0x12345678) >>> 0;
  }

  toJSON() {
    return this.get();
  }
}
