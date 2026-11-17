// 输入：鼠标和键盘。鼠标指哪光束就往哪转，方向键也能转；空格/回车确认，
// P 或 Esc 暂停，1/2 在夜晚升级时二选一，M 静音。按住的键每帧读方向，
// 按一下的动作排队成位标志，由主循环一次取走，帧与帧之间既不丢也不重复。
import { BEAM } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_WIDE = 4;
export const ACTION_LONG = 8;
export const ACTION_MUTE = 16;

const LEFT_KEYS = new Set(['ArrowLeft', 'KeyA']);
const RIGHT_KEYS = new Set(['ArrowRight', 'KeyD']);
const CONFIRM_KEYS = new Set(['Space', 'Enter']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const WIDE_KEYS = new Set(['Digit1', 'Numpad1']);
const LONG_KEYS = new Set(['Digit2', 'Numpad2']);
const MUTE_KEYS = new Set(['KeyM']);

export function createInput(canvas, toLogical) {
  let left = false;
  let right = false;
  let actions = 0;
  /** 鼠标最后指到的逻辑坐标；光束平时就跟着它。 */
  let mouse = null;
  /** 鼠标最后一次动的时间戳，用来判断方向键是否正在接管。 */
  let mouseAt = 0;

  window.addEventListener('keydown', (event) => {
    if (LEFT_KEYS.has(event.code)) left = true;
    else if (RIGHT_KEYS.has(event.code)) right = true;
    else if (CONFIRM_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (WIDE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_WIDE;
    } else if (LONG_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_LONG;
    } else if (MUTE_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT_KEYS.has(event.code)) left = false;
    else if (RIGHT_KEYS.has(event.code)) right = false;
  });
  // 切走或失焦时松开所有键，免得回来还一直转。
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    mouse = toLogical(event.clientX, event.clientY);
    mouseAt = performance.now();
  });
  canvas.addEventListener('pointerdown', (event) => {
    mouse = toLogical(event.clientX, event.clientY);
    mouseAt = performance.now();
    actions |= ACTION_CONFIRM;
  });

  return {
    /** 这帧光束该转多少：方向键按住就匀速转，否则追鼠标。返回角速度（弧度/秒）或目标角。 */
    beamControl(lighthouse) {
      if (left || right) {
        return { turn: (right ? 1 : 0) - (left ? 1 : 0), speed: BEAM.keySlew };
      }
      if (mouse) {
        return {
          target: Math.atan2(mouse.y - lighthouse.y, mouse.x - lighthouse.x),
          speed: BEAM.mouseSlew,
        };
      }
      return null;
    },
    /** 方向键正在按着吗（用来决定光束跟谁）。 */
    keysHeld() {
      return left || right;
    },
    /** 鼠标位置（逻辑坐标），升级按钮的点击判定用它。 */
    mousePosition() {
      return mouse;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
