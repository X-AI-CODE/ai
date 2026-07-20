# 家族修仙/官途 (Family Saga) — 详细开发与架构计划

> 日期：2026-07-20
> 项目：微信小游戏（WeChat Mini Game）`family-saga`
> 架构目标：完全覆盖并超越 MVP、V1.1、V1.2、V1.3，实现双路线（修仙 + 官路）开箱即玩的高品质 3D/2D 混合渲染架构。

---

## 1. 系统总体架构与目录结构

本项目严格遵循微信小游戏官方工程规范与最佳分包/精简主包实践，根目录位于 `/home/user/family-saga/`。

```
family-saga/
├── project.config.json          # 微信开发者工具工程文件 (compileType: 'game')
├── project.private.config.json  # 私有配置
├── game.json                    # 小游戏全局配置与分包配置
├── game.js                      # 游戏主入口，初始化微信环境与 Canvas/Three 场景
├── index.html                   # 浏览器端/模拟测试环境适配页 (开箱即用直接在 Web/Node 下验证)
├── package.json                 # Node/npm 自动化脚本与测试框架依赖
├── src/
│   ├── core/
│   │   ├── GameContext.js       # 全局上下文管理 (时间/年份/行动点/体力/当前路线)
│   │   ├── SceneManager.js      # Three.js 场景管理器 (领地场景/修仙战斗场景/战棋战斗场景切换)
│   │   ├── Adapter.js           # 微信 wx API 兼容适配层 (音频/振动/存储/UI渲染降级)
│   │   └── AudioManager.js      # 音频与特效音效发生器 (WebAudio / wx.createInnerAudioContext)
│   ├── family/
│   │   ├── FamilyManager.js     # 家族成员数据中心 (家主与子女/配偶/旁系增减、分配状态)
│   │   ├── Member.js            # 角色模型 (寿命、资质/灵根/才学、天赋特性遗传、声望加成)
│   │   └── Bloodline.js         # 血脉等级系统 (跨代传承、成就统计、传承系数计算)
│   ├── economy/
│   │   ├── EconomyManager.js    # 领地经济系统核心控制器
│   │   ├── Building.js          # 五大核心建筑模型 (灵脉/庄园、丹房/书院、修炼室/演武场、藏经阁/府库、祠堂)
│   │   └── ResourceLoop.js      # 年岁结算与效率加速公式 (产出计算、族人派驻加成)
│   ├── battle/
│   │   ├── BattleManager.js     # 战斗系统统一入口分发
│   │   ├── XianxiaBattle.js     # 修仙路线 1vN 回合制战斗逻辑与 3D 粒子特效管理
│   │   ├── OfficialBattle.js    # 官场路线 8x8 部队战棋剿匪/平叛逻辑与 3D 方格棋盘管理
│   │   └── DungeonConfig.js     # 境界/官阶副本分层地图与奖励掉落配置
│   ├── event/
│   │   ├── EventEngine.js       # 随机事件引擎 (年岁流逝触发、重大抉择、奇遇触发)
│   │   └── EventDatabase.js     # 30+ 种修仙/官场专属历史与家族事件库
│   ├── ad/
│   │   └── AdManager.js         # 微信激励视频广告管理器 (支持真机拉起与开发环境模拟倒计时)
│   ├── storage/
│   │   └── StorageManager.js    # 多周目与跨代持久化存储管理器 (安全读写、备份恢复、导出导入)
│   └── ui/
│       ├── UIManager.js         # Canvas 2D Overlay HUD 界面管理器
│       ├── MainHUD.js           # 顶部全局数据底栏与选项卡导航
│       ├── TerritoryUI.js       # 领地建筑交互面板与派驻管理 UI
│       ├── FamilyUI.js          # 家族名录与家主培养 UI
│       ├── DungeonUI.js         # 副本选关与战斗前瞻 UI
│       ├── EventUI.js           # 突发事件抉择弹窗 UI
│       ├── HeirSelectUI.js      # 寿命耗尽传承人挑选 UI
│       ├── AdModalUI.js         # 广告福利与签到面板 UI
│       └── BloodlineUI.js       # 血脉里程碑与成就展示 UI
├── libs/
│   ├── weapp-adapter.js         # 微信开发者小游戏 DOM 模拟层
│   └── three.module.js          # Three.js 核心分包模块
└── tests/
    └── run-tests.js             # Node.js 命令行综合回归测试套件 (验证数据模型与核心机制)
```

---

## 2. 核心模块详解与实施路线

### 2.1 双路线平衡与数据流 (`GameContext` & `FamilyManager`)
- **开局路线选择**：用户选择“修仙世家”或“官宦世家”。
- **年岁推移**：每一年的经历分为：
  1. `回合初`：结算当年的灵石/银两自动产出、建筑派驻加成、寿命检查（家主及一众族人年龄+1）。
  2. `随机事件`：触发事件库，带来突发抉择（如：发现天品灵根弃婴、朝廷征税、科举大比、魔修袭扰等）。
  3. `玩家操作`：升级建筑、修炼突破、安排族人职位、消耗体力进入副本战斗。
  4. `下一年`：或当家主寿命归零时，无缝切换进入传承仪式 (`HeirSelectUI`)。

### 2.2 3D 场景与 2D Overlay UI 渲染分层 (`SceneManager` + `UIManager`)
- `Three.js` 负责 3D/2.5D 视觉呈现，保证高帧率展示 Q 版领地、修仙飞剑打斗、方格战棋；
- `Canvas 2D` 覆盖于 3D 渲染画布之上，负责高清晰文字、按钮、进度条、各类模态对话框与交互点击响应，确保文字不失真且兼容小游戏双缓冲渲染机制。

### 2.3 商业化广告全点位覆盖 (`AdManager`)
实现文档规定的 7 大全部激励点位：
1. `行动点恢复`：用尽时点击，回满 50%。
2. `体力恢复`：战斗体力归零时点击，回满 100%。
3. `双倍掉落`：战斗通关结算时点击，获得翻倍资源与战利品。
4. `族人加速`：建筑加速点击，全产出 ×2 持续 2 年。
5. `传承加成`：选择继承人时点击，天赋与资产继承系数额外加 +15%。
6. `寿命延寿`：家主残年 ≤3 岁时点击，立刻延寿 5 年。
7. `每日签到翻倍`：每日签到面板点击，双倍领奖。

---

## 3. 验证与回归测试计划
1. **自动化集成单元测试 (`tests/run-tests.js`)**：无需打开真机即可秒级运行完整数十年的修仙与官路循环测试、产出校验、战斗数值计算与传承继承校验。
2. **微信小游戏适配与 Web 测试兼容 (`index.html`)**：在任意标准 Web 浏览器或微信开发者工具中一键运行。
