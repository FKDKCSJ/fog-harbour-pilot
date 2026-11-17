// 船：三种船的出生、移动和碰撞。船本身不知道游戏规则，只知道自己在哪、
// 往哪走、撞上了什么；输赢和分数由 world.js 算。
import {
  COAST_X,
  DRIFT,
  FIELD,
  GAPS,
  LIGHTHOUSE,
  MOUTH,
  NIGHT_TUNING,
  REEFS,
  SHIP_TYPES,
  STEER,
} from './config.js';

/** 两点之间的角度差，折到 [-π, π] 里。 */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * 船当前要过的墙：前方最近的那道。船要过线之后再往里走 100 像素才算
 * 真的过了——暗礁的圆会伸到墙线以外，刚过线就转向下一道墙会撞上
 * 刚过那道墙的石头。过了最后一道墙返回 null，船就往港口入口走。
 */
export function nextGap(shipX) {
  for (const gap of GAPS) {
    if (shipX > gap.x - 100) return gap;
  }
  return null;
}

/**
 * 被照到的船往哪走：自己往下一道墙的缺口中心走，过了最后一道墙就往
 * 港口入口走。光束只决定“照没照到”，不决定方向——玩家要做的是把光
 * 照在最急的那艘船上，让它自己穿过去。
 */
function steerTargetY(ship) {
  const gap = nextGap(ship.x);
  return gap ? gap.y : MOUTH.centre;
}

/** 这艘船在不在光束里：距离够得着，角度也在张角内（算上船身自己的角宽度）。 */
export function isLit(ship, beam) {
  const dx = ship.x - LIGHTHOUSE.x;
  const dy = ship.y - LIGHTHOUSE.y;
  const distance = Math.hypot(dx, dy);
  if (distance > beam.length) return false;
  const toShip = Math.atan2(dy, dx);
  const halfAngle = beam.halfWidth + Math.asin(Math.min(1, ship.r / Math.max(distance, 1)));
  return Math.abs(angleDiff(toShip, beam.angle)) < halfAngle;
}

/** 按权重抽一种船。 */
function pickType(random) {
  const roll = random();
  let acc = 0;
  for (const key of Object.keys(SHIP_TYPES)) {
    acc += SHIP_TYPES[key].weight;
    if (roll < acc) return key;
  }
  return 'fishing';
}

/** 在右边缘生一艘船：y 随机，但不生在暗礁里面；出生带在第一道墙缺口附近。 */
export function spawnShip(random) {
  const type = pickType(random);
  const spec = SHIP_TYPES[type];
  let x = FIELD.width + 30;
  let y = 250 + random() * 220;
  for (let tries = 0; tries < 10; tries += 1) {
    y = 250 + random() * 220;
    const clear = REEFS.every((reef) => Math.hypot(x - reef.x, y - reef.y) > reef.r + spec.r + 24);
    if (clear) break;
  }
  return {
    type,
    name: spec.name,
    x,
    y,
    r: spec.r,
    speed: spec.speed,
    points: spec.points,
    color: spec.color,
    /** 每艘船自己的浪相位，漂起来才不一样。 */
    phase: random() * Math.PI * 2,
    bob: 0,
    lit: false,
    active: true,
  };
}

/**
 * 推一艘船走一步。返回 'home'（进港）、'wreck'（失事）或 null（还在海上）。
 * 被照到的船加速并沿光束的线转向；没被照到的船随浪慢慢漂，漂偏了就可能撞上暗礁。
 */
export function stepShip(ship, dt, time, beam, night) {
  const tuning = NIGHT_TUNING[night - 1];
  const lit = isLit(ship, beam);
  ship.lit = lit;
  const speed = ship.speed * tuning.speed * (lit ? STEER.boost : 1);
  ship.x -= speed * dt;
  if (lit) {
    const targetY = steerTargetY(ship);
    const dy = targetY - ship.y;
    const move = Math.max(-STEER.turn * dt, Math.min(STEER.turn * dt, dy));
    ship.y += move;
  } else {
    ship.y += Math.sin(time * 0.9 + ship.phase) * (DRIFT.base + DRIFT.perNight * (night - 1)) * dt;
  }
  ship.y = Math.max(24, Math.min(FIELD.height - 24, ship.y));
  // 浪让船身轻轻摇晃，只影响样子，不影响碰撞。
  ship.bob = Math.sin(time * 1.3 + ship.phase) * tuning.wave * 0.12;

  // 撞上暗礁或灯塔岛。
  for (const reef of REEFS) {
    if (Math.hypot(ship.x - reef.x, ship.y - reef.y) < reef.r + ship.r * 0.8) return 'wreck';
  }
  if (Math.hypot(ship.x - LIGHTHOUSE.x, ship.y - LIGHTHOUSE.y) < LIGHTHOUSE.r + ship.r * 0.8) {
    return 'wreck';
  }
  // 到了海岸线：对准入口就是回家，否则撞岸。
  if (ship.x <= COAST_X) {
    return ship.y >= MOUTH.top && ship.y <= MOUTH.bottom ? 'home' : 'wreck';
  }
  return null;
}
