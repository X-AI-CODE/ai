/**
 * 工具函数集
 */

/**
 * 格式化时间
 */
export function formatTime(timestamp) {
  if (!timestamp) return '未知';

  const date = new Date(typeof timestamp === 'number' ? timestamp : Date.parse(timestamp));
  const now = Date.now();
  const diff = now - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;

  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const dayStr = date.getDate().toString().padStart(2, '0');

  if (year === new Date().getFullYear()) {
    return `${month}-${dayStr}`;
  }
  return `${year}-${month}-${dayStr}`;
}

/**
 * 格式化文件大小
 */
export function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i];
}

/**
 * 防抖函数
 */
export function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * 节流函数
 */
export function throttle(fn, interval = 300) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= interval) {
      last = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 生成短ID
 */
export function shortId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

/**
 * 深度克隆
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 检测文件类型
 */
export function getFileType(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const types = {
    code: ['js', 'ts', 'py', 'java', 'c', 'cpp', 'go', 'rs', 'rb', 'php', 'swift', 'kt'],
    markup: ['html', 'css', 'scss', 'less', 'xml', 'svg', 'wxml', 'wxss'],
    data: ['json', 'yaml', 'yml', 'toml', 'ini', 'csv', 'sql'],
    doc: ['md', 'txt', 'rst', 'doc', 'docx', 'pdf'],
    image: ['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp'],
    config: ['gitignore', 'gitattributes', 'editorconfig', 'eslintrc', 'prettierrc', 'env']
  };

  for (const [type, exts] of Object.entries(types)) {
    if (exts.includes(ext)) return type;
  }
  return 'other';
}

/**
 * 获取文件图标
 */
export function getFileIcon(fileName, isDirectory) {
  if (isDirectory) return '📁';

  const ext = fileName.split('.').pop().toLowerCase();
  const icons = {
    js: '📜', ts: '📘', json: '📋', md: '📝',
    html: '🌐', css: '🎨', scss: '🎨',
    py: '🐍', java: '☕', go: '🔵', rs: '🦀',
    png: '🖼️', jpg: '🖼️', gif: '🖼️', svg: '🎭',
    sh: '⚡', yml: '⚙️', yaml: '⚙️', toml: '⚙️',
    gitignore: '🚫', lock: '🔒',
    wxml: '📱', wxss: '🎨', wxs: '📱'
  };

  return icons[ext] || '📄';
}

/**
 * 显示操作确认
 */
export function confirmAction(title, content, confirmText = '确认') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmText,
      confirmColor: '#0366d6',
      success: (res) => resolve(res.confirm)
    });
  });
}

/**
 * 显示Toast
 */
export function showToast(title, icon = 'none', duration = 2000) {
  wx.showToast({ title, icon, duration });
}

/**
 * 显示Loading
 */
export function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

export function hideLoading() {
  wx.hideLoading();
}
