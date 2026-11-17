// 雾港引航的提交入口（Node 22，只用标准库）：把这个目录里的 game/ 和
// screenshots/ 原样拷到 /output，再用随 kit 来的 makefun-game.ts 写出
// /output/dossier.json——裁判读的就是这份 dossier。
// 本地自测时 MAKEFUN_OUTPUT_DIR 代替 /output：
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// 两次运行必须写出完全相同的字节，所以这里不写时间、不写随机数。

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// 评分器的上限（kit 的 reference/gate.json）：超过的条目会被拒收，
// 这里先按同样的上限拦下来，免得交上去才发现。
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
