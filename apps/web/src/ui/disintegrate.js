const SHARD_COLORS = ['var(--cyan)', 'var(--magenta)', 'var(--amber)'];

// Bursts the row into small shards that fly off and fade, instead of just
// hiding it — visually: the process "disintegrates" when killed. Built as
// plain absolutely-positioned elements + a CSS keyframe, not canvas — no
// need to rasterize the real row, and it can't break across environments
// the way capturing DOM-to-image sometimes does.
export function disintegrateRow(row, { shardCount = 24, duration = 800 } = {}) {
  const width = row.offsetWidth;
  const height = row.offsetHeight;

  row.classList.add('disintegrating');
  row.style.position = 'relative';

  for (let i = 0; i < shardCount; i += 1) {
    const shard = document.createElement('span');
    shard.className = 'shard';

    const dx = (Math.random() - 0.5) * 140;
    const dy = -Math.random() * 100 - 10;
    const rotation = Math.round((Math.random() - 0.5) * 360);

    shard.style.left = `${Math.random() * width}px`;
    shard.style.top = `${Math.random() * height}px`;
    shard.style.setProperty('--dx', `${dx}px`);
    shard.style.setProperty('--dy', `${dy}px`);
    shard.style.setProperty('--rot', `${rotation}deg`);
    shard.style.background = SHARD_COLORS[Math.floor(Math.random() * SHARD_COLORS.length)];
    shard.style.animationDelay = `${Math.random() * 150}ms`;

    row.appendChild(shard);
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      row.remove();
      resolve();
    }, duration + 200);
  });
}
