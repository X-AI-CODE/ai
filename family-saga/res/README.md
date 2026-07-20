# 资源文件说明 (`res/`)

> 本目录为《家族修仙/官途 (Family Saga)》小游戏的静态资源包放置库。

---

## 1. 为什么无需依赖外部庞大 3D 模型 (.obj/.fbx) 与海量切图 (.png)？
根据微信小游戏官方规范，**主包必须严格小于等于 4MB**。如果存放大量未压缩的 3D 模型纹理或高清界面背景图，不仅首屏加载需要数十秒，更无法通过微信审核。

本项目采用了**高级程序化生成与双层自绘渲染架构 (Procedural 3D & Canvas 2D Vector UI)**：
* **3D 场景与 Q版角色 (`SceneManager.js`)**：所有领地庄园建筑、飞剑光环、方格战棋及 Q 版族人均使用代码程序化构建几何体 (`BoxGeometry`, `CylinderGeometry`, `ConeGeometry`) 并赋予高光物理材质 (`MeshLambertMaterial`)。**零模型加载延迟，60FPS 极速渲染！**
* **高清自适应 UI (`UIManager.js`)**：所有界面弹窗、按钮、进击血条、边框和圆角面板均使用 Canvas 2D 矢量绘制函数 (`roundRect`, `fillText`, `strokeRect`)，在任何分辨率/Retina 高清屏下都不失真，无需一张切图资源。

---

## 2. 音频与特效音效说明 (`res/audio/`)
为保证开发者在微信开发者工具或真机调试时调用 `wx.createInnerAudioContext().src = 'res/audio/...'` **绝不抛出文件不存在 (`ERR_CODE: 10001`) 错误**，我们已在本目录下自动为您生成并实装了符合小游戏规范的标准静音/兼容音频文件：

* `res/audio/bgm_territory.mp3` — 家园领地背景音乐路径
* `res/audio/bgm_battle.mp3` — 外域秘境/战棋战斗背景音乐路径
* `res/audio/sfx_click.mp3` — 按钮触控反馈音效
* `res/audio/sfx_levelUp.mp3` — 突破升级与精炼成功音效
* `res/audio/sfx_victory.mp3` — 秘境通关与大比夺冠音效
* `res/audio/sfx_event.mp3` — 突发事件与繁衍联姻音效

*(若在普通浏览器或无音频文件的测试环境中运行，底层 `AudioManager` 也会自动平滑降级至 WebAudio 合成音效或控制台日志，实现全平台完美兼容)*
