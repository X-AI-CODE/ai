/**
 * AudioManager.js
 * 游戏音频和特效音效管理
 */

import { Adapter } from './Adapter.js';

export class AudioManager {
  constructor() {
    this.enabled = true;
    this.bgmContext = null;
    this.sfxPool = {};
    this.currentBgm = '';
    this.init();
  }

  init() {
    this.enabled = Adapter.getStorage('family_saga_audio_enabled', true);
  }

  toggleAudio() {
    this.enabled = !this.enabled;
    Adapter.setStorage('family_saga_audio_enabled', this.enabled);
    if (!this.enabled && this.bgmContext) {
      if (typeof this.bgmContext.pause === 'function') this.bgmContext.pause();
    } else if (this.enabled && this.bgmContext) {
      if (typeof this.bgmContext.play === 'function') this.bgmContext.play();
    }
    return this.enabled;
  }

  playBGM(name) {
    if (!this.enabled || this.currentBgm === name) return;
    this.currentBgm = name;

    if (Adapter.isWeChat && typeof wx.createInnerAudioContext === 'function') {
      if (this.bgmContext) {
        try { this.bgmContext.stop(); } catch (e) {}
      } else {
        this.bgmContext = wx.createInnerAudioContext();
        this.bgmContext.loop = true;
      }
      // 在小游戏中若不存在真实音频文件，可以避免报错抛出
      try {
        this.bgmContext.src = `res/audio/bgm_${name}.mp3`;
        this.bgmContext.play();
      } catch (e) {
        console.log(`[Audio] BGM play: ${name}`);
      }
    } else {
      console.log(`[Audio] Play BGM: ${name}`);
    }
  }

  playSFX(name) {
    if (!this.enabled) return;
    if (Adapter.isWeChat && typeof wx.createInnerAudioContext === 'function') {
      try {
        const sfx = wx.createInnerAudioContext();
        sfx.src = `res/audio/sfx_${name}.mp3`;
        sfx.play();
        sfx.onEnded(() => sfx.destroy());
      } catch (e) {
        console.log(`[Audio] SFX: ${name}`);
      }
    } else {
      // 浏览器 WebAudio 合成简易音效反馈（可选）或控制台打印
      this.playSynthSFX(name);
    }
  }

  playSynthSFX(name) {
    if (typeof window !== 'undefined' && window.AudioContext) {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (name === 'click') {
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(300, now + 0.08);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
          osc.start(now);
          osc.stop(now + 0.08);
        } else if (name === 'levelUp' || name === 'victory') {
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(660, now + 0.1);
          osc.frequency.setValueAtTime(880, now + 0.2);
          gain.gain.setValueAtTime(0.15, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
          osc.start(now);
          osc.stop(now + 0.4);
        } else {
          osc.frequency.setValueAtTime(300, now);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
          osc.start(now);
          osc.stop(now + 0.1);
        }
      } catch (e) {}
    }
  }
}
