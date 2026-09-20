import { RAIDS } from '../core/raids';
import { lastCells, simulateRaid } from './engines';
import { SAMPLE_BLOCKS } from './models';

describe('RAIDs', () => {
  it.each(RAIDS.map((item) => item.slug))('%s coloca todos los bloques y termina', (slug) => {
    const raid = RAIDS.find((item) => item.slug === slug)!;
    const frames = simulateRaid(slug, SAMPLE_BLOCKS, raid.defaultDisks);
    expect(frames.length).toBeGreaterThan(2);
    expect(frames.at(-1)?.done).toBe(true);
    const labels = lastCells(frames).map((cell) => cell.label);
    for (const block of SAMPLE_BLOCKS) {
      expect(labels.some((label) => label.includes(block))).toBe(true);
    }
  });

  it('RAID 0 reparte en round-robin', () => {
    const cells = lastCells(simulateRaid('raid-0', ['A', 'B', 'C', 'D'], 4));
    expect(cells.find((cell) => cell.label === 'A')?.disk).toBe(0);
    expect(cells.find((cell) => cell.label === 'B')?.disk).toBe(1);
    expect(cells.find((cell) => cell.label === 'D')?.disk).toBe(3);
  });

  it('RAID 1 replica cada bloque en todos los discos', () => {
    const cells = lastCells(simulateRaid('raid-1', ['A', 'B'], 2));
    expect(cells.filter((cell) => cell.label === 'A')).toHaveLength(2);
    expect(cells.filter((cell) => cell.label === 'B')).toHaveLength(2);
  });

  it('RAID 5 deja una paridad por franja', () => {
    const cells = lastCells(simulateRaid('raid-5', ['A', 'B', 'C', 'D', 'E', 'F'], 4));
    const row0 = cells.filter((cell) => cell.row === 0);
    expect(row0.filter((cell) => cell.kind === 'parity')).toHaveLength(1);
    expect(row0.filter((cell) => cell.kind === 'data')).toHaveLength(3);
  });

  it('RAID 6 deja dos paridades por franja', () => {
    const cells = lastCells(simulateRaid('raid-6', ['A', 'B', 'C'], 5));
    const row0 = cells.filter((cell) => cell.row === 0);
    expect(row0.filter((cell) => cell.kind === 'parity')).toHaveLength(2);
    expect(row0.filter((cell) => cell.kind === 'data')).toHaveLength(3);
  });
});
