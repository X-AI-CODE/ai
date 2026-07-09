# GitFlow - 微信小程序 Git 管理工具

一个功能完整的微信小程序，实现了完整的 Git 操作功能，主要用于本地文件夹操作，支持从不同的远程 Git 仓库拉取和同步代码。

## 📱 功能概览

### 🏠 仓库管理
- 创建本地 Git 仓库
- 仓库列表浏览和搜索
- 删除仓库
- 仓库状态一目了然

### 📁 文件操作
- 浏览文件树（目录/文件导航）
- 创建文件和文件夹
- 编辑文件内容（内置代码编辑器）
- 文件移动/重命名
- 删除文件
- 支持多种编程语言语法高亮

### 🌿 分支管理
- 查看所有分支
- 创建新分支
- 切换分支
- 删除分支
- 分支合并（支持快进和三方合并）

### 📊 Git 状态
- 查看工作区变更状态
- 暂存文件 (git add)
- 批量暂存 (git add -A)
- 取消暂存 (git reset)
- 提交更改 (git commit)
- 暂存/恢复 (git stash / stash pop)

### 📥 远程同步
- 添加多个远程仓库 (GitHub / GitLab / Gitee)
- 从远程拉取 (git pull)
- 同步所有远程仓库
- 克隆远程仓库到本地
- 远程分支浏览
- 连接测试
- 自动同步配置

### 🔍 Diff 查看
- 文件差异对比
- 统一视图 / 分栏视图
- 变更统计

### 📜 提交历史
- 查看提交日志
- 查看提交详情
- 查看每次提交的变更文件
- 文件级 Diff 查看

### ⚙️ 设置
- Git 全局配置（默认分支、作者信息）
- API Token 管理（GitHub / GitLab / Gitee）
- 自动同步设置
- 存储空间管理
- 数据导出/清除

## 🏗️ 项目结构

```
.
├── app.js                    # 应用入口
├── app.json                  # 全局配置
├── app.wxss                  # 全局样式
├── project.config.json       # 项目配置
├── sitemap.json              # 站点地图
│
├── pages/                    # 页面目录
│   ├── index/                # 仓库列表页（首页）
│   ├── repo/                 # 仓库详情页（文件/状态/历史）
│   ├── file-editor/          # 文件编辑器
│   ├── history/              # 提交详情页
│   ├── diff-view/            # Diff 对比页
│   ├── branches/             # 分支管理页
│   ├── remote-manager/       # 远程仓库管理页
│   └── settings/             # 设置页
│
├── utils/                    # 工具模块
│   ├── git-store.js          # 核心 Git 仓库管理
│   ├── git-object-store.js   # Git 对象存储 (blob/tree/commit/tag)
│   ├── index-manager.js      # 暂存区管理
│   ├── diff-engine.js        # Diff 计算引擎
│   ├── remote-manager.js     # 远程仓库管理
│   └── util.js               # 通用工具函数
│
├── config/
│   └── app-config.js         # 应用配置常量
│
└── static/images/            # 静态图片资源
```

## 🔧 核心模块说明

### GitStore (git-store.js)
核心的仓库管理模块，提供完整的 Git 操作 API：
- 仓库 CRUD 操作
- 分支管理（创建、切换、删除、合并）
- 文件状态追踪
- 暂存区操作（add / unstage）
- 提交操作
- 提交历史查询
- 远程操作（fetch / pull / sync）
- Stash 暂存管理

### GitObjectStore (git-object-store.js)
实现 Git 的四种核心对象类型：
- **Blob**: 文件内容存储
- **Tree**: 目录结构存储
- **Commit**: 提交信息存储
- **Tag**: 标签存储

使用内容寻址（SHA-1 哈希）进行对象存储，与真实 Git 实现原理一致。

### IndexManager (index-manager.js)
管理 Git 的暂存区（staging area），跟踪文件暂存状态。

### DiffEngine (diff-engine.js)
差异计算引擎：
- 行级 Diff（基于 LCS 算法）
- 文件树 Diff
- 三方合并（用于 merge 操作）
- Unified Diff 格式输出

### RemoteManager (remote-manager.js)
远程仓库管理器，支持：
- GitHub API 集成
- GitLab API 集成
- Gitee API 集成
- 连接测试
- 远程分支浏览
- 仓库文件下载
- 批量克隆

## 📋 页面说明

| 页面 | 路径 | 功能 |
|------|------|------|
| 仓库列表 | `/pages/index/index` | 展示所有本地仓库，支持搜索、新建、克隆 |
| 仓库详情 | `/pages/repo/repo` | 文件浏览、状态查看、提交历史、操作入口 |
| 文件编辑器 | `/pages/file-editor/file-editor` | 代码编辑、查找替换、保存暂存 |
| 提交详情 | `/pages/history/history` | 查看提交信息、变更文件列表 |
| Diff 查看 | `/pages/diff-view/diff-view` | 文件差异对比 |
| 分支管理 | `/pages/branches/branches` | 分支的创建、切换、合并、删除 |
| 远程管理 | `/pages/remote-manager/remote-manager` | 远程仓库配置、同步、克隆 |
| 设置 | `/pages/settings/settings` | 全局配置、Token管理、数据管理 |

## 🚀 快速开始

### 1. 环境准备
- 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 注册微信小程序账号

### 2. 导入项目
1. 打开微信开发者工具
2. 选择「导入项目」
3. 选择项目根目录
4. 填入你的小程序 AppID（或使用测试号）

### 3. 配置 Tab 图标
将 `static/images/` 中的占位图标替换为实际的 TabBar 图标（81x81 px PNG）。

### 4. 运行调试
- 在开发者工具中点击「编译」
- 使用模拟器或真机调试

## 📖 使用指南

### 创建仓库
1. 首页点击「+ 新建仓库」
2. 输入仓库名称、默认分支、作者信息
3. 点击「创建」

### 从远程克隆
1. 首页点击「📥 从远程克隆」
2. 输入 Git 仓库 URL（支持 GitHub/GitLab/Gitee）
3. 点击「开始克隆」

### 编辑文件
1. 进入仓库 → 文件标签
2. 点击文件打开编辑器
3. 编辑内容后点击「💾」保存
4. 可点击「保存并暂存」直接暂存

### 提交更改
1. 切换到「状态」标签
2. 选择要暂存的文件
3. 点击「提交」输入提交信息
4. 确认提交

### 分支操作
1. 仓库详情页点击分支标签切换
2. 「分支管理」页可创建、合并、删除分支

### 远程同步
1. 仓库详情页点击「🔗 远程」配置远程仓库
2. 或进入「远程仓库管理」页
3. 添加远程 URL 和 Token
4. 点击「同步」拉取更新

## 🔐 安全说明

- API Token 存储在小程序本地 Storage 中，不会上传到服务器
- 建议使用最小权限的 Token
- 敏感操作（删除仓库等）都有二次确认

## ⚠️ 限制与注意

1. **存储空间**: 微信小程序用户存储空间有限（默认 200MB），大仓库需谨慎
2. **网络请求**: 小程序域名需要在后台配置白名单
3. **文件操作**: 使用微信文件系统 API，非真实设备文件系统
4. **Git 协议**: 当前通过 HTTP API 同步，不支持 SSH 协议的直接 git 操作
5. **大文件**: 超过 5MB 的文件建议排除
6. **SHA-1**: 使用简化的哈希实现，生产环境建议替换为 crypto 模块

## 🔮 后续规划

- [ ] 支持 SSH 密钥认证
- [ ] 集成 isomorphic-git 实现完整 git 协议
- [ ] Webhook 支持
- [ ] 冲突解决 UI
- [ ] 分支可视化（类似 git graph）
- [ ] 协作编辑支持
- [ ] 代码片段分享
- [ ] Markdown 预览
- [ ] 深色模式主题

## 📄 License

MIT
