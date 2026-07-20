/**
 * obfuscator.config.cjs
 * 微信小游戏真机发布构建期混淆防护配置
 * 使用 javascript-obfuscator 强混淆代码，打乱控制流、转换变量名并加密敏感字符串，对抗反编译工具！
 */

module.exports = {
  compact: true,
  controlFlowFlattening: true,             // 控制流平坦化
  controlFlowFlatteningThreshold: 0.75,
  deadCodeInjection: true,                 // 随机注入死分支
  deadCodeInjectionThreshold: 0.4,
  identifierNamesGenerator: 'hexadecimal', // 十六进制随机命名如 _0x1a2b3c
  logRecovery: false,                      // 禁用 console 恢复
  numbersToExpressions: true,              // 将数字转为表达式计算
  renameGlobals: false,                    // 不重命名小游戏全局对象
  selfDefending: true,                     // 自卫代码，检测格式化/断点则阻断
  simplify: true,
  splitStrings: true,
  splitStringsChunkLength: 10,
  stringArray: true,                       // 字符串抽离加密
  stringArrayEncoding: ['rc4'],            // RC4 强加密
  stringArrayThreshold: 1.0
};
