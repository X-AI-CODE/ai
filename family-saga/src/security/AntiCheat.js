/**
 * AntiCheat.js
 * 反作弊综合安全引擎：HMAC-SHA256 存档签名校验与双时钟心跳防变速外挂
 */

const SECRET_SALT = 'FS_SAGA_SEC_SALT_2026_X#9988$K!';

export class AntiCheat {
  // 1. 生成 HMAC SHA-256 哈希签名 (自包含纯 JS 实现，兼容小游戏与 Node)
  static computeHMAC(dataStr, timestamp) {
    const payload = `${dataStr}|${timestamp}|${SECRET_SALT}`;
    return this.sha256(payload);
  }

  // 为存档数据包附加防篡改签名
  static signSavePacket(saveObj) {
    if (!saveObj) return null;
    const ts = saveObj.saveTime || Date.now();
    // 复制一个排除了原始签名的干净对象用于签名计算
    const cleanObj = { ...saveObj };
    delete cleanObj._hmac;

    const dataStr = JSON.stringify(cleanObj);
    const hmac = this.computeHMAC(dataStr, ts);
    cleanObj._hmac = hmac;
    return cleanObj;
  }

  // 校验存档包完整性：若被非法修改 JSON，返回 false
  static verifySavePacket(saveObj) {
    if (!saveObj || !saveObj._hmac) {
      console.warn('[AntiCheat] 存档缺少安全签名包！怀疑为伪造或非法导入存档。');
      return false;
    }
    const targetHmac = saveObj._hmac;
    const cleanObj = { ...saveObj };
    delete cleanObj._hmac;

    const dataStr = JSON.stringify(cleanObj);
    const expectedHmac = this.computeHMAC(dataStr, saveObj.saveTime || 0);
    if (targetHmac !== expectedHmac) {
      console.error('[AntiCheat] HMAC 签名校验不匹配！存档数值已被外部文件修改器非法篡改！');
      return false;
    }
    return true;
  }

  // 2. 双时钟心跳校验：防变速齿轮/游戏加速器
  static initSpeedCheck() {
    this._lastRealTime = Date.now();
    this._lastGameTime = Date.now();
  }

  static checkSpeedHack(gameDeltaMs) {
    const now = Date.now();
    const realDelta = now - (this._lastRealTime || now);
    this._lastRealTime = now;

    // 如果游戏逻辑层推演时间（例如连续模拟心跳）比现实网络物理时间快了 10 倍以上且超过 3 秒
    if (gameDeltaMs > realDelta * 10 && gameDeltaMs > 3000) {
      console.error('[AntiCheat] 检测到物理时钟异常！疑似开启变速齿轮/加速外挂！');
      return { hacked: true, reason: '游戏推演速度异常，请关闭第三方变速插件后继续游戏。' };
    }
    return { hacked: false };
  }

  // 纯 JavaScript 简易 SHA-256 哈希算法
  static sha256(ascii) {
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    const lengthProperty = 'length';
    let i, j;
    let result = '';
    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;
    let hash = (AntiCheat._sha256Init || (AntiCheat._sha256Init = []));
    const k = (AntiCheat._sha256K || (AntiCheat._sha256K = []));
    let primeCounter = k[lengthProperty];

    if (hash[lengthProperty] === 0) {
      const isComposite = {};
      for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
          for (i = 0; i < 313; i += candidate) {
            isComposite[i] = candidate;
          }
          hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
          k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
        }
      }
    }

    ascii += '\x80';
    while (ascii[lengthProperty] % 64 - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
      j = ascii.charCodeAt(i);
      if (j >> 8) return 'error_non_ascii';
      words[i >> 2] |= j << ((3 - i % 4) * 8);
    }
    words[words[lengthProperty] | 0] = ((asciiBitLength / maxWord) | 0);
    words[words[lengthProperty] | 0] = (asciiBitLength) | 0;

    let w = [];
    let currentHash = hash.slice(0);
    for (i = 0; i < words[lengthProperty]; i += 16) {
      const oldHash = currentHash.slice(0);
      for (j = 0; j < 64; j++) {
        const i16 = words[i + j];
        if (j < 16) {
          w[j] = i16;
        } else {
          const a = w[j - 15], b = w[j - 2];
          w[j] = (rightRotate(a, 7) ^ rightRotate(a, 18) ^ (a >>> 3)) +
                 w[j - 7] +
                 (rightRotate(b, 17) ^ rightRotate(b, 19) ^ (b >>> 10)) +
                 w[j - 16] | 0;
        }
        const temp1 = currentHash[7] +
                      (rightRotate(currentHash[4], 6) ^ rightRotate(currentHash[4], 11) ^ rightRotate(currentHash[4], 25)) +
                      ((currentHash[4] & currentHash[5]) ^ (~currentHash[4] & currentHash[6])) +
                      k[j] +
                      (w[j] = (w[j] || 0) | 0) | 0;
        const temp2 = (rightRotate(currentHash[0], 2) ^ rightRotate(currentHash[0], 13) ^ rightRotate(currentHash[0], 22)) +
                      ((currentHash[0] & currentHash[1]) ^ (currentHash[0] & currentHash[2]) ^ (currentHash[1] & currentHash[2])) | 0;

        currentHash = [
          (temp1 + temp2) | 0,
          currentHash[0],
          currentHash[1],
          currentHash[2],
          (currentHash[3] + temp1) | 0,
          currentHash[4],
          currentHash[5],
          currentHash[6]
        ];
      }
      for (j = 0; j < 8; j++) {
        currentHash[j] = (currentHash[j] + oldHash[j]) | 0;
      }
    }

    for (j = 0; j < 8; j++) {
      for (i = 3; i + 1; i--) {
        const b = (currentHash[j] >> (i * 8)) & 255;
        result += ((b < 16) ? 0 : '') + b.toString(16);
      }
    }
    return result;
  }
}
