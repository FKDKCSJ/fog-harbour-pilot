// 全部音效都是 WebAudio 现场合成的，没有任何音频文件：雾笛、触礁的闷响、
// 升级的风铃、按钮的轻响，和一层很轻的海浪底噪。浏览器要等用户先点一下
// 才肯出声，所以第一次手势进来时才真正建 AudioContext；建失败也不影响游戏。
export function createAudio() {
  let context = null;
  let master = null;
  let waveGain = null;
  let muted = false;

  function ensure() {
    if (context) {
      if (context.state === 'suspended') context.resume().catch(() => {});
      return true;
    }
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(context.destination);
      startWaves();
      return true;
    } catch {
      return false;
    }
  }

  /** 海浪：一团循环的低频噪声，音量随夜晚加深。 */
  function startWaves() {
    const length = context.sampleRate * 2;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    waveGain = context.createGain();
    waveGain.gain.value = 0.05;
    source.connect(filter).connect(waveGain).connect(master);
    source.start();
  }

  function tone({ type, from, to, seconds, at = 0, volume = 0.2 }) {
    if (!context || !master) return;
    const t0 = context.currentTime + at;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(to, 1), t0 + seconds);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + seconds);
    osc.connect(gain).connect(master);
    osc.start(t0);
    osc.stop(t0 + seconds + 0.05);
  }

  function noiseBurst({ seconds, volume, at = 0 }) {
    if (!context || !master) return;
    const t0 = context.currentTime + at;
    const length = Math.ceil(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = context.createBufferSource();
    source.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = context.createGain();
    gain.gain.value = volume;
    source.connect(filter).connect(gain).connect(master);
    source.start(t0);
  }

  return {
    /** 第一次手势（点击或按键）时调用，建好音频上下文。 */
    unlock() {
      ensure();
    },
    /** 船进港：低沉的双音雾笛。 */
    horn() {
      if (!ensure()) return;
      tone({ type: 'sine', from: 196, to: 196, seconds: 0.9, volume: 0.22 });
      tone({ type: 'sine', from: 147, to: 147, seconds: 0.9, volume: 0.16 });
    },
    /** 船失事：闷响加一个下坠的低音。 */
    wreck() {
      if (!ensure()) return;
      noiseBurst({ seconds: 0.5, volume: 0.5 });
      tone({ type: 'sine', from: 160, to: 55, seconds: 0.7, volume: 0.3 });
    },
    /** 夜晚升级：三个上行的清脆音。 */
    chime() {
      if (!ensure()) return;
      tone({ type: 'triangle', from: 523, to: 523, seconds: 0.35, volume: 0.16 });
      tone({ type: 'triangle', from: 659, to: 659, seconds: 0.35, at: 0.09, volume: 0.16 });
      tone({ type: 'triangle', from: 784, to: 784, seconds: 0.5, at: 0.18, volume: 0.18 });
    },
    /** 按钮和开始：短促的轻响。 */
    click() {
      if (!ensure()) return;
      tone({ type: 'triangle', from: 880, to: 880, seconds: 0.08, volume: 0.12 });
    },
    /** 夜越深浪声越大。 */
    setNight(night) {
      if (!context || !waveGain) return;
      waveGain.gain.linearRampToValueAtTime(
        0.04 + night * 0.015,
        context.currentTime + 1,
      );
    },
    toggleMute() {
      muted = !muted;
      if (master && context) master.gain.linearRampToValueAtTime(muted ? 0 : 0.5, context.currentTime + 0.1);
      return muted;
    },
  };
}
