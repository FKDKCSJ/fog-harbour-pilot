// 一个小小的带种子的随机数发生器（mulberry32）：同一个种子就是同一场雾，
// 截图的场景才可以反复重现。种子是 32 位整数，返回 [0, 1) 之间的数。
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
