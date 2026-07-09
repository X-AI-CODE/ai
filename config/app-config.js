/**
 * 配置文件 - GitFlow小程序全局设置
 */

export const APP_CONFIG = {
  // 应用信息
  appName: 'GitFlow',
  version: '1.0.0',

  // 文件存储
  storage: {
    basePath: 'gitflow',
    maxRepoSize: 50 * 1024 * 1024, // 50MB per repo
    maxFileSize: 5 * 1024 * 1024,   // 5MB per file
    cacheDuration: 7 * 24 * 60 * 60 * 1000 // 7 days
  },

  // 支持的Git服务
  gitServices: {
    github: {
      name: 'GitHub',
      apiUrl: 'https://api.github.com',
      icon: '/static/images/github.png',
      color: '#24292e'
    },
    gitlab: {
      name: 'GitLab',
      apiUrl: 'https://gitlab.com/api/v4',
      icon: '/static/images/gitlab.png',
      color: '#FC6D26'
    },
    gitee: {
      name: 'Gitee',
      apiUrl: 'https://gitee.com/api/v5',
      icon: '/static/images/gitee.png',
      color: '#C71D23'
    }
  },

  // 默认设置
  defaults: {
    defaultBranch: 'main',
    authorName: 'User',
    authorEmail: 'user@example.com',
    autoSync: false,
    syncInterval: 30,
    theme: 'light',
    fontSize: 28
  },

  // 排除的文件模式
  excludePatterns: [
    'node_modules',
    '.git',
    'dist',
    'build',
    '__pycache__',
    '.DS_Store',
    '*.min.js',
    '*.min.css',
    'package-lock.json',
    'yarn.lock',
    'Thumbs.db',
    '*.pyc'
  ],

  // 支持的文件类型
  supportedFileTypes: {
    text: ['.js', '.ts', '.json', '.md', '.txt', '.html', '.css', '.scss',
           '.py', '.java', '.c', '.cpp', '.h', '.go', '.rs', '.rb',
           '.yml', '.yaml', '.xml', '.toml', '.ini', '.cfg', '.conf',
           '.sh', '.bash', '.zsh', '.fish', '.ps1',
           '.sql', '.graphql', '.env', '.gitignore', '.gitattributes',
           '.dockerignore', '.editorconfig', '.eslintrc', '.prettierrc',
           '.wxss', '.wxml', '.wxs'],
    binary: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
             '.pdf', '.zip', '.tar', '.gz', '.rar',
             '.woff', '.woff2', '.ttf', '.eot',
             '.mp3', '.mp4', '.wav', '.avi']
  },

  // 编辑器设置
  editor: {
    tabSize: 2,
    insertSpaces: true,
    wordWrap: true,
    lineNumbers: true,
    minimap: false,
    fontSize: 14
  },

  // 颜色主题
  themes: {
    light: {
      background: '#ffffff',
      text: '#24292e',
      border: '#e1e4e8',
      primary: '#0366d6',
      success: '#28a745',
      warning: '#f9a825',
      danger: '#d73a49',
      muted: '#586069'
    },
    dark: {
      background: '#1e1e1e',
      text: '#d4d4d4',
      border: '#404040',
      primary: '#569cd6',
      success: '#4ec9b0',
      warning: '#dcdcaa',
      danger: '#f44747',
      muted: '#808080'
    }
  }
};
