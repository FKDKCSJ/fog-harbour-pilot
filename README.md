# 雾港引航 · Fog Harbour Pilot

[![Make the best game](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01)
[![Rank](https://make.fun/badge/best-game-01/FKDKCSJ/fog-harbour-pilot/rank.svg)](https://make.fun/bounty/best-game-01)
[![Reward](https://make.fun/badge/best-game-01/FKDKCSJ/fog-harbour-pilot/reward.svg)](https://make.fun/bounty/best-game-01)

make.fun「Make the best game」（best-game-01）的参赛作品：一个完整原创的离线静态游戏。

## 玩法

雾夜里的灯塔引航：转动灯塔的光束，照亮暗礁之间的航道，把船一艘一艘领进雾港。

- 鼠标或 ← → 键转动光束；被光束照到的船会自己往下一个缺口走，没被照到的船随浪漂移。
- 三种船：渔船快分低，客船居中，货船慢分高。撞上暗礁、灯塔岛或海岸都算失事。
- 引航 15 艘获胜，失事 3 艘失败。连续引航成功攒连击，分数翻倍。
- 5 个夜晚：夜越深雾越浓、浪越大、船来得越快。每晚引航 3 艘后二选一升级：加宽光束，或加长射程。
- 空格开始 / 暂停：P；静音：M。音效全部由 WebAudio 现场合成，没有音频文件。

## 本地试玩

```sh
node serve.ts
# 桌面 Chrome 打开 http://localhost:8080
```

## 提交前自检

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# 检查 out/dossier.json 和 out/screenshots/
```

## 截图

`screenshots/` 里的 4 张图是游戏自己在浏览器里真实渲染的画面，用
`?shot=start|play|win|lose&seed=1` 摆拍（`game/src/shots.js`）：
1-start（标题）、2-play（游玩）、3-win（获胜）、4-lose（失败）。

## 结构

- `game/index.html` —— 入口，只加载本地文件，不请求任何网络资源
- `game/src/config.js` —— 全部调校数字和颜色
- `game/src/random.js` —— 带种子的随机数（同一场雾可重现）
- `game/src/audio.js` —— WebAudio 合成音效
- `game/src/ships.js` —— 船的出生、移动和碰撞
- `game/src/world.js` —— 一局的进程：记分、连击、夜晚、升级、胜负
- `game/src/input.js` —— 鼠标和键盘
- `game/src/render.js` —— Canvas 绘制：海、雾、光束、船、HUD、各界面
- `game/src/shots.js` —— 截图摆拍的自动引航员
- `game/src/main.js` —— 启动和主循环
- `main.ts` —— 提交入口（Node 22，只用标准库），写出 dossier.json
- `vendor/makefun-game.ts` —— kit 原样，未改动
