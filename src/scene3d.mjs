import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { computeRoamingCells, computeStageNumber } from './farmEngine.mjs?v=20261026_05';

/**
 * Helper tạo vật liệu Đất Sét Mềm (Soft Matte Claymorphism Shader)
 */
function createClayMaterial(hexColor, options = {}) {
  return new THREE.MeshPhysicalMaterial({
    color: hexColor,
    roughness: options.roughness ?? 0.68,
    metalness: 0.0,
    sheen: options.sheen ?? 0.16,
    sheenRoughness: 0.72,
    sheenColor: new THREE.Color('#ffffff'),
    clearcoat: options.clearcoat ?? 0.08,
    clearcoatRoughness: 0.45,
  });
}

function createEyeMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: '#221c24',
    roughness: 0.12,
    metalness: 0.0,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
}

/**
 * Lấy giờ thực tế tại Hà Nội (UTC+7 / Asia/Ho_Chi_Minh)
 */
export function getHanoiTimeInfo(overrideMode = 'auto') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const realHour = Number(parts.find((p) => p.type === 'hour')?.value ?? 12);
  const realMinute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  const timeString = `${String(realHour).padStart(2, '0')}:${String(realMinute).padStart(2, '0')}`;

  let effectiveHour = realHour + realMinute / 60;
  if (overrideMode === 'day') effectiveHour = 10.5;
  else if (overrideMode === 'sunset') effectiveHour = 17.5;
  else if (overrideMode === 'night') effectiveHour = 20.5;

  let phase = 'day';
  let phaseLabel = 'Ban ngày';
  if (effectiveHour >= 5.25 && effectiveHour < 7.0) {
    phase = 'dawn';
    phaseLabel = 'Bình minh';
  } else if (effectiveHour >= 7.0 && effectiveHour < 16.75) {
    phase = 'day';
    phaseLabel = 'Ban ngày';
  } else if (effectiveHour >= 16.75 && effectiveHour < 18.5) {
    phase = 'sunset';
    phaseLabel = 'Hoàng hôn';
  } else {
    phase = 'night';
    phaseLabel = 'Buổi tối';
  }

  return {
    timeString,
    realHour,
    realMinute,
    effectiveHour,
    phase,
    phaseLabel,
  };
}

/**
 * Tính số cột x hàng cho mảnh đất hình chữ nhật/vuông theo tổng số m² (mỗi ô 1x1 = 1m²)
 * Hỗ trợ xoay tỉ lệ Dài x Rộng theo hướng người chơi mở rộng trên Map tổng 2.000m² (Đông/Tây vs Nam/Bắc)
 */
export function computeGridDimensions(totalM2, state = null) {
  const area = Math.max(10, totalM2 || 10);
  let f1 = Math.round(Math.sqrt(area));
  while (area % f1 !== 0 && f1 > 1) {
    f1 -= 1;
  }
  const f2 = area / f1;
  const longer = Math.max(f1, f2);
  const shorter = Math.min(f1, f2);
  const isNorthSouth =
    state && (state.lastExpansionDirection === 'south' || state.lastExpansionDirection === 'north');

  return {
    cols: isNorthSouth ? shorter : longer,
    rows: isNorthSouth ? longer : shorter,
    cellSize: 1.0, // Tỉ lệ thực 1:1 chuẩn: 1 đơn vị 3D = 1.0 mét ngoài đời (ô 1x1 = 1m²)
  };
}

export class CuteIslandScene {
  constructor(container, onSelectPlot) {
    this.container = container;
    this.onSelectPlot = onSelectPlot;
    this.animatedObjects = [];
    this.roamingAnimals = [];
    this.roamingStateByCell = new Map();
    this.lastAnimTime = 0;
    this.clouds = [];
    this.birds = [];
    this.selectedPlotIndex = 0;
    this.timeOverrideMode = 'auto';
    this.clock = new THREE.Clock();
    this.gltfLoader = new GLTFLoader();
    this.soilMesh = null;
    this.selectionOutline = null;
    this.gridInfo = { cols: 8, rows: 5, cellSize: 1.25 };

    this.initScene();
    this.initLights();
    this.initSkyCloudsAndBirds();
    this.initInteraction();
    this.updateHanoiSkyLighting();
    this.animate();
  }

  initScene() {
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#cbe7ff');
    this.scene.fog = new THREE.FogExp2('#cbe7ff', 0.008);

    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 350);
    const mobileScale = width < height ? 1.45 : 1.0;
    this.camera.position.set(10.5 * mobileScale, 9.8 * mobileScale, 13.0 * mobileScale);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2.12;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 85;

    this.islandGroup = new THREE.Group();
    this.scene.add(this.islandGroup);

    window.addEventListener('resize', () => this.handleResize());
  }

  initLights() {
    this.ambientLight = new THREE.AmbientLight('#fff8f0', 0.9);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight('#fffdf9', '#8bc34a', 0.9);
    this.hemiLight.position.set(0, 35, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight('#fff3e0', 1.35);
    this.dirLight.position.set(18, 28, 18);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 90;
    const d = 28;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0005;
    this.scene.add(this.dirLight);

    this.fillLight = new THREE.DirectionalLight('#e0f2fe', 0.55);
    this.fillLight.position.set(-16, 14, -14);
    this.scene.add(this.fillLight);
  }

  setTimeOverrideMode(mode) {
    this.timeOverrideMode = mode;
    return this.updateHanoiSkyLighting();
  }

  updateHanoiSkyLighting() {
    const info = getHanoiTimeInfo(this.timeOverrideMode);

    if (info.phase === 'day') {
      this.scene.background.set('#bfe3ff');
      this.scene.fog.color.set('#bfe3ff');
      this.ambientLight.color.set('#fff9f2');
      this.ambientLight.intensity = 0.9;
      this.hemiLight.color.set('#ffffff');
      this.hemiLight.groundColor.set('#9ccc65');
      this.hemiLight.intensity = 0.95;
      this.dirLight.color.set('#fff4dc');
      this.dirLight.intensity = 1.35;
      this.dirLight.position.set(18, 28, 16);
      if (this.celestialOrb) {
        this.celestialOrb.material.color.set('#ffe055');
        this.celestialOrb.position.set(-12, 9.5, -18);
      }
      if (this.starsGroup) this.starsGroup.visible = true;
    } else if (info.phase === 'dawn') {
      this.scene.background.set('#ffd6c0');
      this.scene.fog.color.set('#ffd6c0');
      this.ambientLight.color.set('#ffe8d6');
      this.ambientLight.intensity = 0.85;
      this.dirLight.color.set('#ffae70');
      this.dirLight.intensity = 1.2;
      this.dirLight.position.set(24, 15, 12);
      if (this.celestialOrb) {
        this.celestialOrb.material.color.set('#ffb74d');
        this.celestialOrb.position.set(12, 8.5, -18);
      }
      if (this.starsGroup) this.starsGroup.visible = true;
    } else if (info.phase === 'sunset') {
      this.scene.background.set('#f9b497');
      this.scene.fog.color.set('#f9b497');
      this.ambientLight.color.set('#ffe0cc');
      this.ambientLight.intensity = 0.85;
      this.dirLight.color.set('#ff8c52');
      this.dirLight.intensity = 1.25;
      this.dirLight.position.set(-24, 15, 14);
      if (this.celestialOrb) {
        this.celestialOrb.material.color.set('#ff7b3b');
        this.celestialOrb.position.set(-12, 8.5, -18);
      }
      if (this.starsGroup) this.starsGroup.visible = true;
    } else {
      // Buổi tối / Đêm Hà Nội: Bầu trời xanh tím ấm áp, trăng sáng + sao lấp lánh, đảo vẫn sáng rõ
      this.scene.background.set('#1f2c5c');
      this.scene.fog.color.set('#1f2c5c');
      this.ambientLight.color.set('#d8e4ff');
      this.ambientLight.intensity = 0.82;
      this.hemiLight.color.set('#b8d0ff');
      this.hemiLight.groundColor.set('#5c7a52');
      this.hemiLight.intensity = 0.8;
      this.dirLight.color.set('#ffe9b8');
      this.dirLight.intensity = 1.05;
      this.dirLight.position.set(14, 24, 16);
      if (this.celestialOrb) {
        this.celestialOrb.material.color.set('#fff6bd');
        this.celestialOrb.position.set(-12, 9.5, -18);
      }
      if (this.starsGroup) this.starsGroup.visible = true;
    }

    return info;
  }

  initSkyCloudsAndBirds() {
    // Mặt trời / Mặt trăng Clay 3D (đặt ngay trong tầm nhìn camera phía sau đảo)
    const orbGeo = new THREE.SphereGeometry(1.85, 32, 32);
    const orbMat = new THREE.MeshBasicMaterial({ color: '#ffe055', fog: false });
    this.celestialOrb = new THREE.Mesh(orbGeo, orbMat);
    this.celestialOrb.position.set(-12, 9.5, -18);
    this.scene.add(this.celestialOrb);

    // Bầu trời đầy sao lấp lánh (fog: false để không bị sương mù che khuất, phủ toàn bộ vòm trời trong khung hình camera)
    this.starsGroup = new THREE.Group();
    this.twinkleStars = [];
    const starColors = ['#fffbe0', '#ffe066', '#d8f3ff', '#ffd6ff'];

    for (let i = 0; i < 180; i++) {
      const color = starColors[i % starColors.length];
      const starMat = new THREE.MeshBasicMaterial({
        color,
        fog: false,
        transparent: true,
        opacity: 0.75 + (i % 4) * 0.08,
      });

      const isBigClayStar = i % 11 === 0;
      const geo = isBigClayStar
        ? new THREE.OctahedronGeometry(0.28 + (i % 3) * 0.08, 0)
        : new THREE.SphereGeometry(0.11 + (i % 3) * 0.045, 10, 10);

      const s = new THREE.Mesh(geo, starMat);
      // Phân bố đều khắp vòm trời 360 độ, đặc biệt ở độ cao y = -2 đến +24 ngay sau hòn đảo
      const theta = (i * 2.39996) % (Math.PI * 2);
      const radius = 24 + (i % 7) * 4.5;
      const height = -2 + ((i * 7) % 26);

      s.position.set(Math.cos(theta) * radius, height, Math.sin(theta) * radius - 6);
      this.starsGroup.add(s);
      this.twinkleStars.push({
        mesh: s,
        speed: 1.8 + (i % 5) * 0.65,
        phase: i * 0.7,
        isBig: isBigClayStar,
      });
    }
    this.scene.add(this.starsGroup);

    // 15 Đám mây Clay trắng bồng bềnh bay trên bầu trời
    const cloudMat = createClayMaterial('#ffffff', { roughness: 0.85 });
    const cloudCoords = [
      [-18, 8.5, -14, 1.1],
      [-9, 10.2, -18, 1.25],
      [2, 11.0, -20, 1.3],
      [14, 9.5, -15, 1.15],
      [22, 8.0, -8, 1.0],
      [-22, 7.5, -2, 1.05],
      [-15, 9.8, 10, 1.2],
      [18, 9.0, 11, 1.1],
      [8, 10.5, 16, 0.95],
      [-6, 8.2, 17, 1.0],
      [-25, 11.2, -12, 1.3],
      [25, 11.5, -16, 1.25],
      [-4, 12.5, -10, 0.9],
      [11, 12.0, -6, 0.85],
    ];

    cloudCoords.forEach(([x, y, z, scale], idx) => {
      const cloud = new THREE.Group();
      const puffs = [
        [0, 0, 0, 1.3],
        [1.1, -0.1, 0.15, 0.98],
        [-1.1, -0.14, -0.1, 0.95],
        [0.35, 0.52, -0.18, 0.88],
        [-0.4, 0.42, 0.2, 0.78],
      ];
      puffs.forEach(([px, py, pz, r]) => {
        const m = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), cloudMat);
        m.position.set(px, py, pz);
        cloud.add(m);
      });
      cloud.scale.setScalar(scale);
      cloud.position.set(x, y, z);
      this.scene.add(cloud);
      this.clouds.push({
        group: cloud,
        speed: 0.35 + (idx % 5) * 0.12,
        baseX: x,
        range: 4.5 + (idx % 4) * 1.5,
        phase: idx * 0.9,
      });
    });

    // Đàn chim Clay 3D vỗ cánh bay lượn trên bầu trời
    const birdColors = ['#5cc8ff', '#ff8fab', '#ffd166', '#ffffff', '#7bdff2', '#ffb5a7', '#9bf6ff', '#caffbf'];
    for (let i = 0; i < 8; i++) {
      const bird = this.createCuteClayBird(birdColors[i % birdColors.length]);
      this.scene.add(bird.group);
      this.birds.push({
        ...bird,
        radiusX: 9 + (i % 4) * 3.2,
        radiusZ: 7 + (i % 3) * 2.8,
        height: 5.8 + (i % 4) * 1.3,
        speed: 0.45 + (i % 3) * 0.12,
        phase: (i * Math.PI) / 4,
      });
    }
  }

  createCuteClayBird(bodyHex) {
    const group = new THREE.Group();
    const bodyMat = createClayMaterial(bodyHex);
    const beakMat = createClayMaterial('#ff9f1c');
    const eyeMat = createEyeMaterial();

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), bodyMat);
    body.scale.set(0.9, 0.85, 1.35);
    group.add(body);

    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.15, 12), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.02, 0.28);
    group.add(beak);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 12), eyeMat);
    eyeL.position.set(-0.1, 0.06, 0.18);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.1;
    group.add(eyeL, eyeR);

    const wingGeo = new THREE.SphereGeometry(0.18, 16, 16);
    wingGeo.scale(1.3, 0.22, 0.75);

    const wingL = new THREE.Mesh(wingGeo, bodyMat);
    wingL.position.set(-0.22, 0.04, 0);
    const wingR = new THREE.Mesh(wingGeo, bodyMat);
    wingR.position.set(0.22, 0.04, 0);
    group.add(wingL, wingR);

    return { group, wingL, wingR };
  }

  initInteraction() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    let downPos = { x: 0, y: 0 };
    this.renderer.domElement.addEventListener('pointerdown', (e) => {
      downPos = { x: e.clientX, y: e.clientY };
    });

    this.renderer.domElement.addEventListener('pointerup', (e) => {
      const dist = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
      if (dist > 14 || !this.soilMesh) return;

      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const intersects = this.raycaster.intersectObject(this.soilMesh, false);
      if (intersects.length > 0) {
        const pt = intersects[0].point;
        const { cols, rows, cellSize } = this.gridInfo;
        const soilWidth = cols * cellSize;
        const soilDepth = rows * cellSize;

        const localX = pt.x + soilWidth / 2;
        const localZ = pt.z + soilDepth / 2;
        const col = Math.max(0, Math.min(cols - 1, Math.floor(localX / cellSize)));
        const row = Math.max(0, Math.min(rows - 1, Math.floor(localZ / cellSize)));
        const cellIndex = row * cols + col;

        this.selectedPlotIndex = cellIndex;
        if (this.onSelectPlot) {
          this.onSelectPlot(cellIndex);
        }
      }
    });
  }

  handleResize() {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  renderState(state, selectedPlotIndex = 0) {
    this.selectedPlotIndex = selectedPlotIndex;

    while (this.islandGroup.children.length > 0) {
      const child = this.islandGroup.children[0];
      this.islandGroup.remove(child);
    }
    this.animatedObjects = [];
    this.roamingAnimals = [];

    const totalM2 = Math.max(10, state.rentedAreaM2 || 40);
    const { cols, rows, cellSize } = computeGridDimensions(totalM2, state);
    this.gridInfo = { cols, rows, cellSize };

    const soilWidth = cols * cellSize;
    const soilDepth = rows * cellSize;
    const grassMargin = 2.6;
    const islandWidth = soilWidth + grassMargin * 2;
    const islandDepth = soilDepth + grassMargin * 2;

    // 1. Khối Đảo Vuông/Chữ Nhật (Thảm cỏ viền ngoài + Đáy đất đá phía dưới)
    const grassGeo = new THREE.BoxGeometry(islandWidth, 0.9, islandDepth);
    const grassMat = createClayMaterial('#7ed957');
    const grassPlatform = new THREE.Mesh(grassGeo, grassMat);
    grassPlatform.position.y = -0.45;
    grassPlatform.receiveShadow = true;
    this.islandGroup.add(grassPlatform);

    const baseGeo = new THREE.BoxGeometry(islandWidth * 0.88, 1.8, islandDepth * 0.88);
    const baseMat = createClayMaterial('#b88b66');
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = -1.75;
    this.islandGroup.add(baseMesh);

    const subBaseGeo = new THREE.BoxGeometry(islandWidth * 0.65, 1.4, islandDepth * 0.65);
    const subBaseMesh = new THREE.Mesh(subBaseGeo, createClayMaterial('#9e7352'));
    subBaseMesh.position.y = -3.2;
    this.islandGroup.add(subBaseMesh);

    // 2. Mảnh Đất Màu Nâu Liền Mạch Ở Giữa (Không chia thành các ụ tròn rời rạc)
    // Tỉ lệ chuẩn: mỗi 1x1 (cellSize x cellSize) tương đương 1m² đất thực tế
    const soilGeo = new THREE.BoxGeometry(soilWidth, 0.24, soilDepth);
    const soilMat = createClayMaterial('#7c5236', { roughness: 0.82 });
    this.soilMesh = new THREE.Mesh(soilGeo, soilMat);
    this.soilMesh.position.y = 0.12;
    this.soilMesh.receiveShadow = true;
    this.islandGroup.add(this.soilMesh);

    // 3. Khung Sáng Nhẹ Chỉ Đánh Dấu Vị Trí 1m² Đang Chọn Trên Mảnh Đất Nâu
    const selCol = selectedPlotIndex % cols;
    const selRow = Math.floor(selectedPlotIndex / cols);
    if (selRow < rows) {
      const selX = -soilWidth / 2 + (selCol + 0.5) * cellSize;
      const selZ = -soilDepth / 2 + (selRow + 0.5) * cellSize;

      const cursorGeo = new THREE.BoxGeometry(cellSize * 0.96, 0.05, cellSize * 0.96);
      const cursorMat = new THREE.MeshBasicMaterial({
        color: '#ffd166',
        transparent: true,
        opacity: 0.45,
      });
      this.selectionOutline = new THREE.Mesh(cursorGeo, cursorMat);
      this.selectionOutline.position.set(selX, 0.26, selZ);
      this.islandGroup.add(this.selectionOutline);
    }

    // 4. Một Vài Cây To Cute Clay Trang Trí Xung Quanh Ngoài Rìa Mảnh Đất (Cao ~2.8m - 3.4m)
    const rimX = soilWidth / 2 + grassMargin * 0.52;
    const rimZ = soilDepth / 2 + grassMargin * 0.52;
    const treePlacements = [
      [-rimX, -rimZ, 1.85],
      [rimX, -rimZ, 1.95],
      [-rimX, rimZ, 1.75],
      [rimX, rimZ, 1.8],
      [0, -rimZ - 0.15, 2.05],
      [-rimX - 0.1, 0, 1.7],
      [rimX + 0.1, 0, 1.75],
    ];
    treePlacements.forEach(([tx, tz, scale]) => {
      const tree = this.createClayTree();
      tree.scale.setScalar(scale);
      tree.position.set(tx, 0, tz);
      this.islandGroup.add(tree);
    });

    // 5. Hiển Thị Các Cây Trồng / Vật Nuôi / Công Trình Theo Đúng Tỉ Lệ Thực Tế (1 unit = 1m)
    const activeCellKeys = new Set();

    for (let idx = 0; idx < totalM2; idx++) {
      const plot = state.plots[idx];
      if (!plot || !plot.item) continue;

      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const px = -soilWidth / 2 + (col + 0.5) * cellSize;
      const pz = -soilDepth / 2 + (row + 0.5) * cellSize;

      const item3D = this.createCuteClayItemModel(plot.item, idx, state, cols, rows);
      item3D.position.set(px, 0.24, pz);
      this.islandGroup.add(item3D);

      // Nếu là thú nuôi trên cạn (livestock nhưng không phải cá bơi dưới ao): cho phép chạy loanh quanh khắp khu đất (hoặc trong khu rào)
      if (
        plot.item.category === 'livestock' &&
        !plot.item.requiresPond &&
        plot.item.id !== 'fish_carp'
      ) {
        const key = `${idx}-${plot.item.id}`;
        activeCellKeys.add(key);

        const roamCells = computeRoamingCells(state, idx, cols, rows);
        const validTargets = roamCells.map((c) => ({
          index: c.index,
          col: c.col,
          row: c.row,
          x: -soilWidth / 2 + (c.col + 0.5) * cellSize,
          z: -soilDepth / 2 + (c.row + 0.5) * cellSize,
        }));

        // Tốc độ thực tế ngoài đời (1 unit = 1m): gà/thỏ/vịt/lợn đi dạo ~0.24 - 0.38 m/s (từng quãng ngắn 1-2m rồi dừng)
        const realSpeedByAnimal = {
          baby_chick: 0.26,
          chicken_coop: 0.32,
          duck: 0.25,
          rabbit_hutch: 0.38,
          sheep: 0.24,
          pig: 0.27,
        };
        const animalSpeed = realSpeedByAnimal[plot.item.id] || 0.3;

        let roamState = this.roamingStateByCell.get(key);
        const reachableIndices = new Set(roamCells.map((c) => c.index));

        if (!roamState || !reachableIndices.has(roamState.currentCellIndex)) {
          // Chọn điểm đến đầu tiên cách 1-2m thay vì phóng vèo qua cả cánh đồng
          const nearTargets = validTargets.filter(
            (t) => Math.hypot(t.x - px, t.z - pz) <= 2.2
          );
          const pool = nearTargets.length > 0 ? nearTargets : validTargets;
          const initialTarget = pool[Math.floor(Math.random() * pool.length)] || {
            index: idx,
            x: px,
            z: pz,
          };
          roamState = {
            currX: px,
            currZ: pz,
            targetX: initialTarget.x,
            targetZ: initialTarget.z,
            currentCellIndex: initialTarget.index,
            waitTimer: 0.5 + (idx % 4) * 0.4,
            speed: animalSpeed,
            phase: idx * 1.3,
            rotY: 0,
          };
          this.roamingStateByCell.set(key, roamState);
        }

        item3D.position.set(roamState.currX, 0.24, roamState.currZ);
        item3D.rotation.y = roamState.rotY;

        this.roamingAnimals.push({
          mesh: item3D,
          roamState,
          validTargets,
        });
      }
    }

    // Dọn dẹp trạng thái cũ nếu ô thú nuôi đã thu hoạch/xóa
    for (const k of this.roamingStateByCell.keys()) {
      if (!activeCellKeys.has(k)) {
        this.roamingStateByCell.delete(k);
      }
    }
  }

  createClayTree() {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.18, 0.65, 16, 24),
      createClayMaterial('#9e6b47')
    );
    trunk.position.y = 0.45;
    trunk.castShadow = true;
    group.add(trunk);

    const leafMat1 = createClayMaterial('#4ec95b');
    const leafMat2 = createClayMaterial('#6ee07a');
    const c1 = new THREE.Mesh(new THREE.SphereGeometry(0.65, 32, 32), leafMat1);
    c1.position.y = 1.15;
    c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 32), leafMat2);
    c2.position.set(0.26, 1.55, 0.14);
    const c3 = new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 32), leafMat2);
    c3.position.set(-0.28, 1.42, -0.14);
    group.add(c1, c2, c3);
    return group;
  }

  createCuteClayChicken({
    bodyColor = '#ffffff',
    wingColor = null,
    tailColor = null,
    combColor = '#ff3b4e',
    beakColor = '#ff9f1c',
    combScale = 1.0,
  } = {}) {
    const group = new THREE.Group();
    const bodyMat = createClayMaterial(bodyColor);
    const wingMat = createClayMaterial(wingColor || bodyColor);
    const tailMat = createClayMaterial(tailColor || wingColor || bodyColor);
    const combMat = createClayMaterial(combColor);
    const beakMat = createClayMaterial(beakColor);
    const eyeMat = createEyeMaterial();
    const highlightMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const blushMat = createClayMaterial('#ff8fab');

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 36, 36), bodyMat);
    body.scale.set(1.0, 1.12, 0.98);
    body.position.y = 0.36;
    body.castShadow = true;
    group.add(body);

    const combLobes = [
      [0, 0.73, 0.08, 0.075 * combScale],
      [0, 0.75, -0.02, 0.085 * combScale],
      [0, 0.71, -0.12, 0.068 * combScale],
    ];
    combLobes.forEach(([cx, cy, cz, r]) => {
      const lobe = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), combMat);
      lobe.scale.set(0.68, 1.15, 1.0);
      lobe.position.set(cx, cy, cz);
      group.add(lobe);
    });

    const upperBeak = new THREE.Mesh(new THREE.SphereGeometry(0.068, 20, 20), beakMat);
    upperBeak.scale.set(0.95, 0.68, 1.25);
    upperBeak.position.set(0, 0.43, 0.31);
    group.add(upperBeak);

    const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.042 * combScale, 16, 16), combMat);
    wattle.scale.set(0.8, 1.2, 0.8);
    wattle.position.set(0, 0.36, 0.3);
    group.add(wattle);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.044, 20, 20), eyeMat);
    eyeL.position.set(-0.115, 0.48, 0.285);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.115;
    group.add(eyeL, eyeR);

    const sparkL = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 12), highlightMat);
    sparkL.position.set(-0.102, 0.498, 0.322);
    const sparkR = sparkL.clone();
    sparkR.position.x = 0.128;
    group.add(sparkL, sparkR);

    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), blushMat);
    cheekL.scale.set(1.25, 0.78, 0.4);
    cheekL.position.set(-0.165, 0.42, 0.265);
    const cheekR = cheekL.clone();
    cheekR.position.x = 0.165;
    group.add(cheekL, cheekR);

    const wingGeo = new THREE.SphereGeometry(0.13, 24, 24);
    const wingL = new THREE.Mesh(wingGeo, wingMat);
    wingL.scale.set(0.45, 0.85, 1.15);
    wingL.position.set(-0.31, 0.35, 0.02);
    wingL.rotation.z = 0.22;
    const wingR = wingL.clone();
    wingR.position.x = 0.31;
    wingR.rotation.z = -0.22;
    group.add(wingL, wingR);

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 20), tailMat);
    tail.scale.set(0.85, 1.1, 1.1);
    tail.position.set(0, 0.42, -0.29);
    group.add(tail);

    const footGeo = new THREE.CapsuleGeometry(0.038, 0.08, 12, 16);
    const footL = new THREE.Mesh(footGeo, beakMat);
    footL.rotation.x = Math.PI / 2;
    footL.position.set(-0.11, 0.04, 0.06);
    const footR = footL.clone();
    footR.position.x = 0.11;
    group.add(footL, footR);

    return group;
  }

  createCuteClayPig({
    bodyColor = '#ff8fab',
    snoutColor = '#ff4d79',
    earColor = '#ff7597',
    hoofColor = '#d90429',
  } = {}) {
    const group = new THREE.Group();
    const bodyMat = createClayMaterial(bodyColor);
    const snoutMat = createClayMaterial(snoutColor);
    const earMat = createClayMaterial(earColor);
    const hoofMat = createClayMaterial(hoofColor);
    const nostrilMat = createClayMaterial('#590d22');
    const eyeMat = createEyeMaterial();
    const highlightMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const blushMat = createClayMaterial('#ff4d79');

    // Thân lợn tròn mũm mĩm
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 32), bodyMat);
    body.scale.set(1.06, 0.92, 1.24);
    body.position.set(0, 0.34, -0.04);
    body.castShadow = true;
    group.add(body);

    // Đầu lợn phúng phính
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 32, 32), bodyMat);
    head.scale.set(1.05, 0.98, 0.98);
    head.position.set(0, 0.42, 0.24);
    head.castShadow = true;
    group.add(head);

    // Chiếc mũi lợn ỉn tròn dẹt đặc trưng
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.09, 24), snoutMat);
    snout.rotation.x = Math.PI / 2;
    snout.scale.set(1.18, 1.0, 0.85);
    snout.position.set(0, 0.38, 0.47);
    group.add(snout);

    // 2 lỗ mũi nhỏ xinh
    for (const nx of [-0.042, 0.042]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), nostrilMat);
      nostril.scale.set(0.85, 1.2, 0.6);
      nostril.position.set(nx, 0.38, 0.515);
      group.add(nostril);
    }

    // Đôi mắt đen láy long lanh
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), eyeMat);
      eye.position.set(side * 0.11, 0.48, 0.44);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), highlightMat);
      spark.position.set(side * 0.11 + 0.01, 0.495, 0.472);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 14), blushMat);
      cheek.scale.set(1.2, 0.75, 0.4);
      cheek.position.set(side * 0.17, 0.39, 0.41);
      group.add(eye, spark, cheek);
    }

    // Đôi tai lợn cụp về phía trước đáng yêu
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.095, 18, 18), earMat);
      ear.scale.set(0.85, 1.15, 0.38);
      ear.position.set(side * 0.17, 0.61, 0.26);
      ear.rotation.z = side * -0.45;
      ear.rotation.x = 0.35;
      group.add(ear);
    }

    // Đuôi lợn xoắn tròn phía sau
    const tailBase = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.02, 12, 20, Math.PI * 1.65), earMat);
    tailBase.position.set(0, 0.42, -0.44);
    tailBase.rotation.y = Math.PI / 2;
    group.add(tailBase);

    // 4 chân ngắn mập mạp + móng hồng đậm
    const legCoords = [
      [-0.15, 0.12, 0.14],
      [0.15, 0.12, 0.14],
      [-0.15, 0.12, -0.22],
      [0.15, 0.12, -0.22],
    ];
    legCoords.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.12, 12, 16), bodyMat);
      leg.position.set(lx, ly, lz);
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.062, 0.045, 14), hoofMat);
      hoof.position.set(lx, 0.025, lz);
      group.add(leg, hoof);
    });

    return group;
  }

  createClayPondBase({ lotusPadCount = 2, showLotusBud = false, showLotusBloom = false } = {}) {
    const pond = new THREE.Group();
    const waterMat = createClayMaterial('#0ea5e9', {
      roughness: 0.16,
      clearcoat: 0.92,
      sheen: 0.1,
    });
    const deepRingMat = createClayMaterial('#0284c7', { roughness: 0.25, clearcoat: 0.7 });
    const stoneMat1 = createClayMaterial('#94a3b8');
    const stoneMat2 = createClayMaterial('#cbd5e1');
    const woodMat = createClayMaterial('#a67148');
    const padMat = createClayMaterial('#22c55e');

    // Mặt nước ao xanh biếc bóng mượt
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.39, 0.08, 32), waterMat);
    basin.position.y = 0.04;
    pond.add(basin);

    const innerRipple = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.012, 10, 28), deepRingMat);
    innerRipple.rotation.x = Math.PI / 2;
    innerRipple.position.y = 0.082;
    pond.add(innerRipple);

    // Kè đá cuội sông Hồng bo tròn quanh bờ ao
    const pebbleCount = 14;
    for (let i = 0; i < pebbleCount; i++) {
      const ang = (i * Math.PI * 2) / pebbleCount;
      const r = 0.42;
      const stone = new THREE.Mesh(
        new THREE.SphereGeometry(i % 2 === 0 ? 0.085 : 0.072, 14, 14),
        i % 2 === 0 ? stoneMat1 : stoneMat2
      );
      stone.scale.set(1.2, 0.68, 0.95);
      stone.position.set(Math.cos(ang) * r, 0.055, Math.sin(ang) * r);
      stone.rotation.y = -ang;
      pond.add(stone);
    }

    // Cầu ao gỗ nhỏ xinh bên bờ
    const dock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.24), woodMat);
    dock.position.set(0, 0.095, 0.34);
    pond.add(dock);

    // Lá sen / lá súng nổi trên mặt ao
    const padPositions = [
      [-0.2, 0.086, -0.15, 0.095],
      [0.21, 0.086, -0.12, 0.085],
      [-0.16, 0.086, 0.16, 0.08],
    ];
    for (let p = 0; p < Math.min(lotusPadCount, padPositions.length); p++) {
      const [px, py, pz, pr] = padPositions[p];
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, 0.016, 18), padMat);
      pad.position.set(px, py, pz);
      pond.add(pad);
    }

    if (showLotusBud || showLotusBloom) {
      const petalMat = createClayMaterial('#f472b6');
      const centerMat = createClayMaterial('#facc15');
      const lotus = new THREE.Group();
      lotus.position.set(-0.2, 0.1, -0.15);

      if (showLotusBud && !showLotusBloom) {
        const bud = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 14), petalMat);
        bud.scale.set(0.85, 1.35, 0.85);
        bud.position.y = 0.04;
        lotus.add(bud);
      } else if (showLotusBloom) {
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), centerMat);
        core.position.y = 0.03;
        lotus.add(core);
        for (let k = 0; k < 6; k++) {
          const a = (k * Math.PI * 2) / 6;
          const petal = new THREE.Mesh(new THREE.SphereGeometry(0.048, 12, 12), petalMat);
          petal.scale.set(0.7, 0.5, 1.3);
          petal.position.set(Math.sin(a) * 0.05, 0.035, Math.cos(a) * 0.05);
          petal.rotation.y = a;
          petal.rotation.x = 0.35;
          lotus.add(petal);
        }
      }
      pond.add(lotus);
    }

    return pond;
  }

  createCuteClayFish({ bodyHex = '#ff8800', finHex = '#ffb703', scale = 1.0 } = {}) {
    const fish = new THREE.Group();
    const bodyMat = createClayMaterial(bodyHex, { roughness: 0.32, clearcoat: 0.55 });
    const finMat = createClayMaterial(finHex, { roughness: 0.4, clearcoat: 0.35 });
    const eyeMat = createEyeMaterial();

    // Thân cá chép vàng tròn mập
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 18), bodyMat);
    body.scale.set(0.78, 0.68, 1.55);
    fish.add(body);

    // Vây lưng
    const dorsal = new THREE.Mesh(new THREE.SphereGeometry(0.032, 12, 12), finMat);
    dorsal.scale.set(0.35, 0.85, 1.3);
    dorsal.position.set(0, 0.045, -0.01);
    fish.add(dorsal);

    // Đuôi cá xòe chữ V
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.048, 14, 14), finMat);
    tail.scale.set(0.32, 0.95, 1.15);
    tail.position.set(0, 0.008, -0.11);
    fish.add(tail);

    // 2 vây ngực hai bên
    for (const side of [-1, 1]) {
      const pec = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 10), finMat);
      pec.scale.set(1.15, 0.3, 0.75);
      pec.position.set(side * 0.052, -0.01, 0.02);
      pec.rotation.z = side * -0.3;
      fish.add(pec);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.014, 10, 10), eyeMat);
      eye.position.set(side * 0.038, 0.015, 0.068);
      fish.add(eye);
    }

    fish.scale.setScalar(scale);
    return fish;
  }

  createCuteClayAnimal({ bodyColor, earColor, beakColor, combColor, isBunny = false }) {
    if (!isBunny) {
      return this.createCuteClayChicken({ bodyColor, combColor, beakColor });
    }
    const group = new THREE.Group();
    const bodyMat = createClayMaterial(bodyColor);
    const eyeMat = createEyeMaterial();
    const blushMat = createClayMaterial('#ff8fab');

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 32, 32), bodyMat);
    body.scale.set(1.05, 0.92, 1.15);
    body.position.y = 0.22;
    body.castShadow = true;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.21, 32, 32), bodyMat);
    head.position.set(0, 0.44, 0.12);
    head.castShadow = true;
    group.add(body, head);

    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 16, 16), eyeMat);
    eyeL.position.set(-0.085, 0.47, 0.3);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.085;
    group.add(eyeL, eyeR);

    const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 16), blushMat);
    cheekL.scale.set(1.2, 0.8, 0.4);
    cheekL.position.set(-0.13, 0.41, 0.29);
    const cheekR = cheekL.clone();
    cheekR.position.x = 0.13;
    group.add(cheekL, cheekR);

    const innerEarMat = createClayMaterial(earColor || '#ffafcc');
    const earGeo = new THREE.CapsuleGeometry(0.055, 0.22, 16, 24);
    const earL = new THREE.Mesh(earGeo, bodyMat);
    earL.position.set(-0.08, 0.72, 0.1);
    earL.rotation.z = 0.15;
    const earR = new THREE.Mesh(earGeo, innerEarMat);
    earR.position.set(0.08, 0.72, 0.1);
    earR.rotation.z = -0.15;
    group.add(earL, earR);

    return group;
  }

  /**
   * Tạo mầm non Giai đoạn 1 (Mô đất ươm + thân mầm + 2 lá mầm xanh non)
   */
  createClaySproutStage1(leafHex = '#7be876') {
    const sprout = new THREE.Group();
    const moundMat = createClayMaterial('#6e472b');
    const stemMat = createClayMaterial('#b7f76d');
    const cotyledonMat = createClayMaterial(leafHex);

    const mound = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), moundMat);
    mound.scale.set(1.3, 0.45, 1.3);
    mound.position.y = 0.04;
    sprout.add(mound);

    const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, 0.14, 10, 14), stemMat);
    stem.position.y = 0.14;
    sprout.add(stem);

    for (const dir of [-1, 1]) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), cotyledonMat);
      leaf.scale.set(1.25, 0.35, 0.8);
      leaf.position.set(dir * 0.08, 0.23, 0);
      leaf.rotation.z = dir * -0.45;
      sprout.add(leaf);
    }
    return sprout;
  }

  /**
   * Tạo bông hoa 5 cánh nhỏ xinh cho Giai đoạn 3 (Trổ hoa) của cây ăn quả / cà chua / dâu tây
   */
  createClayBlossom(petalHex = '#ffffff', centerHex = '#ffd12b', scale = 1.0) {
    const flower = new THREE.Group();
    const petalMat = createClayMaterial(petalHex);
    const centerMat = createClayMaterial(centerHex);

    const center = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 12), centerMat);
    flower.add(center);

    for (let i = 0; i < 5; i++) {
      const ang = (i * Math.PI * 2) / 5;
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 12), petalMat);
      p.scale.set(0.9, 0.45, 1.25);
      p.position.set(Math.sin(ang) * 0.055, 0, Math.cos(ang) * 0.055);
      p.rotation.y = ang;
      flower.add(p);
    }
    flower.scale.setScalar(scale);
    return flower;
  }

  /**
   * Tạo ổ rơm vàng ấm áp có số lượng trứng thay đổi theo Giai đoạn 1 -> 5
   */
  createClayEggNest(eggCount = 0, eggHex = '#fff5eb') {
    const nest = new THREE.Group();
    const strawMat = createClayMaterial('#eab308');
    const eggMat = createClayMaterial(eggHex, { roughness: 0.35, clearcoat: 0.35 });

    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.09, 20), strawMat);
    ring.position.y = 0.045;
    nest.add(ring);

    const eggPositions = [
      [0, 0.1, 0],
      [-0.08, 0.1, 0.05],
      [0.08, 0.1, 0.05],
      [-0.06, 0.1, -0.07],
      [0.06, 0.1, -0.07],
      [0, 0.14, 0.02],
      [-0.11, 0.1, -0.01],
    ];
    for (let i = 0; i < Math.min(eggCount, eggPositions.length); i++) {
      const [ex, ey, ez] = eggPositions[i];
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.052, 14, 14), eggMat);
      egg.scale.set(0.88, 1.22, 0.88);
      egg.position.set(ex, ey, ez);
      egg.rotation.z = (i - 2) * 0.12;
      nest.add(egg);
    }
    return nest;
  }

  createCuteClayItemModel(item, idx = 0, state = null, cols = 8, rows = 5, options = {}) {
    const isPreview = Boolean(options.isPreview);
    const wrapper = new THREE.Group();
    const isBuilding =
      item.category === 'building' || item.category === 'fence' || item.category === 'decor';
    const stage =
      item.growthStage || computeStageNumber(item.growthProgress ?? 100, isBuilding);
    const stageScaleMap = { 1: 0.55, 2: 0.7, 3: 0.84, 4: 0.94, 5: 1.0 };
    const scaleRatio = stageScaleMap[stage] || 1.0;

    // Mỗi loại cây trồng & vật nuôi có đủ 5 hình dáng 3D biến đổi theo Giai đoạn 1 -> 5:
    switch (item.id) {
      case 'cabbage': {
        // Rau cải ngọt Bok Choy (IconScout #12045887) - 5 Giai đoạn 3D
        const stemMat = createClayMaterial('#f4f7e6');
        const leafMat = createClayMaterial('#3bc954');
        const innerLeafMat = createClayMaterial('#7be876');
        const budMat = createClayMaterial('#d9f99d');

        const buildBokChoyByStage = (st) => {
          if (st === 1) {
            return this.createClaySproutStage1('#7be876');
          }
          const bokChoy = new THREE.Group();
          // GĐ 2: thân nhỏ, 2 lá non; GĐ 3: 3 lá vừa; GĐ 4: 4 lá + bẹ phình; GĐ 5: 4 lá to + lõi non + búp vàng
          const bulbRadius = st === 2 ? 0.13 : st === 3 ? 0.18 : st === 4 ? 0.22 : 0.25;
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(bulbRadius, 20, 20), stemMat);
          bulb.scale.set(1.0, 1.15, 1.0);
          bulb.position.y = bulbRadius * 0.85;
          bokChoy.add(bulb);

          const leafCount = st === 2 ? 2 : st === 3 ? 3 : 4;
          for (let a = 0; a < leafCount; a++) {
            const angle = (a * Math.PI * 2) / leafCount + 0.35;
            const leafGroup = new THREE.Group();
            leafGroup.rotation.y = angle;

            const petiole = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.18, 10, 14), stemMat);
            petiole.position.set(0.1, 0.24, 0);
            petiole.rotation.z = -0.32;

            const blade = new THREE.Mesh(
              new THREE.SphereGeometry(st >= 4 ? 0.19 : 0.14, 18, 18),
              st === 2 ? innerLeafMat : leafMat
            );
            blade.scale.set(0.55, 1.15, 1.05);
            blade.position.set(0.19, 0.44, 0);
            blade.rotation.z = -0.5;

            leafGroup.add(petiole, blade);
            bokChoy.add(leafGroup);
          }

          if (st >= 3) {
            const heart = new THREE.Mesh(
              new THREE.CapsuleGeometry(st === 5 ? 0.105 : 0.08, 0.2, 12, 16),
              innerLeafMat
            );
            heart.position.y = 0.38;
            bokChoy.add(heart);
          }
          if (st === 5) {
            // Búp non căng mọng ở chính giữa khi đạt 100% thu hoạch
            const crownBud = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), budMat);
            crownBud.position.y = 0.52;
            bokChoy.add(crownBud);
          }
          return bokChoy;
        };

        if (isPreview) {
          const hero = buildBokChoyByStage(stage);
          hero.scale.setScalar(stage === 1 ? 1.65 : 1.35 * scaleRatio);
          wrapper.add(hero);
        } else {
          const coords = [-0.28, 0, 0.28];
          for (const ox of coords) {
            for (const oz of coords) {
              const head = buildBokChoyByStage(stage);
              head.scale.setScalar(scaleRatio * 0.28);
              head.position.set(ox, 0, oz);
              head.rotation.y = (ox + oz) * 1.7;
              wrapper.add(head);
            }
          }
        }
        break;
      }

      case 'lettuce': {
        // Xà lách xoăn (Lettuce - IconScout #5220315) - 5 Giai đoạn 3D
        const coreMat = createClayMaterial('#b7f76d');
        const midLeafMat = createClayMaterial('#6ede47');
        const outerLeafMat = createClayMaterial('#45bf34');

        const buildLettuceByStage = (st) => {
          if (st === 1) {
            return this.createClaySproutStage1('#b7f76d');
          }
          const lettuce = new THREE.Group();

          if (st >= 3) {
            const coreR = st === 3 ? 0.14 : st === 4 ? 0.19 : 0.23;
            const core = new THREE.Mesh(new THREE.SphereGeometry(coreR, 20, 20), coreMat);
            core.scale.set(1.05, 0.88, 1.05);
            core.position.y = 0.22;
            lettuce.add(core);
          }

          const innerCount = st === 2 ? 3 : st === 3 ? 4 : 5;
          for (let i = 0; i < innerCount; i++) {
            const angle = (i * Math.PI * 2) / innerCount;
            const innerPetal = new THREE.Group();
            innerPetal.rotation.y = angle;

            const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 18, 18), midLeafMat);
            leaf.scale.set(0.95, 0.65, 0.52);
            leaf.position.set(0, 0.22, 0.16);
            leaf.rotation.x = -0.38;
            innerPetal.add(leaf);

            if (st >= 4) {
              const frillL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 14), coreMat);
              frillL.position.set(-0.08, 0.28, 0.22);
              const frillR = frillL.clone();
              frillR.position.x = 0.08;
              innerPetal.add(frillL, frillR);
            }
            lettuce.add(innerPetal);
          }

          if (st >= 3) {
            const outerCount = st === 3 ? 4 : st === 4 ? 5 : 6;
            for (let i = 0; i < outerCount; i++) {
              const angle = (i * Math.PI * 2) / outerCount + 0.4;
              const outerPetal = new THREE.Group();
              outerPetal.rotation.y = angle;

              const blade = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), outerLeafMat);
              blade.scale.set(1.1, 0.48, 0.75);
              blade.position.set(0, 0.15, 0.26);
              blade.rotation.x = -0.22;
              outerPetal.add(blade);

              if (st === 5) {
                const curl = new THREE.Mesh(new THREE.SphereGeometry(0.095, 14, 14), midLeafMat);
                curl.scale.set(1.3, 0.6, 0.8);
                curl.position.set(0, 0.2, 0.36);
                outerPetal.add(curl);
              }
              lettuce.add(outerPetal);
            }
          }

          return lettuce;
        };

        if (isPreview) {
          const hero = buildLettuceByStage(stage);
          hero.scale.setScalar(stage === 1 ? 1.65 : 1.35 * scaleRatio);
          wrapper.add(hero);
        } else {
          const coords = [-0.28, 0, 0.28];
          for (const ox of coords) {
            for (const oz of coords) {
              const head = buildLettuceByStage(stage);
              head.scale.setScalar(scaleRatio * 0.29);
              head.position.set(ox, 0, oz);
              head.rotation.y = ox * 2.1 + oz * 1.3;
              wrapper.add(head);
            }
          }
        }
        break;
      }

      case 'malabar_spinach': {
        // Rau mồng tơi (Spinach - IconScout #12202803) - 5 Giai đoạn 3D
        const stemMat = createClayMaterial('#7ce374');
        const darkLeafMat = createClayMaterial('#1b9946', { roughness: 0.48, clearcoat: 0.22 });
        const lushLeafMat = createClayMaterial('#29ba58', { roughness: 0.5, clearcoat: 0.2 });

        const buildSpinachByStage = (st) => {
          if (st === 1) {
            return this.createClaySproutStage1('#29ba58');
          }
          const bunch = new THREE.Group();

          const baseStem = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.16, 12, 16), stemMat);
          baseStem.position.y = 0.14;
          bunch.add(baseStem);

          const allLeaves = [
            [0, 0.42, 0.05, -0.25, darkLeafMat, 1.05],
            [2.5, 0.38, 0.11, -0.44, lushLeafMat, 0.98],
            [1.25, 0.36, 0.12, -0.48, darkLeafMat, 0.95],
            [3.75, 0.35, 0.12, -0.5, lushLeafMat, 0.92],
            [5.0, 0.37, 0.11, -0.45, darkLeafMat, 0.96],
          ];
          const count = st === 2 ? 2 : st === 3 ? 3 : st === 4 ? 4 : 5;

          allLeaves.slice(0, count).forEach(([rotY, h, offsetZ, tiltX, mat, sc]) => {
            const stalkGroup = new THREE.Group();
            stalkGroup.rotation.y = rotY;

            const petiole = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.22, 10, 14), stemMat);
            petiole.position.set(0, 0.2, offsetZ * 0.6);
            petiole.rotation.x = tiltX * 0.7;

            const blade = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), mat);
            blade.scale.set(0.88, 1.18, 0.32);
            blade.position.set(0, h, offsetZ + 0.08);
            blade.rotation.x = tiltX;

            const vein = new THREE.Mesh(new THREE.CapsuleGeometry(0.024, 0.24, 8, 12), stemMat);
            vein.position.set(0, h - 0.02, offsetZ + 0.12);
            vein.rotation.x = tiltX;

            stalkGroup.add(petiole, blade, vein);
            stalkGroup.scale.setScalar(sc);
            bunch.add(stalkGroup);
          });

          if (st === 5) {
            // Chồi ngọn mồng tơi vươn cao ở giai đoạn 5
            const topShoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.22, 10, 14), stemMat);
            topShoot.position.set(0, 0.52, 0);
            bunch.add(topShoot);
          }

          return bunch;
        };

        if (isPreview) {
          const hero = buildSpinachByStage(stage);
          hero.scale.setScalar(stage === 1 ? 1.65 : 1.35 * scaleRatio);
          wrapper.add(hero);
        } else {
          const coords = [-0.28, 0, 0.28];
          for (const ox of coords) {
            for (const oz of coords) {
              const bunch = buildSpinachByStage(stage);
              bunch.scale.setScalar(scaleRatio * 0.29);
              bunch.position.set(ox, 0, oz);
              bunch.rotation.y = (ox - oz) * 1.9;
              wrapper.add(bunch);
            }
          }
        }
        break;
      }

      case 'white_fence': {
        const fenceMat = createClayMaterial('#fffdf9');
        const centerPost = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.065, 0.52, 16, 24),
          fenceMat
        );
        centerPost.position.set(0, 0.31, 0);
        wrapper.add(centerPost);

        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const hasFenceAt = (c, r) => {
          if (isPreview || !state || c < 0 || c >= cols || r < 0 || r >= rows) return false;
          const p = state.plots[r * cols + c];
          return Boolean(p && p.item && p.item.id === 'white_fence');
        };

        const dirs = [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ];
        let connectedCount = 0;

        dirs.forEach(([dc, dr]) => {
          if (hasFenceAt(col + dc, row + dr)) {
            connectedCount += 1;
            for (const railY of [0.22, 0.44]) {
              const rail = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.036, 0.5, 12, 20),
                fenceMat
              );
              if (dc !== 0) {
                rail.rotation.z = Math.PI / 2;
                rail.position.set(dc * 0.25, railY, 0);
              } else {
                rail.rotation.x = Math.PI / 2;
                rail.position.set(0, railY, dr * 0.25);
              }
              wrapper.add(rail);
            }
          }
        });

        if (connectedCount === 0) {
          for (const i of [-0.36, 0.36]) {
            const p = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.48, 16, 20), fenceMat);
            p.position.set(i, 0.28, 0);
            wrapper.add(p);
          }
          for (const railY of [0.22, 0.44]) {
            const rail = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.82, 16, 20), fenceMat);
            rail.rotation.z = Math.PI / 2;
            rail.position.set(0, railY, 0);
            wrapper.add(rail);
          }
        }
        if (isPreview) {
          wrapper.scale.setScalar(1.18);
        }
        break;
      }

      case 'name_sign': {
        const woodMat = createClayMaterial('#d49a6a');
        const boardMat = createClayMaterial('#ffe8c2');
        const heartMat = createClayMaterial('#ff5d8f');
        const signGroup = new THREE.Group();
        const post = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.65, 16, 24), woodMat);
        post.position.y = 0.38;
        const board = new THREE.Mesh(new THREE.SphereGeometry(0.45, 28, 28), boardMat);
        board.scale.set(1.15, 0.62, 0.22);
        board.position.y = 0.72;
        const heart = new THREE.Mesh(new THREE.SphereGeometry(0.1, 20, 20), heartMat);
        heart.position.set(0, 0.72, 0.1);
        signGroup.add(post, board, heart);
        signGroup.scale.setScalar(isPreview ? 1.05 : 0.78);
        wrapper.add(signGroup);
        break;
      }

      case 'cherry_tomato': {
        // Cây cà chua bi (Tomato Plant - IconScout #9710037) - 5 Giai đoạn 3D:
        // GĐ 1: Mầm non 2 lá -> GĐ 2: Cây con lá xanh -> GĐ 3: Trổ hoa vàng 5 cánh -> GĐ 4: Đậu quả xanh -> GĐ 5: Chín đỏ & cam
        const stemMat = createClayMaterial('#45b842');
        const leafMat = createClayMaterial('#32a83c');
        const lightLeafMat = createClayMaterial('#5cd65c');
        const greenTomatoMat = createClayMaterial('#84cc16', { roughness: 0.4, clearcoat: 0.3 });
        const redTomatoMat = createClayMaterial('#ff3b30', { roughness: 0.32, clearcoat: 0.48 });
        const orangeTomatoMat = createClayMaterial('#ff9500', { roughness: 0.35, clearcoat: 0.42 });
        const calyxMat = createClayMaterial('#26782c');

        const buildTomatoFruit = (radius, mat) => {
          const fruitGroup = new THREE.Group();
          const berry = new THREE.Mesh(new THREE.SphereGeometry(radius, 18, 18), mat);
          berry.scale.set(1.04, 0.94, 1.04);
          fruitGroup.add(berry);

          for (let s = 0; s < 4; s++) {
            const sepal = new THREE.Mesh(
              new THREE.CapsuleGeometry(radius * 0.16, radius * 0.42, 8, 10),
              calyxMat
            );
            sepal.rotation.z = Math.PI / 2.3;
            sepal.rotation.y = (s * Math.PI) / 2;
            sepal.position.y = radius * 0.85;
            fruitGroup.add(sepal);
          }
          return fruitGroup;
        };

        const buildTomatoPlantByStage = (st) => {
          if (st === 1) {
            return this.createClaySproutStage1('#5cd65c');
          }
          const plant = new THREE.Group();
          const stemHeight = st === 2 ? 0.42 : st === 3 ? 0.62 : 0.76;

          const mainStem = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.052, stemHeight, 14, 20),
            stemMat
          );
          mainStem.position.y = stemHeight * 0.55;
          plant.add(mainStem);

          for (let t = 0; t < 3; t++) {
            const topLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), lightLeafMat);
            topLeaf.scale.set(0.65, 0.35, 1.25);
            const ang = (t * Math.PI * 2) / 3;
            topLeaf.position.set(Math.sin(ang) * 0.09, stemHeight + 0.06, Math.cos(ang) * 0.09);
            topLeaf.rotation.y = ang;
            topLeaf.rotation.x = -0.35;
            plant.add(topLeaf);
          }

          const allBranches = [
            { rotY: 0.2, y: 0.28, len: 0.25, fruitMat: redTomatoMat, r: 0.115 },
            { rotY: 1.85, y: 0.4, len: 0.24, fruitMat: redTomatoMat, r: 0.11 },
            { rotY: 3.4, y: 0.52, len: 0.22, fruitMat: orangeTomatoMat, r: 0.1 },
            { rotY: 4.9, y: 0.64, len: 0.2, fruitMat: redTomatoMat, r: 0.105 },
          ];
          const activeBranches = st === 2 ? allBranches.slice(0, 2) : allBranches;

          activeBranches.forEach(({ rotY, y, len, fruitMat, r }) => {
            const branch = new THREE.Group();
            branch.position.y = Math.min(y, stemHeight - 0.05);
            branch.rotation.y = rotY;

            const twig = new THREE.Mesh(new THREE.CapsuleGeometry(0.028, len, 10, 14), stemMat);
            twig.rotation.z = -Math.PI / 2.4;
            twig.position.set(len * 0.5, 0.04, 0);
            branch.add(twig);

            const tipLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 14), leafMat);
            tipLeaf.scale.set(1.25, 0.32, 0.72);
            tipLeaf.position.set(len + 0.05, 0.06, 0);
            tipLeaf.rotation.z = -0.25;
            branch.add(tipLeaf);

            for (const side of [-1, 1]) {
              const sideLeaf = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 12), lightLeafMat);
              sideLeaf.scale.set(0.75, 0.3, 1.15);
              sideLeaf.position.set(len * 0.65, 0.05, side * 0.1);
              sideLeaf.rotation.x = side * 0.25;
              branch.add(sideLeaf);
            }

            if (st === 3) {
              // Giai đoạn 3: Nở hoa cà chua 5 cánh màu vàng tươi
              const flower1 = this.createClayBlossom('#fde047', '#ca8a04', 0.95);
              flower1.position.set(len * 0.6, -0.04, 0.06);
              flower1.rotation.x = Math.PI / 3;
              const flower2 = this.createClayBlossom('#fde047', '#ca8a04', 0.85);
              flower2.position.set(len * 0.82, -0.02, -0.05);
              flower2.rotation.x = Math.PI / 3;
              branch.add(flower1, flower2);
            } else if (st === 4) {
              // Giai đoạn 4: Đậu quả cà chua non màu xanh cốm
              const f1 = buildTomatoFruit(r * 0.82, greenTomatoMat);
              f1.position.set(len * 0.58, -0.07, 0.07);
              const f2 = buildTomatoFruit(r * 0.72, greenTomatoMat);
              f2.position.set(len * 0.82, -0.05, -0.06);
              branch.add(f1, f2);
            } else if (st >= 5) {
              // Giai đoạn 5: Quả chín đỏ bóng & cam rực rỡ
              const f1 = buildTomatoFruit(r, fruitMat);
              f1.position.set(len * 0.58, -0.08, 0.07);
              const f2 = buildTomatoFruit(
                r * 0.86,
                fruitMat === redTomatoMat ? orangeTomatoMat : redTomatoMat
              );
              f2.position.set(len * 0.82, -0.05, -0.06);
              branch.add(f1, f2);
            }

            plant.add(branch);
          });

          return plant;
        };

        if (isPreview) {
          const hero = buildTomatoPlantByStage(stage);
          hero.scale.setScalar(stage === 1 ? 1.65 : 1.22);
          wrapper.add(hero);
        } else {
          for (const [vx, vz, rot] of [
            [-0.22, -0.22, 0.2],
            [0.22, -0.22, 1.7],
            [-0.22, 0.22, 3.1],
            [0.22, 0.22, 4.5],
          ]) {
            const p = buildTomatoPlantByStage(stage);
            p.scale.setScalar(stage === 1 ? 0.5 : 0.76 * scaleRatio);
            p.position.set(vx, 0, vz);
            p.rotation.y = rot;
            wrapper.add(p);
          }
        }
        break;
      }

      case 'sunflower': {
        const stemMat = createClayMaterial('#56c449');
        const petalMat = createClayMaterial('#ffd12b');
        const centerMat = createClayMaterial('#6f4528');
        const offsets = isPreview
          ? [[0, 0, 1.05]]
          : [
              [-0.22, -0.15, 0.78],
              [0.22, -0.12, 0.72],
              [0, 0.2, 0.82],
            ];
        offsets.forEach(([ox, oz, sc], i) => {
          const sf = new THREE.Group();
          const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.85, 14, 20), stemMat);
          stem.position.y = 0.48;
          const petals = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), petalMat);
          petals.scale.set(1.0, 1.0, 0.32);
          petals.position.set(0, 0.96, 0.05);
          const center = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 20), centerMat);
          center.scale.set(1.0, 1.0, 0.42);
          center.position.set(0, 0.96, 0.09);
          sf.add(stem, petals, center);
          sf.scale.setScalar(sc);
          sf.position.set(ox, 0, oz);
          wrapper.add(sf);
          if (!isPreview) {
            this.animatedObjects.push({ mesh: sf, type: 'sway', offset: i * 0.6 });
          }
        });
        break;
      }

      case 'chicken_coop': {
        // Gà mái đẻ trứng - 5 Giai đoạn 3D:
        // GĐ 1: Mới thả + ổ rơm trống -> GĐ 2: Ổ 1 trứng -> GĐ 3: Ổ 3 trứng -> GĐ 4: Ổ 5 trứng -> GĐ 5: Gà béo mượt + Ổ 7 trứng đầy ắp
        const henGroup = new THREE.Group();
        const hen = this.createCuteClayChicken({
          bodyColor: '#ffffff',
          combColor: '#ff3b4e',
          beakColor: '#ff9f1c',
        });
        const henScaleByStage = { 1: 0.82, 2: 0.88, 3: 0.94, 4: 0.98, 5: 1.04 };
        hen.scale.setScalar(henScaleByStage[stage] || 1.0);
        henGroup.add(hen);

        const eggCounts = { 1: 0, 2: 1, 3: 3, 4: 5, 5: 7 };
        const nest = this.createClayEggNest(eggCounts[stage] ?? 7, '#ffedd5');
        nest.position.set(0.38, 0, -0.12);
        henGroup.add(nest);

        henGroup.scale.setScalar(isPreview ? 1.15 : 0.42);
        wrapper.add(henGroup);
        break;
      }

      case 'baby_chick': {
        // Gà vàng thả vườn (105 ngày - 5 Giai đoạn 3D với bộ lông VÀNG ÓNG chuẩn gà vàng Việt Nam):
        // GĐ 1: Gà con lông vàng mới nở kèm vỏ trứng -> GĐ 2: Gà con vàng tươi -> GĐ 3: Gà choai vàng cam -> GĐ 4: Gà tơ vàng rơm -> GĐ 5: Gà ta lông vàng óng trưởng thành
        const chickGroup = new THREE.Group();
        const colorByStage = {
          1: {
            body: '#ffd000',
            wing: '#ffaa00',
            tail: '#ff9500',
            comb: '#ff4d6d',
            beak: '#f77f00',
            combScale: 0.55,
            sc: 0.62,
          },
          2: {
            body: '#ffc300',
            wing: '#f48c06',
            tail: '#e85d04',
            comb: '#ff3355',
            beak: '#e85d04',
            combScale: 0.72,
            sc: 0.78,
          },
          3: {
            body: '#ffb703',
            wing: '#e85d04',
            tail: '#dc2f02',
            comb: '#ef233c',
            beak: '#d97706',
            combScale: 0.88,
            sc: 0.94,
          },
          4: {
            body: '#f59e0b',
            wing: '#d97706',
            tail: '#b45309',
            comb: '#e11d48',
            beak: '#b45309',
            combScale: 1.0,
            sc: 1.08,
          },
          5: {
            body: '#eab308',
            wing: '#d97706',
            tail: '#9a3412',
            comb: '#dc2626',
            beak: '#b45309',
            combScale: 1.15,
            sc: 1.24,
          },
        };
        const cfg = colorByStage[stage] || colorByStage[5];
        const bird = this.createCuteClayChicken({
          bodyColor: cfg.body,
          wingColor: cfg.wing,
          tailColor: cfg.tail,
          combColor: cfg.comb,
          beakColor: cfg.beak,
          combScale: cfg.combScale,
        });
        bird.scale.setScalar(cfg.sc);
        chickGroup.add(bird);

        if (stage === 1) {
          // Nửa vỏ trứng vừa nở đặt cạnh chú gà vàng sơ sinh
          const shellMat = createClayMaterial('#fff3d6');
          const shell = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 16, 12, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55),
            shellMat
          );
          shell.position.set(0.28, 0.14, 0.08);
          shell.rotation.z = 0.35;
          chickGroup.add(shell);
        }

        chickGroup.scale.setScalar(isPreview ? 1.05 : 0.32);
        wrapper.add(chickGroup);
        break;
      }

      case 'pig': {
        // Lợn ỉn thảo mộc (120 ngày - 5 Giai đoạn 3D):
        // GĐ 1: Lợn sữa mới cai + bát sữa -> GĐ 2: Lợn con tập ăn -> GĐ 3: Lợn choai + cỏ thảo mộc -> GĐ 4: Lợn tơ phổng phao -> GĐ 5: Lợn thảo mộc trưởng thành + bắp ngô vàng
        const pigGroup = new THREE.Group();
        const pigStageCfg = {
          1: { body: '#ff9ebb', snout: '#ff5c8a', ear: '#ff85a9', sc: 0.58 },
          2: { body: '#ff8fab', snout: '#ff4d79', ear: '#ff7597', sc: 0.74 },
          3: { body: '#ff7597', snout: '#f72585', ear: '#ff5c8a', sc: 0.90 },
          4: { body: '#ff6388', snout: '#e63966', ear: '#ff4d79', sc: 1.05 },
          5: { body: '#ff5c8a', snout: '#d90429', ear: '#e63966', sc: 1.20 },
        };
        const cfg = pigStageCfg[stage] || pigStageCfg[5];
        const pig = this.createCuteClayPig({
          bodyColor: cfg.body,
          snoutColor: cfg.snout,
          earColor: cfg.ear,
        });
        pig.scale.setScalar(cfg.sc);
        pigGroup.add(pig);

        if (stage === 1) {
          // Bát gỗ đựng sữa non cho lợn sữa Cấp 1
          const bowl = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.085, 0.06, 16),
            createClayMaterial('#b07d4f')
          );
          bowl.position.set(0.26, 0.03, 0.22);
          const milk = new THREE.Mesh(
            new THREE.CylinderGeometry(0.09, 0.09, 0.02, 16),
            createClayMaterial('#fffbeb')
          );
          milk.position.set(0.26, 0.055, 0.22);
          pigGroup.add(bowl, milk);
        } else if (stage === 3) {
          // Cụm lá thảo mộc xanh non cho lợn choai Cấp 3
          const herb = this.createClaySproutStage1('#22c55e');
          herb.scale.setScalar(0.8);
          herb.position.set(0.28, 0, 0.24);
          pigGroup.add(herb);
        } else if (stage === 5) {
          // Bắp ngô ngọt vàng óng & quả táo đỏ cho lợn thảo mộc trưởng thành Cấp 5
          const corn = new THREE.Mesh(
            new THREE.CapsuleGeometry(0.055, 0.14, 12, 16),
            createClayMaterial('#facc15')
          );
          corn.rotation.z = Math.PI / 2.2;
          corn.rotation.y = 0.4;
          corn.position.set(0.28, 0.06, 0.26);
          const apple = new THREE.Mesh(
            new THREE.SphereGeometry(0.068, 16, 16),
            createClayMaterial('#ef4444', { roughness: 0.35, clearcoat: 0.4 })
          );
          apple.position.set(-0.26, 0.065, 0.25);
          pigGroup.add(corn, apple);
        }

        pigGroup.scale.setScalar(isPreview ? 0.96 : 0.38);
        wrapper.add(pigGroup);
        break;
      }

      case 'fish_pond': {
        // Công trình Đào Ao Cá Sinh Thái (Yêu cầu >= 300m² đất)
        const pond = this.createClayPondBase({
          lotusPadCount: 3,
          showLotusBud: true,
        });
        pond.scale.setScalar(isPreview ? 1.35 : 1.05);
        wrapper.add(pond);
        break;
      }

      case 'fish_carp': {
        // Nuôi Cá chép vàng sông Hồng trong Ao sinh thái (5 Giai đoạn 3D từ Cá bột -> Cá lớn đầy ao & Hoa sen nở):
        const lotusPadByStage = { 1: 1, 2: 2, 3: 2, 4: 3, 5: 3 };
        const pondGroup = this.createClayPondBase({
          lotusPadCount: lotusPadByStage[stage] || 3,
          showLotusBud: stage === 4,
          showLotusBloom: stage === 5,
        });

        const fishSchool = new THREE.Group();
        fishSchool.position.y = 0.088;

        const fishSpecsByStage = {
          1: [
            { r: 0.15, ang: 0.4, sc: 0.48, body: '#fbbf24', fin: '#fde047' },
            { r: 0.18, ang: 3.5, sc: 0.45, body: '#f59e0b', fin: '#fde047' },
          ],
          2: [
            { r: 0.16, ang: 0.2, sc: 0.65, body: '#f59e0b', fin: '#fbbf24' },
            { r: 0.21, ang: 2.3, sc: 0.62, body: '#fb923c', fin: '#fde047' },
            { r: 0.14, ang: 4.4, sc: 0.60, body: '#fbbf24', fin: '#fef08a' },
          ],
          3: [
            { r: 0.18, ang: 0.0, sc: 0.82, body: '#f97316', fin: '#fbbf24' },
            { r: 0.22, ang: 2.1, sc: 0.78, body: '#f59e0b', fin: '#fde047' },
            { r: 0.16, ang: 4.2, sc: 0.80, body: '#ea580c', fin: '#fb923c' },
          ],
          4: [
            { r: 0.19, ang: 0.0, sc: 0.96, body: '#ea580c', fin: '#fbbf24' },
            { r: 0.23, ang: 1.6, sc: 0.92, body: '#f59e0b', fin: '#fde047' },
            { r: 0.17, ang: 3.2, sc: 0.94, body: '#f97316', fin: '#fdba74' },
            { r: 0.22, ang: 4.8, sc: 0.90, body: '#fbbf24', fin: '#fef08a' },
          ],
          5: [
            { r: 0.20, ang: 0.0, sc: 1.14, body: '#ea580c', fin: '#fbbf24' },
            { r: 0.24, ang: 1.25, sc: 1.08, body: '#f59e0b', fin: '#fde047' },
            { r: 0.16, ang: 2.5, sc: 1.10, body: '#dc2626', fin: '#fb923c' },
            { r: 0.23, ang: 3.75, sc: 1.06, body: '#f97316', fin: '#fde047' },
            { r: 0.18, ang: 5.0, sc: 1.12, body: '#d97706', fin: '#fef08a' },
          ],
        };

        const specs = fishSpecsByStage[stage] || fishSpecsByStage[5];
        specs.forEach(({ r, ang, sc, body, fin }) => {
          const fish = this.createCuteClayFish({ bodyHex: body, finHex: fin, scale: sc });
          fish.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
          // Hướng đầu cá tiếp tuyến theo chiều bơi tròn ngược chiều kim đồng hồ
          fish.rotation.y = -ang;
          fishSchool.add(fish);
        });

        pondGroup.add(fishSchool);
        pondGroup.scale.setScalar(isPreview ? 1.35 : 1.05);
        wrapper.add(pondGroup);
        if (!isPreview) {
          this.animatedObjects.push({ mesh: fishSchool, type: 'swim', offset: idx * 0.7 });
        }
        break;
      }

      case 'strawberry': {
        // Dâu tây Nhật Hana - 5 Giai đoạn 3D:
        // GĐ 1: Mầm non -> GĐ 2: Bụi lá xanh -> GĐ 3: Nở hoa trắng nhụy vàng -> GĐ 4: Quả dâu xanh cốm -> GĐ 5: Dâu chín đỏ mọng
        const leafMat = createClayMaterial('#4ad66d');
        const greenBerryMat = createClayMaterial('#bef264', { roughness: 0.45, clearcoat: 0.2 });
        const redBerryMat = createClayMaterial('#ff3366', { roughness: 0.42, clearcoat: 0.32 });

        const buildStrawberryByStage = (st) => {
          if (st === 1) {
            return this.createClaySproutStage1('#4ad66d');
          }
          const plant = new THREE.Group();
          const leaves = new THREE.Mesh(
            new THREE.SphereGeometry(st === 2 ? 0.25 : 0.34, 20, 20),
            leafMat
          );
          leaves.scale.set(1.2, 0.6, 1.2);
          leaves.position.y = 0.15;
          plant.add(leaves);

          if (st === 3) {
            const fl1 = this.createClayBlossom('#ffffff', '#facc15', 1.15);
            fl1.position.set(0.14, 0.28, 0.12);
            const fl2 = this.createClayBlossom('#ffffff', '#facc15', 1.05);
            fl2.position.set(-0.14, 0.26, 0.1);
            plant.add(fl1, fl2);
          } else if (st >= 4) {
            const mat = st === 4 ? greenBerryMat : redBerryMat;
            const r = st === 4 ? 0.105 : 0.135;
            for (const [bx, by, bz] of [
              [0.16, 0.22, 0.16],
              [-0.16, 0.2, 0.14],
              [0, 0.24, -0.16],
            ]) {
              const berry = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 18), mat);
              berry.scale.set(0.9, 1.22, 0.9);
              berry.position.set(bx, by, bz);
              plant.add(berry);
            }
          }
          return plant;
        };

        if (isPreview) {
          const hero = buildStrawberryByStage(stage);
          hero.scale.setScalar(stage === 1 ? 1.65 : 1.32);
          wrapper.add(hero);
        } else {
          for (const ox of [-0.24, 0.24]) {
            for (const oz of [-0.24, 0.24]) {
              const plant = buildStrawberryByStage(stage);
              plant.scale.setScalar(stage === 1 ? 0.48 : scaleRatio * 0.44);
              plant.position.set(ox, 0, oz);
              wrapper.add(plant);
            }
          }
        }
        break;
      }

      case 'rabbit_hutch': {
        // Thỏ trắng tai dài - 5 Giai đoạn 3D (từ thỏ con tai ngắn -> thỏ trưởng thành ôm củ cà rốt)
        const bunnyGroup = new THREE.Group();
        const bunny = this.createCuteClayAnimal({
          bodyColor: '#ffffff',
          earColor: '#ff8fab',
          isBunny: true,
        });
        const bunnySc = { 1: 0.58, 2: 0.72, 3: 0.85, 4: 0.95, 5: 1.06 }[stage] || 1.0;
        bunny.scale.setScalar(bunnySc);
        bunnyGroup.add(bunny);

        if (stage >= 4) {
          // Thêm củ cà rốt cam tươi có lá xanh trước mặt chú thỏ ở GĐ 4-5
          const carrotMat = createClayMaterial('#ff7b00');
          const leafMat = createClayMaterial('#4cd964');
          const snack = new THREE.Group();
          const root = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.24, 14), carrotMat);
          root.rotation.z = Math.PI / 2.2;
          root.position.set(0, 0.06, 0.34);
          const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), leafMat);
          leaf.position.set(-0.11, 0.08, 0.34);
          snack.add(root, leaf);
          if (stage === 5) {
            const snack2 = snack.clone();
            snack2.position.set(0.14, 0, -0.06);
            snack2.rotation.y = 0.5;
            bunnyGroup.add(snack2);
          }
          bunnyGroup.add(snack);
        }

        bunnyGroup.scale.setScalar(isPreview ? 1.22 : 0.38);
        wrapper.add(bunnyGroup);
        break;
      }

      case 'duck': {
        // Vịt bầu cổ xanh đẻ trứng - 5 Giai đoạn 3D (kèm ổ trứng vịt tăng từ 0 -> 7 quả)
        const duckGroup = new THREE.Group();
        const duck = new THREE.Group();
        const bodyMat = createClayMaterial('#ffffff');
        const headMat = createClayMaterial(stage <= 2 ? '#52b788' : '#2a9d8f');
        const billMat = createClayMaterial('#ff9f1c');
        const eyeMat = createEyeMaterial();

        const body = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 28), bodyMat);
        body.scale.set(0.95, 0.82, 1.25);
        body.position.y = 0.24;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 28), headMat);
        head.position.set(0, 0.48, 0.16);
        const bill = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 20), billMat);
        bill.scale.set(0.95, 0.45, 1.35);
        bill.position.set(0, 0.46, 0.36);

        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 16), eyeMat);
        eyeL.position.set(-0.085, 0.52, 0.31);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.085;

        duck.add(body, head, bill, eyeL, eyeR);
        const duckSc = { 1: 0.78, 2: 0.86, 3: 0.92, 4: 0.97, 5: 1.04 }[stage] || 1.0;
        duck.scale.setScalar(duckSc);
        duckGroup.add(duck);

        const eggCounts = { 1: 0, 2: 1, 3: 3, 4: 5, 5: 7 };
        const nest = this.createClayEggNest(eggCounts[stage] ?? 7, '#f0fdf4');
        nest.position.set(0.38, 0, -0.12);
        duckGroup.add(nest);

        duckGroup.scale.setScalar(isPreview ? 1.15 : 0.44);
        wrapper.add(duckGroup);
        break;
      }

      case 'sheep': {
        // Cừu bông trắng - 5 Giai đoạn 3D (Lớp lông bông mọc dày dần từ GĐ 1 -> GĐ 5 khổng lồ)
        const sheep = new THREE.Group();
        const woolMat = createClayMaterial('#ffffff');
        const faceMat = createClayMaterial('#4a3b32');
        const eyeMat = createEyeMaterial();
        const blushMat = createClayMaterial('#ff8fab');

        const allPuffs = [
          [0, 0.34, 0, stage === 1 ? 0.22 : 0.32],
          [-0.16, 0.38, -0.05, 0.22],
          [0.16, 0.38, -0.05, 0.22],
          [0, 0.46, -0.08, 0.24],
          [0, 0.56, 0.16, 0.16],
          [-0.18, 0.44, 0.08, 0.21],
          [0.18, 0.44, 0.08, 0.21],
          [0, 0.42, -0.22, 0.23],
        ];
        const puffCount = stage === 1 ? 1 : stage === 2 ? 3 : stage === 3 ? 5 : stage === 4 ? 6 : 8;
        allPuffs.slice(0, puffCount).forEach(([px, py, pz, r]) => {
          const p = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 24), woolMat);
          p.position.set(px, py, pz);
          sheep.add(p);
        });

        const face = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), faceMat);
        face.position.set(0, 0.42, 0.24);
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 16), eyeMat);
        eyeL.position.set(-0.075, 0.45, 0.39);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.075;
        const cheekL = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), blushMat);
        cheekL.position.set(-0.11, 0.4, 0.38);
        const cheekR = cheekL.clone();
        cheekR.position.x = 0.11;

        sheep.add(face, eyeL, eyeR, cheekL, cheekR);
        const sheepSc = { 1: 0.65, 2: 0.78, 3: 0.88, 4: 0.96, 5: 1.06 }[stage] || 1.0;
        sheep.scale.setScalar((isPreview ? 1.2 : 0.78) * sheepSc);
        wrapper.add(sheep);
        break;
      }

      case 'wood_coop': {
        const wallMat = createClayMaterial('#f4c07a');
        const roofMat = createClayMaterial('#ff5c5c');
        const doorMat = createClayMaterial('#5c3d28');
        const coopGroup = new THREE.Group();
        const house = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.68, 0.78), wallMat);
        house.position.y = 0.34;
        const roof = new THREE.Mesh(new THREE.ConeGeometry(0.74, 0.48, 4), roofMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.y = 0.9;
        const door = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.22, 16, 20), doorMat);
        door.position.set(0, 0.22, 0.38);
        coopGroup.add(house, roof, door);
        coopGroup.scale.setScalar(isPreview ? 0.92 : 1.0);
        wrapper.add(coopGroup);
        break;
      }

      case 'feed_trough': {
        const woodMat = createClayMaterial('#c98a4b');
        const grainMat = createClayMaterial('#ffd12b');
        const waterMat = createClayMaterial('#4cc9f0', { roughness: 0.2, clearcoat: 0.8 });

        const troughGroup = new THREE.Group();
        const trough = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.24, 0.38), woodMat);
        trough.position.set(-0.12, 0.12, 0);
        const grain = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.07, 0.28), grainMat);
        grain.position.set(-0.12, 0.24, 0);

        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.2, 24), woodMat);
        bowl.position.set(0.42, 0.1, 0.12);
        const water = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 24), waterMat);
        water.position.set(0.42, 0.19, 0.12);

        troughGroup.add(trough, grain, bowl, water);
        troughGroup.scale.setScalar(isPreview ? 1.15 : 0.58);
        wrapper.add(troughGroup);
        break;
      }

      case 'carrot': {
        // Cà rốt baby - 5 Giai đoạn 3D (GĐ 1: Mầm non -> GĐ 2: Lá non -> GĐ 3: Nhú đầu củ -> GĐ 4: Củ cam vừa -> GĐ 5: Củ cam to trồi cao)
        const carrotMat = createClayMaterial('#ff7b00');
        const leafMat = createClayMaterial('#4cd964');
        const buildCarrotByStage = (st) => {
          if (st === 1) {
            return this.createClaySproutStage1('#4cd964');
          }
          const c = new THREE.Group();
          if (st >= 3) {
            const rootR = st === 3 ? 0.12 : st === 4 ? 0.17 : 0.22;
            const rootH = st === 3 ? 0.28 : st === 4 ? 0.4 : 0.52;
            const root = new THREE.Mesh(new THREE.ConeGeometry(rootR, rootH, 18), carrotMat);
            root.rotation.x = Math.PI;
            root.position.y = st === 5 ? 0.22 : 0.14;
            c.add(root);
          }
          const topR = st === 2 ? 0.15 : st === 3 ? 0.19 : 0.23;
          const top = new THREE.Mesh(new THREE.SphereGeometry(topR, 18, 18), leafMat);
          top.scale.set(1.1, 0.65, 1.1);
          top.position.y = st === 2 ? 0.18 : st === 5 ? 0.46 : 0.36;
          c.add(top);
          return c;
        };

        if (isPreview) {
          const hero = buildCarrotByStage(stage);
          hero.scale.setScalar(stage === 1 ? 1.65 : 1.4);
          wrapper.add(hero);
        } else {
          const coords = [-0.28, 0, 0.28];
          for (const ox of coords) {
            for (const oz of coords) {
              const c = buildCarrotByStage(stage);
              c.scale.setScalar(stage === 1 ? 0.45 : scaleRatio * 0.32);
              c.position.set(ox, 0, oz);
              wrapper.add(c);
            }
          }
        }
        break;
      }

      case 'sweet_corn': {
        // Ngô ngọt bãi bồi - 5 Giai đoạn 3D:
        // GĐ 1: Mầm ngô -> GĐ 2: Cây ngô non -> GĐ 3: Trỗ cờ vàng trên đỉnh -> GĐ 4: Bắp ngô vỏ xanh -> GĐ 5: Bắp ngô tách vỏ hạt vàng óng
        const stalkMat = createClayMaterial('#55c955');
        const huskMat = createClayMaterial('#4ade80');
        const cobMat = createClayMaterial('#ffd12b');
        const tasselMat = createClayMaterial('#fde047');

        const buildCornByStage = (st) => {
          if (st === 1) {
            return this.createClaySproutStage1('#55c955');
          }
          const stalk = new THREE.Group();
          const h = st === 2 ? 0.45 : st === 3 ? 0.75 : 0.95;
          const stem = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, h, 14, 20), stalkMat);
          stem.position.y = h * 0.55;
          stalk.add(stem);

          if (st >= 3) {
            // Bông cờ ngô vàng trên đỉnh ngọn từ GĐ 3+
            const tassel = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 14), tasselMat);
            tassel.scale.set(0.8, 1.35, 0.8);
            tassel.position.y = h + 0.08;
            stalk.add(tassel);
          }

          if (st === 4) {
            // GĐ 4: Bắp ngô còn bọc kín trong vỏ bi màu xanh
            const greenCob = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 14, 18), huskMat);
            greenCob.position.set(0.12, 0.54, 0);
            greenCob.rotation.z = -0.32;
            stalk.add(greenCob);
          } else if (st >= 5) {
            // GĐ 5: Bắp ngô chín lộ hạt vàng óng ả
            const cob = new THREE.Mesh(new THREE.CapsuleGeometry(0.098, 0.28, 14, 20), cobMat);
            cob.position.set(0.13, 0.58, 0);
            cob.rotation.z = -0.35;
            stalk.add(cob);
            const cob2 = cob.clone();
            cob2.position.set(-0.12, 0.46, 0.04);
            cob2.rotation.z = 0.35;
            stalk.add(cob2);
          }
          return stalk;
        };

        if (isPreview) {
          const hero = buildCornByStage(stage);
          hero.scale.setScalar(stage === 1 ? 1.65 : 1.05);
          wrapper.add(hero);
        } else {
          for (const ox of [-0.22, 0.22]) {
            for (const oz of [-0.22, 0.22]) {
              const stalk = buildCornByStage(stage);
              stalk.scale.setScalar(stage === 1 ? 0.5 : scaleRatio * 0.95);
              stalk.position.set(ox, 0, oz);
              wrapper.add(stalk);
            }
          }
        }
        break;
      }

      case 'guava_tree': {
        // Cây ổi lê Đông Dư - 5 Giai đoạn 3D:
        // GĐ 1: Cây chiết mới trồng -> GĐ 2: Cây non tán nhỏ -> GĐ 3: Nở hoa trắng -> GĐ 4: Quả non xanh -> GĐ 5: Quả ổi lê to giòn sai trĩu
        const trunkMat = createClayMaterial('#a67148');
        const crownMat = createClayMaterial('#5cd669');
        const youngFruitMat = createClayMaterial('#4ade80');
        const guavaMat = createClayMaterial('#b5f279', { roughness: 0.45, clearcoat: 0.25 });

        const treeGroup = new THREE.Group();
        const trunkH = stage === 1 ? 0.36 : stage === 2 ? 0.52 : 0.72;
        const crownR = stage === 1 ? 0.26 : stage === 2 ? 0.44 : 0.62;

        const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, trunkH, 16, 24), trunkMat);
        trunk.position.y = trunkH * 0.6;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(crownR, 32, 32), crownMat);
        crown.position.y = trunkH + crownR * 0.7;
        treeGroup.add(trunk, crown);

        const coords = [
          [0.36, 1.05, 0.34],
          [-0.32, 1.18, 0.28],
          [0.15, 1.35, -0.35],
          [-0.25, 0.98, -0.32],
        ];
        if (stage === 3) {
          coords.forEach(([gx, gy, gz]) => {
            const fl = this.createClayBlossom('#ffffff', '#fde047', 1.3);
            fl.position.set(gx, gy, gz);
            treeGroup.add(fl);
          });
        } else if (stage >= 4) {
          const fMat = stage === 4 ? youngFruitMat : guavaMat;
          const fRad = stage === 4 ? 0.075 : 0.12;
          coords.forEach(([gx, gy, gz]) => {
            const guava = new THREE.Mesh(new THREE.SphereGeometry(fRad, 20, 20), fMat);
            guava.position.set(gx, gy, gz);
            treeGroup.add(guava);
          });
        }

        treeGroup.scale.setScalar(isPreview ? 0.72 : scaleRatio * 1.15);
        wrapper.add(treeGroup);
        break;
      }

      case 'orange_tree': {
        // Cây cam Canh Hà Nội - 5 Giai đoạn 3D:
        // GĐ 1: Cây ghép non -> GĐ 2: Tán lá xanh -> GĐ 3: Hoa cam trắng thơm -> GĐ 4: Quả cam xanh -> GĐ 5: Cam chín vàng cam rực rỡ
        const trunkMat = createClayMaterial('#a67148');
        const crownMat = createClayMaterial('#4cd964');
        const greenOrangeMat = createClayMaterial('#22c55e', { roughness: 0.4, clearcoat: 0.2 });
        const orangeMat = createClayMaterial('#ff8800', { roughness: 0.38, clearcoat: 0.3 });

        const treeGroup = new THREE.Group();
        const trunkH = stage === 1 ? 0.36 : stage === 2 ? 0.54 : 0.75;
        const crownR = stage === 1 ? 0.28 : stage === 2 ? 0.46 : 0.64;

        const trunk = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, trunkH, 16, 24), trunkMat);
        trunk.position.y = trunkH * 0.6;
        const crown = new THREE.Mesh(new THREE.SphereGeometry(crownR, 32, 32), crownMat);
        crown.position.y = trunkH + crownR * 0.7;
        treeGroup.add(trunk, crown);

        const coords = [
          [0.38, 1.08, 0.34],
          [-0.34, 1.2, 0.3],
          [0.18, 1.38, -0.34],
          [-0.26, 1.0, -0.32],
        ];
        if (stage === 3) {
          coords.forEach(([ox, oy, oz]) => {
            const fl = this.createClayBlossom('#ffffff', '#facc15', 1.3);
            fl.position.set(ox, oy, oz);
            treeGroup.add(fl);
          });
        } else if (stage >= 4) {
          const oMat = stage === 4 ? greenOrangeMat : orangeMat;
          const oRad = stage === 4 ? 0.08 : 0.125;
          coords.forEach(([ox, oy, oz]) => {
            const orange = new THREE.Mesh(new THREE.SphereGeometry(oRad, 20, 20), oMat);
            orange.position.set(ox, oy, oz);
            treeGroup.add(orange);
          });
        }

        treeGroup.scale.setScalar(isPreview ? 0.72 : scaleRatio * 1.18);
        wrapper.add(treeGroup);
        break;
      }

      case 'windmill': {
        const towerMat = createClayMaterial('#ff6b6b');
        const domeMat = createClayMaterial('#ffd166');
        const bladeMat = createClayMaterial('#ffffff');
        const wmGroup = new THREE.Group();
        const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.44, 1.45, 32), towerMat);
        tower.position.y = 0.72;
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 32), domeMat);
        dome.position.y = 1.45;
        wmGroup.add(tower, dome);

        const rotor = new THREE.Group();
        rotor.position.set(0, 1.28, 0.34);
        for (let i = 0; i < 4; i++) {
          const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.58, 12, 24), bladeMat);
          b.rotation.z = (i * Math.PI) / 2;
          rotor.add(b);
        }
        wmGroup.add(rotor);
        wmGroup.scale.setScalar(isPreview ? 0.65 : 1.22);
        wrapper.add(wmGroup);
        if (!isPreview) {
          this.animatedObjects.push({ mesh: rotor, type: 'spin', offset: 0 });
        }
        break;
      }
    }

    return wrapper;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();
    const dt = Math.min(0.05, Math.max(0.001, t - this.lastAnimTime));
    this.lastAnimTime = t;

    if (this.islandGroup) {
      this.islandGroup.position.y = Math.sin(t * 1.1) * 0.06;
    }

    // Sao lấp lánh trên bầu trời
    if (this.twinkleStars) {
      for (const st of this.twinkleStars) {
        const pulse = 0.72 + Math.sin(t * st.speed + st.phase) * 0.28;
        st.mesh.scale.setScalar(pulse);
        if (st.isBig) {
          st.mesh.rotation.y = t * 1.2 + st.phase;
          st.mesh.rotation.z = t * 0.8;
        }
      }
    }

    // Mây trôi bồng bềnh
    for (const c of this.clouds) {
      c.group.position.x = c.baseX + Math.sin(t * c.speed + c.phase) * c.range;
    }

    // Đàn chim vỗ cánh bay lượn trên bầu trời
    for (const b of this.birds) {
      const angle = t * b.speed + b.phase;
      const nx = Math.cos(angle) * b.radiusX;
      const nz = Math.sin(angle) * b.radiusZ;
      const ny = b.height + Math.sin(t * 2.2 + b.phase) * 0.45;

      b.group.position.set(nx, ny, nz);
      b.group.rotation.y = Math.atan2(-Math.sin(angle) * b.radiusX, Math.cos(angle) * b.radiusZ);
      const flap = Math.sin(t * 9.5 + b.phase * 2) * 0.55;
      b.wingL.rotation.z = flap;
      b.wingR.rotation.z = -flap;
    }

    // Thú nuôi đi bộ từng quãng ngắn (1-2m) đúng tốc độ thực tế trên mảnh đất nâu (hoặc trong khu rào)
    for (const animal of this.roamingAnimals) {
      const { mesh, roamState, validTargets } = animal;
      if (!validTargets || validTargets.length === 0) continue;

      if (roamState.waitTimer > 0) {
        roamState.waitTimer -= dt;
        // Nhấp nhô nhẹ khi đứng mổ thóc / gặm cỏ (~1.2cm)
        mesh.position.y = 0.24 + Math.abs(Math.sin(t * 3.5 + roamState.phase)) * 0.012;
        if (roamState.waitTimer <= 0) {
          // Ưu tiên chọn ô kế bên trong bán kính <= 2.2m để gà đi bộ tự nhiên từng quãng ngắn
          const nearby = validTargets.filter(
            (cell) => Math.hypot(cell.x - roamState.currX, cell.z - roamState.currZ) <= 2.2
          );
          const pool = nearby.length > 0 ? nearby : validTargets;
          const picked = pool[Math.floor(Math.random() * pool.length)];
          const jitterX = (Math.random() - 0.5) * 0.55;
          const jitterZ = (Math.random() - 0.5) * 0.55;
          roamState.targetX = picked.x + jitterX;
          roamState.targetZ = picked.z + jitterZ;
          roamState.currentCellIndex = picked.index;
        }
      } else {
        const dx = roamState.targetX - roamState.currX;
        const dz = roamState.targetZ - roamState.currZ;
        const dist = Math.hypot(dx, dz);

        if (dist < 0.05) {
          roamState.waitTimer = 1.0 + Math.random() * 1.8;
        } else {
          const step = Math.min(dist, roamState.speed * dt);
          roamState.currX += (dx / dist) * step;
          roamState.currZ += (dz / dist) * step;
          roamState.rotY = Math.atan2(dx, dz);

          // Bước chân lạch bạch nhỏ nhắn (~3.2cm) đúng tỉ lệ chú gà/thỏ ngoài đời
          mesh.position.set(
            roamState.currX,
            0.24 + Math.abs(Math.sin(t * 14.0 + roamState.phase)) * 0.032,
            roamState.currZ
          );
          mesh.rotation.y = roamState.rotY;
        }
      }
    }

    // Cây trồng, đàn cá bơi trong ao & cối xay gió chuyển động tại chỗ
    for (const obj of this.animatedObjects) {
      if (obj.type === 'spin') {
        obj.mesh.rotation.z = t * 1.8;
      } else if (obj.type === 'sway') {
        obj.mesh.rotation.z = Math.sin(t * 2 + obj.offset) * 0.08;
      } else if (obj.type === 'swim') {
        obj.mesh.rotation.y = t * 1.15 + obj.offset;
      }
    }

    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }
}

/**
 * Bàn xoay 3D Cute Clay trực tiếp trong Cửa Hàng (Shop 3D Showcase)
 */
export class ShopPreview3D {
  constructor(container, islandSceneRef) {
    this.container = container;
    this.islandSceneRef = islandSceneRef;
    this.currentItemId = null;
    this.clock = new THREE.Clock();

    if (!container) return;

    this.scene = new THREE.Scene();

    const width = container.clientWidth || 260;
    const height = container.clientHeight || 220;

    this.camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    this.camera.position.set(0, 1.35, 2.55);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    container.innerHTML = '';
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.target.set(0, 0.42, 0);

    // Ánh sáng Studio ấm áp làm nổi bật chất liệu đất sét 3D
    const hemi = new THREE.HemisphereLight('#fffdf7', '#d8f3dc', 1.45);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight('#fff6e0', 1.9);
    keyLight.position.set(3.5, 5.5, 4.0);
    this.scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#bae6fd', 0.95);
    rimLight.position.set(-3.5, 2.5, -2.5);
    this.scene.add(rimLight);

    // Bục đất sét tròn xoay dưới chân vật phẩm
    this.turntable = new THREE.Group();
    this.scene.add(this.turntable);

    const baseRim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.82, 0.14, 36),
      createClayMaterial('#65c466', { roughness: 0.72 })
    );
    baseRim.position.y = -0.09;
    this.turntable.add(baseRim);

    const soilPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.64, 0.66, 0.08, 36),
      createClayMaterial('#8d5b3e', { roughness: 0.82 })
    );
    soilPad.position.y = -0.02;
    this.turntable.add(soilPad);

    this.itemHolder = new THREE.Group();
    this.turntable.add(this.itemHolder);

    this.animate();
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const w = this.container.clientWidth || 260;
    const h = this.container.clientHeight || 220;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  showItem(catalogItem, stage = 5, slideDir = 0) {
    if (!catalogItem || !this.itemHolder || !this.islandSceneRef) return;
    this.resize();
    if (
      this.currentItemId === catalogItem.id &&
      this.currentStage === stage &&
      this.itemHolder.children.length > 0
    ) {
      return;
    }
    const itemChanged = this.currentItemId !== catalogItem.id;
    this.currentItemId = catalogItem.id;
    this.currentStage = stage;

    while (this.itemHolder.children.length > 0) {
      this.itemHolder.remove(this.itemHolder.children[0]);
    }

    this.turntable.position.set(0, 0, 0);
    this.itemHolder.position.set(0, 0, 0);
    this.itemHolder.scale.setScalar(1);

    // Khi mới chọn vật phẩm, tính khung bao theo Cấp 5 (kích thước tối đa) để cố định Camera
    // giúp khi bấm Slide sang trái/phải qua Cấp 1..5 sẽ thấy rõ cây/vật nuôi lớn dần trên cùng 1 tỉ lệ!
    if (itemChanged) {
      const fullModel = this.islandSceneRef.createCuteClayItemModel(
        {
          ...catalogItem,
          growthProgress: 100,
          growthStage: 5,
        },
        0,
        null,
        1,
        1,
        { isPreview: true }
      );
      this.itemHolder.add(fullModel);
      const box = new THREE.Box3().setFromObject(this.turntable);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.y * 1.35, size.x * 1.25, size.z * 1.25, 1.25);
      const fovRad = (this.camera.fov * Math.PI) / 180;
      const dist = Math.max(2.6, ((maxDim / 2) / Math.tan(fovRad / 2)) * 1.35);

      this.controls.target.set(0, center.y, 0);
      this.camera.position.set(0, center.y + dist * 0.38, dist);
      this.controls.update();
      this.itemHolder.remove(fullModel);
    }

    const stageProgressMap = { 1: 10, 2: 35, 3: 60, 4: 85, 5: 100 };
    const model = this.islandSceneRef.createCuteClayItemModel(
      {
        ...catalogItem,
        growthProgress: stageProgressMap[stage] || 100,
        growthStage: stage,
      },
      0,
      null,
      1,
      1,
      { isPreview: true }
    );
    this.itemHolder.add(model);

    if (slideDir !== 0) {
      this.slideOffset = slideDir * 0.48;
      this.slideScale = 0.82;
    } else {
      this.slideOffset = 0;
      this.slideScale = 1;
      this.turntable.rotation.y = 0.35;
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.renderer || !this.scene || !this.camera) return;
    const t = this.clock.getElapsedTime();
    if (this.turntable) {
      this.turntable.rotation.y = t * 0.95;
      this.turntable.position.y = Math.sin(t * 2.2) * 0.025;
      if (typeof this.slideOffset === 'number' && Math.abs(this.slideOffset) > 0.002) {
        this.slideOffset *= 0.8;
        this.turntable.position.x = this.slideOffset;
      } else if (this.turntable.position.x !== 0) {
        this.turntable.position.x = 0;
      }
    }
    if (this.itemHolder && typeof this.slideScale === 'number' && Math.abs(1 - this.slideScale) > 0.002) {
      this.slideScale += (1 - this.slideScale) * 0.22;
      this.itemHolder.scale.setScalar(this.slideScale);
    }
    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

/**
 * 3D Master Map Scene (25m x 80m = 2.000m² "Làng Vườn Nhỏ" 4 Cụm)
 * Dựng 100% bằng 3D Three.js theo đúng thiết kế:
 * - Kích thước 25m ngang (10 cột x 2.5m) x 80m dài (20 hàng x 4.0m) = 2.000m²
 * - 4 Cụm: Cụm 1 (15m: Ô nhỏ 10-20m²), Cụm 2 (20m: Ô vừa 20-30m²), Cụm 3 (20m: Ô lớn 40-60m² - Vị trí người chơi), Cụm 4 (25m: Ô lớn & Khu sinh hoạt chung)
 * - Trục chính nội bộ 1,4-1,6m uốn nhẹ hình chữ S, nhánh vào vườn 0,8-1m, nút mở rộng (giàn hoa, ghế nghỉ, cây anh đào), điểm nhấn cuối khu (Chòi nghỉ bát giác & sân sinh hoạt chung)
 */
export class MasterMap3D {
  constructor(container, onDirectionSelect) {
    this.container = container;
    this.onDirectionSelect = onDirectionSelect;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.dynamicGroup = null;
    this.interactiveTargets = [];
    this.animatedPins = [];
    this.previewMeshes = [];
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.clock = new THREE.Clock();
    this.cameraTargetGoal = null;
    this.cameraPosGoal = null;
    this.lastStateRef = null;
    this.init();
  }

  getMainPathCenterX(z) {
    // Đường trục chính nội bộ 1,4 - 1,6m uốn nhẹ tự nhiên từ Cổng Nam (z=+40) lên Chòi nghỉ Cụm 4 (z=-34)
    const t = Math.max(0, Math.min(1, (40 - z) / 74));
    return Math.sin(t * Math.PI * 3.15) * 1.9 + Math.pow(t, 1.45) * 2.2;
  }

  cellToWorld(col, row) {
    // 10 cột x 2.5m = 25m (-12.5 .. +12.5), 20 hàng x 4.0m = 80m (-40 .. +40)
    const x = -12.5 + col * 2.5 + 1.25;
    const z = -40 + row * 4.0 + 2.0;
    return { x, z, w: 2.5, d: 4.0 };
  }

  createLabelSprite(text, options = {}) {
    const bgColor = options.bgColor || 'rgba(20, 83, 45, 0.94)';
    const borderColor = options.borderColor || '#ffffff';
    const textColor = options.textColor || '#ffffff';
    const fontSize = options.fontSize || 28;
    const scaleX = options.scaleX || 8.5;
    const scaleY = options.scaleY || 2.1;

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bgColor;
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(8, 14, 496, 100, 48);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `900 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 65);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scaleX, scaleY, 1);
    sprite.renderOrder = 20;
    return sprite;
  }

  init() {
    if (!this.container) return;
    const width = Math.max(320, this.container.clientWidth || 540);
    const height = Math.max(360, this.container.clientHeight || 480);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xdbf0ff);
    this.scene.fog = new THREE.FogExp2(0xdbf0ff, 0.0042);

    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 350);
    this.camera.position.set(-22, 46, 38);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 135;
    this.controls.target.set(0, 0, -4);

    // Ánh sáng mặt trời ấm áp cho toàn khu Làng Vườn 25m x 80m
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x8ab17d, 1.05);
    hemiLight.position.set(0, 60, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.55);
    dirLight.position.set(35, 58, 28);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -45;
    dirLight.shadow.camera.right = 45;
    dirLight.shadow.camera.top = 55;
    dirLight.shadow.camera.bottom = -55;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    this.dynamicGroup = new THREE.Group();
    this.scene.add(this.dynamicGroup);

    this.buildStaticVillageArchitecture();
    this.bindInteraction();
    this.animate();
  }

  buildStaticVillageArchitecture() {
    const staticGroup = new THREE.Group();

    // 1. Đế đảo đất sét bo tròn cho toàn khu 25m x 80m
    const earthBase = new THREE.Mesh(
      new THREE.BoxGeometry(28.5, 3.2, 85.5),
      createClayMaterial(0x9c6644, { roughness: 0.85 })
    );
    earthBase.position.set(0, -1.8, 0);
    earthBase.receiveShadow = true;
    staticGroup.add(earthBase);

    const turfTop = new THREE.Mesh(
      new THREE.BoxGeometry(25.4, 0.5, 80.4),
      createClayMaterial(0x74a15e, { roughness: 0.78 })
    );
    turfTop.position.set(0, -0.25, 0);
    turfTop.receiveShadow = true;
    staticGroup.add(turfTop);

    // 2. Đường trục chính 1m phía Nam (Z = +41.8)
    const mainRoad = new THREE.Mesh(
      new THREE.BoxGeometry(32, 0.28, 3.2),
      createClayMaterial(0x475569, { roughness: 0.85 })
    );
    mainRoad.position.set(0, -0.05, 42.0);
    mainRoad.receiveShadow = true;
    staticGroup.add(mainRoad);

    for (let rx = -13; rx <= 13; rx += 3.2) {
      const stripe = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 0.04, 0.22),
        createClayMaterial(0xf8fafc, { roughness: 0.5 })
      );
      stripe.position.set(rx, 0.11, 42.0);
      staticGroup.add(stripe);
    }

    // 3. Hàng rào cây xanh bao quanh biên Tây (-12.5m), Đông (+12.5m) và Bắc (-40m)
    const hedgeMat = createClayMaterial(0x2d5a27, { roughness: 0.82 });
    const westHedge = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.35, 80.4), hedgeMat);
    westHedge.position.set(-12.6, 0.65, 0);
    westHedge.castShadow = true;
    staticGroup.add(westHedge);

    const eastHedge = new THREE.Mesh(new THREE.BoxGeometry(0.65, 1.35, 80.4), hedgeMat);
    eastHedge.position.set(12.6, 0.65, 0);
    eastHedge.castShadow = true;
    staticGroup.add(eastHedge);

    const northHedge = new THREE.Mesh(new THREE.BoxGeometry(25.8, 1.35, 0.65), hedgeMat);
    northHedge.position.set(0, 0.65, -40.1);
    northHedge.castShadow = true;
    staticGroup.add(northHedge);

    // Hàng rào gỗ thấp mặt tiền phía Nam (Cụm 1) + Cổng chào gỗ giàn hoa ở giữa
    this.buildRusticFenceLine(staticGroup, -12.2, 39.9, -2.0, 39.9);
    this.buildRusticFenceLine(staticGroup, 2.0, 39.9, 12.2, 39.9);
    this.buildWoodenArchGate(staticGroup, 0, 39.6, 0);

    // 4. Trục chính nội bộ (1,4 - 1,6m) uốn nhẹ hình chữ S từ z = +40 lên z = -33
    const gravelMat = createClayMaterial(0xe3d5c5, { roughness: 0.88 });
    const curbMat = createClayMaterial(0xb7a99a, { roughness: 0.85 });
    const stepMat = createClayMaterial(0xf5ebe0, { roughness: 0.75 });

    for (let z = -33.5; z <= 39.8; z += 0.65) {
      const cx = this.getMainPathCenterX(z);
      const nextX = this.getMainPathCenterX(z - 0.65);
      const angle = Math.atan2(nextX - cx, -0.65);

      const seg = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.1, 0.85), gravelMat);
      seg.position.set(cx, 0.04, z);
      seg.rotation.y = angle;
      seg.receiveShadow = true;
      staticGroup.add(seg);

      // Viền đá cuội hai bên trục chính
      const curbL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.82), curbMat);
      curbL.position.set(cx - 0.86, 0.06, z);
      curbL.rotation.y = angle;
      staticGroup.add(curbL);

      const curbR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.82), curbMat);
      curbR.position.set(cx + 0.86, 0.06, z);
      curbR.rotation.y = angle;
      staticGroup.add(curbR);

      if (Math.abs(Math.round(z * 2)) % 3 === 0) {
        const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.12, 7), stepMat);
        stone.position.set(cx + Math.sin(z) * 0.22, 0.055, z);
        staticGroup.add(stone);
      }

      // Khóm hoa tự nhiên dọc hai bên đường uốn nhẹ
      if (Math.abs(Math.round(z * 1.5)) % 4 === 0) {
        this.buildFlowerShrub(staticGroup, cx - 1.25, z, (Math.abs(Math.round(z)) % 3));
        this.buildFlowerShrub(staticGroup, cx + 1.25, z + 0.3, ((Math.abs(Math.round(z)) + 1) % 3));
      }
    }

    // 5. Các nhánh vào vườn (0,8 - 1m, dài 4 - 8m) & Hàng rào phân cách giữa 4 Cụm
    // Ranh giới Cụm 4 / Cụm 3 (z = -16), Cụm 3 / Cụm 2 (z = +4), Cụm 2 / Cụm 1 (z = +24)
    const branchConfigs = [
      { z: -24, dir: -1, len: 8.5, fence: true },
      { z: -16, dir: -1, len: 10.5, fence: true }, // Ranh giới Cụm 4 - Cụm 3
      { z: -16, dir: 1, len: 9.5, fence: true },
      { z: -4, dir: -1, len: 9.0, fence: true },
      { z: 4, dir: -1, len: 10.5, fence: true }, // Ranh giới Cụm 3 - Cụm 2
      { z: 4, dir: 1, len: 9.5, fence: true },
      { z: 14, dir: -1, len: 9.5, fence: true },
      { z: 14, dir: 1, len: 9.0, fence: true },
      { z: 24, dir: -1, len: 10.5, fence: true }, // Ranh giới Cụm 2 - Cụm 1
      { z: 24, dir: 1, len: 9.5, fence: true },
    ];

    for (const br of branchConfigs) {
      const startX = this.getMainPathCenterX(br.z) + br.dir * 0.85;
      const endX = br.dir < 0 ? -11.8 : 11.8;
      const branchLen = Math.abs(endX - startX);
      const midX = (startX + endX) / 2;

      const branchMesh = new THREE.Mesh(
        new THREE.BoxGeometry(branchLen, 0.08, 0.92),
        gravelMat
      );
      branchMesh.position.set(midX, 0.035, br.z);
      branchMesh.receiveShadow = true;
      staticGroup.add(branchMesh);

      if (br.fence) {
        this.buildRusticFenceLine(staticGroup, startX, br.z - 0.55, endX, br.z - 0.55);
      }
    }

    // 6. Nút mở rộng 1 (Giữa Cụm 2 & Cụm 3, z = +5.5): Cây hoa anh đào hồng lớn + ghế nghỉ
    const node1X = this.getMainPathCenterX(5.5);
    const node1Plaza = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 0.1, 16), gravelMat);
    node1Plaza.position.set(node1X + 0.6, 0.04, 5.5);
    staticGroup.add(node1Plaza);
    this.buildCherryBlossomTree(staticGroup, node1X + 1.4, 5.2, 1.35);
    this.buildGardenBench(staticGroup, node1X - 1.1, 5.5, Math.PI / 2);

    // 7. Nút mở rộng 2 (Giữa Cụm 3 & Cụm 4, z = -14.5): Giàn hoa gỗ Pergola + ghế nghỉ + cây lớn
    const node2X = this.getMainPathCenterX(-14.5);
    const node2Plaza = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.1, 16), gravelMat);
    node2Plaza.position.set(node2X, 0.04, -14.5);
    staticGroup.add(node2Plaza);
    this.buildWoodenArchGate(staticGroup, node2X, -14.5, 0.15);
    this.buildGardenBench(staticGroup, node2X + 1.5, -14.5, -Math.PI / 2);
    this.buildShadeTree(staticGroup, node2X - 2.0, -15.2, 1.25);

    // 8. Điểm nhấn cuối khu (Cụm 4, z = -34.5, x = +4.8): Chòi nghỉ bát giác & Khu sinh hoạt chung
    this.buildOctagonalGazeboPlaza(staticGroup, 4.6, -34.2);

    // Sân trà tròn phụ bên trái Cụm 4
    const subPlaza = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.5, 0.1, 16), stepMat);
    subPlaza.position.set(-2.2, 0.05, -31.5);
    staticGroup.add(subPlaza);
    this.buildCherryBlossomTree(staticGroup, -1.8, -34.8, 1.1);

    // 9. Ao sinh thái tại Cụm 4 Tây (Lô của GĐ Tuấn Kiệt - sát biên Bắc người chơi: x = -3.8, z = -20.5)
    this.buildEcoPondLandmark(staticGroup, -4.0, -20.2);

    // 10. Các Nhà kính (Glass Greenhouses) dọc cánh Đông Cụm 4, Cụm 3, Cụm 2, Cụm 1 như thiết kế
    this.buildMiniGreenhouse(staticGroup, 8.2, -21.5);
    this.buildMiniGreenhouse(staticGroup, 8.4, -5.5);
    this.buildMiniGreenhouse(staticGroup, 8.2, 13.5);
    this.buildMiniGreenhouse(staticGroup, 8.4, 28.5);

    // Cây bóng mát dọc hai bên biên tạo cảm giác "Làng Vườn Nhỏ" mềm mại
    const perimeterTrees = [
      [-11.2, -36, 1.2],
      [-11.0, -26, 1.35],
      [-11.2, -13, 1.25],
      [-11.0, 2, 1.15],
      [-11.2, 16, 1.3],
      [-11.0, 31, 1.1],
      [11.2, -29, 1.3],
      [11.0, -12, 1.2],
      [11.2, 2, 1.15],
      [11.0, 21, 1.25],
      [11.2, 35, 1.1],
    ];
    for (const [tx, tz, ts] of perimeterTrees) {
      this.buildShadeTree(staticGroup, tx, tz, ts);
    }

    // 11. Nhãn 3D hiển thị kích thước 25m x 80m và 4 Cụm (Cụm 1 -> Cụm 4) bên lề trái
    const topDimSprite = this.createLabelSprite('◄─── RỘNG 25 m (TỔNG KHU 2.000 m²) ───►', {
      bgColor: 'rgba(15, 23, 42, 0.88)',
      scaleX: 14,
      scaleY: 2.3,
    });
    topDimSprite.position.set(0, 2.2, -42.5);
    staticGroup.add(topDimSprite);

    const roadSprite = this.createLabelSprite('🛣️ ĐƯỜNG TRỤC CHÍNH 1 m • CỔNG VÀO LÀNG VƯỜN', {
      bgColor: 'rgba(30, 41, 59, 0.92)',
      scaleX: 14.5,
      scaleY: 2.3,
    });
    roadSprite.position.set(0, 1.8, 44.2);
    staticGroup.add(roadSprite);

    const clusterMarkers = [
      { z: -28, text: 'CỤM 4 (25m) • Ô lớn & Sinh hoạt chung', bg: 'rgba(21, 128, 61, 0.92)' },
      { z: -6, text: 'CỤM 3 (20m) • Ô lớn 40–60m²', bg: 'rgba(2, 132, 199, 0.94)' },
      { z: 14, text: 'CỤM 2 (20m) • Ô vừa 20–30m²', bg: 'rgba(21, 128, 61, 0.92)' },
      { z: 32, text: 'CỤM 1 (15m) • Ô nhỏ 10–20m²', bg: 'rgba(21, 128, 61, 0.92)' },
    ];
    for (const cm of clusterMarkers) {
      const sp = this.createLabelSprite(cm.text, {
        bgColor: cm.bg,
        scaleX: 11.5,
        scaleY: 2.1,
        fontSize: 25,
      });
      sp.position.set(-19.2, 2.0, cm.z);
      staticGroup.add(sp);
    }

    this.scene.add(staticGroup);
  }

  buildRusticFenceLine(parent, x1, z1, x2, z2) {
    const woodMat = createClayMaterial(0x9c6b3b, { roughness: 0.85 });
    const dx = x2 - x1;
    const dz = z2 - z1;
    const dist = Math.hypot(dx, dz);
    if (dist < 0.8) return;
    const steps = Math.max(2, Math.floor(dist / 1.1));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + dx * t;
      const pz = z1 + dz * t;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.9, 6), woodMat);
      post.position.set(px, 0.45, pz);
      post.castShadow = true;
      parent.add(post);
    }
    const rail = new THREE.Mesh(new THREE.BoxGeometry(dist, 0.08, 0.08), woodMat);
    rail.position.set((x1 + x2) / 2, 0.65, (z1 + z2) / 2);
    rail.rotation.y = Math.atan2( dz, dx );
    parent.add(rail);

    const railLow = new THREE.Mesh(new THREE.BoxGeometry(dist, 0.08, 0.08), woodMat);
    railLow.position.set((x1 + x2) / 2, 0.32, (z1 + z2) / 2);
    railLow.rotation.y = Math.atan2( dz, dx );
    parent.add(railLow);
  }

  buildWoodenArchGate(parent, x, z, rotY = 0) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    const woodMat = createClayMaterial(0x8d5524, { roughness: 0.8 });
    const leafMat = createClayMaterial(0x386641, { roughness: 0.75 });
    const flowerMat = createClayMaterial(0xff758f, { roughness: 0.65 });

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.6, 8), woodMat);
    leftPost.position.set(-1.15, 1.3, 0);
    leftPost.castShadow = true;
    group.add(leftPost);

    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 2.6, 8), woodMat);
    rightPost.position.set(1.15, 1.3, 0);
    rightPost.castShadow = true;
    group.add(rightPost);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.22, 0.45), woodMat);
    topBeam.position.set(0, 2.55, 0);
    topBeam.castShadow = true;
    group.add(topBeam);

    for (let lx = -1.2; lx <= 1.2; lx += 0.4) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.95), woodMat);
      rafter.position.set(lx, 2.7, 0);
      group.add(rafter);
    }

    const vine = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), leafMat);
    vine.position.set(-0.9, 2.5, 0.2);
    group.add(vine);
    const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), flowerMat);
    bloom.position.set(-0.75, 2.6, 0.35);
    group.add(bloom);

    parent.add(group);
  }

  buildOctagonalGazeboPlaza(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const patioMat = createClayMaterial(0xd6ccc2, { roughness: 0.82 });
    const woodMat = createClayMaterial(0x9c6644, { roughness: 0.78 });
    const roofMat = createClayMaterial(0x7f4f24, { roughness: 0.75 });

    // Sân đá tròn Khu sinh hoạt chung
    const patio = new THREE.Mesh(new THREE.CylinderGeometry(4.6, 4.8, 0.16, 24), patioMat);
    patio.position.y = 0.08;
    patio.receiveShadow = true;
    group.add(patio);

    // 8 cột gỗ Chòi nghỉ bát giác
    const radius = 2.6;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 2.5, 8), woodMat);
      col.position.set(Math.cos(ang) * radius, 1.3, Math.sin(ang) * radius);
      col.castShadow = true;
      group.add(col);
    }

    // Mái chòi gỗ bát giác 2 tầng
    const lowerRoof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.35, 8), roofMat);
    lowerRoof.position.y = 3.05;
    lowerRoof.castShadow = true;
    group.add(lowerRoof);

    const upperRoof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.9, 8), roofMat);
    upperRoof.position.y = 3.85;
    upperRoof.castShadow = true;
    group.add(upperRoof);

    // Bàn trà / Bếp lửa trại sinh hoạt chung ở giữa chòi
    const fireRing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.38, 12),
      createClayMaterial(0x64748b, { roughness: 0.85 })
    );
    fireRing.position.set(-1.2, 0.25, 2.8);
    group.add(fireRing);

    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.65, 7),
      createClayMaterial(0xf97316, { roughness: 0.4 })
    );
    flame.position.set(-1.2, 0.62, 2.8);
    group.add(flame);

    const label = this.createLabelSprite('🏛️ Chòi Nghỉ & Khu Sinh Hoạt Chung', {
      bgColor: 'rgba(124, 45, 18, 0.92)',
      scaleX: 9.5,
      scaleY: 1.85,
      fontSize: 24,
    });
    label.position.set(0, 5.1, 0);
    group.add(label);

    parent.add(group);
  }

  buildEcoPondLandmark(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(2.1, 1.9, 0.14, 18),
      createClayMaterial(0x0ea5e9, { roughness: 0.22 })
    );
    water.position.y = 0.08;
    group.add(water);

    const stoneMat = createClayMaterial(0x94a3b8, { roughness: 0.85 });
    for (let i = 0; i < 14; i++) {
      const ang = (i / 14) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), stoneMat);
      rock.position.set(Math.cos(ang) * 2.1, 0.16, Math.sin(ang) * 2.1);
      group.add(rock);
    }

    const lilyMat = createClayMaterial(0x4ade80, { roughness: 0.65 });
    for (const [lx, lz] of [[-0.6, -0.4], [0.7, 0.5], [-0.2, 0.8]]) {
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.04, 10), lilyMat);
      pad.position.set(lx, 0.16, lz);
      group.add(pad);
    }

    parent.add(group);
  }

  buildMiniGreenhouse(parent, x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.3, 3.2),
      createClayMaterial(0x78350f, { roughness: 0.85 })
    );
    base.position.y = 0.15;
    group.add(base);

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.62,
      roughness: 0.15,
    });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.4, 3.0), glassMat);
    walls.position.y = 1.0;
    walls.castShadow = true;
    group.add(walls);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 0.95, 4), glassMat);
    roof.position.y = 2.15;
    roof.rotation.y = Math.PI / 4;
    group.add(roof);

    parent.add(group);
  }

  buildShadeTree(parent, x, z, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.26, 1.4, 7),
      createClayMaterial(0x7f4f24, { roughness: 0.85 })
    );
    trunk.position.y = 0.7;
    trunk.castShadow = true;
    group.add(trunk);

    const foliageMat = createClayMaterial(0x3a7d44, { roughness: 0.75 });
    const crown1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.05, 1), foliageMat);
    crown1.position.set(0, 1.85, 0);
    crown1.castShadow = true;
    group.add(crown1);

    const crown2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 1), foliageMat);
    crown2.position.set(0.45, 2.25, 0.25);
    group.add(crown2);

    parent.add(group);
  }

  buildCherryBlossomTree(parent, x, z, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.scale.setScalar(scale);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.28, 1.5, 7),
      createClayMaterial(0x6f4518, { roughness: 0.85 })
    );
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);

    const pinkMat = createClayMaterial(0xffb3c6, { roughness: 0.68 });
    const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 1), pinkMat);
    c1.position.set(0, 2.0, 0);
    c1.castShadow = true;
    group.add(c1);

    const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 1), pinkMat);
    c2.position.set(-0.5, 2.3, 0.3);
    group.add(c2);

    parent.add(group);
  }

  buildGardenBench(parent, x, z, rotY = 0) {
    const bench = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.35, 0.45),
      createClayMaterial(0xb07d4f, { roughness: 0.8 })
    );
    bench.position.set(x, 0.22, z);
    bench.rotation.y = rotY;
    bench.castShadow = true;
    parent.add(bench);
  }

  buildFlowerShrub(parent, x, z, colorIdx = 0) {
    const colors = [0xf472b6, 0xfacc15, 0xc084fc];
    const bush = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.26, 0),
      createClayMaterial(0x4d908e, { roughness: 0.8 })
    );
    bush.position.set(x, 0.18, z);
    parent.add(bush);

    const flower = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 6, 6),
      createClayMaterial(colors[colorIdx % colors.length], { roughness: 0.6 })
    );
    flower.position.set(x, 0.36, z);
    parent.add(flower);
  }

  setCameraPreset(presetName, state = null) {
    const currentState = state || this.lastStateRef;
    let userCenterX = -2.5;
    let userCenterZ = -10.0;
    if (currentState && currentState.masterMap && currentState.masterMap.userCells.length > 0) {
      let sumX = 0;
      let sumZ = 0;
      for (const c of currentState.masterMap.userCells) {
        const w = this.cellToWorld(c.col, c.row);
        sumX += w.x;
        sumZ += w.z;
      }
      userCenterX = sumX / currentState.masterMap.userCells.length;
      userCenterZ = sumZ / currentState.masterMap.userCells.length;
    }

    if (presetName === 'focus_user') {
      this.cameraTargetGoal = new THREE.Vector3(userCenterX, 0.5, userCenterZ);
      this.cameraPosGoal = new THREE.Vector3(userCenterX - 14, 24, userCenterZ + 22);
    } else if (presetName === 'top_down') {
      this.cameraTargetGoal = new THREE.Vector3(0, 0, 0);
      this.cameraPosGoal = new THREE.Vector3(0, 92, 6);
    } else if (presetName === 'walk_path') {
      this.cameraTargetGoal = new THREE.Vector3(2.0, 1.5, -24);
      this.cameraPosGoal = new THREE.Vector3(-3.5, 11.5, 22);
    } else {
      // Toàn cảnh 25m x 80m
      this.cameraTargetGoal = new THREE.Vector3(0, 0, -2);
      this.cameraPosGoal = new THREE.Vector3(-28, 52, 46);
    }
  }

  updateState(state, selectedDirection, selectedRentM2, previewCells = []) {
    if (!this.dynamicGroup || !state || !state.masterMap) return;
    this.lastStateRef = state;

    while (this.dynamicGroup.children.length > 0) {
      this.dynamicGroup.remove(this.dynamicGroup.children[0]);
    }
    this.interactiveTargets = [];
    this.animatedPins = [];
    this.previewMeshes = [];

    const map = state.masterMap;
    const userSet = new Set((map.userCells || []).map((u) => `${u.col},${u.row}`));
    const occMap = new Map((map.occupiedCells || []).map((o) => [`${o.col},${o.row}`, o.owner]));
    const previewSet = new Set((previewCells || []).map((p) => `${p.col},${p.row}`));

    const userSoilMat = createClayMaterial(0x5c3d28, { roughness: 0.85 });
    const userFrameMat = createClayMaterial(0x22c55e, { roughness: 0.4 });
    const previewMat = createClayMaterial(0x38bdf8, { roughness: 0.35 });
    const neighborSoilMat = createClayMaterial(0x7f5539, { roughness: 0.88 });
    const neighborBorderMat = createClayMaterial(0xf97316, { roughness: 0.55 });
    const freeLawnMat = createClayMaterial(0x84a96c, { roughness: 0.85 });
    const cropLeafMat = createClayMaterial(0x4ade80, { roughness: 0.65 });

    let userSumX = 0;
    let userSumZ = 0;
    let userCount = 0;

    let previewSumX = 0;
    let previewSumZ = 0;
    let previewCount = 0;

    // Nhóm tọa độ các hộ hàng xóm để gắn 1 biển tên 3D cho mỗi hộ
    const neighborCenters = new Map();

    for (let r = 0; r < map.rows; r++) {
      for (let c = 0; c < map.cols; c++) {
        const key = `${c},${r}`;
        const { x, z, w, d } = this.cellToWorld(c, r);
        const pathX = this.getMainPathCenterX(z);
        // Tránh đè trực tiếp lên tim đường trục chính uốn nhẹ (chừa hành lang đường)
        const distToPath = Math.abs(x - pathX);
        const isUser = userSet.has(key);
        const isPreview = previewSet.has(key);
        const neighborOwner = occMap.get(key);

        if (isUser) {
          userSumX += x;
          userSumZ += z;
          userCount++;

          // Nền đất nâu phù sa của người chơi + khung viền xanh ngọc nổi bật
          const frame = new THREE.Mesh(new THREE.BoxGeometry(w - 0.12, 0.24, d - 0.16), userFrameMat);
          frame.position.set(x, 0.12, z);
          frame.receiveShadow = true;
          this.dynamicGroup.add(frame);

          const soil = new THREE.Mesh(new THREE.BoxGeometry(w - 0.36, 0.3, d - 0.4), userSoilMat);
          soil.position.set(x, 0.18, z);
          soil.receiveShadow = true;
          soil.userData = { col: c, row: r, type: 'user' };
          this.dynamicGroup.add(soil);
          this.interactiveTargets.push(soil);

          // Mô hình cây trồng / vật nuôi thu nhỏ trên mảnh đất của người chơi
          for (const dz of [-0.9, 0.9]) {
            const sprout = new THREE.Mesh(new THREE.SphereGeometry(0.34, 8, 8), cropLeafMat);
            sprout.position.set(x, 0.48, z + dz);
            sprout.castShadow = true;
            this.dynamicGroup.add(sprout);
          }
        } else if (isPreview) {
          previewSumX += x;
          previewSumZ += z;
          previewCount++;

          const prevMesh = new THREE.Mesh(
            new THREE.BoxGeometry(w - 0.18, 0.34, d - 0.22),
            previewMat
          );
          prevMesh.position.set(x, 0.2, z);
          prevMesh.userData = { col: c, row: r, type: 'preview' };
          this.dynamicGroup.add(prevMesh);
          this.interactiveTargets.push(prevMesh);
          this.previewMeshes.push(prevMesh);
        } else if (neighborOwner) {
          if (!neighborCenters.has(neighborOwner)) {
            neighborCenters.set(neighborOwner, { sumX: 0, sumZ: 0, count: 0 });
          }
          const nc = neighborCenters.get(neighborOwner);
          nc.sumX += x;
          nc.sumZ += z;
          nc.count++;

          // Tránh vẽ luống đất đè lên Chòi nghỉ & Ao sinh thái ở Cụm 4
          const isGazeboOrPond =
            neighborOwner.includes('Chòi Nghỉ') ||
            (neighborOwner.includes('Tuấn Kiệt') && c >= 2 && c <= 3);
          if (!isGazeboOrPond && distToPath > 1.1) {
            const nFrame = new THREE.Mesh(
              new THREE.BoxGeometry(w - 0.22, 0.16, d - 0.26),
              neighborBorderMat
            );
            nFrame.position.set(x, 0.08, z);
            this.dynamicGroup.add(nFrame);

            const nBed = new THREE.Mesh(
              new THREE.BoxGeometry(w - 0.42, 0.22, d - 0.46),
              neighborSoilMat
            );
            nBed.position.set(x, 0.12, z);
            nBed.userData = { col: c, row: r, type: 'neighbor', owner: neighborOwner };
            this.dynamicGroup.add(nBed);
            this.interactiveTargets.push(nBed);
          }
        } else if (distToPath > 1.25) {
          // Ô đất trống có thể mở rộng
          const freePlot = new THREE.Mesh(
            new THREE.BoxGeometry(w - 0.32, 0.09, d - 0.38),
            freeLawnMat
          );
          freePlot.position.set(x, 0.045, z);
          freePlot.userData = { col: c, row: r, type: 'free' };
          this.dynamicGroup.add(freePlot);
          this.interactiveTargets.push(freePlot);
        }
      }
    }

    // Ghim 3D nổi bật trên mảnh đất của người chơi ("🏡 VƯỜN CỦA BẠN")
    if (userCount > 0) {
      const ux = userSumX / userCount;
      const uz = userSumZ / userCount;

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 4.2, 8),
        createClayMaterial(0xffffff, { roughness: 0.3 })
      );
      pole.position.set(ux, 2.2, uz);
      this.dynamicGroup.add(pole);

      const userPin = this.createLabelSprite(
        `🏡 VƯỜN CỦA BẠN (${state.rentedAreaM2}m² • Cụm 3)`,
        {
          bgColor: 'rgba(22, 163, 74, 0.96)',
          borderColor: '#ffffff',
          scaleX: 11.5,
          scaleY: 2.35,
          fontSize: 27,
        }
      );
      userPin.position.set(ux, 4.8, uz);
      userPin.userData = { baseY: 4.8 };
      this.dynamicGroup.add(userPin);
      this.animatedPins.push(userPin);
    }

    // Ghim 3D cho vùng Sẽ Mở Rộng
    if (previewCount > 0) {
      const px = previewSumX / previewCount;
      const pz = previewSumZ / previewCount;
      const dirLabels = {
        north: '⬆️ Hướng Bắc',
        east: '➡️ Hướng Đông',
        south: '⬇️ Hướng Nam',
        west: '⬅️ Hướng Tây',
      };
      const prevPin = this.createLabelSprite(
        `➕ SẼ MỞ RỘNG +${selectedRentM2}m² (${dirLabels[selectedDirection] || ''})`,
        {
          bgColor: 'rgba(2, 132, 199, 0.95)',
          borderColor: '#e0f2fe',
          scaleX: 11.2,
          scaleY: 2.15,
          fontSize: 25,
        }
      );
      prevPin.position.set(px, 3.3, pz);
      prevPin.userData = { baseY: 3.3 };
      this.dynamicGroup.add(prevPin);
      this.animatedPins.push(prevPin);
    }

    // Biển tên 3D cho các hộ hàng xóm xung quanh (đặc biệt là GĐ Tuấn Kiệt chặn biên Bắc & GĐ Minh Anh biên Tây)
    for (const [ownerName, info] of neighborCenters.entries()) {
      if (ownerName.includes('Chòi Nghỉ') || info.count === 0) continue;
      const nx = info.sumX / info.count;
      const nz = info.sumZ / info.count;
      const shortOwner = ownerName.split('(')[0].trim();
      const isNorthBlocker = ownerName.includes('Tuấn Kiệt');
      const badgeText = isNorthBlocker
        ? `⛔ ${shortOwner} (Đã xây sát biên Bắc)`
        : `🚧 ${shortOwner}`;
      const nPin = this.createLabelSprite(badgeText, {
        bgColor: isNorthBlocker ? 'rgba(190, 18, 60, 0.92)' : 'rgba(234, 88, 12, 0.9)',
        scaleX: isNorthBlocker ? 10.2 : 7.6,
        scaleY: 1.75,
        fontSize: 23,
      });
      nPin.position.set(nx, 2.5, nz);
      this.dynamicGroup.add(nPin);
    }
  }

  bindInteraction() {
    if (!this.renderer) return;
    const dom = this.renderer.domElement;
    let downX = 0;
    let downY = 0;

    dom.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
    });

    dom.addEventListener('pointerup', (e) => {
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > 12) return;
      if (!this.lastStateRef || !this.onDirectionSelect) return;

      const rect = dom.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hits = this.raycaster.intersectObjects(this.interactiveTargets, false);
      if (hits.length === 0) return;

      const { col, row } = hits[0].object.userData || {};
      if (typeof col !== 'number' || typeof row !== 'number') return;

      const userCells = this.lastStateRef.masterMap.userCells || [];
      if (userCells.length === 0) return;
      const minCol = Math.min(...userCells.map((u) => u.col));
      const maxCol = Math.max(...userCells.map((u) => u.col));
      const minRow = Math.min(...userCells.map((u) => u.row));
      const maxRow = Math.max(...userCells.map((u) => u.row));

      if (row < minRow) {
        this.onDirectionSelect('north');
      } else if (row > maxRow) {
        this.onDirectionSelect('south');
      } else if (col < minCol) {
        this.onDirectionSelect('west');
      } else if (col > maxCol) {
        this.onDirectionSelect('east');
      }
    });

    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = Math.max(300, this.container.clientWidth);
    const height = Math.max(320, this.container.clientHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (!this.renderer || !this.scene || !this.camera) return;

    const t = this.clock.getElapsedTime();
    for (const pin of this.animatedPins) {
      if (pin.userData && typeof pin.userData.baseY === 'number') {
        pin.position.y = pin.userData.baseY + Math.sin(t * 2.8) * 0.28;
      }
    }
    for (const mesh of this.previewMeshes) {
      mesh.position.y = 0.2 + Math.sin(t * 4.0) * 0.06;
    }

    if (this.cameraTargetGoal && this.controls) {
      this.controls.target.lerp(this.cameraTargetGoal, 0.12);
      if (this.controls.target.distanceTo(this.cameraTargetGoal) < 0.08) {
        this.cameraTargetGoal = null;
      }
    }
    if (this.cameraPosGoal) {
      this.camera.position.lerp(this.cameraPosGoal, 0.1);
      if (this.camera.position.distanceTo(this.cameraPosGoal) < 0.15) {
        this.cameraPosGoal = null;
      }
    }

    if (this.controls) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
