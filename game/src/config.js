// 雾港引航 Fog Harbour Pilot：所有调校数字和颜色都放在这里。
// 棋盘是固定 1280x720 的逻辑区域，渲染器再把它缩放到窗口，所以下面没有一条规则依赖屏幕尺寸。

export const FIELD = { width: 1280, height: 720 };

/** 固定步长（秒）：无论显示器刷新率多少，每秒都是 60 次模拟。 */
export const STEP = 1 / 60;

/** 左侧陆地（海岸线）的 x 位置；船到这里就靠岸或触礁。 */
export const COAST_X = 150;

/** 港口入口在海岸线上的开口：y 在这个区间内的船算引航成功。 */
export const MOUTH = { top: 300, bottom: 420, centre: 360 };

/** 灯塔坐在港口外的小岛上，光束从这里发出；小岛本身也是暗礁。 */
export const LIGHTHOUSE = { x: 330, y: 480, r: 24 };

/** 光束的初始状态：半角和射程，升级各加 30%。 */
export const BEAM = {
  halfWidth: 0.13,
  length: 800,
  widthUpgrade: 1.3,
  lengthUpgrade: 1.3,
  /** 鼠标瞄准时光束追向目标角的速度（弧度/秒），基本等于跟手。 */
  mouseSlew: 12,
  /** 方向键转动光束的速度（弧度/秒）。 */
  keySlew: 2.2,
};

/** 暗礁：每块都是一个圆，船碰上就失事。三道礁墙各留一个缺口，船要顺着光束的线走过去。 */
export const REEFS = [
  // 第一道墙（x≈920），缺口在 y 265–450 之间
  { x: 920, y: 120, r: 70 },
  { x: 920, y: 210, r: 55 },
  { x: 920, y: 520, r: 70 },
  { x: 920, y: 620, r: 55 },
  // 第一道墙缺口里的孤礁，守在缺口下沿：直线漂过去的船容易撞上
  { x: 780, y: 470, r: 28 },
  // 第二道墙（x≈640），缺口在 y 170–345 之间
  { x: 640, y: 110, r: 55 },
  { x: 640, y: 420, r: 65 },
  { x: 640, y: 590, r: 70 },
  // 第二道墙缺口里的孤礁，守在航道上方：漂得太靠上的船会撞上
  { x: 560, y: 130, r: 24 },
  // 第三道墙（x≈400），缺口在 y 205–420 之间，正对港口入口
  { x: 400, y: 140, r: 65 },
  { x: 400, y: 500, r: 80 },
  { x: 400, y: 640, r: 50 },
];

/** 截图里的自动引航员瞄准的点：每道墙缺口的中心，最后是港口入口。 */
export const GAPS = [
  { x: 920, y: 357 },
  { x: 640, y: 260 },
  { x: 400, y: 312 },
];

/** 三种船：越快分越低，越慢分越高。 */
export const SHIP_TYPES = {
  fishing: { name: '渔船', speed: 50, points: 50, r: 13, color: '#f2c94c', weight: 0.4 },
  passenger: { name: '客船', speed: 34, points: 100, r: 17, color: '#eef1f5', weight: 0.35 },
  cargo: { name: '货船', speed: 24, points: 150, r: 21, color: '#e07840', weight: 0.25 },
};

/** 每晚要引航回家的船数；5 夜 × 3 艘 = 15 艘获胜。 */
export const SHIPS_PER_NIGHT = 3;
export const NIGHTS = 5;
export const WIN_GUIDED = 15;
export const MAX_WRECKS = 3;
/** 同时在海上的船最多几艘：两艘，一盏灯刚好顾得过来。 */
export const MAX_SHIPS = 2;

/** 每晚的难度：雾更浓、浪更大、船来得更快、船也更快。 */
export const NIGHT_TUNING = [
  { fog: 0.22, wave: 2, spawn: 2.7, speed: 1.08 },
  { fog: 0.3, wave: 4, spawn: 2.4, speed: 1.15 },
  { fog: 0.38, wave: 6, spawn: 2.1, speed: 1.22 },
  { fog: 0.46, wave: 8, spawn: 1.8, speed: 1.3 },
  { fog: 0.54, wave: 10, spawn: 1.5, speed: 1.38 },
];

/** 被光束照到的船：沿光束的线转向的速度，以及顺流加速的倍数。 */
export const STEER = { turn: 130, boost: 1.35 };

/** 没被照到的船随浪漂移的速度（像素/秒），随夜晚加深：离了光束，船会越漂越偏。 */
export const DRIFT = { base: 3.5, perNight: 0.8 };

/** 连击：连续引航成功不失事，每艘的倍数 +1，最高 5 倍。 */
export const COMBO_MAX = 5;

/** 最好成绩存在这个浏览器里（只在本机）。 */
export const BEST_KEY = 'fog-harbour-pilot.best';

export const PALETTE = {
  seaTop: '#0d2436',
  seaBottom: '#081426',
  coast: '#232c3a',
  coastEdge: '#4a5a70',
  reef: '#2c3138',
  reefEdge: '#5a6a7a',
  foam: '#9fc3d8',
  beam: '#ffe9a8',
  lighthouse: '#eef1f5',
  lighthouseBand: '#d84a3a',
  panel: '#101827',
  panelEdge: '#2c3a4d',
  text: '#eef1f5',
  muted: '#93a1b5',
  gold: '#f2c94c',
  danger: '#e5534b',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif';
