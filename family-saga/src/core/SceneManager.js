/**
 * SceneManager.js
 * Three.js 3D/2.5D 视觉渲染管理中心
 * 负责领地俯视场景、修仙对决侧视场景与官场 8x8 战棋俯视沙盘场景的创建与平滑切换
 */

import * as THREE from '../../libs/three.module.js';
import { Adapter } from './Adapter.js';

export class SceneManager {
  constructor(context, canvas) {
    this.context = context;
    this.canvas = canvas || (typeof GameGlobal !== 'undefined' ? GameGlobal.canvas : null);
    this.currentMode = 'territory'; // 'territory', 'xianxia_battle', 'official_battle'
    this.renderer = null;
    this.scene = null;
    this.camera = null;
    this.clock = new THREE.Clock();

    // 各场景内部模型和粒子对象池
    this.territoryGroup = null;
    this.xianxiaGroup = null;
    this.officialGroup = null;
    this.clanWalkerList = [];
    this.particleSystem = null;
    this.battleAnimations = [];

    this.initWebGL();
  }

  initWebGL() {
    if (!this.canvas) return;
    try {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      const info = Adapter.getSystemInfo();
      this.renderer.setSize(info.windowWidth, info.windowHeight, false);
      this.renderer.setPixelRatio(Math.min(2, info.pixelRatio || 1));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    } catch (e) {
      console.log('[SceneManager] WebGL 初始化失败或处于无头仿真环境:', e);
      this.renderer = null;
    }

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a2e3b); // 深青空色

    this.camera = new THREE.PerspectiveCamera(45, (this.canvas ? this.canvas.width / this.canvas.height : 375 / 667), 0.1, 1000);

    // 全局环境光和主平行光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff5e6, 0.85);
    dirLight.position.set(25, 45, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    this.scene.add(dirLight);

    // 初始化领地场景
    this.buildTerritoryScene();
    this.switchScene('territory');
  }

  // 1. 构建家族领地场景 (Q版 3D/2.5D 庄园)
  buildTerritoryScene() {
    this.territoryGroup = new THREE.Group();

    // 领地地面草坪
    const groundGeo = new THREE.CylinderGeometry(28, 30, 2, 8);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x4d8c57 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.territoryGroup.add(ground);

    // 中央青石台阶与广场
    const plazaGeo = new THREE.CylinderGeometry(10, 11, 0.3, 8);
    const plazaMat = new THREE.MeshLambertMaterial({ color: 0xc8c8c8 });
    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.y = 0.1;
    plaza.receiveShadow = true;
    this.territoryGroup.add(plaza);

    // 5处核心建筑 Q版方块模型位置分列四周
    const buildingPositions = [
      { id: 'spiritVein_or_manorShop', name: '主要产出庄园', pos: [-12, 1, -10], color: 0xd4af37 },
      { id: 'alchemyLab_or_academy', name: '丹房/书院', pos: [12, 1, -10], color: 0x9370db },
      { id: 'cultivationRoom_or_training', name: '修炼室/演武场', pos: [-14, 1, 6], color: 0x3cb371 },
      { id: 'sutraVault_or_treasury', name: '藏经阁/通事库', pos: [14, 1, 6], color: 0x4682b4 },
      { id: 'ancestralShrine', name: '家族祠堂', pos: [0, 2, -14], color: 0xb22222 }
    ];

    buildingPositions.forEach((item) => {
      // 建筑主体
      const bGeo = new THREE.BoxGeometry(5, 5, 5);
      const bMat = new THREE.MeshLambertMaterial({ color: item.color });
      const bMesh = new THREE.Mesh(bGeo, bMat);
      bMesh.position.set(item.pos[0], item.pos[1] + 2.5, item.pos[2]);
      bMesh.castShadow = true;
      bMesh.receiveShadow = true;

      // 古风屋顶 (四棱锥)
      const rGeo = new THREE.ConeGeometry(4.2, 3.5, 4);
      const rMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.position.y = 4.2;
      rMesh.rotation.y = Math.PI / 4;
      bMesh.add(rMesh);

      bMesh.userData = { isBuilding: true, id: item.id, name: item.name };
      this.territoryGroup.add(bMesh);
    });

    // 几位来回散步的 Q 版族人 (小方块小人)
    for (let i = 0; i < 4; i++) {
      const walker = this.createQChibiCharacter(0x88ccff);
      walker.position.set(Math.random() * 16 - 8, 0.8, Math.random() * 16 - 8);
      this.territoryGroup.add(walker);
      this.clanWalkerList.push({
        mesh: walker,
        target: new THREE.Vector3(Math.random() * 20 - 10, 0.8, Math.random() * 20 - 10),
        speed: 0.05 + Math.random() * 0.05
      });
    }

    // 漂浮的仙气灵子 / 飘叶系统
    const partCount = 60;
    const partGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(partCount * 3);
    for (let i = 0; i < partCount * 3; i += 3) {
      posArr[i] = Math.random() * 40 - 20;
      posArr[i + 1] = Math.random() * 15 + 1;
      posArr[i + 2] = Math.random() * 40 - 20;
    }
    partGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    const partMat = new THREE.PointsMaterial({ color: 0xaaffff, size: 0.6, transparent: true, opacity: 0.7 });
    this.particleSystem = new THREE.Points(partGeo, partMat);
    this.territoryGroup.add(this.particleSystem);

    this.scene.add(this.territoryGroup);
  }

  createQChibiCharacter(clothColor = 0xffffff) {
    const group = new THREE.Group();
    // 头部
    const headGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xffe0bd });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.6;
    group.add(head);

    // 身体
    const bodyGeo = new THREE.BoxGeometry(1.0, 1.3, 0.8);
    const bodyMat = new THREE.MeshLambertMaterial({ color: clothColor });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    group.add(body);

    group.scale.set(0.8, 0.8, 0.8);
    return group;
  }

  // 2. 构建修仙对决 3D 侧视场景
  buildXianxiaScene() {
    if (this.xianxiaGroup) return;
    this.xianxiaGroup = new THREE.Group();

    // 悬浮比武台
    const stageGeo = new THREE.CylinderGeometry(15, 12, 1.5, 12);
    const stageMat = new THREE.MeshLambertMaterial({ color: 0x3a404a });
    const stage = new THREE.Mesh(stageGeo, stageMat);
    stage.position.y = -0.75;
    this.xianxiaGroup.add(stage);

    // 我方主将 (左侧 (-6, 0, 0))
    const playerChibi = this.createQChibiCharacter(0x00bcd4);
    playerChibi.scale.set(1.5, 1.5, 1.5);
    playerChibi.position.set(-6, 0, 0);
    playerChibi.rotation.y = Math.PI / 2;
    this.xianxiaGroup.add(playerChibi);
    this.xianxiaPlayerMesh = playerChibi;

    // 我方法剑光环
    const ringGeo = new THREE.RingGeometry(1.8, 2.2, 16);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-6, 0.1, 0);
    this.xianxiaGroup.add(ring);
    this.xianxiaPlayerRing = ring;

    // 敌方 BOSS (右侧 (6, 0, 0))
    const bossChibi = this.createQChibiCharacter(0xd32f2f);
    bossChibi.scale.set(2.0, 2.0, 2.0);
    bossChibi.position.set(6, 0, 0);
    bossChibi.rotation.y = -Math.PI / 2;
    this.xianxiaGroup.add(bossChibi);
    this.xianxiaBossMesh = bossChibi;

    this.scene.add(this.xianxiaGroup);
  }

  // 3. 构建官场战棋 8x8 方格沙盘场景
  buildOfficialScene(battleInstance = null) {
    if (this.officialGroup) {
      this.scene.remove(this.officialGroup);
    }
    this.officialGroup = new THREE.Group();

    // 8x8 棋盘底座 (-14 ~ +14, 每个格子宽 3.5 单元)
    const boardGeo = new THREE.BoxGeometry(28, 1, 28);
    const boardMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = -0.5;
    this.officialGroup.add(board);

    // 绘制 8x8 交替格子
    for (let rx = 0; rx < 8; rx++) {
      for (let rz = 0; rz < 8; rz++) {
        const isDark = (rx + rz) % 2 === 1;
        const cellGeo = new THREE.BoxGeometry(3.3, 0.1, 3.3);
        const cellMat = new THREE.MeshLambertMaterial({ color: isDark ? 0xd2b48c : 0xfff8dc });
        const cellMesh = new THREE.Mesh(cellGeo, cellMat);
        // 将棋盘格下标 (0~7, 0~7) 转换为 3D 坐标
        cellMesh.position.set((rx - 3.5) * 3.5, 0.06, (rz - 3.5) * 3.5);
        this.officialGroup.add(cellMesh);
      }
    }

    // 根据 battleInstance 渲染单位旗帜与模型
    if (battleInstance && battleInstance.units) {
      battleInstance.units.forEach((u) => {
        if (!u.isAlive()) return;
        const color = u.team === 'player' ? 0x1e90ff : 0xd22222;
        const unitChibi = this.createQChibiCharacter(color);
        unitChibi.scale.set(1.2, 1.2, 1.2);
        unitChibi.position.set((u.x - 3.5) * 3.5, 0.1, (u.y - 3.5) * 3.5);
        unitChibi.userData = { unitId: u.id };
        this.officialGroup.add(unitChibi);
      });
    }

    this.scene.add(this.officialGroup);
  }

  // 切换显示哪个场景
  switchScene(mode, param = null) {
    this.currentMode = mode;
    if (this.territoryGroup) this.territoryGroup.visible = false;
    if (this.xianxiaGroup) this.xianxiaGroup.visible = false;
    if (this.officialGroup) this.officialGroup.visible = false;

    if (mode === 'territory') {
      if (this.territoryGroup) this.territoryGroup.visible = true;
      this.scene.background = new THREE.Color(0x1a2e3b);
      this.camera.position.set(0, 38, 38);
      this.camera.lookAt(0, 0, 0);
    } else if (mode === 'xianxia_battle') {
      this.buildXianxiaScene();
      this.xianxiaGroup.visible = true;
      this.scene.background = new THREE.Color(0x221122); // 紫暗战斗星空
      this.camera.position.set(0, 8, 24);
      this.camera.lookAt(0, 1, 0);
    } else if (mode === 'official_battle') {
      this.buildOfficialScene(param);
      this.officialGroup.visible = true;
      this.scene.background = new THREE.Color(0x2d3a2d); // 沉稳墨绿沙盘背景
      this.camera.position.set(0, 35, 22);
      this.camera.lookAt(0, 0, 2);
    }
  }

  // 触发修仙战斗特效动画
  triggerXianxiaEffect(type, isCrit = false) {
    if (!this.xianxiaGroup) return;

    if (type === 'sword') {
      // 创建一道飞剑从左 (-6) 射向右 (6)
      const sGeo = new THREE.BoxGeometry(2.5, 0.4, 0.4);
      const sMat = new THREE.MeshBasicMaterial({ color: isCrit ? 0xffea00 : 0x00ffff });
      const sword = new THREE.Mesh(sGeo, sMat);
      sword.position.set(-5, 2, 0);
      this.xianxiaGroup.add(sword);

      this.battleAnimations.push({
        type: 'translate',
        mesh: sword,
        startPos: new THREE.Vector3(-5, 2, 0),
        endPos: new THREE.Vector3(6, 2, 0),
        progress: 0,
        speed: 3.5,
        onComplete: () => {
          this.xianxiaGroup.remove(sword);
          if (this.xianxiaBossMesh) {
            this.xianxiaBossMesh.position.x += 0.8; // 击退后震动回调
          }
        }
      });
    } else if (type === 'lightning') {
      // 敌方上空降下金色雷霆
      const lGeo = new THREE.CylinderGeometry(0.5, 1.8, 16, 8);
      const lMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.9 });
      const bolt = new THREE.Mesh(lGeo, lMat);
      bolt.position.set(6, 12, 0);
      this.xianxiaGroup.add(bolt);

      this.battleAnimations.push({
        type: 'fade',
        mesh: bolt,
        progress: 0,
        speed: 2.0,
        onComplete: () => this.xianxiaGroup.remove(bolt)
      });
    } else if (type === 'heal') {
      // 我方头顶漂浮绿光治疗环
      const hGeo = new THREE.RingGeometry(1.0, 1.6, 16);
      const hMat = new THREE.MeshBasicMaterial({ color: 0x00ff7f, side: THREE.DoubleSide });
      const healRing = new THREE.Mesh(hGeo, hMat);
      healRing.rotation.x = -Math.PI / 2;
      healRing.position.set(-6, 3, 0);
      this.xianxiaGroup.add(healRing);

      this.battleAnimations.push({
        type: 'fade',
        mesh: healRing,
        progress: 0,
        speed: 1.5,
        onComplete: () => this.xianxiaGroup.remove(healRing)
      });
    } else if (type === 'enemyHit') {
      // 敌人扑向我方，然后回位
      if (this.xianxiaBossMesh) {
        this.battleAnimations.push({
          type: 'hop',
          mesh: this.xianxiaBossMesh,
          startPos: new THREE.Vector3(6, 0, 0),
          targetPos: new THREE.Vector3(-4, 0, 0),
          progress: 0,
          speed: 3.0
        });
      }
    }
  }

  // 触发战棋特效
  triggerTacticalEffect(gridX, gridY, effectType) {
    if (!this.officialGroup) return;
    const posX = (gridX - 3.5) * 3.5;
    const posZ = (gridY - 3.5) * 3.5;

    const geo = new THREE.SphereGeometry(1.5, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: effectType === 'fire' ? 0xff4500 : (effectType === 'heal' ? 0x00ff7f : 0xffff00) });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(posX, 2, posZ);
    this.officialGroup.add(sphere);

    this.battleAnimations.push({
      type: 'fade',
      mesh: sphere,
      progress: 0,
      speed: 2.5,
      onComplete: () => this.officialGroup.remove(sphere)
    });
  }

  // 主渲染与物理推演循环
  render() {
    if (!this.renderer || !this.scene || !this.camera) return;

    const delta = this.clock.getDelta();

    // 1. 领地族人散步动画
    if (this.currentMode === 'territory') {
      this.clanWalkerList.forEach((w) => {
        const dist = w.mesh.position.distanceTo(w.target);
        if (dist < 0.5) {
          w.target.set(Math.random() * 20 - 10, 0.8, Math.random() * 20 - 10);
        } else {
          const dir = w.target.clone().sub(w.mesh.position).normalize();
          w.mesh.position.add(dir.multiplyScalar(w.speed));
          w.mesh.lookAt(w.target.x, w.mesh.position.y, w.target.z);
        }
      });

      // 灵子漂浮旋转
      if (this.particleSystem) {
        this.particleSystem.rotation.y += delta * 0.08;
      }
    }

    // 2. 修仙战场光环自转
    if (this.currentMode === 'xianxia_battle' && this.xianxiaPlayerRing) {
      this.xianxiaPlayerRing.rotation.z += delta * 2;
      if (this.xianxiaBossMesh) {
        // 让未在播放行动动画的 Boss 归位
        if (this.xianxiaBossMesh.position.x > 6) {
          this.xianxiaBossMesh.position.x -= delta * 3;
        }
      }
    }

    // 3. 特效与动作动画池推演
    for (let i = this.battleAnimations.length - 1; i >= 0; i--) {
      const anim = this.battleAnimations[i];
      anim.progress += delta * anim.speed;
      if (anim.progress >= 1) {
        if (anim.onComplete) anim.onComplete();
        else if (anim.type === 'hop') anim.mesh.position.copy(anim.startPos);
        this.battleAnimations.splice(i, 1);
      } else {
        if (anim.type === 'translate') {
          anim.mesh.position.lerpVectors(anim.startPos, anim.endPos, anim.progress);
        } else if (anim.type === 'fade') {
          anim.mesh.scale.setScalar(1 + anim.progress * 1.5);
          if (anim.mesh.material) anim.mesh.material.opacity = 1 - anim.progress;
        } else if (anim.type === 'hop') {
          if (anim.progress < 0.5) {
            anim.mesh.position.lerpVectors(anim.startPos, anim.targetPos, anim.progress * 2);
          } else {
            anim.mesh.position.lerpVectors(anim.targetPos, anim.startPos, (anim.progress - 0.5) * 2);
          }
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}
