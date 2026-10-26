import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialFarmState,
  topUpWallet,
  rentLandArea,
  placeItemOnPlot,
  waterPlot,
  simulateDailyUpdate,
  requestRealWorldView,
  harvestPlot,
  assignManagedGarden,
  getGrowthStageInfo,
  hasFishPond,
  getExpansionCapabilities,
  getPreviewExpansionCells,
  ITEM_CATALOG,
  SHOP_CATEGORIES,
  computeRoamingCells,
} from '../src/farmEngine.mjs';

test('creates initial farm state with 2000m2 Hanoi demo pool and starting balance', () => {
  const state = createInitialFarmState({
    familyName: 'Gia đình Bé Bắp - Vinhomes Smart City',
    initialBalance: 1_000_000,
  });

  assert.equal(state.totalProjectAreaM2, 2000);
  assert.equal(state.walletBalance, 1_000_000);
  assert.equal(state.rentedAreaM2, 0);
  assert.equal(state.level, 1);
  assert.equal(state.plots.length, 0);
});

test('rents land in multiples of 10m2 at 200,000 VND per 10m2 up to 500m2 max', () => {
  const state = createInitialFarmState({ initialBalance: 12_000_000 });

  // Reject non-multiple of 10m2
  const invalidMultiple = rentLandArea(state, 15);
  assert.equal(invalidMultiple.ok, false);
  assert.match(invalidMultiple.error, /bội số của 10m²/i);

  // Rent 30m2 -> costs 600,000 VND and creates 3 plots of 10m2
  const rent30 = rentLandArea(state, 30);
  assert.equal(rent30.ok, true);
  assert.equal(state.rentedAreaM2, 30);
  assert.equal(state.walletBalance, 11_400_000);
  assert.equal(state.plots.length, 3);
  assert.equal(state.plots[0].areaM2, 10);
  assert.equal(state.plots[0].realLotCode, 'HN-DA-001');

  // Reject exceeding 500m2 total per user
  const exceedMax = rentLandArea(state, 480);
  assert.equal(exceedMax.ok, false);
  assert.match(exceedMax.error, /tối đa 500m²/i);

  // Rent another 470m2 to reach exact 500m2 max
  const rentToMax = rentLandArea(state, 470);
  assert.equal(rentToMax.ok, true);
  assert.equal(state.rentedAreaM2, 500);
  assert.equal(state.plots.length, 50);
});

test('topUpWallet adds VND funds and rejects invalid amounts', () => {
  const state = createInitialFarmState({ initialBalance: 200_000 });

  const badTopUp = topUpWallet(state, -50_000);
  assert.equal(badTopUp.ok, false);

  const goodTopUp = topUpWallet(state, 500_000);
  assert.equal(goodTopUp.ok, true);
  assert.equal(state.walletBalance, 700_000);
});

test('enforces level unlock requirements and levels up as player gains EXP', () => {
  const state = createInitialFarmState({ initialBalance: 5_000_000 });
  rentLandArea(state, 40); // 4 plots, grants EXP

  // Chicken coop requires Level 3, player is still Level 1
  const lockedAttempt = placeItemOnPlot(state, 0, 'chicken_coop');
  assert.equal(lockedAttempt.ok, false);
  assert.match(lockedAttempt.error, /Cấp 3/i);

  // Place Level 1 items (cabbage, white_fence, name_sign) to earn EXP
  const placeCabbage = placeItemOnPlot(state, 0, 'cabbage');
  assert.equal(placeCabbage.ok, true);
  assert.equal(state.plots[0].item.id, 'cabbage');

  const placeFence = placeItemOnPlot(state, 1, 'white_fence');
  assert.equal(placeFence.ok, true);

  // Water plots and simulate updates to gain EXP and reach Level 2+
  waterPlot(state, 0);
  simulateDailyUpdate(state);
  simulateDailyUpdate(state);

  assert.ok(state.level >= 2, `Expected level >= 2, got ${state.level}`);
  const placeTomato = placeItemOnPlot(state, 2, 'cherry_tomato');
  assert.equal(placeTomato.ok, true);
  assert.equal(state.plots[2].item.id, 'cherry_tomato');
});

test('simulates daily farm updates and supports on-demand real-world photo/info requests', () => {
  const state = createInitialFarmState({ initialBalance: 2_000_000 });
  rentLandArea(state, 20);
  placeItemOnPlot(state, 0, 'cabbage');

  const updateRes = simulateDailyUpdate(state);
  assert.equal(updateRes.ok, true);
  assert.equal(state.day, 2);
  assert.ok(state.plots[0].item.growthProgress > 0);
  assert.ok(state.dailyUpdates.length >= 2);

  const liveView = requestRealWorldView(state, 0);
  assert.equal(liveView.ok, true);
  assert.equal(liveView.report.realLotCode, 'HN-DA-001');
  assert.match(liveView.report.location, /Hà Nội/i);
  assert.equal(liveView.report.itemName, ITEM_CATALOG.cabbage.name);
  assert.ok(typeof liveView.report.soilMoisture === 'number');
});

test('harvests mature plot and creates apartment shipping or weekend farm visit order', () => {
  const state = createInitialFarmState({ initialBalance: 2_000_000 });
  rentLandArea(state, 20);
  placeItemOnPlot(state, 0, 'cabbage');

  // Cannot harvest before 100% maturity
  const earlyHarvest = harvestPlot(state, 0, {
    method: 'ship_apartment',
    address: 'Tòa S2.05 Vinhomes Smart City, Nam Từ Liêm, Hà Nội',
  });
  assert.equal(earlyHarvest.ok, false);

  // Advance days until mature
  while (state.plots[0].item.growthProgress < 100) {
    simulateDailyUpdate(state);
  }

  const harvestRes = harvestPlot(state, 0, {
    method: 'ship_apartment',
    address: 'Tòa S2.05 Vinhomes Smart City, Nam Từ Liêm, Hà Nội',
  });
  assert.equal(harvestRes.ok, true);
  assert.equal(state.harvestOrders.length, 1);
  assert.equal(state.harvestOrders[0].method, 'ship_apartment');
  assert.equal(state.plots[0].item, null);
});

test('organizes shop catalog into crop, livestock, and building categories including coop and trough', () => {
  assert.equal(SHOP_CATEGORIES.length, 3);
  assert.deepEqual(
    SHOP_CATEGORIES.map((c) => c.id),
    ['crop', 'livestock', 'building']
  );

  // Check building items: white_fence, wood_coop, feed_trough
  assert.equal(ITEM_CATALOG.white_fence.category, 'building');
  assert.equal(ITEM_CATALOG.wood_coop.category, 'building');
  assert.equal(ITEM_CATALOG.feed_trough.category, 'building');

  // Check livestock items: chicken_coop, rabbit_hutch, duck
  assert.equal(ITEM_CATALOG.chicken_coop.category, 'livestock');
  assert.equal(ITEM_CATALOG.rabbit_hutch.category, 'livestock');
  assert.equal(ITEM_CATALOG.duck.category, 'livestock');

  // Check new Long Bien leafy vegetables & cherry tomato IconScout mappings
  assert.equal(ITEM_CATALOG.lettuce.category, 'crop');
  assert.equal(ITEM_CATALOG.lettuce.iconScoutFile, 'crop_lettuce.glb');
  assert.equal(ITEM_CATALOG.malabar_spinach.category, 'crop');
  assert.equal(ITEM_CATALOG.malabar_spinach.iconScoutFile, 'crop_spinach.glb');
  assert.equal(
    ITEM_CATALOG.cherry_tomato.iconScoutUrl,
    'https://iconscout.com/3d-icon/tomato-plant-3d-icon_9710037'
  );
});

test('computeRoamingCells lets animals roam whole field unless enclosed by white_fence', () => {
  const state = createInitialFarmState({ initialBalance: 5_000_000 });
  rentLandArea(state, 20); // 20m2 -> e.g., 5 cols x 4 rows
  const cols = 5;
  const rows = 4;

  // Place chicken at top-left cell 0 (col=0, row=0) with no fences
  placeItemOnPlot(state, 0, 'cabbage'); // level 1 item first or unlock level 3
  state.level = 5;
  state.plots[0].item = null;
  placeItemOnPlot(state, 0, 'chicken_coop');

  const freeRoam = computeRoamingCells(state, 0, cols, rows);
  assert.equal(freeRoam.length, 20);

  // Now fence off a 2x2 pen at top-left: cells (0,0), (1,0), (0,1), (1,1)
  // Barrier fences at col=2 for row 0,1 and row=2 for col 0,1,2:
  // indices in 5-col grid: (2,0)=2, (2,1)=7, (0,2)=10, (1,2)=11, (2,2)=12
  for (const fenceIdx of [2, 7, 10, 11, 12]) {
    placeItemOnPlot(state, fenceIdx, 'white_fence');
  }

  const pennedRoam = computeRoamingCells(state, 0, cols, rows);
  assert.deepEqual(
    pennedRoam.map((c) => c.index).sort((a, b) => a - b),
    [0, 1, 5, 6]
  );
});

test('calculates EXP from land tenure, cultivation duration, and quality harvests, plus earns money from selling surplus and managing other gardens', () => {
  const state = createInitialFarmState({ initialBalance: 5_000_000 });
  rentLandArea(state, 20); // 20m2

  // Level 1 cannot manage other people's gardens yet (requires Level 3+ mastery)
  const earlyManage = assignManagedGarden(state, 20);
  assert.equal(earlyManage.ok, false);

  // Plant cabbage and care for it over time (water + daily updates)
  placeItemOnPlot(state, 0, 'cabbage');
  const expAfterPlanting = state.exp;

  while (state.plots[0].item.growthProgress < 100) {
    waterPlot(state, 0);
    simulateDailyUpdate(state);
  }

  // Land tenure days & active cultivation days must have increased and granted mastery EXP
  assert.ok(state.landTenureDays >= 2);
  assert.ok(state.totalCultivationDays >= 2);
  assert.ok(state.exp > expAfterPlanting);

  // Sell surplus produce to the farm (farm buyback price = 50% of retail market price)
  const balanceBeforeSale = state.walletBalance;
  const expBeforeHarvest = state.exp;
  const saleRes = harvestPlot(state, 0, { method: 'sell_surplus' });
  assert.equal(saleRes.ok, true);
  assert.equal(
    ITEM_CATALOG.cabbage.farmBuybackPrice,
    Math.round(ITEM_CATALOG.cabbage.retailMarketPrice * 0.5)
  );
  assert.ok(ITEM_CATALOG.cabbage.growthDays >= 28);
  assert.ok(saleRes.order.saleRevenue >= ITEM_CATALOG.cabbage.farmBuybackPrice);
  assert.ok(saleRes.order.saleRevenue > ITEM_CATALOG.cabbage.cost);
  assert.ok(saleRes.order.saleRevenue < ITEM_CATALOG.cabbage.retailMarketPrice);
  assert.equal(state.walletBalance, balanceBeforeSale + saleRes.order.saleRevenue);
  assert.ok(state.exp >= expBeforeHarvest + ITEM_CATALOG.cabbage.expReward);
  assert.equal(state.successfulHarvests, 1);

  // Reach Level 3+ experienced farmer status and manage 30m2 for other families
  state.level = 3;
  const manageRes = assignManagedGarden(state, 30);
  assert.equal(manageRes.ok, true);
  assert.equal(state.managedOtherAreaM2, 30);

  const balanceBeforeDailyFee = state.walletBalance;
  const dailyRes = simulateDailyUpdate(state);
  assert.equal(dailyRes.ok, true);
  assert.ok(dailyRes.managementFeeEarned > 0);
  assert.equal(state.walletBalance, balanceBeforeDailyFee + dailyRes.managementFeeEarned);
});

test('tracks 5 distinct 3D growth stages for crops and livestock across weekly updates', () => {
  const state = createInitialFarmState({ initialBalance: 5_000_000 });
  rentLandArea(state, 20);
  state.level = 5;

  // Plant cabbage (28-day cycle -> ~1 stage per week across 5 stages)
  placeItemOnPlot(state, 0, 'cabbage');
  const seenStages = new Set([state.plots[0].item.growthStage]);
  assert.equal(state.plots[0].item.growthStage, 1);

  const stage1Info = getGrowthStageInfo(state.plots[0].item);
  assert.equal(stage1Info.stage, 1);
  assert.equal(stage1Info.totalStages, 5);

  // Advance week by week (+7 days) and verify growthStage progresses through stages up to 5
  for (let w = 0; w < 4; w++) {
    simulateDailyUpdate(state, 7);
    seenStages.add(state.plots[0].item.growthStage);
  }

  assert.equal(state.plots[0].item.growthStage, 5);
  assert.equal(state.plots[0].item.growthProgress, 100);
  assert.equal(seenStages.size, 5);
});

test('supports raising pigs, requires 300m2 land to build a fish pond, and unlocks raising fish after opening a pond', () => {
  const state = createInitialFarmState({ initialBalance: 10_000_000 });
  rentLandArea(state, 40);
  state.level = 5;

  // 1. Pig is available in livestock catalog and can be placed on land
  assert.equal(ITEM_CATALOG.pig.category, 'livestock');
  const pigRes = placeItemOnPlot(state, 0, 'pig');
  assert.equal(pigRes.ok, true);
  assert.equal(state.plots[0].item.id, 'pig');

  // 2. Cannot build fish_pond or stock fish_carp when rentedAreaM2 < 300m2
  const earlyPond = placeItemOnPlot(state, 1, 'fish_pond');
  assert.equal(earlyPond.ok, false);
  const earlyFish = placeItemOnPlot(state, 1, 'fish_carp');
  assert.equal(earlyFish.ok, false);
  assert.equal(hasFishPond(state), false);

  // 3. Expand land to 300m2 (+260m2) -> can now build fish_pond
  const rentRes = rentLandArea(state, 260);
  assert.equal(rentRes.ok, true);
  assert.equal(state.rentedAreaM2, 300);

  const pondRes = placeItemOnPlot(state, 1, 'fish_pond');
  assert.equal(pondRes.ok, true);
  assert.equal(hasFishPond(state), true);

  // 4. After opening the pond, player can stock fish_carp directly into the pond plot
  const fishRes = placeItemOnPlot(state, 1, 'fish_carp');
  assert.equal(fishRes.ok, true);
  assert.equal(state.plots[1].item.id, 'fish_carp');
  assert.equal(state.plots[1].item.growthStage, 1);

  // 5. Buying consecutive items on the same plotIndex automatically finds the next empty cell and deducts walletBalance each time
  const balanceBeforeBuys = state.walletBalance;
  const buy1 = placeItemOnPlot(state, 0, 'cabbage');
  assert.equal(buy1.ok, true);
  assert.equal(state.walletBalance, balanceBeforeBuys - ITEM_CATALOG.cabbage.cost);

  const buy2 = placeItemOnPlot(state, 0, 'baby_chick');
  assert.equal(buy2.ok, true);
  assert.equal(
    state.walletBalance,
    balanceBeforeBuys - ITEM_CATALOG.cabbage.cost - ITEM_CATALOG.baby_chick.cost
  );

  // 6. Topping up increases walletBalance by exact amount
  const topupRes = topUpWallet(state, 500_000);
  assert.equal(topupRes.ok, true);
  assert.equal(topupRes.addedAmount, 500_000);
  assert.equal(
    state.walletBalance,
    balanceBeforeBuys - ITEM_CATALOG.cabbage.cost - ITEM_CATALOG.baby_chick.cost + 500_000
  );
});






test('buildings cannot be harvested or sold back to the farm', () => {
  const state = createInitialFarmState({ initialBalance: 5_000_000 });
  rentLandArea(state, 10);
  placeItemOnPlot(state, 0, 'white_fence');
  const balanceBefore = state.walletBalance;

  const res = harvestPlot(state, 0, { method: 'sell_surplus' });
  assert.equal(res.ok, false);
  assert.equal(state.walletBalance, balanceBefore);
  assert.equal(state.plots[0].item.id, 'white_fence');
});

test('daily update does not count buildings as ready to harvest or as cultivation', () => {
  const state = createInitialFarmState({ initialBalance: 5_000_000 });
  rentLandArea(state, 10);
  placeItemOnPlot(state, 0, 'white_fence');

  simulateDailyUpdate(state, 1);
  assert.equal(state.totalCultivationDays, 0);
  assert.doesNotMatch(state.dailyUpdates[0].message, /sẵn sàng thu hoạch/);
});

test('watering the same plot twice in one day only grants EXP once', () => {
  const state = createInitialFarmState({ initialBalance: 5_000_000 });
  rentLandArea(state, 10);
  waterPlot(state, 0);
  const expAfterFirst = state.exp;

  const second = waterPlot(state, 0);
  assert.equal(second.ok, true);
  assert.equal(second.expEarned, 0);
  assert.equal(state.exp, expAfterFirst);

  simulateDailyUpdate(state, 1);
  const expBeforeNextDay = state.exp;
  assert.equal(waterPlot(state, 0).expEarned, 15);
  assert.equal(state.exp, expBeforeNextDay + 15);
});

test('2000m2 master map tracks user location, blocks expansion into adjacent neighbor lots, and scales in chosen direction', () => {
  const state = createInitialFarmState({ initialBalance: 8_000_000 });
  // Initial 40m2 (4 lots of 10m2 at col 5..6, row 3..4)
  rentLandArea(state, 40);
  assert.equal(state.masterMap.cols * state.masterMap.rows, 200); // 20x10 = 200 lots x 10m2 = 2000m2
  assert.equal(state.masterMap.userCells.length, 4);

  const caps = getExpansionCapabilities(state);
  // North is immediately blocked by GĐ Tuấn Kiệt (Times City) at row 1..2, col 5..7
  assert.equal(caps.north.canExpand, false);
  assert.equal(caps.north.maxExpandM2, 0);
  assert.match(caps.north.blockedBy, /Tuấn Kiệt/);

  // Attempting to rent land towards North fails because neighbor already built there
  const blockedNorthRes = rentLandArea(state, 20, 'north');
  assert.equal(blockedNorthRes.ok, false);
  assert.equal(state.rentedAreaM2, 40);

  // West only has 40m2 free before hitting GĐ Minh Anh (Royal City) at col 1..2
  assert.equal(caps.west.canExpand, true);
  assert.equal(caps.west.maxExpandM2, 40);
  const westRes = rentLandArea(state, 40, 'west');
  assert.equal(westRes.ok, true);
  assert.equal(westRes.direction, 'west');
  assert.equal(state.rentedAreaM2, 80);

  // Now West is also completely blocked by GĐ Minh Anh
  const capsAfterWest = getExpansionCapabilities(state);
  assert.equal(capsAfterWest.west.canExpand, false);
  assert.equal(capsAfterWest.west.maxExpandM2, 0);

  // East and South remain open for scaling
  assert.equal(capsAfterWest.east.canExpand, true);
  const previewEast = getPreviewExpansionCells(state, 'east', 30);
  assert.equal(previewEast.length, 3);
  const eastRes = rentLandArea(state, 30, 'east');
  assert.equal(eastRes.ok, true);
  assert.equal(state.rentedAreaM2, 110);
});
