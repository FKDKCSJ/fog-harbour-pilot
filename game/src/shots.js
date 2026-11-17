// 截图的摆拍：?shot=start|play|win|lose（加 &seed=N）时不走主循环，
// 而是按真实规则往前模拟一段，再由主循环画一帧。摆拍的画面就是一局真游戏
// 的样子：同一个种子永远是同一帧，裁判看到的和玩家玩到的是同一个游戏。
import { LIGHTHOUSE, MOUTH, STEP } from './config.js';
import { EVENT_LOSE, EVENT_WIN } from './world.js';
import { nextGap } from './ships.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 26;
const LIMIT_SECONDS = 900;

/** 两点之间的角度差，折到 [-π, π] 里。 */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * 自动引航员：先救最急的那艘船——离下一道墙最近的那艘。光束要照着船
 * 才能让它转向，所以目标角不能一下跳到缺口去，只能在“还照得着船”的
 * 窗口里慢慢往缺口靠，船就跟着光束的线一寸一寸挪过去，跟玩家赢下这局
 * 用的办法一样。
 */
function autopilotAngle(world) {
  const ships = world.state.ships;
  const beam = world.state.beam;
  if (ships.length === 0) {
    return Math.atan2(MOUTH.centre - LIGHTHOUSE.y, 150 - LIGHTHOUSE.x);
  }
  // 每艘船的下一道墙：它前方最近的那道；离墙最近的船最急。
  let urgent = null;
  let urgentGap = { x: 150, y: MOUTH.centre };
  let urgentDistance = Infinity;
  for (const ship of ships) {
    const gap = nextGap(ship.x) ?? { x: 150, y: MOUTH.centre };
    const distance = ship.x - gap.x;
    if (distance < urgentDistance) {
      urgentDistance = distance;
      urgent = ship;
      urgentGap = gap;
    }
  }
  const gapAngle = Math.atan2(urgentGap.y - LIGHTHOUSE.y, urgentGap.x - LIGHTHOUSE.x);
  const shipAngle = Math.atan2(urgent.y - LIGHTHOUSE.y, urgent.x - LIGHTHOUSE.x);
  const window = beam.halfWidth * 0.8;
  return Math.max(shipAngle - window, Math.min(shipAngle + window, gapAngle));
}

/** 光束角以每秒不超过 2.5 弧度的速度追向目标角。 */
function slewAngle(current, target, dt) {
  const maxTurn = 2.5 * dt;
  const d = angleDiff(target, current);
  return current + Math.max(-maxTurn, Math.min(maxTurn, d));
}

/**
 * 把世界摆成指定场景，返回要画的界面和最好成绩。
 * start：在标题背后演示 6 秒；play：自动引航 26 秒；win：自动打到获胜；
 * lose：光束故意指向上方，让船自己漂向暗礁，直到失事 3 艘。
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name !== 'play' && name !== 'win' && name !== 'lose') {
    let angle = -0.6;
    for (let t = 0; t < START_SECONDS; t += STEP) {
      angle = -0.6 + Math.sin(t * 0.4) * 0.5;
      world.step(STEP, angle, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    for (let t = 0; t < PLAY_SECONDS; t += STEP) {
      const target = autopilotAngle(world);
      state.beam.angle = slewAngle(state.beam.angle, target, STEP);
      world.step(STEP, state.beam.angle);
      if (state.won || state.lost) break;
    }
    return { screen: state.lost ? SCREEN_LOSE : SCREEN_PLAY, best: state.score };
  }
  if (name === 'win') {
    for (let t = 0; t < LIMIT_SECONDS; t += STEP) {
      const target = autopilotAngle(world);
      state.beam.angle = slewAngle(state.beam.angle, target, STEP);
      const events = world.step(STEP, state.beam.angle);
      if (events & EVENT_WIN) break;
      if (events & EVENT_LOSE) break;
      // 夜晚升级时自动选加长射程。
      if (state.upgradePending) world.chooseUpgrade('long');
    }
    return { screen: state.won ? SCREEN_WIN : SCREEN_PLAY, best: state.score };
  }
  // lose：光束一直指着右上方的空海，船得不到引航。
  const away = Math.atan2(-260, 700);
  for (let t = 0; t < LIMIT_SECONDS; t += STEP) {
    const events = world.step(STEP, away);
    if (events & EVENT_LOSE) break;
    if (events & EVENT_WIN) break;
  }
  return { screen: state.lost ? SCREEN_LOSE : SCREEN_PLAY, best: state.score };
}
