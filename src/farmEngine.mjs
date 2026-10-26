export const LAND_UNIT_M2 = 10;
export const PRICE_PER_10M2 = 200_000;
export const MAX_USER_AREA_M2 = 500;
export const TOTAL_DEMO_FARM_M2 = 2_000;
export const MASTER_MAP_WIDTH_M = 25;
export const MASTER_MAP_LENGTH_M = 80;
export const MASTER_MAP_COLS = 10; // Chiều ngang 25m (10 cột x 2.5m)
export const MASTER_MAP_ROWS = 20; // Chiều dài 80m (20 hàng x 4m) = 200 lô x 10m² = 2.000m²
export const MIN_POND_LAND_AREA_M2 = 300;
export const MANAGEMENT_FEE_PER_10M2 = 15_000;
export const MAX_MANAGED_BY_LEVEL = {
  1: 0,
  2: 0,
  3: 50,
  4: 150,
  5: 300,
};

export const LEVEL_THRESHOLDS = [
  { level: 1, title: 'Cấp 1: Người Mới Giữ Đất', minExp: 0 },
  { level: 2, title: 'Cấp 2: Nông Dân Chăm Chỉ', minExp: 100 },
  { level: 3, title: 'Cấp 3: Chuyên Gia Nuôi Trồng (Mở Quản Lý Hộ)', minExp: 250 },
  { level: 4, title: 'Cấp 4: Kỹ Sư Nông Trại Hữu Cơ', minExp: 450 },
  { level: 5, title: 'Cấp 5: Điền Chủ Riverside Long Biên', minExp: 700 },
];

export const SHOP_CATEGORIES = [
  { id: 'crop', label: '🥬 Rau / Củ / Quả', icon: '🥬' },
  { id: 'livestock', label: '🐔 Thú Nuôi & Cá', icon: '🐔' },
  { id: 'building', label: '🧱 Rào, Chuồng & Ao', icon: '🧱' },
];

export const ITEM_CATALOG = {
  // === 1. DANH MỤC RAU / CỦ / QUẢ (crop) - TÍNH TRÊN 1 Ô 1m² ĐẤT THỰC TẾ ===
  cabbage: {
    id: 'cabbage',
    name: 'Rau cải ngọt (Bok Choy)',
    shortName: 'Cải ngọt',
    icon: '🥬',
    category: 'crop',
    unlockLevel: 1,
    cost: 25_000,
    costBasis: 'Cây giống + phân trùn quế hữu cơ cho 1m² (9 khóm)',
    retailMarketPrice: 120_000, // 2.5 kg rau cải hữu cơ x 48.000đ/kg tại cửa hàng Organic Hà Nội
    farmBuybackPrice: 60_000, // Trang trại thu mua lại = 50% giá thị trường (người trồng lãi +35k/m²)
    sellPricePerKg: 24_000,
    expReward: 40,
    growthDays: 28,
    yieldDescription: '2.5 kg rau cải ngọt hữu cơ / 1m² (Giá lẻ thị trường ~48k/kg = 120k)',
    realWorldAction: 'Nhân viên nông trại Riverside Long Biên làm tơi 1m² đất phù sa, bón trùn quế và cấy 9 khóm cải ngọt.',
    realPhotoScene: 'cabbage_bed',
    iconScoutFile: 'crop_cabbage.glb',
    iconScoutUrl: 'https://iconscout.com/3d-icon/bok-choi-3d-icon_12045887',
  },
  lettuce: {
    id: 'lettuce',
    name: 'Xà lách xoăn (Lettuce)',
    shortName: 'Xà lách xoăn',
    icon: '🥗',
    category: 'crop',
    unlockLevel: 1,
    cost: 32_000,
    costBasis: 'Cây con xà lách giống ngoại + phân hữu cơ + rơm phủ 1m²',
    retailMarketPrice: 140_000, // 2.2 kg xà lách xoăn hữu cơ x ~64.000đ/kg
    farmBuybackPrice: 70_000, // 50% giá thị trường
    sellPricePerKg: 32_000,
    expReward: 45,
    growthDays: 35,
    yieldDescription: '2.2 kg xà lách xoăn ăn salad chuẩn hữu cơ / 1m² (Giá thị trường ~140k)',
    realWorldAction: 'Trồng 9 cây con xà lách xoăn trên 1m² đất phù sa tơi xốp, phủ rơm giữ ẩm tại Riverside Long Biên.',
    realPhotoScene: 'cabbage_bed',
    iconScoutFile: 'crop_lettuce.glb',
    iconScoutUrl: 'https://iconscout.com/3d-icon/lettuce-3d-icon_5220315',
  },
  malabar_spinach: {
    id: 'malabar_spinach',
    name: 'Rau mồng tơi xanh mướt',
    shortName: 'Rau mồng tơi',
    icon: '🌿',
    category: 'crop',
    unlockLevel: 1,
    cost: 22_000,
    costBasis: 'Hạt giống mồng tơi quê + phân trùn quế cho 1m²',
    retailMarketPrice: 110_000, // 2.5 kg mồng tơi hữu cơ x 44.000đ/kg
    farmBuybackPrice: 55_000, // 50% giá thị trường
    sellPricePerKg: 22_000,
    expReward: 38,
    growthDays: 30,
    yieldDescription: '2.5 kg rau mồng tơi lá dày mọng nước / 1m² (Giá thị trường ~110k)',
    realWorldAction: 'Gieo hạt mồng tơi quê và tưới phun sương mát lành trên 1m² nền đất phù sa ven sông Long Biên.',
    realPhotoScene: 'cabbage_bed',
    iconScoutFile: 'crop_spinach.glb',
    iconScoutUrl: 'https://iconscout.com/3d-icon/spinach-3d-icon_12202803',
  },
  cherry_tomato: {
    id: 'cherry_tomato',
    name: 'Cà chua bi chuỗi ngọc',
    shortName: 'Cà chua bi',
    icon: '🍅',
    category: 'crop',
    unlockLevel: 2,
    cost: 55_000,
    costBasis: '4 gốc giống cà chua bi + giàn tre + phân hữu cơ vi sinh cho 1m²',
    retailMarketPrice: 280_000, // 3.5 kg cà chua bi hữu cơ x 80.000đ/kg
    farmBuybackPrice: 140_000, // 50% giá thị trường
    sellPricePerKg: 40_000,
    expReward: 65,
    growthDays: 70,
    yieldDescription: '3.5 kg cà chua bi chín đỏ mọng / 1m² (Giá thị trường ~80k/kg = 280k)',
    realWorldAction: 'Dựng giàn chữ A bằng tre và trồng 4 gốc cà chua bi hữu cơ trên 1m² đất phù sa.',
    realPhotoScene: 'cherry_tomato',
    iconScoutFile: 'crop_tomato.glb',
    iconScoutUrl: 'https://iconscout.com/3d-icon/tomato-plant-3d-icon_9710037',
  },
  carrot: {
    id: 'carrot',
    name: 'Cà rốt baby đất cát pha',
    shortName: 'Cà rốt baby',
    icon: '🥕',
    category: 'crop',
    unlockLevel: 2,
    cost: 40_000,
    costBasis: 'Hạt giống cà rốt baby nhập khẩu + làm đất cát pha tơi xốp 1m²',
    retailMarketPrice: 180_000, // 3.0 kg cà rốt baby hữu cơ x 60.000đ/kg
    farmBuybackPrice: 90_000, // 50% giá thị trường
    sellPricePerKg: 30_000,
    expReward: 55,
    growthDays: 65,
    yieldDescription: '3.0 kg cà rốt baby củ giòn ngọt / 1m² (Giá thị trường ~60k/kg = 180k)',
    realWorldAction: 'Gieo hạt cà rốt baby trên 1m² đất cát pha phù sa ven sông Long Biên tơi xốp.',
    realPhotoScene: 'carrot_bed',
    iconScoutFile: 'crop_carrot.glb',
  },
  sweet_corn: {
    id: 'sweet_corn',
    name: 'Ngô ngọt bãi bồi sông Hồng',
    shortName: 'Ngô ngọt',
    icon: '🌽',
    category: 'crop',
    unlockLevel: 3,
    cost: 38_000,
    costBasis: '4 gốc ngô ngọt giống Nhật + phân hữu cơ bãi bồi trên 1m²',
    retailMarketPrice: 180_000, // 8 bắp ngô ngọt hữu cơ loại 1 x 22.500đ/bắp
    farmBuybackPrice: 90_000, // 50% giá thị trường
    sellPricePerKg: 25_000,
    expReward: 70,
    growthDays: 75,
    yieldDescription: '8 bắp ngô ngọt sữa hữu cơ / 1m² (Giá thị trường ~180k)',
    realWorldAction: 'Trồng 4 gốc ngô ngọt giống Nhật trên 1m² đất bãi bồi phù sa ven sông Hồng.',
    realPhotoScene: 'sweet_corn',
    iconScoutFile: 'crop_corn.glb',
  },
  strawberry: {
    id: 'strawberry',
    name: 'Dâu tây Nhật vụ Đông',
    shortName: 'Dâu tây Hana',
    icon: '🍓',
    category: 'crop',
    unlockLevel: 3,
    cost: 95_000,
    costBasis: '4 gốc dâu tây cấy mô Hana + màng phủ + dinh dưỡng hữu cơ 1m²',
    retailMarketPrice: 480_000, // 1.5 kg dâu tây hữu cơ x 320.000đ/kg
    farmBuybackPrice: 240_000, // 50% giá thị trường
    sellPricePerKg: 160_000,
    expReward: 85,
    growthDays: 85,
    yieldDescription: '1.5 kg dâu tây Hana hữu cơ / 1m² (Giá thị trường ~320k/kg = 480k)',
    realWorldAction: 'Trồng 4 bụi dâu tây Hana phủ màng chống cỏ và lắp tưới nhỏ giọt tận gốc.',
    realPhotoScene: 'strawberry',
    iconScoutFile: 'crop_strawberry.glb',
  },
  guava_tree: {
    id: 'guava_tree',
    name: 'Cây ổi lê Đông Dư - Long Biên',
    shortName: 'Cây ổi Đông Dư',
    icon: '🍐',
    category: 'crop',
    unlockLevel: 4,
    cost: 110_000,
    costBasis: 'Cây ổi lê chiết cành đã ra hoa + phân chuồng ủ hoai + bao bọc quả 1 vụ',
    retailMarketPrice: 500_000, // 10 kg ổi lê Đông Dư hữu cơ x 50.000đ/kg
    farmBuybackPrice: 250_000, // 50% giá thị trường
    sellPricePerKg: 25_000,
    expReward: 110,
    growthDays: 120,
    yieldDescription: '10 kg ổi lê đặc sản Đông Dư hữu cơ / vụ (Giá thị trường ~500k)',
    realWorldAction: 'Trồng cây ổi lê chiết cành đặc sản vùng đất phù sa Long Biên - Đông Dư.',
    realPhotoScene: 'guava_tree',
    iconScoutFile: 'tree_guava.glb',
  },
  orange_tree: {
    id: 'orange_tree',
    name: 'Cây cam Canh ngọt Hà Nội',
    shortName: 'Cây cam Canh',
    icon: '🍊',
    category: 'crop',
    unlockLevel: 4,
    cost: 150_000,
    costBasis: 'Cây cam Canh ghép cành + phân đậu tương hữu cơ chăm sóc 1 vụ',
    retailMarketPrice: 720_000, // 8 kg cam Canh hữu cơ x 90.000đ/kg
    farmBuybackPrice: 360_000, // 50% giá thị trường
    sellPricePerKg: 45_000,
    expReward: 125,
    growthDays: 150,
    yieldDescription: '8 kg cam Canh vỏ mỏng ngọt đậm / vụ (Giá thị trường ~90k/kg = 720k)',
    realWorldAction: 'Trồng cây cam Canh ghép cành hợp thổ nhưỡng đất bãi bồi ven sông.',
    realPhotoScene: 'orange_tree',
    iconScoutFile: 'tree_orange.glb',
  },

  // === 2. DANH MỤC THÚ NUÔI - MUA TỪNG CON MỘT (livestock) ===
  chicken_coop: {
    id: 'chicken_coop',
    name: 'Gà mái đẻ trứng (1 con)',
    shortName: 'Gà mái đẻ',
    icon: '🐔',
    category: 'livestock',
    unlockLevel: 3,
    cost: 35_000,
    costBasis: 'Khẩu phần thóc ngô bãi sông + rau xanh + đệm lót sinh học trong 14 ngày',
    retailMarketPrice: 100_000, // 12 quả trứng gà ta thả vườn hữu cơ x ~8.500đ/quả
    farmBuybackPrice: 50_000, // 50% giá thị trường
    sellPricePerKg: 85_000,
    expReward: 55,
    growthDays: 14,
    yieldDescription: '12 quả trứng gà ta thả vườn hữu cơ / lứa 14 ngày (Giá lẻ ~100k)',
    realWorldAction: 'Thả 1 cô gà mái ri ăn ngô bãi sông, thóc và rau xanh để thu gom trứng mỗi 2 tuần.',
    realPhotoScene: 'chicken_coop',
    iconScoutFile: 'animal_chicken.glb',
  },
  baby_chick: {
    id: 'baby_chick',
    name: 'Gà vàng thả vườn (1 con)',
    shortName: 'Gà vàng thả vườn',
    icon: '🐤',
    category: 'livestock',
    unlockLevel: 1,
    cost: 85_000,
    costBasis: 'Con giống gà ri vàng + ngô thóc hữu cơ nuôi thả vườn suốt 3.5 tháng (105 ngày)',
    retailMarketPrice: 400_000, // 1 con gà ta lông vàng thả vườn hữu cơ ~1.8 kg x 220.000đ/kg
    farmBuybackPrice: 200_000, // 50% giá thị trường
    sellPricePerKg: 110_000,
    expReward: 80,
    growthDays: 105,
    yieldDescription: '1 gà vàng thả vườn hữu cơ ~1.8 kg sau 3.5 tháng (Giá lẻ thị trường ~400k)',
    realWorldAction: 'Thả 1 chú gà vàng lông óng nuôi lớn bằng thóc ngô trên bãi đất trong 105 ngày.',
    realPhotoScene: 'chicken_coop',
    iconScoutFile: 'animal_chick.glb',
  },
  duck: {
    id: 'duck',
    name: 'Vịt bầu cổ xanh (1 con)',
    shortName: 'Vịt bầu đẻ trứng',
    icon: '🦆',
    category: 'livestock',
    unlockLevel: 3,
    cost: 30_000,
    costBasis: 'Khẩu phần lúa + ngô + khoáng tự nhiên trong chu kỳ 14 ngày đẻ trứng',
    retailMarketPrice: 90_000, // 12 quả trứng vịt bầu sạch x 7.500đ/quả
    farmBuybackPrice: 45_000, // 50% giá thị trường
    sellPricePerKg: 70_000,
    expReward: 50,
    growthDays: 14,
    yieldDescription: '12 quả trứng vịt bầu sạch / lứa 14 ngày (Giá lẻ thị trường ~90k)',
    realWorldAction: 'Thả 1 chú vịt bầu ven sông giúp bắt ốc, làm sạch cỏ và thu trứng mỗi 14 ngày.',
    realPhotoScene: 'duck',
    iconScoutFile: 'animal_duck.glb',
  },
  rabbit_hutch: {
    id: 'rabbit_hutch',
    name: 'Thỏ trắng tai dài (1 con)',
    shortName: 'Thỏ trắng',
    icon: '🐰',
    category: 'livestock',
    unlockLevel: 4,
    cost: 110_000,
    costBasis: 'Thỏ giống + cỏ tươi & cà rốt phụ phẩm hữu cơ suốt 90 ngày (3 tháng)',
    retailMarketPrice: 480_000, // 1 thỏ trưởng thành ~2.5 kg / thú cưng sinh sản
    farmBuybackPrice: 240_000, // 50% giá thị trường
    sellPricePerKg: 95_000,
    expReward: 90,
    growthDays: 90,
    yieldDescription: '1 thỏ trắng trưởng thành khỏe mạnh sau 90 ngày (Giá thị trường ~480k)',
    realWorldAction: 'Thả 1 chú thỏ trắng tai dài ăn cỏ tươi và cà rốt sạch tại vườn suốt 90 ngày.',
    realPhotoScene: 'rabbit_hutch',
    iconScoutFile: 'animal_rabbit.glb',
  },
  sheep: {
    id: 'sheep',
    name: 'Cừu bông trắng (1 con)',
    shortName: 'Cừu bông',
    icon: '🐑',
    category: 'livestock',
    unlockLevel: 5,
    cost: 260_000,
    costBasis: 'Chăm sóc cỏ tươi, khoáng & thú y 1 vụ 120 ngày (4 tháng)',
    retailMarketPrice: 1_100_000, // Thu hoạch lông cừu + khai thác du lịch trải nghiệm & nhân giống
    farmBuybackPrice: 550_000, // 50% giá thị trường
    sellPricePerKg: 140_000,
    expReward: 140,
    growthDays: 120,
    yieldDescription: '1 vụ thu hoạch lông cừu & lợi tức nhân giống sau 120 ngày (Giá trị ~1.100k)',
    realWorldAction: 'Chăm sóc 1 chú cừu bông tại bãi cỏ khu nông trại Riverside Long Biên.',
    realPhotoScene: 'sheep',
    iconScoutFile: 'animal_sheep.glb',
  },
  pig: {
    id: 'pig',
    name: 'Lợn ỉn thảo mộc (1 con)',
    shortName: 'Lợn ỉn sạch',
    icon: '🐷',
    category: 'livestock',
    unlockLevel: 4,
    cost: 350_000,
    costBasis: 'Giống lợn ỉn con + cám ngô, bã đậu, chuối cây & thảo mộc hữu cơ suốt 120 ngày',
    retailMarketPrice: 1_200_000, // Phần thịt lợn thảo mộc sạch hữu cơ chia phần (~6 kg x 200.000đ/kg)
    farmBuybackPrice: 600_000, // 50% giá thị trường
    sellPricePerKg: 100_000,
    expReward: 125,
    growthDays: 120,
    yieldDescription: '6.0 kg thịt lợn ỉn thảo mộc hữu cơ thơm ngọt sau 120 ngày (Giá lẻ ~1.200k)',
    realWorldAction: 'Thả 1 chú lợn ỉn hồng ăn cám ngô, chuối cây và rau hữu cơ tại khu vườn.',
    realPhotoScene: 'pig',
    iconScoutFile: 'animal_pig.glb',
  },
  fish_carp: {
    id: 'fish_carp',
    name: 'Cá chép vàng sông Hồng',
    shortName: 'Cá chép vàng',
    icon: '🐟',
    category: 'livestock',
    requiresPond: true,
    unlockLevel: 3,
    cost: 90_000,
    costBasis: 'Đàn cá chép vàng giống sông Hồng + thức ăn cám ngô & bèo tấm suốt 90 ngày',
    retailMarketPrice: 360_000, // 3.0 kg cá chép sông Hồng sạch x 120.000đ/kg
    farmBuybackPrice: 180_000, // 50% giá thị trường
    sellPricePerKg: 60_000,
    expReward: 95,
    growthDays: 90,
    yieldDescription: '3.0 kg cá chép vàng sông Hồng thịt chắc ngọt sau 90 ngày (Giá lẻ ~360k)',
    realWorldAction: 'Thả đàn cá chép vàng xuống Ao sinh thái, cho ăn cám ngô và cỏ non tự nhiên.',
    realPhotoScene: 'fish_carp',
    iconScoutFile: 'animal_fish.glb',
  },

  // === 3. DANH MỤC VẬT DỤNG XÂY DỰNG: HÀNG RÀO, CHUỒNG, MÁNG & AO CÁ (building) ===
  fish_pond: {
    id: 'fish_pond',
    name: 'Đào Ao Cá Sinh Thái',
    shortName: 'Đào Ao (≥300m²)',
    icon: '🏞️',
    category: 'building',
    minLandAreaM2: MIN_POND_LAND_AREA_M2,
    unlockLevel: 3,
    cost: 280_000,
    costBasis: 'Đào lòng ao, kè đá cuội sông Hồng, dẫn nước sạch & trồng sen súng sinh thái',
    expReward: 110,
    growthDays: 1,
    yieldDescription: 'Ao nước sinh thái dẫn nguồn sông Hồng — Mở khóa nuôi Cá chép vàng!',
    realWorldAction: 'Đào ao nước sạch dẫn nguồn sông Hồng, kè đá cuội và thả sen súng để nuôi cá.',
    realPhotoScene: 'fish_pond',
    iconScoutFile: 'building_pond.glb',
  },
  white_fence: {
    id: 'white_fence',
    name: 'Hàng rào gỗ trắng',
    icon: '🚧',
    category: 'building',
    unlockLevel: 1,
    cost: 40_000,
    expReward: 25,
    growthDays: 1,
    yieldDescription: 'Rào phân khu & bảo vệ luống rau/thú nuôi',
    realWorldAction: 'Dựng hàng rào gỗ thông sơn trắng chống thấm tại ranh giới ô đất thực tế.',
    realPhotoScene: 'white_fence',
    iconScoutFile: 'decor_fence.glb',
  },
  feed_trough: {
    id: 'feed_trough',
    name: 'Máng ăn & Máng nước gỗ',
    icon: '🥣',
    category: 'building',
    unlockLevel: 1,
    cost: 45_000,
    expReward: 30,
    growthDays: 1,
    yieldDescription: 'Máng gỗ đựng thóc ngô hữu cơ & nước sạch tự động cho gà/thỏ',
    realWorldAction: 'Lắp đặt máng ăn gỗ thông và bình cấp nước tự động tại khu chăn nuôi của gia đình.',
    realPhotoScene: 'feed_trough',
    iconScoutFile: 'building_trough.glb',
  },
  wood_coop: {
    id: 'wood_coop',
    name: 'Chuồng gỗ mái đỏ ấm áp',
    icon: '🏠',
    category: 'building',
    unlockLevel: 2,
    cost: 160_000,
    expReward: 70,
    growthDays: 1,
    yieldDescription: 'Nhà chuồng gỗ thông có ổ rơm đẻ trứng che mưa nắng cho thú nuôi',
    realWorldAction: 'Dựng chuồng gỗ mái ngói đỏ cao ráo, lót trấu sinh học khử mùi sạch sẽ.',
    realPhotoScene: 'wood_coop',
    iconScoutFile: 'building_coop.glb',
  },
  name_sign: {
    id: 'name_sign',
    name: 'Biển gỗ khắc tên Gia đình',
    icon: '🪧',
    category: 'building',
    unlockLevel: 1,
    cost: 30_000,
    expReward: 25,
    growthDays: 1,
    yieldDescription: 'Biển gỗ thông khắc laser tên căn hộ & mã QR',
    realWorldAction: 'Cắm biển gỗ khắc tên gia đình kèm mã QR định danh ngay đầu luống đất.',
    realPhotoScene: 'name_sign',
    iconScoutFile: 'decor_sign.glb',
  },
  sunflower: {
    id: 'sunflower',
    name: 'Khóm hoa hướng dương',
    icon: '🌻',
    category: 'building',
    unlockLevel: 2,
    cost: 45_000,
    expReward: 40,
    growthDays: 2,
    yieldDescription: 'Tiểu cảnh hoa vàng rực rỡ & dẫn dụ ong thụ phấn',
    realWorldAction: 'Trồng cụm hoa hướng dương trang trí viền khu đất.',
    realPhotoScene: 'sunflower',
    iconScoutFile: 'flower_sunflower.glb',
  },
  windmill: {
    id: 'windmill',
    name: 'Cối xay gió & Chòi nghỉ',
    icon: '🏡',
    category: 'building',
    unlockLevel: 5,
    cost: 320_000,
    expReward: 140,
    growthDays: 2,
    yieldDescription: 'Khu chòi gỗ & cối xay gió riêng đón gió sông Hồng cuối tuần',
    realWorldAction: 'Dựng tiểu cảnh cối xay gió gỗ và bàn ghế nghỉ mát ngay tại khu đất.',
    realPhotoScene: 'windmill',
    iconScoutFile: 'decor_windmill.glb',
  },
};

export function isBuildingItem(item) {
  return Boolean(item) && ['building', 'fence', 'decor'].includes(item.category);
}

export function computeStageNumber(growthProgress = 0, isBuilding = false) {
  if (isBuilding) return 5;
  if (growthProgress >= 100) return 5;
  if (growthProgress >= 80) return 4;
  if (growthProgress >= 55) return 3;
  if (growthProgress >= 30) return 2;
  return 1;
}

export function getGrowthStageInfo(item) {
  if (!item) return null;
  const isBuilding =
    item.category === 'building' || item.category === 'fence' || item.category === 'decor';
  const stage = item.growthStage || computeStageNumber(item.growthProgress ?? 100, isBuilding);
  const weekNumber = Math.max(1, Math.ceil((item.daysCultivated || 1) / 7));

  if (isBuilding) {
    return {
      stage: 5,
      totalStages: 5,
      weekNumber: 1,
      stageName: 'Công trình hoàn thiện 100%',
      stageShort: 'Hoàn thiện',
    };
  }

  let stageLabels;
  if (item.id === 'fish_carp' || item.requiresPond) {
    stageLabels = {
      1: { name: 'Cấp 1/5 • Cá bột mới thả xuống ao', short: 'Cấp 1: Cá bột' },
      2: { name: 'Cấp 2/5 • Cá hương bơi lội quanh lá súng', short: 'Cấp 2: Cá hương' },
      3: { name: 'Cấp 3/5 • Cá giống khỏe mạnh vẫy đuôi', short: 'Cấp 3: Cá giống' },
      4: { name: 'Cấp 4/5 • Cá chép vàng phổng phao • Sen nhú nụ', short: 'Cấp 4: Cá lớn' },
      5: { name: 'Cấp 5/5 • Cá chép đầy ao & Hoa sen nở • Thu hoạch', short: 'Cấp 5: Thu hoạch cá' },
    };
  } else if (item.id === 'pig') {
    stageLabels = {
      1: { name: 'Cấp 1/5 • Lợn sữa hồng hào mới cai', short: 'Cấp 1: Lợn sữa' },
      2: { name: 'Cấp 2/5 • Lợn con tập ăn cám ngô & rau', short: 'Cấp 2: Lợn con' },
      3: { name: 'Cấp 3/5 • Lợn choai tròn bụng đáng yêu', short: 'Cấp 3: Lợn choai' },
      4: { name: 'Cấp 4/5 • Lợn thảo mộc săn chắc phổng phao', short: 'Cấp 4: Lợn tơ' },
      5: { name: 'Cấp 5/5 • Lợn thảo mộc trưởng thành • Thu hoạch', short: 'Cấp 5: Thu hoạch' },
    };
  } else if (item.id === 'chicken_coop' || item.id === 'duck') {
    stageLabels = {
      1: { name: 'Cấp 1/5 • Mới thả & Làm quen ổ rơm', short: 'Cấp 1: Mới thả' },
      2: { name: 'Cấp 2/5 • Đẻ bói quả trứng đầu tiên', short: 'Cấp 2: Đẻ bói (1 trứng)' },
      3: { name: 'Cấp 3/5 • Đẻ đều (Ổ 3 quả trứng)', short: 'Cấp 3: Ổ 3 trứng' },
      4: { name: 'Cấp 4/5 • Mào đỏ mượt (Ổ 5 quả trứng)', short: 'Cấp 4: Ổ 5 trứng' },
      5: { name: 'Cấp 5/5 • Thu hoạch ổ trứng đầy (7 quả)', short: 'Cấp 5: Ổ trứng đầy' },
    };
  } else if (item.category === 'livestock') {
    stageLabels = {
      1: { name: 'Cấp 1/5 • Mới nở / Sơ sinh nhỏ xíu', short: 'Cấp 1: Mới nở' },
      2: { name: 'Cấp 2/5 • Non tơ tập ăn thóc cỏ', short: 'Cấp 2: Non tơ' },
      3: { name: 'Cấp 3/5 • Đang lớn • Phát triển khung & lông', short: 'Cấp 3: Đang lớn' },
      4: { name: 'Cấp 4/5 • Cận trưởng thành khỏe mạnh', short: 'Cấp 4: Cận thu hoạch' },
      5: { name: 'Cấp 5/5 • Trưởng thành 100% • Thu hoạch', short: 'Cấp 5: Trưởng thành' },
    };
  } else if (item.id === 'cabbage' || item.id === 'lettuce' || item.id === 'malabar_spinach') {
    stageLabels = {
      1: { name: 'Cấp 1/5 • Hạt nảy mầm nhú 2 lá non', short: 'Cấp 1: Nảy mầm' },
      2: { name: 'Cấp 2/5 • Cây con bén rễ ra lá thật', short: 'Cấp 2: Cây con' },
      3: { name: 'Cấp 3/5 • Xòe tán lá xanh mướt', short: 'Cấp 3: Xòe tán' },
      4: { name: 'Cấp 4/5 • Cuộn bẹ dày lá chuẩn bị khép búp', short: 'Cấp 4: Cuộn bẹ' },
      5: { name: 'Cấp 5/5 • Búp rau căng mọng • Thu hoạch', short: 'Cấp 5: Chín rộ' },
    };
  } else if (item.id === 'carrot') {
    stageLabels = {
      1: { name: 'Cấp 1/5 • Hạt nảy mầm nhú 2 lá non', short: 'Cấp 1: Nảy mầm' },
      2: { name: 'Cấp 2/5 • Lên chùm lá non xanh mướt', short: 'Cấp 2: Cây con' },
      3: { name: 'Cấp 3/5 • Tán lá xòe rộng nuôi củ dưới đất', short: 'Cấp 3: Nuôi củ' },
      4: { name: 'Cấp 4/5 • Củ cà rốt bắt đầu phình to', short: 'Cấp 4: Củ phình to' },
      5: { name: 'Cấp 5/5 • Củ cam ngọt lộ vai • Thu hoạch', short: 'Cấp 5: Thu hoạch củ' },
    };
  } else {
    stageLabels = {
      1: { name: 'Cấp 1/5 • Hạt nảy mầm nhú 2 lá non', short: 'Cấp 1: Nảy mầm' },
      2: { name: 'Cấp 2/5 • Cây non vươn thân & cành lá', short: 'Cấp 2: Cây non' },
      3: { name: 'Cấp 3/5 • Đơm hoa kết nhụy rực rỡ', short: 'Cấp 3: Ra hoa' },
      4: { name: 'Cấp 4/5 • Đậu quả non xanh cốm', short: 'Cấp 4: Đậu quả xanh' },
      5: { name: 'Cấp 5/5 • Quả chín mọng trĩu cành • Thu hoạch', short: 'Cấp 5: Quả chín rộ' },
    };
  }

  const info = stageLabels[stage] || stageLabels[1];
  return {
    stage,
    totalStages: 5,
    weekNumber,
    stageName: info.name,
    stageShort: info.short,
  };
}

export function calculateLevelFromExp(exp) {
  let current = LEVEL_THRESHOLDS[0];
  for (const entry of LEVEL_THRESHOLDS) {
    if (exp >= entry.minExp) {
      current = entry;
    }
  }
  const nextEntry = LEVEL_THRESHOLDS.find((e) => e.level === current.level + 1) || null;
  return {
    level: current.level,
    levelTitle: current.title,
    nextLevelExp: nextEntry ? nextEntry.minExp : current.minExp,
  };
}

export function addExp(state, amount) {
  state.exp += amount;
  const info = calculateLevelFromExp(state.exp);
  const leveledUp = info.level > state.level;
  state.level = info.level;
  state.levelTitle = info.levelTitle;
  state.nextLevelExp = info.nextLevelExp;
  return leveledUp;
}

export function getClusterInfoByRow(row) {
  if (row <= 5) {
    return {
      id: 'cum_4',
      name: 'Cụm 4 (25m)',
      shortName: 'Cụm 4',
      desc: 'Ô lớn kết hợp Khu sinh hoạt chung & Chòi nghỉ cuối khu',
    };
  }
  if (row <= 10) {
    return {
      id: 'cum_3',
      name: 'Cụm 3 (20m)',
      shortName: 'Cụm 3',
      desc: 'Đa dạng, có ô lớn 40–60m² & Nút mở rộng giàn hoa',
    };
  }
  if (row <= 15) {
    return {
      id: 'cum_2',
      name: 'Cụm 2 (20m)',
      shortName: 'Cụm 2',
      desc: 'Ô vừa 20–30m² dọc trục chính uốn nhẹ',
    };
  }
  return {
    id: 'cum_1',
    name: 'Cụm 1 (15m)',
    shortName: 'Cụm 1',
    desc: 'Ô nhỏ 10–20m² ngay Cổng chào & Đường trục chính 1m',
  };
}

export function createDefaultMasterMap() {
  // Quy hoạch tổng thể Làng Vườn Nhỏ: 25m ngang x 80m dài = 2.000m² (10 cột x 20 hàng, mỗi lô = 10m²):
  // Chia làm 4 Cụm từ Nam (Cổng vào - Cụm 1) lên Bắc (Chòi nghỉ cuối khu - Cụm 4):
  // - Người chơi khởi điểm ở Cụm 3 (row 6..7, col 3..4 = 40m²) ngay ô vườn lớn bên trái trục chính uốn nhẹ.
  // - Phía Bắc (row 4..5, col 2..4): GĐ Tuấn Kiệt (Times City) đã làm vườn & ao sinh thái sát cạnh -> Chặn hướng Bắc!
  // - Phía Tây (row 5..8, col 0..0): GĐ Minh Anh (Royal City) đã xây sát rào biên Tây -> Hướng Tây chỉ còn mở rộng tối đa +40m² (col 1..2, row 6..7) là kịch biên!
  // - Phía Đông (qua trục chính nội bộ 1,4-1,6m sang cánh Đông Cụm 3) và Phía Nam (xuống Cụm 2, Cụm 1) còn trống rộng rãi.
  const neighborZones = [
    { owner: 'GĐ Tuấn Kiệt (Times City • Cụm 4)', c1: 2, c2: 4, r1: 4, r2: 5 }, // 3x2 = 6 lô (60m²) sát biên Bắc người chơi
    { owner: 'GĐ Minh Anh (Royal City • Biên Tây)', c1: 0, c2: 0, r1: 5, r2: 8 }, // 1x4 = 4 lô (40m²) cách biên Tây người chơi 2 cột
    { owner: 'GĐ Hải Yến (Ciputra • Cụm 4)', c1: 0, c2: 3, r1: 0, r2: 1 }, // 4x2 = 8 lô (80m²) góc Tây Bắc Cụm 4
    { owner: 'Chòi Nghỉ & Khu Sinh Hoạt Chung (Cụm 4)', c1: 5, c2: 9, r1: 0, r2: 1 }, // 5x2 = 10 lô (100m²) điểm nhấn cuối khu
    { owner: 'GĐ Hùng Cường (Symphony • Cụm 4)', c1: 6, c2: 9, r1: 3, r2: 4 }, // 4x2 = 8 lô (80m²) cánh Đông Cụm 4
    { owner: 'GĐ Quốc Khánh (Ecopark • Cụm 2)', c1: 6, c2: 9, r1: 12, r2: 13 }, // 4x2 = 8 lô (80m²) cánh Đông Cụm 2
    { owner: 'GĐ Bảo Trâm (Riverside • Cụm 1)', c1: 0, c2: 2, r1: 18, r2: 19 }, // 3x2 = 6 lô (60m²) gần cổng vào Cụm 1
  ];

  const occupiedCells = [];
  for (const zone of neighborZones) {
    for (let r = zone.r1; r <= zone.r2; r++) {
      for (let c = zone.c1; c <= zone.c2; c++) {
        occupiedCells.push({ col: c, row: r, owner: zone.owner });
      }
    }
  }

  return {
    cols: MASTER_MAP_COLS,
    rows: MASTER_MAP_ROWS,
    widthM: MASTER_MAP_WIDTH_M,
    lengthM: MASTER_MAP_LENGTH_M,
    anchorCol: 3,
    anchorRow: 6,
    userCells: [],
    occupiedCells,
  };
}

export function ensureMasterMap(state) {
  if (
    !state.masterMap ||
    !Array.isArray(state.masterMap.occupiedCells) ||
    state.masterMap.cols !== MASTER_MAP_COLS ||
    state.masterMap.rows !== MASTER_MAP_ROWS
  ) {
    state.masterMap = createDefaultMasterMap();
  }
  const targetUnits = Math.floor((state.rentedAreaM2 || 0) / LAND_UNIT_M2);
  if (state.masterMap.userCells.length === 0 && targetUnits > 0) {
    const occSet = new Set(state.masterMap.occupiedCells.map((o) => `${o.col},${o.row}`));
    const initialOrder = [
      [3, 6],
      [4, 6],
      [3, 7],
      [4, 7],
    ];
    for (let r = 6; r < MASTER_MAP_ROWS; r++) {
      for (let c = 3; c < MASTER_MAP_COLS; c++) {
        if (!initialOrder.some(([ic, ir]) => ic === c && ir === r)) {
          initialOrder.push([c, r]);
        }
      }
    }
    for (const [c, r] of initialOrder) {
      if (state.masterMap.userCells.length >= targetUnits) break;
      if (!occSet.has(`${c},${r}`)) {
        state.masterMap.userCells.push({ col: c, row: r });
      }
    }
  }
  return state.masterMap;
}

export function getUserMapBounds(state) {
  const map = ensureMasterMap(state);
  if (map.userCells.length === 0) {
    return { minCol: 3, maxCol: 4, minRow: 6, maxRow: 7 };
  }
  let minCol = Infinity;
  let maxCol = -Infinity;
  let minRow = Infinity;
  let maxRow = -Infinity;
  for (const cell of map.userCells) {
    if (cell.col < minCol) minCol = cell.col;
    if (cell.col > maxCol) maxCol = cell.col;
    if (cell.row < minRow) minRow = cell.row;
    if (cell.row > maxRow) maxRow = cell.row;
  }
  return { minCol, maxCol, minRow, maxRow };
}

export function getExpansionCapabilities(state) {
  const map = ensureMasterMap(state);
  const userSet = new Set(map.userCells.map((u) => `${u.col},${u.row}`));
  const occMap = new Map(map.occupiedCells.map((o) => [`${o.col},${o.row}`, o.owner]));
  const { minCol, maxCol, minRow, maxRow } = getUserMapBounds(state);
  const maxRemainingUserM2 = Math.max(0, MAX_USER_AREA_M2 - (state.rentedAreaM2 || 0));

  const isFree = (c, r) =>
    c >= 0 &&
    c < map.cols &&
    r >= 0 &&
    r < map.rows &&
    !userSet.has(`${c},${r}`) &&
    !occMap.has(`${c},${r}`);

  const buildDirectionInfo = (dir, label, shortLabel, icon) => {
    const candidateCells = [];
    let blockedBy = null;

    if (dir === 'north') {
      if (minRow <= 0) {
        blockedBy = 'Ranh giới phía Bắc khu 2.000m²';
      } else {
        for (let c = minCol; c <= maxCol; c++) {
          const owner = occMap.get(`${c},${minRow - 1}`);
          if (owner) {
            blockedBy = owner;
            break;
          }
        }
        if (!blockedBy) {
          for (let r = minRow - 1; r >= 0; r--) {
            let rowBlockedOwner = null;
            for (let c = minCol; c <= maxCol; c++) {
              if (occMap.has(`${c},${r}`)) {
                rowBlockedOwner = occMap.get(`${c},${r}`);
                break;
              }
            }
            if (rowBlockedOwner) {
              blockedBy = rowBlockedOwner;
              break;
            }
            for (let c = minCol; c <= maxCol; c++) {
              if (isFree(c, r)) candidateCells.push({ col: c, row: r });
            }
          }
        }
      }
    } else if (dir === 'west') {
      if (minCol <= 0) {
        blockedBy = 'Ranh giới phía Tây khu 2.000m²';
      } else {
        for (let r = minRow; r <= maxRow; r++) {
          const owner = occMap.get(`${minCol - 1},${r}`);
          if (owner) {
            blockedBy = owner;
            break;
          }
        }
        if (!blockedBy) {
          for (let c = minCol - 1; c >= 0; c--) {
            let colBlockedOwner = null;
            for (let r = minRow; r <= maxRow; r++) {
              if (occMap.has(`${c},${r}`)) {
                colBlockedOwner = occMap.get(`${c},${r}`);
                break;
              }
            }
            if (colBlockedOwner) {
              blockedBy = colBlockedOwner;
              break;
            }
            for (let r = minRow; r <= maxRow; r++) {
              if (isFree(c, r)) candidateCells.push({ col: c, row: r });
            }
          }
        }
      }
    } else if (dir === 'east') {
      if (maxCol >= map.cols - 1) {
        blockedBy = 'Bờ sông Hồng (Ranh giới phía Đông)';
      } else {
        for (let r = minRow; r <= maxRow; r++) {
          const owner = occMap.get(`${maxCol + 1},${r}`);
          if (owner) {
            blockedBy = owner;
            break;
          }
        }
        if (!blockedBy) {
          // Mở rộng theo dải hàng hiện tại sang phía Đông trước, sau đó mở rộng các hàng lân cận về phía Đông
          for (let c = maxCol + 1; c < map.cols; c++) {
            for (let r = minRow; r <= maxRow; r++) {
              if (isFree(c, r)) candidateCells.push({ col: c, row: r });
            }
          }
          for (let r = maxRow + 1; r < map.rows; r++) {
            for (let c = minCol; c < map.cols; c++) {
              if (isFree(c, r)) candidateCells.push({ col: c, row: r });
            }
          }
          for (let r = minRow - 1; r >= 0; r--) {
            for (let c = maxCol + 1; c < map.cols; c++) {
              if (isFree(c, r)) candidateCells.push({ col: c, row: r });
            }
          }
        }
      }
    } else if (dir === 'south') {
      if (maxRow >= map.rows - 1) {
        blockedBy = 'Đường nội khu (Ranh giới phía Nam)';
      } else {
        for (let c = minCol; c <= maxCol; c++) {
          const owner = occMap.get(`${c},${maxRow + 1}`);
          if (owner) {
            blockedBy = owner;
            break;
          }
        }
        if (!blockedBy) {
          // Mở rộng theo dải cột hiện tại xuống phía Nam trước, sau đó mở rộng sang các cột liền kề phía Nam
          for (let r = maxRow + 1; r < map.rows; r++) {
            for (let c = minCol; c <= maxCol; c++) {
              if (isFree(c, r)) candidateCells.push({ col: c, row: r });
            }
          }
          for (let c = maxCol + 1; c < map.cols; c++) {
            for (let r = minRow; r < map.rows; r++) {
              if (isFree(c, r)) candidateCells.push({ col: c, row: r });
            }
          }
        }
      }
    }

    const rawMaxM2 = candidateCells.length * LAND_UNIT_M2;
    const maxExpandM2 = Math.min(rawMaxM2, maxRemainingUserM2);
    const canExpand = maxExpandM2 >= LAND_UNIT_M2;

    let statusText;
    if (!canExpand) {
      statusText = blockedBy
        ? `⛔ Kịch biên (${blockedBy} đã xây sát cạnh)`
        : '⛔ Đã đạt tối đa 500m²';
    } else if (blockedBy && rawMaxM2 <= 80) {
      statusText = `⚠️ Còn trống +${maxExpandM2}m² (Giáp ${blockedBy})`;
    } else {
      statusText = `✅ Mở rộng tốt (Tối đa +${maxExpandM2}m²)`;
    }

    return {
      id: dir,
      label,
      shortLabel,
      icon,
      canExpand,
      maxExpandM2,
      blockedBy,
      statusText,
      candidateCells,
    };
  };

  const directions = {
    north: buildDirectionInfo('north', 'Hướng Bắc (Về Cụm 4)', '⬆️ Bắc (Cụm 4)', '⬆️'),
    east: buildDirectionInfo('east', 'Hướng Đông (Qua trục chính)', '➡️ Đông', '➡️'),
    south: buildDirectionInfo('south', 'Hướng Nam (Về Cụm 2–1)', '⬇️ Nam (Cụm 2–1)', '⬇️'),
    west: buildDirectionInfo('west', 'Hướng Tây (Biên 25m)', '⬅️ Tây', '⬅️'),
  };

  const canExpandAny = Object.values(directions).some((d) => d.canExpand);
  return {
    cols: map.cols,
    rows: map.rows,
    canExpandAny,
    directions,
    ...directions,
  };
}

export function getPreviewExpansionCells(state, direction, additionalAreaM2) {
  const caps = getExpansionCapabilities(state);
  const dirInfo = caps.directions[direction];
  if (!dirInfo || !dirInfo.canExpand) return [];
  const count = Math.max(0, Math.floor((additionalAreaM2 || 0) / LAND_UNIT_M2));
  return dirInfo.candidateCells.slice(0, count);
}

export function createInitialFarmState(options = {}) {
  const familyName = options.familyName || 'Gia đình Bé Bắp - Chung cư Hà Nội';
  const apartmentAddress =
    options.apartmentAddress || 'Tòa S2.05, Vinhomes Smart City / Vinhomes Riverside, Hà Nội';
  const initialBalance =
    typeof options.initialBalance === 'number' ? options.initialBalance : 1_200_000;

  return {
    familyName,
    apartmentAddress,
    totalProjectAreaM2: TOTAL_DEMO_FARM_M2,
    otherFamiliesRentedM2: 420,
    walletBalance: initialBalance,
    rentedAreaM2: 0,
    exp: 0,
    level: 1,
    levelTitle: LEVEL_THRESHOLDS[0].title,
    nextLevelExp: LEVEL_THRESHOLDS[1].minExp,
    day: 1,
    landTenureDays: 0,
    totalCultivationDays: 0,
    successfulHarvests: 0,
    totalProduceRevenue: 0,
    managedOtherAreaM2: 0,
    totalManagementRevenue: 0,
    lastExpansionDirection: 'east',
    masterMap: createDefaultMasterMap(),
    plots: [],
    dailyUpdates: [
      {
        id: 'update-init',
        day: 1,
        time: '07:30',
        title: 'Chào mừng đến Khu Vườn Nông Trại Vui Vẻ 2.000m² (Riverside Long Biên - Hà Nội)',
        message:
          'Đất thịt phù sa bãi bồi ven sông tại khu Riverside Long Biên đã được phơi ải và trộn trùn quế hữu cơ. Hãy thuê những ô 10m² đầu tiên!',
        weather: '25°C • Gió mát ven sông Long Biên',
        soilMoisture: 68,
        staffName: 'Kỹ sư nông nghiệp Minh Tuấn',
      },
    ],
    liveRequests: [],
    harvestOrders: [],
  };
}

export function topUpWallet(state, amountVnd) {
  if (typeof amountVnd !== 'number' || Number.isNaN(amountVnd) || amountVnd <= 0) {
    return { ok: false, error: 'Số tiền nạp Top-up phải lớn hơn 0đ.' };
  }
  const added = Math.round(amountVnd);
  const previousBalance = state.walletBalance;
  state.walletBalance += added;
  return {
    ok: true,
    addedAmount: added,
    balanceDelta: added,
    previousBalance,
    walletBalance: state.walletBalance,
  };
}

export function rentLandArea(state, additionalAreaM2, direction = null) {
  if (
    typeof additionalAreaM2 !== 'number' ||
    additionalAreaM2 <= 0 ||
    additionalAreaM2 % LAND_UNIT_M2 !== 0
  ) {
    return {
      ok: false,
      error: 'Diện tích thuê phải chọn theo bội số của 10m² (10m², 20m², 30m²...).',
    };
  }

  if (state.rentedAreaM2 + additionalAreaM2 > MAX_USER_AREA_M2) {
    return {
      ok: false,
      error: `Mỗi gia đình được thuê tối đa 500m² (Hiện đã thuê ${state.rentedAreaM2}m²).`,
    };
  }

  const remainingPool =
    state.totalProjectAreaM2 - state.otherFamiliesRentedM2 - state.rentedAreaM2;
  if (additionalAreaM2 > remainingPool) {
    return {
      ok: false,
      error: `Quỹ đất 2.000m² chỉ còn trống ${remainingPool}m².`,
    };
  }

  const numUnits = additionalAreaM2 / LAND_UNIT_M2;
  const totalCost = numUnits * PRICE_PER_10M2;

  if (state.walletBalance < totalCost) {
    return {
      ok: false,
      error: `Số dư Ví Top-up không đủ (Cần ${totalCost.toLocaleString('vi-VN')}đ cho ${additionalAreaM2}m²).`,
    };
  }

  const map = ensureMasterMap(state);
  let cellsToClaim = [];
  let chosenDirection = direction || 'east';

  if (state.rentedAreaM2 === 0 || map.userCells.length === 0) {
    // Khởi tạo lô đất đầu tiên tại Cụm 3 (Cột 3..4, Hàng 6..7) trên Map tổng 25m x 80m (2.000m²)
    const occSet = new Set(map.occupiedCells.map((o) => `${o.col},${o.row}`));
    const initialSeeds = [
      [3, 6],
      [4, 6],
      [3, 7],
      [4, 7],
    ];
    for (let r = 6; r < map.rows; r++) {
      for (let c = 3; c < map.cols; c++) {
        if (!initialSeeds.some(([ic, ir]) => ic === c && ir === r)) {
          initialSeeds.push([c, r]);
        }
      }
    }
    for (const [c, r] of initialSeeds) {
      if (cellsToClaim.length >= numUnits) break;
      if (!occSet.has(`${c},${r}`)) {
        cellsToClaim.push({ col: c, row: r });
      }
    }
  } else {
    const caps = getExpansionCapabilities(state);
    if (!caps.canExpandAny) {
      return {
        ok: false,
        error:
          'Tất cả các hướng quanh khu đất của bạn đều đã có hộ khác xây dựng sát cạnh, không thể mở rộng thêm!',
      };
    }

    if (direction) {
      const dirInfo = caps.directions[direction];
      if (!dirInfo) {
        return { ok: false, error: 'Hướng mở rộng không hợp lệ.' };
      }
      if (!dirInfo.canExpand) {
        return {
          ok: false,
          error: `Không thể mở rộng về ${dirInfo.label}: Sát cạnh đã có "${dirInfo.blockedBy}" xây dựng! Hãy chọn hướng khác trên Bản Đồ 2.000m².`,
        };
      }
      if (additionalAreaM2 > dirInfo.maxExpandM2) {
        return {
          ok: false,
          error: `${dirInfo.label} chỉ còn mở rộng được tối đa +${dirInfo.maxExpandM2}m² trước khi chạm đất "${dirInfo.blockedBy || 'ranh giới'}". Hãy chọn hướng Đông/Nam hoặc giảm diện tích!`,
        };
      }
      cellsToClaim = dirInfo.candidateCells.slice(0, numUnits);
      chosenDirection = direction;
    } else {
      // Tự động chọn hướng còn đủ diện tích (Đông -> Nam -> Tây -> Bắc)
      const fallbackOrder = ['east', 'south', 'west', 'north'];
      const picked = fallbackOrder
        .map((d) => caps.directions[d])
        .find((d) => d && d.canExpand && d.maxExpandM2 >= additionalAreaM2);
      if (!picked) {
        return {
          ok: false,
          error:
            'Không còn hướng nào đủ diện tích trống liền kề để mở rộng mức này do vướng các hộ xung quanh!',
        };
      }
      cellsToClaim = picked.candidateCells.slice(0, numUnits);
      chosenDirection = picked.id;
    }
  }

  const previousBalance = state.walletBalance;
  state.walletBalance -= totalCost;
  const startIdx = state.plots.length;

  for (let i = 0; i < numUnits; i++) {
    const plotIndex = startIdx + i;
    const realLotCode = `HN-DA-${String(plotIndex + 1).padStart(3, '0')}`;
    state.plots.push({
      index: plotIndex,
      areaM2: LAND_UNIT_M2,
      realLotCode,
      soilMoisture: 68 + ((plotIndex * 3) % 12),
      soilPh: 6.5,
      item: null,
      wateredToday: false,
    });
  }

  for (const cell of cellsToClaim) {
    map.userCells.push({ col: cell.col, row: cell.row });
  }
  state.lastExpansionDirection = chosenDirection;
  state.rentedAreaM2 += additionalAreaM2;
  const leveledUp = addExp(state, numUnits * 15);

  return {
    ok: true,
    addedPlots: numUnits,
    direction: chosenDirection,
    claimedMapCells: cellsToClaim,
    cost: totalCost,
    balanceDelta: -totalCost,
    previousBalance,
    walletBalance: state.walletBalance,
    rentedAreaM2: state.rentedAreaM2,
    leveledUp,
  };
}

export function ensurePlotCell(state, cellIndex) {
  if (typeof cellIndex !== 'number' || cellIndex < 0 || cellIndex >= state.rentedAreaM2) {
    return null;
  }
  if (!state.plots[cellIndex]) {
    const realLotCode = `HN-LB-${String(cellIndex + 1).padStart(3, '0')}`;
    state.plots[cellIndex] = {
      index: cellIndex,
      areaM2: 1,
      realLotCode,
      soilMoisture: 68 + ((cellIndex * 3) % 12),
      soilPh: 6.5,
      item: null,
      wateredToday: false,
    };
  }
  return state.plots[cellIndex];
}

/**
 * Tìm tất cả các ô 1x1m mà thú nuôi đặt tại `startCellIndex` có thể chạy loanh quanh (BFS Flood-Fill).
 * - Nếu KHÔNG bị rào bởi `white_fence`, thú nuôi chạy tự do khắp toàn bộ mảnh đất nâu.
 * - Nếu người dùng dựng `white_fence` bao quanh một khu vực, thú nuôi chỉ chạy loanh quanh bên trong khu rào đó.
 */
export function computeRoamingCells(state, startCellIndex, cols, rows) {
  const totalCells = cols * rows;
  if (startCellIndex < 0 || startCellIndex >= totalCells) return [];

  const isObstacle = (idx) => {
    const p = state.plots[idx];
    if (!p || !p.item) return false;
    return (
      p.item.id === 'white_fence' ||
      p.item.id === 'fish_pond' ||
      Boolean(p.item.requiresPond)
    );
  };

  const visited = new Set([startCellIndex]);
  const queue = [startCellIndex];
  const reachable = [];

  while (queue.length > 0) {
    const curr = queue.shift();
    const col = curr % cols;
    const row = Math.floor(curr / cols);
    reachable.push({ index: curr, col, row });

    const neighbors = [
      [col - 1, row],
      [col + 1, row],
      [col, row - 1],
      [col, row + 1],
    ];

    for (const [nc, nr] of neighbors) {
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows) continue;
      const nIdx = nr * cols + nc;
      if (visited.has(nIdx) || isObstacle(nIdx)) continue;
      visited.add(nIdx);
      queue.push(nIdx);
    }
  }

  return reachable;
}

export function hasFishPond(state) {
  if (!state) return false;
  if (state.hasPondUnlocked) return true;
  return (state.plots || []).some(
    (p) =>
      p &&
      (p.hasPondBase ||
        (p.item && (p.item.id === 'fish_pond' || p.item.id === 'fish_carp' || p.item.requiresPond)))
  );
}

export function placeItemOnPlot(state, plotIndex, itemId) {
  let plot = ensurePlotCell(state, plotIndex);
  if (!plot) {
    return { ok: false, error: 'Ô đất không tồn tại. Hãy thuê đất trước!' };
  }

  const catalogItem = ITEM_CATALOG[itemId];
  if (!catalogItem) {
    return { ok: false, error: 'Vật phẩm không hợp lệ.' };
  }

  // Cho phép thả cá trực tiếp vào ô đã đào Ao cá (fish_pond)
  let isStockingFishIntoPond =
    Boolean(catalogItem.requiresPond) && plot.item && plot.item.id === 'fish_pond';

  // Nếu ô đang chọn đã có vật phẩm, tự động tìm ô 1m² trống kế tiếp (hoặc ô Ao trống nếu thả cá)
  // để người chơi bấm Mua liên tiếp trong Cửa Hàng vẫn trừ quỹ và đặt được ngay!
  if (plot.item && !isStockingFishIntoPond) {
    let fallbackPlot = null;
    if (catalogItem.requiresPond) {
      for (let i = 0; i < state.rentedAreaM2; i++) {
        const candidate = ensurePlotCell(state, i);
        if (candidate && candidate.item && candidate.item.id === 'fish_pond') {
          fallbackPlot = candidate;
          isStockingFishIntoPond = true;
          break;
        }
      }
    }
    if (!fallbackPlot) {
      for (let offset = 1; offset <= state.rentedAreaM2; offset++) {
        const idx = (plotIndex + offset) % state.rentedAreaM2;
        const candidate = ensurePlotCell(state, idx);
        if (candidate && !candidate.item) {
          fallbackPlot = candidate;
          break;
        }
      }
    }
    if (!fallbackPlot) {
      return {
        ok: false,
        error: `Toàn bộ ${state.rentedAreaM2}m² đất đã kín chỗ. Hãy thuê thêm đất hoặc thu hoạch trước!`,
      };
    }
    plot = fallbackPlot;
  }

  if (catalogItem.minLandAreaM2 && state.rentedAreaM2 < catalogItem.minLandAreaM2) {
    return {
      ok: false,
      error: `Cần mở rộng đất đạt tối thiểu ${catalogItem.minLandAreaM2}m² mới được mở "${catalogItem.name}" (Hiện tại: ${state.rentedAreaM2}m²).`,
    };
  }

  if (catalogItem.requiresPond && !hasFishPond(state)) {
    return {
      ok: false,
      error: `Cần mở "Đào Ao Cá Sinh Thái" (khi đạt ≥ ${MIN_POND_LAND_AREA_M2}m² đất) trước khi thả nuôi "${catalogItem.name}"!`,
    };
  }

  if (state.level < catalogItem.unlockLevel) {
    return {
      ok: false,
      error: `"${catalogItem.name}" mở khóa ở Cấp ${catalogItem.unlockLevel} (Hiện tại: Cấp ${state.level}).`,
    };
  }

  if (state.walletBalance < catalogItem.cost) {
    return {
      ok: false,
      error: `Không đủ tiền trong Quỹ để mua "${catalogItem.name}" (Cần ${catalogItem.cost.toLocaleString('vi-VN')}đ, hiện có ${state.walletBalance.toLocaleString('vi-VN')}đ).`,
    };
  }

  const previousBalance = state.walletBalance;
  state.walletBalance -= catalogItem.cost;
  if (catalogItem.id === 'fish_pond') {
    state.hasPondUnlocked = true;
    plot.hasPondBase = true;
  } else if (catalogItem.requiresPond) {
    plot.hasPondBase = true;
  }
  const isInstantDecor =
    catalogItem.category === 'building' ||
    catalogItem.category === 'fence' ||
    catalogItem.category === 'decor';

  const retailMarketPrice =
    catalogItem.retailMarketPrice || Math.round(catalogItem.cost * 3.6);
  const farmBuybackPrice =
    catalogItem.farmBuybackPrice || Math.round(retailMarketPrice * 0.5);

  const initialProgress = isInstantDecor ? 100 : 10;
  plot.item = {
    id: catalogItem.id,
    name: catalogItem.name,
    icon: catalogItem.icon,
    category: catalogItem.category,
    requiresPond: Boolean(catalogItem.requiresPond),
    minLandAreaM2: catalogItem.minLandAreaM2 || 0,
    cost: catalogItem.cost,
    costBasis: catalogItem.costBasis || 'Giống & vật tư hữu cơ đầu vào',
    expReward: catalogItem.expReward,
    retailMarketPrice,
    farmBuybackPrice,
    marketValue: farmBuybackPrice,
    plantedDay: state.day,
    growthDays: catalogItem.growthDays,
    growthProgress: initialProgress,
    growthStage: computeStageNumber(initialProgress, isInstantDecor),
    daysCultivated: 0,
    qualityCareDays: 0,
    yieldDescription: catalogItem.yieldDescription,
    realWorldAction: catalogItem.realWorldAction,
    realPhotoScene: catalogItem.realPhotoScene,
  };

  // Khi mới bắt đầu gieo trồng/đặt vật phẩm chỉ nhận 1 phần nhỏ EXP khởi tạo;
  // Phần lớn EXP đến từ thời gian sở hữu đất, thời gian chăm sóc và chất lượng thành phẩm khi thu hoạch!
  const initialSetupExp = isInstantDecor
    ? catalogItem.expReward
    : Math.max(5, Math.round(catalogItem.expReward * 0.25));
  const leveledUp = addExp(state, initialSetupExp);

  state.dailyUpdates.unshift({
    id: `work-order-${Date.now()}-${plotIndex}`,
    day: state.day,
    time: 'Vừa xong',
    title: `Đã đầu tư "${catalogItem.name}" tại Lô ${plot.realLotCode} (Riverside Long Biên)`,
    message: isInstantDecor
      ? `${catalogItem.realWorldAction} (Chi phí xây lắp: ${catalogItem.cost.toLocaleString('vi-VN')}đ).`
      : `${catalogItem.realWorldAction} — Chu kỳ: ${catalogItem.growthDays} ngày • Vốn đầu vào: ${catalogItem.cost.toLocaleString('vi-VN')}đ (${catalogItem.costBasis}) • Giá Trang Trại thu mua lại: ${farmBuybackPrice.toLocaleString('vi-VN')}đ (50% giá thị trường ${retailMarketPrice.toLocaleString('vi-VN')}đ).`,
    weather: '26°C • Gió mát sông Đuống - Long Biên',
    soilMoisture: plot.soilMoisture,
    staffName: 'Đội nông trại Riverside Long Biên',
  });

  return {
    ok: true,
    plot,
    plotIndex: plot.index,
    costDeducted: catalogItem.cost,
    balanceDelta: -catalogItem.cost,
    previousBalance,
    walletBalance: state.walletBalance,
    leveledUp,
  };
}

export function waterPlot(state, plotIndex) {
  const plot = ensurePlotCell(state, plotIndex);
  if (!plot) {
    return { ok: false, error: 'Ô đất không tồn tại.' };
  }
  // Mỗi ô chỉ được tính tưới (EXP + tăng trưởng) 1 lần/ngày để tránh bấm tưới liên tục
  if (plot.wateredToday) {
    return { ok: true, soilMoisture: plot.soilMoisture, expEarned: 0, leveledUp: false };
  }
  plot.soilMoisture = Math.min(95, plot.soilMoisture + 12);
  plot.wateredToday = true;
  if (plot.item && !isBuildingItem(plot.item) && plot.item.growthProgress < 100) {
    plot.item.growthProgress = Math.min(100, plot.item.growthProgress + 8);
    plot.item.growthStage = computeStageNumber(plot.item.growthProgress, false);
    plot.item.qualityCareDays = (plot.item.qualityCareDays || 0) + 1;
  }
  const leveledUp = addExp(state, 15);

  return {
    ok: true,
    soilMoisture: plot.soilMoisture,
    expEarned: 15,
    leveledUp,
  };
}

export function assignManagedGarden(state, areaM2) {
  if (typeof areaM2 !== 'number' || areaM2 < 0 || areaM2 % LAND_UNIT_M2 !== 0) {
    return {
      ok: false,
      error: 'Diện tích nhận quản lý hộ phải là bội số của 10m².',
    };
  }
  if (state.level < 3 && areaM2 > 0) {
    return {
      ok: false,
      error: `Cần đạt Cấp 3 (Chuyên Gia Nuôi Trồng) trở lên mới đủ uy tín nhận quản lý hộ vườn cho gia đình khác (Hiện tại: Cấp ${state.level}).`,
    };
  }
  const maxAllowed = MAX_MANAGED_BY_LEVEL[state.level] ?? 300;
  if (areaM2 > maxAllowed) {
    return {
      ok: false,
      error: `Ở Cấp ${state.level}, bạn có thể nhận quản lý hộ tối đa ${maxAllowed}m². Hãy tích lũy thêm EXP nuôi trồng để nâng cấp!`,
    };
  }

  state.managedOtherAreaM2 = areaM2;
  const dailyFee = (areaM2 / LAND_UNIT_M2) * MANAGEMENT_FEE_PER_10M2;

  if (areaM2 > 0) {
    state.dailyUpdates.unshift({
      id: `manage-contract-${Date.now()}`,
      day: state.day,
      time: 'Vừa xong',
      title: `🤝 Nhận quản lý hộ ${areaM2}m² vườn cho cư dân khác`,
      message: `Với kinh nghiệm Cấp ${state.level}, bạn đang điều phối chăm sóc ${areaM2}m² đất cho các hộ gia đình bận rộn và nhận phí quản lý ${dailyFee.toLocaleString('vi-VN')}đ/ngày.`,
      weather: '25°C • Nắng đẹp',
      soilMoisture: 72,
      staffName: 'Ban Quản Lý Hợp Tác Xã Long Biên',
    });
  }

  return {
    ok: true,
    managedOtherAreaM2: state.managedOtherAreaM2,
    dailyFee,
  };
}

export function simulateDailyUpdate(state, daysToAdvance = 1) {
  const days = Math.max(1, Math.round(daysToAdvance));
  state.day += days;
  if (state.rentedAreaM2 > 0) {
    state.landTenureDays = (state.landTenureDays || 0) + days;
  }

  let maturedCount = 0;
  let activeCount = 0;
  let cultivationExp = 0;

  for (const plot of state.plots) {
    if (!plot) continue;
    const wasWatered = Boolean(plot.wateredToday);
    plot.wateredToday = false;
    plot.soilMoisture = Math.max(60, Math.min(88, plot.soilMoisture - 3 + ((state.day * 5) % 9)));
    if (plot.item && !isBuildingItem(plot.item)) {
      activeCount += 1;
      plot.item.daysCultivated = (plot.item.daysCultivated || 0) + days;
      state.totalCultivationDays = (state.totalCultivationDays || 0) + days;

      if (wasWatered || plot.soilMoisture >= 68) {
        plot.item.qualityCareDays = (plot.item.qualityCareDays || 0) + days;
        cultivationExp += 10 * days; // Chăm sóc tốt (đủ ẩm / tưới nước đều)
      } else {
        cultivationExp += 6 * days;
      }

      if (plot.item.growthProgress < 100) {
        const step = Math.max(1, Math.round((100 / Math.max(1, plot.item.growthDays)) * days));
        plot.item.growthProgress = Math.min(100, plot.item.growthProgress + step);
      }
      plot.item.growthStage = computeStageNumber(plot.item.growthProgress, false);
      if (plot.item.growthProgress >= 100) {
        maturedCount += 1;
      }
    }
  }

  // 1. EXP từ thời gian sở hữu đất (Land Tenure)
  const tenureExp =
    state.rentedAreaM2 > 0
      ? (Math.floor(state.rentedAreaM2 / 10) * 3 + Math.min(16, state.landTenureDays || 1)) * days
      : 0;

  // 2. Phí quản lý hộ khu vườn cho người khác (nếu đã mở khóa từ Cấp 3+)
  const managedUnits = Math.floor((state.managedOtherAreaM2 || 0) / LAND_UNIT_M2);
  const managementFeeEarned = managedUnits * MANAGEMENT_FEE_PER_10M2 * days;
  const managementExp = managedUnits * 6 * days;
  if (managementFeeEarned > 0) {
    state.walletBalance += managementFeeEarned;
    state.totalManagementRevenue = (state.totalManagementRevenue || 0) + managementFeeEarned;
  }

  const totalDailyExp = tenureExp + cultivationExp + managementExp;
  const leveledUp = addExp(state, totalDailyExp);

  const feeNote =
    managementFeeEarned > 0
      ? ` Thu +${managementFeeEarned.toLocaleString('vi-VN')}đ phí quản lý hộ ${state.managedOtherAreaM2}m².`
      : '';

  const summaryMsg =
    activeCount === 0
      ? `Khu đất ${state.rentedAreaM2}m² (Sở hữu ${state.landTenureDays} ngày) đang giữ ẩm tốt (+${totalDailyExp} EXP kinh nghiệm).${feeNote}`
      : `Đã chăm sóc ${activeCount} lô nuôi trồng suốt ${days} ngày (+${totalDailyExp} EXP kinh nghiệm). Có ${maturedCount} lô sẵn sàng thu hoạch!${feeNote}`;

  const updateEntry = {
    id: `daily-${state.day}-${Date.now()}`,
    day: state.day,
    time: '07:30 sáng',
    title: `Nhật ký Ngày ${state.day} • Thâm niên giữ đất ${state.landTenureDays} ngày`,
    message: summaryMsg,
    weather: `${24 + (state.day % 5)}°C • Nắng dịu ven sông`,
    soilMoisture: state.plots[0]?.soilMoisture ?? 70,
    staffName: 'Kỹ sư Minh Tuấn & Đội chăm sóc Long Biên',
  };

  state.dailyUpdates.unshift(updateEntry);

  return {
    ok: true,
    day: state.day,
    daysAdvanced: days,
    expEarned: totalDailyExp,
    managementFeeEarned,
    update: updateEntry,
    leveledUp,
  };
}

export function requestRealWorldView(state, plotIndex = 0) {
  const plot = ensurePlotCell(state, plotIndex);
  if (!plot) {
    return {
      ok: false,
      error: 'Hãy thuê ít nhất 10m² đất để yêu cầu xem ảnh và thông tin thực tế.',
    };
  }

  const item = plot.item;
  const report = {
    requestId: `REQ-${state.day}-${plot.realLotCode}-${Date.now().toString().slice(-4)}`,
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    day: state.day,
    realLotCode: plot.realLotCode,
    areaM2: plot.areaM2,
    location: 'Khu Nông Trại Mẫu 2.000m² - Khu Riverside, Quận Long Biên, Hà Nội',
    gps: '21.0458° N, 105.9182° E',
    temperature: `${25 + (plotIndex % 3)}°C`,
    soilMoisture: plot.soilMoisture,
    soilPh: plot.soilPh,
    itemName: item ? item.name : 'Đất phù sa bãi bồi Long Biên đã lên luống',
    itemIcon: item ? item.icon : '🌱',
    growthProgress: item ? item.growthProgress : 0,
    sceneType: item ? item.realPhotoScene : 'prepared_soil',
    staffReport: item
      ? `Kỹ thuật viên Lê Hương vừa chụp trực tiếp tại lô ${plot.realLotCode} (Riverside Long Biên): "${item.name}" đang phát triển rất tốt trên đất phù sa (${item.growthProgress}%), 100% hữu cơ.`
      : `Lô ${plot.realLotCode} (10m²) tại Riverside Long Biên đã được lên luống cao 25cm, trộn phân trùn quế và gắn biển chờ lệnh gieo trồng.`,
  };

  state.liveRequests.unshift(report);
  return {
    ok: true,
    report,
  };
}

export function harvestPlot(state, plotIndex, options = {}) {
  const plot = ensurePlotCell(state, plotIndex);
  if (!plot || !plot.item) {
    return { ok: false, error: 'Ô đất này chưa có cây trồng hoặc vật nuôi để thu hoạch.' };
  }

  if (isBuildingItem(plot.item)) {
    return { ok: false, error: `"${plot.item.name}" là công trình, không thể thu hoạch hay bán lại.` };
  }

  if (plot.item.growthProgress < 100) {
    return {
      ok: false,
      error: `"${plot.item.name}" mới đạt ${plot.item.growthProgress}% độ trưởng thành. Hãy chăm sóc thêm hoặc bấm qua ngày mới!`,
    };
  }

  const catalogItem = ITEM_CATALOG[plot.item.id] || {};
  const daysCultivated = Math.max(1, plot.item.daysCultivated || 1);
  const qualityCareDays = plot.item.qualityCareDays || 0;
  const isHighQuality = qualityCareDays >= Math.ceil(daysCultivated * 0.5) || plot.soilMoisture >= 70;
  const expQualityMultiplier = isHighQuality ? 1.25 : 1.0;
  const qualityGrade = isHighQuality ? 'Hạng A+ Đặc Sản Hữu Cơ' : 'Hạng A Chuẩn Hữu Cơ';

  // Giá thị trường bán lẻ & Giá Trang Trại thu mua lại (= 50% giá thị trường để trang trại còn 50% biên gộp bán ra ngoài)
  const retailMarketPrice =
    plot.item.retailMarketPrice ||
    catalogItem.retailMarketPrice ||
    Math.round((plot.item.cost || catalogItem.cost || 40_000) * 3.6);
  const baseFarmBuyback =
    plot.item.farmBuybackPrice ||
    catalogItem.farmBuybackPrice ||
    Math.round(retailMarketPrice * 0.5);

  const saleRevenue = baseFarmBuyback;
  const harvestExp = Math.round(
    (plot.item.expReward || catalogItem.expReward || 60) * expQualityMultiplier
  );

  const method = options.method || 'ship_apartment';
  let methodLabel = '🚚 Ship tươi về sảnh Chung cư Hà Nội';
  let addressOrSchedule = options.address || state.apartmentAddress;

  if (method === 'farm_visit') {
    methodLabel = '👨‍👩‍👧‍👦 Gia đình qua Riverside Long Biên tự thu hoạch cuối tuần';
    addressOrSchedule =
      options.address || 'Thứ Bảy tuần này (08:30 - 11:30) tại Nông trại Riverside Long Biên, Hà Nội';
  } else if (method === 'sell_surplus') {
    methodLabel = `💰 Bán lại cho Trang Trại (${qualityGrade}): +${saleRevenue.toLocaleString('vi-VN')}đ (50% giá lẻ thị trường ${retailMarketPrice.toLocaleString('vi-VN')}đ)`;
    addressOrSchedule =
      'Trang trại Riverside Long Biên thu mua tại vườn (50% giá thị trường) để đóng gói phân phối ra các cửa hàng Organic';
    state.walletBalance += saleRevenue;
    state.totalProduceRevenue = (state.totalProduceRevenue || 0) + saleRevenue;
  }

  const order = {
    orderId: `HARV-${Date.now().toString().slice(-5)}`,
    day: state.day,
    realLotCode: plot.realLotCode,
    itemName: plot.item.name,
    itemIcon: plot.item.icon,
    yieldDescription: plot.item.yieldDescription,
    qualityGrade,
    retailMarketPrice,
    saleRevenue: method === 'sell_surplus' ? saleRevenue : 0,
    expEarned: harvestExp,
    method,
    methodLabel,
    addressOrSchedule,
  };

  state.successfulHarvests = (state.successfulHarvests || 0) + 1;
  state.harvestOrders.unshift(order);
  state.dailyUpdates.unshift({
    id: `harvest-${order.orderId}`,
    day: state.day,
    time: 'Vừa xong',
    title: `🎉 Thu hoạch ${qualityGrade} tại Lô ${plot.realLotCode} (+${harvestExp} EXP)`,
    message: `${order.yieldDescription} — ${order.methodLabel} (${order.addressOrSchedule}).`,
    weather: '25°C • Trời trong xanh',
    soilMoisture: plot.soilMoisture,
    staffName: 'Bộ phận Thu hoạch & Kiểm định Chất lượng Long Biên',
  });

  // Nếu thu hoạch cá trong ao đã đào (hasPondBase), giữ lại Ao cá để người chơi thả lứa cá tiếp theo!
  if (plot.hasPondBase && plot.item && plot.item.requiresPond) {
    const pondCatalog = ITEM_CATALOG.fish_pond;
    plot.item = {
      id: pondCatalog.id,
      name: pondCatalog.name,
      icon: pondCatalog.icon,
      category: pondCatalog.category,
      cost: pondCatalog.cost,
      expReward: pondCatalog.expReward,
      plantedDay: state.day,
      growthDays: 1,
      growthProgress: 100,
      growthStage: 5,
      yieldDescription: pondCatalog.yieldDescription,
      realWorldAction: pondCatalog.realWorldAction,
      realPhotoScene: pondCatalog.realPhotoScene,
    };
  } else {
    plot.item = null;
  }
  const leveledUp = addExp(state, harvestExp);

  return {
    ok: true,
    order,
    leveledUp,
  };
}
