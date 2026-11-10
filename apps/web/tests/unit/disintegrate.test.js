import { disintegrateRow } from '../../src/ui/disintegrate.js';

describe('disintegrateRow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds the requested number of shard elements and the disintegrating class', () => {
    const list = document.createElement('ul');
    const row = document.createElement('li');
    list.appendChild(row);

    disintegrateRow(row, { shardCount: 10, duration: 500 });

    expect(row.classList.contains('disintegrating')).toBe(true);
    expect(row.querySelectorAll('.shard')).toHaveLength(10);
  });

  it('removes the row from the DOM once the effect finishes', async () => {
    const list = document.createElement('ul');
    const row = document.createElement('li');
    list.appendChild(row);

    const done = disintegrateRow(row, { shardCount: 5, duration: 500 });

    expect(list.contains(row)).toBe(true);

    await vi.advanceTimersByTimeAsync(700);
    await done;

    expect(list.contains(row)).toBe(false);
  });
});
