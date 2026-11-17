// 渲染：把世界画到 canvas 上。逻辑场固定 1280x720，渲染器按窗口等比缩放，
// 鼠标坐标再换算回去。画的顺序：海 → 暗礁 → 海岸 → 光束 → 船 → 水花 → 雾 → HUD → 界面。
import { FIELD, LIGHTHOUSE, MOUTH, NIGHT_TUNING, PALETTE, REEFS, FONT, COAST_X } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_UPGRADE = 'upgrade';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

/** 升级的两张卡片在逻辑场上的位置，主循环用它判断点中了哪张。 */
export const UPGRADE_CARDS = {
  wide: { x: 280, y: 300, w: 320, h: 170 },
  long: { x: 680, y: 300, w: 320, h: 170 },
};

export function upgradeHit(pos) {
  if (!pos) return null;
  for (const key of ['wide', 'long']) {
    const c = UPGRADE_CARDS[key];
    if (pos.x >= c.x && pos.x <= c.x + c.w && pos.y >= c.y && pos.y <= c.y + c.h) return key;
  }
  return null;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const fogCanvas = document.createElement('canvas');
  fogCanvas.width = FIELD.width;
  fogCanvas.height = FIELD.height;
  const fog = fogCanvas.getContext('2d');
  let view = { scale: 1, ox: 0, oy: 0, dpr: 1 };

  function fit() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view = {
      scale,
      ox: (canvas.width - FIELD.width * scale) / 2,
      oy: (canvas.height - FIELD.height * scale) / 2,
      dpr,
    };
  }

  function toLogical(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width) / view.scale - view.ox / view.scale,
      y: (clientY - rect.top) * (canvas.height / rect.height) / view.scale - view.oy / view.scale,
    };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawSea(time) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.seaTop);
    g.addColorStop(1, PALETTE.seaBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // 几道缓慢移动的浪纹，只作装饰。
    ctx.strokeStyle = 'rgba(159,195,216,0.07)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 6; i += 1) {
      const y = 90 + i * 110;
      ctx.beginPath();
      for (let x = 160; x <= FIELD.width; x += 32) {
        const yy = y + Math.sin(x * 0.012 + time * 0.7 + i * 1.7) * 7;
        if (x === 160) ctx.moveTo(x, yy);
        else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  function drawCoast() {
    ctx.fillStyle = PALETTE.coast;
    // 上半陆地和下半陆地，中间留出港口入口。
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(COAST_X, 0);
    ctx.lineTo(COAST_X, MOUTH.top);
    ctx.lineTo(110, MOUTH.top + 18);
    ctx.lineTo(0, MOUTH.top + 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, FIELD.height);
    ctx.lineTo(COAST_X, FIELD.height);
    ctx.lineTo(COAST_X, MOUTH.bottom);
    ctx.lineTo(110, MOUTH.bottom - 18);
    ctx.lineTo(0, MOUTH.bottom - 26);
    ctx.closePath();
    ctx.fill();
    // 海岸线描边。
    ctx.strokeStyle = PALETTE.coastEdge;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(COAST_X, 0);
    ctx.lineTo(COAST_X, MOUTH.top);
    ctx.lineTo(110, MOUTH.top + 18);
    ctx.moveTo(COAST_X, MOUTH.bottom);
    ctx.lineTo(110, MOUTH.bottom - 18);
    ctx.lineTo(COAST_X, FIELD.height);
    ctx.stroke();
    // 港口里画两座小码头和“雾港”二字。
    ctx.strokeStyle = 'rgba(238,241,245,0.35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 330);
    ctx.lineTo(96, 330);
    ctx.moveTo(0, 392);
    ctx.lineTo(96, 392);
    ctx.stroke();
    ctx.fillStyle = 'rgba(238,241,245,0.55)';
    ctx.font = `600 30px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('雾 港', 62, 180);
    ctx.font = `400 15px ${FONT}`;
    ctx.fillStyle = 'rgba(147,161,181,0.8)';
    ctx.fillText('FOG HARBOUR', 62, 208);
  }

  function drawReefs(time) {
    for (const reef of REEFS) {
      ctx.fillStyle = PALETTE.reef;
      ctx.beginPath();
      ctx.arc(reef.x, reef.y, reef.r, 0, Math.PI * 2);
      ctx.fill();
      // 锯齿状的岩顶：几个小凸起。
      ctx.fillStyle = PALETTE.reefEdge;
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + reef.x * 0.01;
        const px = reef.x + Math.cos(a) * reef.r * 0.55;
        const py = reef.y + Math.sin(a) * reef.r * 0.55 - reef.r * 0.25;
        ctx.beginPath();
        ctx.moveTo(px - 9, py + 7);
        ctx.lineTo(px, py - 9);
        ctx.lineTo(px + 9, py + 7);
        ctx.closePath();
        ctx.fill();
      }
      // 一圈时隐时现的浪花。
      ctx.strokeStyle = `rgba(159,195,216,${0.25 + 0.15 * Math.sin(time * 1.5 + reef.y)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(reef.x, reef.y, reef.r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawLighthouse(time) {
    // 小岛。
    ctx.fillStyle = PALETTE.coast;
    ctx.beginPath();
    ctx.arc(LIGHTHOUSE.x, LIGHTHOUSE.y, LIGHTHOUSE.r + 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.coastEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    // 塔身：白底红带。
    ctx.fillStyle = PALETTE.lighthouse;
    ctx.fillRect(LIGHTHOUSE.x - 9, LIGHTHOUSE.y - 42, 18, 42);
    ctx.fillStyle = PALETTE.lighthouseBand;
    ctx.fillRect(LIGHTHOUSE.x - 9, LIGHTHOUSE.y - 30, 18, 9);
    ctx.fillRect(LIGHTHOUSE.x - 9, LIGHTHOUSE.y - 14, 18, 9);
    // 灯头和一圈光晕。
    const glow = ctx.createRadialGradient(
      LIGHTHOUSE.x, LIGHTHOUSE.y - 46, 2,
      LIGHTHOUSE.x, LIGHTHOUSE.y - 46, 26,
    );
    glow.addColorStop(0, 'rgba(255,233,168,0.9)');
    glow.addColorStop(1, 'rgba(255,233,168,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(LIGHTHOUSE.x, LIGHTHOUSE.y - 46, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath();
    ctx.arc(LIGHTHOUSE.x, LIGHTHOUSE.y - 46, 6, 0, Math.PI * 2);
    ctx.fill();
    void time;
  }

  function drawBeam(beam) {
    const { x, y } = LIGHTHOUSE;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 10, x, y, beam.length);
    g.addColorStop(0, 'rgba(255,233,168,0.34)');
    g.addColorStop(0.7, 'rgba(255,233,168,0.12)');
    g.addColorStop(1, 'rgba(255,233,168,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, beam.length, beam.angle - beam.halfWidth, beam.angle + beam.halfWidth);
    ctx.closePath();
    ctx.fill();
    // 中心更亮的一线。
    ctx.fillStyle = 'rgba(255,244,200,0.20)';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, beam.length, beam.angle - beam.halfWidth * 0.35, beam.angle + beam.halfWidth * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawShip(ship) {
    ctx.save();
    ctx.translate(ship.x, ship.y);
    ctx.rotate(ship.bob);
    // 被照到的船顶一盏暖光，看得出它正在被引航。
    if (ship.lit) {
      const halo = ctx.createRadialGradient(0, -6, 2, 0, -6, ship.r + 18);
      halo.addColorStop(0, 'rgba(255,233,168,0.55)');
      halo.addColorStop(1, 'rgba(255,233,168,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(0, -6, ship.r + 18, 0, Math.PI * 2);
      ctx.fill();
    }
    const r = ship.r;
    if (ship.type === 'fishing') {
      ctx.fillStyle = ship.color;
      ctx.beginPath();
      ctx.moveTo(-r - 4, 0);
      ctx.lineTo(-r * 0.4, r * 0.75);
      ctx.lineTo(r * 0.7, r * 0.75);
      ctx.lineTo(r + 2, -2);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#2c3138';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, -r - 8);
      ctx.stroke();
      ctx.fillStyle = '#eef1f5';
      ctx.beginPath();
      ctx.moveTo(0, -r - 8);
      ctx.lineTo(0, -2);
      ctx.lineTo(r * 0.8, -2);
      ctx.closePath();
      ctx.fill();
    } else if (ship.type === 'passenger') {
      ctx.fillStyle = '#dfe6ee';
      ctx.beginPath();
      ctx.moveTo(-r - 6, 0);
      ctx.lineTo(-r * 0.5, r * 0.8);
      ctx.lineTo(r * 0.8, r * 0.8);
      ctx.lineTo(r + 4, -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a6ea5';
      ctx.fillRect(-r * 0.4, -r * 0.7, r * 1.1, r * 0.7);
      ctx.fillStyle = '#ffe9a8';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(-r * 0.25 + i * r * 0.4, -r * 0.35, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = ship.color;
      ctx.beginPath();
      ctx.moveTo(-r - 8, 0);
      ctx.lineTo(-r * 0.5, r * 0.8);
      ctx.lineTo(r * 0.9, r * 0.8);
      ctx.lineTo(r + 6, -2);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#4a6a8a';
      ctx.fillRect(-r * 0.6, -r * 0.75, r * 0.5, r * 0.7);
      ctx.fillRect(r * 0.05, -r * 0.75, r * 0.5, r * 0.7);
      ctx.fillStyle = '#8a6a3a';
      ctx.fillRect(-r * 0.55, -r * 1.15, r * 0.45, r * 0.45);
    }
    ctx.restore();
  }

  function drawParticles(particles) {
    for (const p of particles) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** 雾：一层暗色盖在海上，只在光束、灯塔、船和港口入口处挖开。 */
  function drawFog(state) {
    const tuning = NIGHT_TUNING[state.night - 1] ?? { fog: 0.3 };
    fog.clearRect(0, 0, FIELD.width, FIELD.height);
    fog.fillStyle = `rgba(5,9,17,${tuning.fog})`;
    fog.fillRect(0, 0, FIELD.width, FIELD.height);
    fog.globalCompositeOperation = 'destination-out';
    const { x, y } = LIGHTHOUSE;
    const beam = state.beam;
    const g = fog.createRadialGradient(x, y, 10, x, y, beam.length);
    g.addColorStop(0, 'rgba(0,0,0,0.95)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.75)');
    g.addColorStop(1, 'rgba(0,0,0,0.25)');
    fog.fillStyle = g;
    fog.beginPath();
    fog.moveTo(x, y);
    fog.arc(x, y, beam.length, beam.angle - beam.halfWidth, beam.angle + beam.halfWidth);
    fog.closePath();
    fog.fill();
    for (const [cx, cy, r, a] of [
      [x, y, 110, 0.9],
      [150, 360, 130, 0.7],
      ...state.ships.map((s) => [s.x, s.y, 64, 0.55]),
    ]) {
      const cg = fog.createRadialGradient(cx, cy, 2, cx, cy, r);
      cg.addColorStop(0, `rgba(0,0,0,${a})`);
      cg.addColorStop(1, 'rgba(0,0,0,0)');
      fog.fillStyle = cg;
      fog.beginPath();
      fog.arc(cx, cy, r, 0, Math.PI * 2);
      fog.fill();
    }
    fog.globalCompositeOperation = 'source-over';
    ctx.drawImage(fogCanvas, 0, 0);
  }

  function drawHud(state) {
    ctx.fillStyle = 'rgba(16,24,39,0.82)';
    roundRect(10, 10, FIELD.width - 20, 52, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 22px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`分数 ${state.score}`, 28, 44);
    ctx.fillStyle = state.combo > 1 ? PALETTE.gold : PALETTE.muted;
    ctx.fillText(state.combo > 1 ? `连击 x${state.combo}` : '连击 —', 210, 44);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(`第 ${state.night} 夜 · 引航 ${state.guided}/15`, FIELD.width / 2, 44);
    ctx.textAlign = 'right';
    ctx.fillStyle = state.wrecks > 0 ? PALETTE.danger : PALETTE.text;
    ctx.fillText(`失事 ${state.wrecks}/3`, FIELD.width - 28, 44);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('鼠标 / ← → 转动光束 · 空格开始 · P 暂停 · M 静音', FIELD.width / 2, FIELD.height - 14);
  }

  function dim(alpha) {
    ctx.fillStyle = `rgba(5,9,17,${alpha})`;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = 'rgba(16,24,39,0.92)';
    roundRect(x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawTitle(best) {
    dim(0.55);
    panel(290, 130, 700, 440);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 64px ${FONT}`;
    ctx.fillText('雾 港 引 航', FIELD.width / 2, 230);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `400 20px ${FONT}`;
    ctx.fillText('FOG HARBOUR PILOT', FIELD.width / 2, 268);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 19px ${FONT}`;
    ctx.fillText('转动灯塔的光束，照亮暗礁之间的航道，', FIELD.width / 2, 330);
    ctx.fillText('把 15 艘船一艘一艘领进雾港。失事 3 艘，雾港就失守了。', FIELD.width / 2, 360);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText('渔船快分低 · 客船居中 · 货船慢分高 —— 被光照到的船会自己往下一个缺口走', FIELD.width / 2, 402);
    ctx.fillText('每晚引航 3 艘后二选一升级：加宽光束，或加长射程', FIELD.width / 2, 430);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText(best > 0 ? `最好成绩 ${best} 分 · 点击或按空格开始` : '点击或按空格开始', FIELD.width / 2, 500);
  }

  function drawPaused() {
    dim(0.55);
    panel(440, 260, 400, 180);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText('已 暂 停', FIELD.width / 2, 335);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText('按 P 或点击继续', FIELD.width / 2, 380);
  }

  function drawUpgrade(state) {
    dim(0.6);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 40px ${FONT}`;
    ctx.fillText(`第 ${state.night} 夜结束`, FIELD.width / 2, 220);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 19px ${FONT}`;
    ctx.fillText(`已引航 ${state.guided} 艘 · 选一项升级，迎接更浓的雾`, FIELD.width / 2, 258);
    for (const [key, title, desc, hint] of [
      ['wide', '加宽光束', '光束张角 +30%', '按 1 或点击'],
      ['long', '加长射程', '光束射程 +30%', '按 2 或点击'],
    ]) {
      const c = UPGRADE_CARDS[key];
      panel(c.x, c.y, c.w, c.h);
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `700 30px ${FONT}`;
      ctx.fillText(title, c.x + c.w / 2, c.y + 62);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `400 19px ${FONT}`;
      ctx.fillText(desc, c.x + c.w / 2, c.y + 104);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `400 16px ${FONT}`;
      ctx.fillText(hint, c.x + c.w / 2, c.y + 138);
    }
  }

  function drawEnd(state, best, won) {
    dim(0.6);
    panel(330, 170, 620, 380);
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? PALETTE.gold : PALETTE.danger;
    ctx.font = `700 56px ${FONT}`;
    ctx.fillText(won ? '引 航 成 功' : '雾 港 失 守', FIELD.width / 2, 270);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 21px ${FONT}`;
    ctx.fillText(
      won ? '15 艘船都平安进港了，雾港的灯还亮着。' : '失事 3 艘，雾把航道吞了。',
      FIELD.width / 2, 322,
    );
    ctx.font = `600 26px ${FONT}`;
    ctx.fillText(`分数 ${state.score} · 引航 ${state.guided}/15`, FIELD.width / 2, 380);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 18px ${FONT}`;
    ctx.fillText(`最好成绩 ${best} 分`, FIELD.width / 2, 420);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText('按空格或点击再来一局', FIELD.width / 2, 490);
  }

  return {
    toLogical,
    draw(state, screen, best) {
      fit();
      ctx.setTransform(view.scale, 0, 0, view.scale, view.ox, view.oy);
      drawSea(state.time);
      drawReefs(state.time);
      drawCoast();
      drawBeam(state.beam);
      drawLighthouse(state.time);
      for (const ship of state.ships) drawShip(ship);
      drawParticles(state.particles);
      drawFog(state);
      drawHud(state);
      if (screen === SCREEN_TITLE) drawTitle(best);
      else if (screen === SCREEN_PAUSED) drawPaused();
      else if (screen === SCREEN_UPGRADE) drawUpgrade(state);
      else if (screen === SCREEN_WIN) drawEnd(state, best, true);
      else if (screen === SCREEN_LOSE) drawEnd(state, best, false);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
  };
}
