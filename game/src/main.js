// 启动和主循环：读输入、按固定步长推世界、画出来。游戏在四个界面之间走：
// 标题 → 游玩 →（暂停）→ 夜晚升级 → 胜利 / 失败 → 再来一局。
// ?seed=N 固定出船的顺序；?shot=start|play|win|lose（加 &seed=N）只摆拍一帧，
// 画两次后立起 window.__shotReady，等截图工具来拍。
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import {
  ACTION_CONFIRM,
  ACTION_LONG,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_WIDE,
  createInput,
} from './input.js';
import {
  EVENT_HOME,
  EVENT_LOSE,
  EVENT_NIGHT,
  EVENT_WIN,
  EVENT_WRECK,
  UPGRADE_LONG,
  UPGRADE_WIDE,
  createWorld,
} from './world.js';
import {
  SCREEN_LOSE,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_UPGRADE,
  SCREEN_WIN,
  createRenderer,
  upgradeHit,
} from './render.js';
import { stageShot } from './shots.js';

/** 一帧最多追赶的时长；更长的卡顿（切走的标签页）直接丢掉，不补跑。 */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // 隐私窗口里存不下，最好成绩就只留这一局。
  }
}

/** 摆拍模式：摆好场景画两遍，立起 __shotReady。 */
function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, (x, y) => renderer.toLogical(x, y));
  let screen = SCREEN_TITLE;
  let best = readBest();
  let beamAngle = -0.5;
  let accumulator = 0;
  let last = performance.now();

  // 屏幕阅读器（和所有看页面文字的人）能听到界面变化和每次进港、失事。
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    audio.unlock();
    audio.click();
    world.reset();
    beamAngle = -0.5;
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('开始引航。把船领进雾港。');
  }

  function endGame(won) {
    screen = won ? SCREEN_WIN : SCREEN_LOSE;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(won ? `引航成功。分数 ${world.state.score}。` : `雾港失守。分数 ${world.state.score}。`);
  }

  /** 光束这一帧转到哪：方向键按住就匀速转，否则追鼠标。 */
  function updateBeam(dt) {
    const control = input.beamControl(world.lighthouse());
    if (!control) return;
    if (control.turn !== undefined) {
      beamAngle += control.turn * control.speed * dt;
    } else {
      const diff = control.target - beamAngle;
      const wrapped = Math.atan2(Math.sin(diff), Math.cos(diff));
      const maxTurn = control.speed * dt;
      beamAngle += Math.max(-maxTurn, Math.min(maxTurn, wrapped));
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? '已静音。' : '声音已开。');
    }
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_UPGRADE) {
      const mouse = input.mousePosition();
      const clicked = actions & ACTION_CONFIRM ? upgradeHit(mouse) : null;
      if (actions & ACTION_WIDE || clicked === UPGRADE_WIDE) {
        audio.chime();
        world.chooseUpgrade(UPGRADE_WIDE);
        screen = SCREEN_PLAY;
        announce(`光束加宽。第 ${world.state.night} 夜。`);
      } else if (actions & ACTION_LONG || clicked === UPGRADE_LONG) {
        audio.chime();
        world.chooseUpgrade(UPGRADE_LONG);
        screen = SCREEN_PLAY;
        announce(`射程加长。第 ${world.state.night} 夜。`);
      }
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('已暂停。');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('继续引航。');
      }
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) {
      // 标题背后：光束慢慢扫过海面，船照样走，只是不记分。
      beamAngle = -0.6 + Math.sin(world.state.time * 0.4) * 0.5;
      world.step(STEP, beamAngle, true);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    updateBeam(STEP);
    const events = world.step(STEP, beamAngle);
    if (events & EVENT_HOME) audio.horn();
    if (events & EVENT_WRECK) audio.wreck();
    if (events & EVENT_WIN) endGame(true);
    else if (events & EVENT_LOSE) endGame(false);
    else if (events & EVENT_NIGHT) {
      screen = SCREEN_UPGRADE;
      audio.chime();
      announce(`第 ${world.state.night} 夜结束。选一项升级。`);
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      step();
      accumulator -= STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world.state, screen, best);
  }

  // 切走标签页时把进行中的一局暂停，别让船在看不见的时候失事。
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('已暂停。');
    }
  });

  announce('雾港引航。按空格或点击开始。');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
