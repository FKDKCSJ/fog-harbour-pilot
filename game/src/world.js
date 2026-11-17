// 世界：整局游戏的状态机。船怎么走归 ships.js，这里只管一局的进程：
// 生船、记分、连击、夜晚推进、夜与夜之间的升级选择、胜负和水花。
import {
  BEAM,
  COMBO_MAX,
  FIELD,
  LIGHTHOUSE,
  MAX_SHIPS,
  MAX_WRECKS,
  NIGHTS,
  NIGHT_TUNING,
  SHIPS_PER_NIGHT,
  WIN_GUIDED,
} from './config.js';
import { spawnShip, stepShip } from './ships.js';

export const EVENT_HOME = 1;
export const EVENT_WRECK = 2;
export const EVENT_WIN = 4;
export const EVENT_LOSE = 8;
export const EVENT_NIGHT = 16;

/** 升级的两个选项：加宽光束，或加长射程。 */
export const UPGRADE_WIDE = 'wide';
export const UPGRADE_LONG = 'long';

function burst(particles, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.6;
    const v = speed * (0.4 + Math.random() * 0.8);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - 20,
      life: 0.7 + Math.random() * 0.5,
      age: 0,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

export function createWorld(random) {
  const state = {
    time: 0,
    night: 1,
    score: 0,
    combo: 0,
    guided: 0,
    wrecks: 0,
    ships: [],
    particles: [],
    beam: { angle: -0.5, halfWidth: BEAM.halfWidth, length: BEAM.length },
    spawnTimer: 1.2,
    upgradePending: false,
    won: false,
    lost: false,
  };

  function reset() {
    state.time = 0;
    state.night = 1;
    state.score = 0;
    state.combo = 0;
    state.guided = 0;
    state.wrecks = 0;
    state.ships = [];
    state.particles = [];
    state.beam = { angle: -0.5, halfWidth: BEAM.halfWidth, length: BEAM.length };
    state.spawnTimer = 1.2;
    state.upgradePending = false;
    state.won = false;
    state.lost = false;
  }

  /** 夜与夜之间的选择：加宽光束，或加长射程；选完夜晚 +1，继续。 */
  function chooseUpgrade(kind) {
    if (!state.upgradePending) return;
    if (kind === UPGRADE_WIDE) state.beam.halfWidth *= BEAM.widthUpgrade;
    else state.beam.length *= BEAM.lengthUpgrade;
    state.upgradePending = false;
    state.night = Math.min(NIGHTS, state.night + 1);
  }

  /**
   * 推世界走一步。beamAngle 是这一步光束的角度；attract 为真时是标题背后的
   * 演示：船照样走，但不记分、不记失事、不推进夜晚。
   * 返回事件位掩码（EVENT_*）。
   */
  function step(dt, beamAngle, attract = false) {
    if (state.won || state.lost) return 0;
    state.time += dt;
    state.beam.angle = beamAngle;
    let events = 0;

    for (const p of state.particles) {
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 60 * dt;
    }
    state.particles = state.particles.filter((p) => p.age < p.life);

    const tuning = NIGHT_TUNING[state.night - 1];
    if (state.ships.length < MAX_SHIPS) {
      state.spawnTimer -= dt;
      if (state.spawnTimer <= 0) {
        state.ships.push(spawnShip(random));
        state.spawnTimer = tuning.spawn * (0.8 + random() * 0.4);
      }
    }

    for (const ship of state.ships) {
      if (!ship.active) continue;
      const result = stepShip(ship, dt, state.time, state.beam, state.night);
      if (result === 'home') {
        ship.active = false;
        burst(state.particles, 120, ship.y, '#f2c94c', 14, 90);
        if (attract) continue;
        state.guided += 1;
        state.combo = Math.min(state.combo + 1, COMBO_MAX);
        state.score += ship.points * state.combo;
        events |= EVENT_HOME;
        if (state.guided >= WIN_GUIDED) {
          state.won = true;
          events |= EVENT_WIN;
        } else if (state.guided % SHIPS_PER_NIGHT === 0) {
          state.upgradePending = true;
          events |= EVENT_NIGHT;
        }
      } else if (result === 'wreck') {
        ship.active = false;
        burst(state.particles, ship.x, ship.y, '#9fc3d8', 18, 120);
        if (attract) continue;
        state.wrecks += 1;
        state.combo = 0;
        events |= EVENT_WRECK;
        if (state.wrecks >= MAX_WRECKS) {
          state.lost = true;
          events |= EVENT_LOSE;
        }
      }
    }
    state.ships = state.ships.filter((ship) => ship.active);
    return events;
  }

  return {
    state,
    reset,
    step,
    chooseUpgrade,
    /** 今晚的雾、浪和出船间隔。 */
    nightTuning() {
      return NIGHT_TUNING[state.night - 1];
    },
    /** 灯塔在逻辑场上的位置（渲染和输入共用）。 */
    lighthouse() {
      return { x: LIGHTHOUSE.x, y: LIGHTHOUSE.y };
    },
    fieldSize() {
      return { width: FIELD.width, height: FIELD.height };
    },
  };
}
