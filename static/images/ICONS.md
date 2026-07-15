# GitFlow 图标资源清单

## 📱 TabBar 图标 (81x81 PNG)

微信 tabBar 图标要求：81x81 像素，PNG 格式

| 文件名 | 用途 | 状态 |
|--------|------|------|
| `tab-repo.png` | 仓库 Tab - 未选中 (灰色 #586069) | ✅ |
| `tab-repo-active.png` | 仓库 Tab - 选中 (蓝色 #0366d6) | ✅ |
| `tab-settings.png` | 设置 Tab - 未选中 (灰色 #586069) | ✅ |
| `tab-settings-active.png` | 设置 Tab - 选中 (蓝色 #0366d6) | ✅ |

## 🌐 Git 服务品牌图标 (128x128 PNG)

| 文件名 | 用途 | 颜色 |
|--------|------|------|
| `github.png` | GitHub 品牌图标 | 黑色 #24292e |
| `gitlab.png` | GitLab 品牌图标 | 橙色 #FC6D26 |
| `gitee.png` | Gitee 品牌图标 | 红色 #C71D23 |

## 🎨 UI 图标 (SVG)

SVG 图标可无损缩放，适合各种尺寸使用

### Git 操作图标

| 文件名 | 用途 | 颜色 |
|--------|------|------|
| `icon-branch.svg` | 分支 | 蓝色 #0366d6 |
| `icon-commit.svg` | 提交 | 绿色 #28a745 |
| `icon-merge.svg` | 合并 | 紫色 #6f42c1 |
| `icon-pull.svg` | 拉取/下载 | 蓝色 #0366d6 |
| `icon-push.svg` | 推送/上传 | 绿色 #28a745 |

### 文件类型图标

| 文件名 | 用途 | 描述 |
|--------|------|------|
| `icon-file-code.svg` | 代码文件 | 带 `</>` 标记的文件 |
| `icon-file-text.svg` | 文本文件 | 带横线的文档 |
| `icon-folder.svg` | 文件夹 | 蓝色文件夹 |
| `icon-empty.svg` | 空状态 | 虚线框 + ∅ 符号 |

## 🎯 品牌与启动图

| 文件名 | 用途 | 尺寸 |
|--------|------|------|
| `app-logo.svg` | 应用 Logo | 200x200 |
| `splash-screen.svg` | 启动页背景 | 600x400 |

## 📋 使用示例

### 在 WXML 中使用 PNG 图标

```xml
<!-- TabBar 图标（在 app.json 中配置） -->
{
  "tabBar": {
    "list": [{
      "iconPath": "static/images/tab-repo.png",
      "selectedIconPath": "static/images/tab-repo-active.png"
    }]
  }
}

<!-- 品牌图标 -->
<image src="/static/images/github.png" mode="aspectFit" />
```

### 在 WXML 中使用 SVG 图标

```xml
<!-- 操作按钮 -->
<view class="action-btn">
  <image src="/static/images/icon-pull.svg" class="icon" />
  <text>拉取</text>
</view>

<!-- 文件列表 -->
<view class="file-item">
  <image src="/static/images/icon-folder.svg" wx:if="{{item.isDir}}" />
  <image src="/static/images/icon-file-code.svg" wx:else />
  <text>{{item.name}}</text>
</view>
```

### 在 WXSS 中设置图标样式

```css
.icon {
  width: 48rpx;
  height: 48rpx;
}

.icon-large {
  width: 64rpx;
  height: 64rpx;
}

.icon-small {
  width: 32rpx;
  height: 32rpx;
}
```

## 🎨 颜色规范

| 用途 | 颜色值 | 说明 |
|------|--------|------|
| 主色调 | `#0366d6` | 蓝色，用于选中状态、链接、主要操作 |
| 成功 | `#28a745` | 绿色，用于成功状态、推送、提交 |
| 警告 | `#f9a825` | 黄色，用于警告状态 |
| 危险 | `#d73a49` | 红色，用于删除、错误、冲突 |
| 禁用 | `#586069` | 灰色，用于未选中状态 |
| 分支 | `#6f42c1` | 紫色，用于分支相关 |

## 📐 图标尺寸建议

| 场景 | 推荐尺寸 | 说明 |
|------|----------|------|
| TabBar | 81x81 px | 微信强制要求 |
| 列表项图标 | 48x48 rpx | 文件列表、分支列表 |
| 按钮图标 | 40x40 rpx | 操作按钮 |
| 品牌图标 | 64x64 rpx | GitHub/GitLab/Gitee |
| 空状态图标 | 200x200 rpx | 居中展示 |

## 🔧 图标生成说明

- **TabBar PNG**: 使用 Python 程序化绘制 (Pillow)，81x81 像素
- **品牌 PNG**: 使用 Python 绘制几何化品牌图标，128x128 像素
- **UI SVG**: 手工编写 SVG 代码，可无损缩放
- **Logo/Splash SVG**: 使用渐变和几何图形设计

## ⚠️ 注意事项

1. **微信小程序限制**
   - TabBar 图标必须是 PNG 格式，不支持 SVG
   - SVG 可以在 WXML 中使用 `<image>` 标签

2. **生产环境建议**
   - 替换为设计师提供的高精度图标
   - TabBar 图标需要支持 @2x/@3x 分辨率
   - 品牌图标建议使用官方 SVG 版本

---

**维护者**: GitFlow Team  
**最后更新**: 2026-07-10
