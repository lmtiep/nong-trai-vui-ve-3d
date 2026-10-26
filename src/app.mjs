import {
  createInitialFarmState,
  topUpWallet,
  rentLandArea,
  ensurePlotCell,
  placeItemOnPlot,
  waterPlot,
  simulateDailyUpdate,
  requestRealWorldView,
  harvestPlot,
  assignManagedGarden,
  addExp,
  getGrowthStageInfo,
  hasFishPond,
  isBuildingItem,
  ensureMasterMap,
  getUserMapBounds,
  getClusterInfoByRow,
  getExpansionCapabilities,
  getPreviewExpansionCells,
  MASTER_MAP_COLS,
  MASTER_MAP_ROWS,
  MIN_POND_LAND_AREA_M2,
  ITEM_CATALOG,
  SHOP_CATEGORIES,
  PRICE_PER_10M2,
  MAX_USER_AREA_M2,
} from './farmEngine.mjs?v=20261026_06';
import {
  CuteIslandScene,
  ShopPreview3D,
  MasterMap3D,
  computeGridDimensions,
} from './scene3d.mjs?v=20261026_06';

const STORAGE_KEY = 'nong_trai_vui_ve_state_v4';

function loadOrCreateState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.walletBalance === 'number' && parsed.rentedAreaM2 >= 10) {
        ensureMasterMap(parsed);
        return parsed;
      }
    }
  } catch (_err) {
    // Ignore storage read errors
  }
  const initial = createInitialFarmState({
    familyName: 'Gia đình Bé Bắp • Vinhomes Smart City',
    apartmentAddress: 'Căn 1808, Tòa S2.05, Vinhomes Smart City, Nam Từ Liêm, Hà Nội',
    initialBalance: 8_000_000,
  });
  // Khởi tạo sẵn 40m² đất nâu liền mạch (lưới 8m x 5m, mỗi ô 1x1 = 1m²), để trống mặt đất nâu ban đầu
  rentLandArea(initial, 40);
  addExp(initial, 750); // Mở sẵn Cấp 5 trên bản Demo để thử mọi cây trồng & vật nuôi
  return initial;
}

function saveState(currentState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch (_err) {
    // Ignore storage write errors
  }
}

const state = loadOrCreateState();

let selectedPlotIndex = 0;
let selectedShopCategory = 'crop';
let selectedShopItemId = 'cabbage';
let selectedPreviewStage = 1;
let lastSlideDir = 0;
let selectedExpansionDirection = 'east';
let island3D = null;
let shopPreview3D = null;
let masterMap3D = null;

function stepPreviewStage(dir) {
  const selItem = ITEM_CATALOG[selectedShopItemId];
  if (!selItem || selItem.category === 'building') return;
  lastSlideDir = dir;
  if (dir > 0) {
    selectedPreviewStage = selectedPreviewStage < 5 ? selectedPreviewStage + 1 : 1;
  } else {
    selectedPreviewStage = selectedPreviewStage > 1 ? selectedPreviewStage - 1 : 5;
  }
  updateUI();
}
const timeModes = ['auto', 'day', 'sunset', 'night'];
let currentTimeModeIdx = 0;

function formatVnd(amount) {
  return `${amount.toLocaleString('vi-VN')}đ`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]
  );
}

function formatShortVnd(amount) {
  return `${Math.round(amount / 1000)}k`;
}

function getShortItemTitle(item) {
  if (item.shortName) return item.shortName;
  return item.name
    .replace(/\s*\(.*?\)\s*/g, '')
    .replace(' - Long Biên', '')
    .replace(' đất cát pha', '')
    .replace(' bãi bồi sông Hồng', '')
    .replace(' Nhật vụ Đông', '')
    .replace(' ngọt Hà Nội', '')
    .replace(' xanh mướt', '')
    .trim();
}

let walletDeltaTimer = null;

function showWalletDelta(deltaAmount) {
  if (!deltaAmount) return;
  const badge = document.getElementById('wallet-delta-badge');
  const pill = document.getElementById('wallet-pill');
  if (!badge) return;
  const isPositive = deltaAmount > 0;
  badge.textContent = `${isPositive ? '+' : '-'}${formatVnd(Math.abs(deltaAmount))}`;
  badge.className = `wallet-delta-badge ${isPositive ? 'delta-plus' : 'delta-minus'}`;
  if (pill) {
    pill.classList.remove('wallet-pulse-plus', 'wallet-pulse-minus');
    void pill.offsetWidth;
    pill.classList.add(isPositive ? 'wallet-pulse-plus' : 'wallet-pulse-minus');
  }
  if (walletDeltaTimer) clearTimeout(walletDeltaTimer);
  walletDeltaTimer = setTimeout(() => {
    badge.classList.add('hidden');
  }, 2600);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast-hide');
    setTimeout(() => toast.remove(), 260);
  }, 2800);
}

function openModal(id) {
  document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
  if (id === 'shop-modal') {
    requestAnimationFrame(() => {
      if (!shopPreview3D && island3D) {
        const shopViewport = document.getElementById('shop-3d-viewport');
        shopPreview3D = new ShopPreview3D(shopViewport, island3D);
      }
      if (shopPreview3D) {
        shopPreview3D.currentItemId = null;
        shopPreview3D.showItem(ITEM_CATALOG[selectedShopItemId], selectedPreviewStage);
      }
    });
  } else if (id === 'rent-modal') {
    const statusBar = document.getElementById('map-click-status-bar');
    if (statusBar) statusBar.classList.add('hidden');
    requestAnimationFrame(() => {
      if (!masterMap3D) {
        const mapViewport = document.getElementById('master-map-3d-viewport');
        if (mapViewport) {
          masterMap3D = new MasterMap3D(mapViewport, (interactEvent) => {
            if (!interactEvent) return;
            if (interactEvent.type === 'landmark') {
              showMapStatusMessage(interactEvent.label, 'info');
              return;
            }
            if (interactEvent.type === 'user') {
              const bounds = getUserMapBounds(state);
              const cl = getClusterInfoByRow(bounds.minRow);
              showMapStatusMessage(
                `🏡 Vườn của bạn: ${state.rentedAreaM2}m² tại ${cl.name} (${cl.desc})`,
                'success'
              );
              return;
            }
            const clickedDir =
              typeof interactEvent === 'string' ? interactEvent : interactEvent.dir;
            if (!clickedDir) return;
            const caps = getExpansionCapabilities(state);
            const info = caps[clickedDir];
            if (!info) return;
            if (!info.canExpand) {
              showMapStatusMessage(`⛔ ${info.shortLabel}: ${info.statusText}`, 'error');
              return;
            }
            selectedExpansionDirection = clickedDir;
            showMapStatusMessage(`🧭 Đã chọn ${info.shortLabel}: ${info.statusText}`, 'info');
            renderMasterMapUI();
          });
        }
      } else {
        masterMap3D.activeCalloutInfo = null;
        masterMap3D.resize();
      }
      renderMasterMapUI();
    });
  }
}

function showMapStatusMessage(text, tone = 'info') {
  const bar = document.getElementById('map-click-status-bar');
  if (!bar) return;
  bar.textContent = text;
  bar.className = `map-click-status-bar tone-${tone}`;
}

function closeAllModals() {
  document.querySelectorAll('.modal-backdrop').forEach((m) => m.classList.add('hidden'));
}

function updateHanoiTimeHUD() {
  if (!island3D) return;
  const mode = timeModes[currentTimeModeIdx];
  const info = island3D.setTimeOverrideMode(mode);
  const el = document.getElementById('hanoi-time-display');
  const btn = document.getElementById('btn-cycle-time');
  const icon = info.phase === 'night' ? '🌙' : info.phase === 'sunset' ? '🌇' : '🌤️';
  if (el) {
    el.textContent = `${icon} ${info.timeString} Hà Nội (${info.phaseLabel})`;
  }
  if (btn) {
    btn.textContent = mode === 'auto' ? 'Tự động HN' : `Xem: ${info.phaseLabel}`;
  }
}

function renderRealFarmPhotoCanvas(canvas, report) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;

  const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.42);
  skyGrad.addColorStop(0, '#8ecae6');
  skyGrad.addColorStop(1, '#e0f4ff');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, h * 0.42);

  ctx.fillStyle = '#588157';
  ctx.beginPath();
  ctx.moveTo(0, h * 0.42);
  for (let x = 0; x <= w; x += 40) {
    ctx.quadraticCurveTo(x + 20, h * 0.34, x + 40, h * 0.42);
  }
  ctx.fill();

  const groundGrad = ctx.createLinearGradient(0, h * 0.42, 0, h);
  groundGrad.addColorStop(0, '#6b8e4e');
  groundGrad.addColorStop(1, '#4a6b32');
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, h * 0.42, w, h * 0.58);

  ctx.fillStyle = '#5c3d28';
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h * 0.52);
  ctx.lineTo(w * 0.78, h * 0.52);
  ctx.lineTo(w * 0.9, h * 0.88);
  ctx.lineTo(w * 0.1, h * 0.88);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#8d6346';
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = '#d4a373';
  ctx.fillRect(w * 0.14, h * 0.45, 130, 38);
  ctx.fillStyle = '#2b2d42';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`Ô ${report.realLotCode}`, w * 0.16, h * 0.51);
  ctx.font = '11px sans-serif';
  ctx.fillText('1m² • Long Biên', w * 0.16, h * 0.55);

  ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
  ctx.fillRect(0, 0, w, 34);
  ctx.fillRect(0, h - 36, w, 36);

  ctx.fillStyle = '#4ade80';
  ctx.beginPath();
  ctx.arc(18, 17, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(`CAM THỰC TẾ • RIVERSIDE LONG BIÊN • Ô ${report.realLotCode}`, 32, 21);
  ctx.fillText(
    `GPS: ${report.gps} | Ẩm độ: ${report.soilMoisture}% | pH: ${report.soilPh} | Ngày ${report.day}`,
    14,
    h - 13
  );
}

function renderMasterMapUI() {
  ensureMasterMap(state);
  const capabilities = getExpansionCapabilities(state);
  const bounds = getUserMapBounds(state);

  // If currently selected direction is blocked, auto-pick first available direction if possible
  if (
    capabilities[selectedExpansionDirection] &&
    !capabilities[selectedExpansionDirection].canExpand
  ) {
    const firstOpen = ['east', 'south', 'west', 'north'].find(
      (d) => capabilities[d] && capabilities[d].canExpand
    );
    if (firstOpen) {
      selectedExpansionDirection = firstOpen;
    }
  }

  const activeDirInfo = capabilities[selectedExpansionDirection] || capabilities.east;
  const slider = document.getElementById('rent-area-slider');
  const maxByHouseholdCap = Math.max(0, MAX_USER_AREA_M2 - state.rentedAreaM2);
  const maxInDirection = activeDirInfo
    ? Math.min(maxByHouseholdCap, activeDirInfo.maxExpandM2)
    : maxByHouseholdCap;

  if (slider) {
    slider.max = String(Math.max(10, maxInDirection));
    if (Number(slider.value) > maxInDirection && maxInDirection >= 10) {
      slider.value = String(maxInDirection);
    }
  }

  const selectedRentM2 = slider ? Number(slider.value) : 20;
  const rentCost = (selectedRentM2 / 10) * PRICE_PER_10M2;

  const startCluster = getClusterInfoByRow(bounds.minRow);
  const endCluster = getClusterInfoByRow(bounds.maxRow);
  const clusterLabel =
    startCluster.id === endCluster.id
      ? startCluster.name
      : `${startCluster.shortName} → ${endCluster.shortName}`;

  const coordBadge = document.getElementById('user-map-coord-badge');
  if (coordBadge) {
    coordBadge.textContent = `📍 ${clusterLabel} • ${state.rentedAreaM2}m²`;
  }

  // Render 4 directional buttons (Tối giản: chỉ hiện tên hướng ngắn gọn + hạn mức, không hiện đoạn văn dài)
  const dirGrid = document.getElementById('expansion-direction-grid');
  if (dirGrid) {
    const dirOrder = ['north', 'east', 'south', 'west'];
    dirGrid.innerHTML = dirOrder
      .map((dirKey) => {
        const info = capabilities[dirKey];
        if (!info) return '';
        const isSelected = selectedExpansionDirection === dirKey;
        const isBlocked = !info.canExpand;
        return `
          <button
            type="button"
            class="dir-card ${isSelected ? 'active' : ''} ${isBlocked ? 'blocked' : ''}"
            data-expand-dir="${dirKey}"
          >
            <div class="dir-card-top">
              <span class="dir-card-title">${escapeHtml(info.shortLabel)}</span>
              <span class="dir-card-badge ${isBlocked ? 'badge-blocked' : 'badge-open'}">
                ${isBlocked ? '⛔ Kịch biên' : `+${info.maxExpandM2}m²`}
              </span>
            </div>
          </button>
        `;
      })
      .join('');

    dirGrid.querySelectorAll('[data-expand-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const dirKey = btn.getAttribute('data-expand-dir');
        const info = capabilities[dirKey];
        if (!info) return;
        if (!info.canExpand) {
          showMapStatusMessage(`⛔ ${info.shortLabel}: ${info.statusText}`, 'error');
          if (masterMap3D) {
            masterMap3D.showCallout(`⛔ ${info.shortLabel}: Kịch biên`, -3.5, -18, 'rgba(190, 18, 60, 0.94)');
          }
          return;
        }
        selectedExpansionDirection = dirKey;
        showMapStatusMessage(`🧭 ${info.shortLabel}: ${info.statusText}`, 'info');
        renderMasterMapUI();
      });
    });
  }

  const previewCells =
    activeDirInfo && activeDirInfo.canExpand
      ? getPreviewExpansionCells(state, selectedExpansionDirection, selectedRentM2)
      : [];

  if (masterMap3D) {
    masterMap3D.updateState(state, selectedExpansionDirection, selectedRentM2, previewCells);
  }

  const previewEl = document.getElementById('rent-area-preview');
  const rentBtn = document.getElementById('btn-rent-land');
  if (previewEl) {
    if (!activeDirInfo || !activeDirInfo.canExpand) {
      previewEl.textContent = `⛔ Kịch biên`;
    } else {
      previewEl.textContent = `+${selectedRentM2}m² (${activeDirInfo.shortLabel}) • ${formatVnd(rentCost)}`;
    }
  }
  if (rentBtn) {
    if (!activeDirInfo || !activeDirInfo.canExpand || maxInDirection < 10) {
      rentBtn.disabled = true;
      rentBtn.textContent = '⛔ Hướng này đã kịch biên';
    } else {
      rentBtn.disabled = false;
      rentBtn.textContent = `➕ Mở rộng +${selectedRentM2}m² (${formatVnd(rentCost)})`;
    }
  }
}

function updateUI() {
  saveState(state);
  const { cols } = computeGridDimensions(state.rentedAreaM2, state);
  const col = (selectedPlotIndex % cols) + 1;
  const row = Math.floor(selectedPlotIndex / cols) + 1;

  const formattedWallet = formatVnd(state.walletBalance);
  document.getElementById('wallet-balance').textContent = formattedWallet;
  document.querySelectorAll('[data-live-wallet]').forEach((el) => {
    el.textContent = formattedWallet;
  });
  document.getElementById('rented-area').textContent = `${state.rentedAreaM2}m²`;
  document.getElementById('farm-day').textContent = `Ngày ${state.day}`;
  document.getElementById('level-badge').textContent = `Lv.${state.level}`;

  const expPct = Math.min(100, Math.round((state.exp / Math.max(1, state.nextLevelExp)) * 100));
  document.getElementById('exp-bar-fill').style.width = `${expPct}%`;
  document.getElementById('unread-updates-count').textContent = String(state.dailyUpdates.length);

  const plot = ensurePlotCell(state, selectedPlotIndex);
  if (plot) {
    document.getElementById('ctx-plot-code').textContent = `Ô (${col},${row}) • 1m²`;
    document.getElementById('ctx-plot-icon').textContent = plot.item ? plot.item.icon : '🟫';
    if (plot.item) {
      const stgInfo = getGrowthStageInfo(plot.item);
      document.getElementById('ctx-plot-status').textContent =
        plot.item.category === 'building'
          ? '100%'
          : `GĐ ${stgInfo.stage}/5 • ${plot.item.growthProgress}%`;
    } else {
      document.getElementById('ctx-plot-status').textContent = 'Đất trống';
    }

    const popover = document.getElementById('plot-detail-popover');
    if (plot.item) {
      const stgInfo = getGrowthStageInfo(plot.item);
      popover.innerHTML = `
        <div><strong>${plot.item.icon} ${plot.item.name}</strong> • Tọa độ (${col},${row}) [1m²]</div>
        <div>🌟 <strong>${stgInfo.stageName}</strong></div>
        <div>💧 Độ ẩm đất: ${plot.soilMoisture}% • pH ${plot.soilPh}</div>
        <div style="margin-top:4px;opacity:0.9">${plot.item.realWorldAction}</div>
      `;
    } else {
      popover.innerHTML = `
        <div><strong>🟫 Đất nâu phù sa (${col},${row}) • 1m²</strong></div>
        <div>💧 Độ ẩm đất: ${plot.soilMoisture}% • pH ${plot.soilPh}</div>
        <div style="margin-top:4px;opacity:0.9">Bấm "🌱 Đặt/Trồng" để trồng cây hoặc đặt vật nuôi vào vị trí 1m² này.</div>
      `;
    }
  }

  // Rent Modal & 2,000m² Master Map preview
  renderMasterMapUI();

  const totalUsedM2 = state.otherFamiliesRentedM2 + state.rentedAreaM2;
  document.getElementById('pool-summary-text').textContent =
    `Đã thuê ${totalUsedM2}m² / 2.000m² (Của bạn: ${state.rentedAreaM2}m²)`;
  document.getElementById('pool-bar-user').style.width = `${(state.rentedAreaM2 / 2000) * 100}%`;
  document.getElementById('pool-bar-others').style.width = `${(state.otherFamiliesRentedM2 / 2000) * 100}%`;

  // Mastery & Garden Management Section
  const masteryTitleEl = document.getElementById('mastery-level-title');
  if (masteryTitleEl) {
    masteryTitleEl.textContent = `🏆 ${state.levelTitle}`;
  }
  const masteryExpBadge = document.getElementById('mastery-exp-badge');
  if (masteryExpBadge) {
    masteryExpBadge.textContent = `${state.exp} / ${state.nextLevelExp} EXP`;
  }
  const masteryStatsEl = document.getElementById('mastery-stats-grid');
  if (masteryStatsEl) {
    masteryStatsEl.innerHTML = `
      <div class="mastery-stat-card">
        ⏳ Thâm niên giữ đất
        <strong>${state.landTenureDays || 1} ngày (${state.rentedAreaM2}m²)</strong>
      </div>
      <div class="mastery-stat-card">
        🌱 Kinh nghiệm nuôi trồng
        <strong>${state.totalCultivationDays || 0} ngày-lô • ${state.successfulHarvests || 0} vụ thu hoạch</strong>
      </div>
      <div class="mastery-stat-card">
        💰 Tiền bán nông sản dư
        <strong>+${formatVnd(state.totalProduceRevenue || 0)}</strong>
      </div>
      <div class="mastery-stat-card">
        🤝 Phí quản lý hộ vườn (${state.managedOtherAreaM2 || 0}m²)
        <strong>+${formatVnd(state.totalManagementRevenue || 0)}</strong>
      </div>
    `;
  }

  document.querySelectorAll('[data-manage-area]').forEach((chip) => {
    const chipArea = Number(chip.getAttribute('data-manage-area'));
    chip.classList.toggle('active-chip', chipArea === (state.managedOtherAreaM2 || 0));
  });

  // Shop Category Tabs (Rau/Củ/Quả | Thú Nuôi | Hàng Rào, Chuồng & Máng)
  const tabsEl = document.getElementById('shop-category-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = '';
    SHOP_CATEGORIES.forEach((cat) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `shop-tab-btn ${cat.id === selectedShopCategory ? 'active' : ''}`;
      btn.textContent = cat.label;
      btn.addEventListener('click', () => {
        selectedShopCategory = cat.id;
        const firstInCat = Object.values(ITEM_CATALOG).find((i) => i.category === cat.id);
        if (firstInCat) selectedShopItemId = firstInCat.id;
        updateUI();
      });
      tabsEl.appendChild(btn);
    });
  }

  // Shop Modal Grid filtered by selectedShopCategory (Minimal Game Slots)
  const catalogEl = document.getElementById('shop-catalog-grid');
  catalogEl.innerHTML = '';
  const pondOpened = hasFishPond(state);
  Object.values(ITEM_CATALOG)
    .filter((item) => item.category === selectedShopCategory)
    .forEach((item) => {
      const levelOk = state.level >= item.unlockLevel;
      const areaOk = !item.minLandAreaM2 || state.rentedAreaM2 >= item.minLandAreaM2;
      const pondOk = !item.requiresPond || pondOpened;
      const unlocked = levelOk && areaOk && pondOk;
      const isSelected = item.id === selectedShopItemId;

      let lockLabel = `🔒 Lv.${item.unlockLevel}`;
      if (!areaOk) {
        lockLabel = `🏝️ ≥${item.minLandAreaM2}m²`;
      } else if (!pondOk) {
        lockLabel = '🏞️ Cần Ao';
      }

      const card = document.createElement('div');
      card.className = `shop-card ${unlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;
      card.innerHTML = `
        <span class="shop-icon">${item.icon}</span>
        <div class="shop-title">${getShortItemTitle(item)}</div>
        <div class="shop-meta">${formatShortVnd(item.cost)}</div>
        <span class="level-req-badge ${unlocked ? 'badge-open' : 'badge-lock'}">
          ${lockLabel}
        </span>
      `;
      card.addEventListener('click', () => {
        selectedShopItemId = item.id;
        updateUI();
      });
      catalogEl.appendChild(card);
    });

  const selItem = ITEM_CATALOG[selectedShopItemId];
  const previewEl = document.getElementById('shop-selected-preview');
  if (selItem && previewEl) {
    const isBuilding = selItem.category === 'building';
    const prevSideBtn = document.getElementById('btn-stage-prev');
    const nextSideBtn = document.getElementById('btn-stage-next');
    if (prevSideBtn) prevSideBtn.classList.toggle('hidden', isBuilding);
    if (nextSideBtn) nextSideBtn.classList.toggle('hidden', isBuilding);

    const timeLabel = isBuilding ? '⚡ Xây ngay' : `⏱️ ${selItem.growthDays} ngày`;
    const pricePerKg = selItem.sellPricePerKg || 30_000;
    const secondPill = isBuilding
      ? `<span class="shop-stat-pill">✨ +${selItem.expReward} EXP</span>`
      : `<span class="shop-stat-pill">💵 Giá bán: ${formatShortVnd(pricePerKg)}/kg</span>`;

    let reqPill = '';
    if (selItem.minLandAreaM2 && state.rentedAreaM2 < selItem.minLandAreaM2) {
      reqPill = `<span class="shop-stat-pill" style="background:#fef2f2;color:#b91c1c">🏝️ Cần đạt ≥${selItem.minLandAreaM2}m² đất (Hiện có ${state.rentedAreaM2}m²)</span>`;
    } else if (selItem.requiresPond && !pondOpened) {
      reqPill = `<span class="shop-stat-pill" style="background:#eff6ff;color:#1d4ed8">🏞️ Cần mở "Đào Ao (≥${MIN_POND_LAND_AREA_M2}m²)" trước khi thả cá</span>`;
    }

    const stgInfo = getGrowthStageInfo({ ...selItem, growthStage: selectedPreviewStage });
    const dotsHtml = [1, 2, 3, 4, 5]
      .map(
        (st) =>
          `<span class="stage-slide-dot ${selectedPreviewStage === st ? 'active' : ''}"></span>`
      )
      .join('');

    const stageSlideHtml = isBuilding
      ? ''
      : `
        <div class="shop-stage-slider">
          <button type="button" class="stage-slide-arrow" data-stage-dir="-1" title="Về cấp trước (Trái)">
            ◀
          </button>
          <div class="stage-slide-center">
            <div class="stage-slide-dots">${dotsHtml}</div>
            <div class="stage-slide-title">${stgInfo.stageName}</div>
          </div>
          <button type="button" class="stage-slide-arrow" data-stage-dir="1" title="Sang cấp tiếp theo (Phải)">
            ▶
          </button>
        </div>
      `;

    previewEl.innerHTML = `
      ${stageSlideHtml}
      <div class="shop-preview-name">${selItem.icon} ${getShortItemTitle(selItem)}</div>
      <div class="shop-preview-pills">
        ${reqPill}
        <span class="shop-stat-pill" title="${selItem.costBasis || ''}">💰 Vốn: ${formatShortVnd(selItem.cost)}</span>
        ${secondPill}
        <span class="shop-stat-pill">${timeLabel}</span>
      </div>
    `;
    previewEl.querySelectorAll('[data-stage-dir]').forEach((btn) => {
      btn.addEventListener('click', () => {
        stepPreviewStage(Number(btn.getAttribute('data-stage-dir')));
      });
    });
    const placeBtn = document.getElementById('btn-place-item');
    if (placeBtn) {
      placeBtn.textContent = `🌱 Mua & Đặt "${getShortItemTitle(selItem)}" (-${formatVnd(selItem.cost)})`;
    }
    if (shopPreview3D) {
      shopPreview3D.showItem(selItem, isBuilding ? 5 : selectedPreviewStage, lastSlideDir);
      lastSlideDir = 0;
    }
  }

  // Daily Farm Updates Drawer
  const feedEl = document.getElementById('daily-updates-feed');
  feedEl.innerHTML = state.dailyUpdates
    .slice(0, 8)
    .map(
      (u) => `
      <div class="feed-item">
        <div class="feed-header">
          <strong>${escapeHtml(u.title)}</strong>
          <span class="feed-time">Ngày ${u.day} • ${u.time}</span>
        </div>
        <p class="feed-msg">${escapeHtml(u.message)}</p>
        <div class="feed-footer">
          <span>🌤️ ${u.weather}</span>
          <span>💧 ${u.soilMoisture}%</span>
          <span>👨‍🌾 ${u.staffName}</span>
        </div>
      </div>
    `
    )
    .join('');

  const ordersEl = document.getElementById('harvest-orders-list');
  ordersEl.innerHTML =
    state.harvestOrders.length === 0
      ? `<p style="font-size:0.78rem;color:#64748b">Chưa có đơn thu hoạch nào.</p>`
      : state.harvestOrders
          .map(
            (o) => `
          <div class="order-item">
            <strong>${o.itemIcon} ${escapeHtml(o.itemName)}</strong> (${o.realLotCode}) — ${escapeHtml(o.methodLabel)}<br/>
            <small>${escapeHtml(o.addressOrSchedule)}</small>
          </div>
        `
          )
          .join('');

  if (island3D) {
    island3D.renderState(state, selectedPlotIndex);
  }
}

function triggerLiveView() {
  const res = requestRealWorldView(state, selectedPlotIndex);
  if (!res.ok) {
    showToast(res.error, 'error');
    return;
  }
  const r = res.report;
  document.getElementById('live-modal-title').textContent =
    `📸 Ảnh & Thông Số Thực Tế • ${r.realLotCode} (Riverside Long Biên)`;
  document.getElementById('live-modal-meta').innerHTML = `
    <div class="live-grid">
      <div><strong>Vị trí:</strong> Riverside Long Biên, Hà Nội</div>
      <div><strong>Hạng mục:</strong> ${r.itemIcon} ${r.itemName} (${r.growthProgress}%)</div>
      <div><strong>Nhiệt độ:</strong> ${r.temperature}</div>
      <div><strong>Độ ẩm & pH:</strong> ${r.soilMoisture}% • pH ${r.soilPh}</div>
    </div>
    <p class="staff-quote">💬 <em>"${r.staffReport}"</em></p>
  `;
  const canvas = document.getElementById('live-photo-canvas');
  renderRealFarmPhotoCanvas(canvas, r);
  openModal('live-view-modal');
}

function initEventListeners() {
  document.querySelectorAll('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openModal(btn.getAttribute('data-open-modal'));
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', closeAllModals);
  });
  document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeAllModals();
    });
  });

  document.getElementById('btn-hud-info').addEventListener('click', () => openModal('rent-modal'));

  // Các nút chọn góc nhìn Camera trên Sa Bàn 3D 25m x 80m
  document.querySelectorAll('[data-map-cam]').forEach((camBtn) => {
    camBtn.addEventListener('click', () => {
      const preset = camBtn.getAttribute('data-map-cam');
      document.querySelectorAll('[data-map-cam]').forEach((b) => {
        b.classList.toggle('active', b === camBtn);
      });
      if (masterMap3D) {
        masterMap3D.setCameraPreset(preset, state);
      }
    });
  });

  // Nút "!" (Help Tooltip): Hiện khi di chuột hoặc bấm vào dấu "!"
  document.querySelectorAll('.help-bang-btn').forEach((bangBtn) => {
    bangBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const wrap = bangBtn.closest('.help-tip-wrap');
      if (!wrap) return;
      const wasOpen = wrap.classList.contains('help-open');
      document.querySelectorAll('.help-tip-wrap.help-open').forEach((w) => {
        w.classList.remove('help-open');
      });
      if (!wasOpen) {
        wrap.classList.add('help-open');
      }
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.help-tip-wrap.help-open').forEach((w) => {
      w.classList.remove('help-open');
    });
  });

  document.getElementById('btn-open-topup').addEventListener('click', (e) => {
    e.stopPropagation();
    openModal('topup-modal');
  });
  const walletPill = document.getElementById('wallet-pill');
  if (walletPill) {
    walletPill.addEventListener('click', () => openModal('topup-modal'));
  }

  document.getElementById('btn-cycle-time').addEventListener('click', () => {
    currentTimeModeIdx = (currentTimeModeIdx + 1) % timeModes.length;
    updateHanoiTimeHUD();
  });

  document.getElementById('btn-ctx-plant').addEventListener('click', () => openModal('shop-modal'));
  document.getElementById('btn-ctx-detail').addEventListener('click', () => {
    document.getElementById('plot-detail-popover').classList.toggle('hidden');
  });

  const prevStageBtn = document.getElementById('btn-stage-prev');
  if (prevStageBtn) {
    prevStageBtn.addEventListener('click', () => stepPreviewStage(-1));
  }
  const nextStageBtn = document.getElementById('btn-stage-next');
  if (nextStageBtn) {
    nextStageBtn.addEventListener('click', () => stepPreviewStage(1));
  }

  window.addEventListener('keydown', (e) => {
    const shopModal = document.getElementById('shop-modal');
    if (!shopModal || shopModal.classList.contains('hidden')) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      stepPreviewStage(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepPreviewStage(-1);
    }
  });

  document.querySelectorAll('[data-topup]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const amount = Number(btn.getAttribute('data-topup'));
      const res = topUpWallet(state, amount);
      if (res.ok) {
        closeAllModals();
        showWalletDelta(res.addedAmount);
        updateUI();
        showToast(
          `💰 Đã nạp +${formatVnd(amount)} • Quỹ hiện có: ${formatVnd(state.walletBalance)}`,
          'success'
        );
      }
    });
  });

  const customTopupBtn = document.getElementById('btn-custom-topup');
  if (customTopupBtn) {
    customTopupBtn.addEventListener('click', () => {
      const input = document.getElementById('custom-topup-input');
      const amount = Number(input ? input.value : 0);
      const res = topUpWallet(state, amount);
      if (!res.ok) {
        showToast(res.error, 'error');
        return;
      }
      if (input) input.value = '';
      closeAllModals();
      showWalletDelta(res.addedAmount);
      updateUI();
      showToast(
        `💰 Đã nạp +${formatVnd(res.addedAmount)} • Quỹ hiện có: ${formatVnd(state.walletBalance)}`,
        'success'
      );
    });
  }

  const slider = document.getElementById('rent-area-slider');
  slider.addEventListener('input', () => {
    renderMasterMapUI();
  });

  document.querySelectorAll('[data-rent-preset]').forEach((chip) => {
    chip.addEventListener('click', () => {
      slider.value = chip.getAttribute('data-rent-preset');
      renderMasterMapUI();
    });
  });

  document.querySelectorAll('[data-manage-area]').forEach((chip) => {
    chip.addEventListener('click', () => {
      const areaToManage = Number(chip.getAttribute('data-manage-area'));
      const res = assignManagedGarden(state, areaToManage);
      if (!res.ok) {
        showToast(res.error, 'error');
        return;
      }
      if (areaToManage > 0) {
        showToast(
          `🤝 Đang nhận quản lý hộ ${areaToManage}m² vườn (+${formatVnd(res.dailyFee)}/ngày)!`,
          'success'
        );
      } else {
        showToast('Đã tạm dừng nhận quản lý hộ vườn.', 'info');
      }
      updateUI();
    });
  });

  document.getElementById('btn-rent-land').addEventListener('click', () => {
    const areaToRent = Number(slider.value);
    const res = rentLandArea(state, areaToRent, selectedExpansionDirection);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    const dirLabelMap = {
      north: 'Hướng Bắc ⬆️',
      east: 'Hướng Đông ➡️',
      south: 'Hướng Nam ⬇️',
      west: 'Hướng Tây ⬅️',
    };
    closeAllModals();
    showWalletDelta(-res.cost);
    updateUI();
    showToast(
      `🏝️ Đã mở rộng +${areaToRent}m² về ${dirLabelMap[res.direction] || 'hướng đã chọn'} (-${formatVnd(res.cost)}) • Quỹ còn: ${formatVnd(state.walletBalance)}`,
      'success'
    );
  });

  document.getElementById('btn-place-item').addEventListener('click', () => {
    const res = placeItemOnPlot(state, selectedPlotIndex, selectedShopItemId);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    if (typeof res.plotIndex === 'number') {
      selectedPlotIndex = res.plotIndex;
    }
    closeAllModals();
    showWalletDelta(-res.costDeducted);
    updateUI();
    showToast(
      `🌱 Đã mua "${ITEM_CATALOG[selectedShopItemId].name}" (-${formatVnd(res.costDeducted)}) • Quỹ còn: ${formatVnd(state.walletBalance)}`,
      'success'
    );
  });

  document.getElementById('btn-water-plot').addEventListener('click', () => {
    const res = waterPlot(state, selectedPlotIndex);
    if (!res.ok) {
      showToast(res.error, 'error');
      return;
    }
    showToast(
      res.expEarned > 0 ? `💧 Đã tưới nước (+${res.expEarned} EXP)!` : '💧 Ô này đã được tưới hôm nay.',
      'info'
    );
    updateUI();
  });

  document.getElementById('btn-next-day').addEventListener('click', () => {
    const res = simulateDailyUpdate(state, 1);
    if (res.ok) {
      if (res.managementFeeEarned > 0) {
        showWalletDelta(res.managementFeeEarned);
      }
      const feeMsg =
        res.managementFeeEarned > 0
          ? ` • Thu +${formatVnd(res.managementFeeEarned)} phí quản lý hộ!`
          : '';
      updateUI();
      showToast(
        `☀️ Ngày ${res.day}: +${res.expEarned} EXP kinh nghiệm${feeMsg}`,
        'success'
      );
    }
  });

  const nextWeekBtn = document.getElementById('btn-next-week');
  if (nextWeekBtn) {
    nextWeekBtn.addEventListener('click', () => {
      const res = simulateDailyUpdate(state, 7);
      if (res.ok) {
        if (res.managementFeeEarned > 0) {
          showWalletDelta(res.managementFeeEarned);
        }
        const feeMsg =
          res.managementFeeEarned > 0
            ? ` • Thu +${formatVnd(res.managementFeeEarned)} phí quản lý hộ 7 ngày!`
            : '';
        updateUI();
        showToast(
          `⏩ Đã qua 7 ngày (Ngày ${res.day}): +${res.expEarned} EXP kinh nghiệm${feeMsg}`,
          'success'
        );
      }
    });
  }

  document.getElementById('btn-request-live').addEventListener('click', triggerLiveView);
  document.getElementById('btn-dock-live').addEventListener('click', triggerLiveView);

  document.getElementById('btn-open-harvest').addEventListener('click', () => {
    const plot = ensurePlotCell(state, selectedPlotIndex);
    if (!plot || !plot.item) {
      showToast('Vị trí 1m² này chưa có cây/vật nuôi.', 'error');
      return;
    }
    if (isBuildingItem(plot.item)) {
      showToast(`"${plot.item.name}" là công trình, không thể thu hoạch.`, 'error');
      return;
    }
    if (plot.item.growthProgress < 100) {
      showToast(`Cần đạt 100% mới thu hoạch được (Hiện tại: ${plot.item.growthProgress}%).`, 'error');
      return;
    }
    const retailPrice =
      plot.item.retailMarketPrice || Math.round((plot.item.cost || 40_000) * 3.6);
    const farmBuyback =
      plot.item.farmBuybackPrice || Math.round(retailPrice * 0.5);
    document.getElementById('harvest-modal-item').textContent =
      `${plot.item.icon} ${plot.item.name} (${plot.realLotCode}) — ${plot.item.yieldDescription}`;
    const sellTitleEl = document.getElementById('btn-harvest-sell-title');
    if (sellTitleEl) {
      sellTitleEl.textContent = `💰 Bán Lại Cho Trang Trại (+${formatVnd(farmBuyback)})`;
    }
    const sellSubEl = document.getElementById('btn-harvest-sell-sub');
    if (sellSubEl) {
      sellSubEl.textContent = `Bằng 50% giá lẻ thị trường (${formatVnd(retailPrice)}) để Trang Trại phân phối ra ngoài`;
    }
    openModal('harvest-modal');
  });

  document.getElementById('btn-harvest-ship').addEventListener('click', () => {
    const addr = document.getElementById('apartment-address-input').value.trim();
    const res = harvestPlot(state, selectedPlotIndex, {
      method: 'ship_apartment',
      address: addr || state.apartmentAddress,
    });
    if (res.ok) {
      closeAllModals();
      showToast(`🚚 Đã đặt lịch ship về chung cư (+${res.order.expEarned} EXP)!`, 'success');
      updateUI();
    } else {
      showToast(res.error, 'error');
    }
  });

  document.getElementById('btn-harvest-visit').addEventListener('click', () => {
    const res = harvestPlot(state, selectedPlotIndex, {
      method: 'farm_visit',
      address: 'Thứ Bảy tuần này (08:30) tại Nông trại Riverside Long Biên',
    });
    if (res.ok) {
      closeAllModals();
      showToast(`👨‍👩‍👧‍👦 Đã giữ vườn cuối tuần (+${res.order.expEarned} EXP)!`, 'success');
      updateUI();
    } else {
      showToast(res.error, 'error');
    }
  });

  document.getElementById('btn-harvest-sell').addEventListener('click', () => {
    const res = harvestPlot(state, selectedPlotIndex, {
      method: 'sell_surplus',
    });
    if (res.ok) {
      closeAllModals();
      showWalletDelta(res.order.saleRevenue);
      updateUI();
      showToast(
        `💰 Đã bán ${res.order.qualityGrade} (+${formatVnd(res.order.saleRevenue)}) • Quỹ mới: ${formatVnd(state.walletBalance)}!`,
        'success'
      );
    } else {
      showToast(res.error, 'error');
    }
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const viewport = document.getElementById('island-3d-viewport');
  island3D = new CuteIslandScene(viewport, (plotIdx) => {
    selectedPlotIndex = plotIdx;
    document.getElementById('plot-detail-popover').classList.add('hidden');
    updateUI();
  });
  initEventListeners();
  updateHanoiTimeHUD();
  setInterval(updateHanoiTimeHUD, 15000);
  updateUI();
});
