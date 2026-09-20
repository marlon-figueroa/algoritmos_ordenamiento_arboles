import { RAIDS } from '../core/raids';
import { CellKind, RaidCell, RaidDiskView, RaidFrame } from './models';

interface LiveCell {
  disk: number;
  row: number;
  label: string;
  kind: CellKind;
}

const MAX_STEPS = 200;

function diskName(index: number): string {
  return `D${index}`;
}

function xorParity(labels: string[]): string {
  return `P(${labels.join('⊕')})`;
}

function rsParity(labels: string[]): string {
  return `Q(${labels.join(',')})`;
}

function cloneCells(cells: LiveCell[]): RaidCell[] {
  return cells.map((cell) => ({
    ...cell,
    highlight: false,
    reconstructed: false,
  }));
}

function rowsOf(cells: LiveCell[]): number {
  return cells.reduce((max, cell) => Math.max(max, cell.row + 1), 0);
}

function rolesFor(slug: string, n: number): string[] {
  if (slug === 'raid-1') {
    return Array.from({ length: n }, () => 'Espejo');
  }
  if (slug === 'raid-2') {
    return ['H1', 'H2', 'Dato', 'H4', 'Dato', 'Dato', 'Dato'];
  }
  if (slug === 'raid-3' || slug === 'raid-4') {
    return Array.from({ length: n }, (_, index) => (index === n - 1 ? 'Paridad' : 'Dato'));
  }
  if (slug === 'raid-10') {
    return Array.from({ length: n }, (_, index) => (index % 2 === 0 ? 'Stripe' : 'Espejo'));
  }
  if (slug === 'raid-01') {
    const half = n / 2;
    return Array.from({ length: n }, (_, index) => (index < half ? 'Stripe A' : 'Stripe B'));
  }
  return Array.from({ length: n }, () => 'Mixto');
}

function disksView(n: number, slug: string, failed: number | null): RaidDiskView[] {
  return rolesFor(slug, n).map((role, index) => ({
    index,
    name: diskName(index),
    failed: failed === index,
    role,
  }));
}

function snapshot(
  frames: RaidFrame[],
  cells: LiveCell[],
  n: number,
  slug: string,
  message: string,
  highlight: LiveCell[] = [],
  failed: number | null = null,
  reconstructed: LiveCell[] = [],
  done = false,
): void {
  const view = cloneCells(cells);
  const marks = new Set(highlight.map((cell) => `${cell.disk}:${cell.row}:${cell.label}`));
  const rebuilt = new Set(reconstructed.map((cell) => `${cell.disk}:${cell.row}`));
  for (const cell of view) {
    const key = `${cell.disk}:${cell.row}:${cell.label}`;
    cell.highlight = marks.has(key);
    cell.reconstructed = rebuilt.has(`${cell.disk}:${cell.row}`);
  }
  frames.push({
    message,
    disks: disksView(n, slug, failed),
    cells: view,
    rows: rowsOf(cells),
    failedDisk: failed,
    done,
  });
}

export function simulateRaid(slug: string, blocks: string[], diskCount: number): RaidFrame[] {
  const raid = RAIDS.find((item) => item.slug === slug);
  if (!raid) {
    throw new Error(`No hay simulador para ${slug}.`);
  }
  switch (slug) {
    case 'raid-0':
      return runRaid0(blocks, diskCount);
    case 'raid-1':
      return runRaid1(blocks, diskCount);
    case 'raid-2':
      return runRaid2(blocks);
    case 'raid-3':
      return runDedicatedParity(blocks, diskCount, 'raid-3', 'byte');
    case 'raid-4':
      return runDedicatedParity(blocks, diskCount, 'raid-4', 'bloque');
    case 'raid-5':
      return runRaid5(blocks, diskCount);
    case 'raid-6':
      return runRaid6(blocks, diskCount);
    case 'raid-10':
      return runRaid10(blocks, diskCount);
    case 'raid-01':
      return runRaid01(blocks, diskCount);
    default:
      return runRaid0(blocks, diskCount);
  }
}

function runRaid0(blocks: string[], n: number): RaidFrame[] {
  const cells: LiveCell[] = [];
  const frames: RaidFrame[] = [];
  snapshot(frames, cells, n, 'raid-0', `RAID 0 con ${n} discos. Sin redundancia.`);
  for (let i = 0; i < blocks.length && frames.length < MAX_STEPS; i++) {
    const cell: LiveCell = { disk: i % n, row: Math.floor(i / n), label: blocks[i], kind: 'data' };
    cells.push(cell);
    snapshot(frames, cells, n, 'raid-0', `Escribe ${blocks[i]} en ${diskName(cell.disk)} (striping).`, [cell]);
  }
  addFailure(frames, cells, n, 'raid-0', 1, false);
  return frames;
}

function runRaid1(blocks: string[], n: number): RaidFrame[] {
  const cells: LiveCell[] = [];
  const frames: RaidFrame[] = [];
  snapshot(frames, cells, n, 'raid-1', `RAID 1 con ${n} discos espejo.`);
  for (let i = 0; i < blocks.length && frames.length < MAX_STEPS; i++) {
    const placed: LiveCell[] = [];
    for (let disk = 0; disk < n; disk++) {
      const cell: LiveCell = {
        disk,
        row: i,
        label: blocks[i],
        kind: disk === 0 ? 'data' : 'mirror',
      };
      cells.push(cell);
      placed.push(cell);
    }
    snapshot(frames, cells, n, 'raid-1', `Replica ${blocks[i]} en todos los discos.`, placed);
  }
  addFailure(frames, cells, n, 'raid-1', 0, true);
  return frames;
}

function runRaid2(blocks: string[]): RaidFrame[] {
  const n = 7;
  const cells: LiveCell[] = [];
  const frames: RaidFrame[] = [];
  const kinds: CellKind[] = ['hamming', 'hamming', 'data', 'hamming', 'data', 'data', 'data'];
  snapshot(frames, cells, n, 'raid-2', 'RAID 2: Hamming (7,4). Paridad en D0, D1 y D3.');
  for (let row = 0; row < blocks.length && frames.length < MAX_STEPS; row++) {
    const block = blocks[row];
    const labels = ['H1', 'H2', `${block}₀`, 'H4', `${block}₁`, `${block}₂`, `${block}₃`];
    const placed: LiveCell[] = labels.map((label, disk) => ({
      disk,
      row,
      label,
      kind: kinds[disk],
    }));
    cells.push(...placed);
    snapshot(frames, cells, n, 'raid-2', `Coloca ${block} con bits de Hamming en la fila ${row}.`, placed);
  }
  addFailure(frames, cells, n, 'raid-2', 4, true);
  return frames;
}

function runDedicatedParity(blocks: string[], n: number, slug: 'raid-3' | 'raid-4', unit: string): RaidFrame[] {
  const cells: LiveCell[] = [];
  const frames: RaidFrame[] = [];
  const width = n - 1;
  snapshot(frames, cells, n, slug, `${slug === 'raid-3' ? 'RAID 3' : 'RAID 4'}: paridad dedicada en ${diskName(n - 1)} (${unit}).`);
  let row = 0;
  for (let i = 0; i < blocks.length && frames.length < MAX_STEPS; i += width) {
    const stripe = blocks.slice(i, i + width);
    const placed: LiveCell[] = [];
    stripe.forEach((label, disk) => {
      const cell: LiveCell = { disk, row, label, kind: 'data' };
      cells.push(cell);
      placed.push(cell);
    });
    const parity: LiveCell = { disk: n - 1, row, label: xorParity(stripe), kind: 'parity' };
    cells.push(parity);
    placed.push(parity);
    snapshot(frames, cells, n, slug, `Franja ${row}: ${stripe.join(' ')} y paridad en ${diskName(n - 1)}.`, placed);
    row += 1;
  }
  addFailure(frames, cells, n, slug, 1, true);
  return frames;
}

function runRaid5(blocks: string[], n: number): RaidFrame[] {
  const cells: LiveCell[] = [];
  const frames: RaidFrame[] = [];
  const width = n - 1;
  snapshot(frames, cells, n, 'raid-5', `RAID 5 con ${n} discos. La paridad rota en cada franja.`);
  let row = 0;
  for (let i = 0; i < blocks.length && frames.length < MAX_STEPS; i += width) {
    const stripe = blocks.slice(i, i + width);
    const pDisk = (n - 1 - (row % n) + n) % n;
    const placed: LiveCell[] = [];
    let dataIndex = 0;
    for (let disk = 0; disk < n; disk++) {
      if (disk === pDisk) {
        continue;
      }
      if (dataIndex < stripe.length) {
        const cell: LiveCell = { disk, row, label: stripe[dataIndex], kind: 'data' };
        cells.push(cell);
        placed.push(cell);
        dataIndex += 1;
      }
    }
    const parity: LiveCell = { disk: pDisk, row, label: xorParity(stripe), kind: 'parity' };
    cells.push(parity);
    placed.push(parity);
    snapshot(frames, cells, n, 'raid-5', `Franja ${row}: P en ${diskName(pDisk)}.`, placed);
    row += 1;
  }
  addFailure(frames, cells, n, 'raid-5', 1, true);
  return frames;
}

function runRaid6(blocks: string[], n: number): RaidFrame[] {
  const cells: LiveCell[] = [];
  const frames: RaidFrame[] = [];
  const width = n - 2;
  snapshot(frames, cells, n, 'raid-6', `RAID 6 con ${n} discos. P y Q rotan; aguanta 2 fallos.`);
  let row = 0;
  for (let i = 0; i < blocks.length && frames.length < MAX_STEPS; i += width) {
    const stripe = blocks.slice(i, i + width);
    const pDisk = (n - 1 - (row % n) + n) % n;
    const qDisk = (pDisk - 1 + n) % n;
    const placed: LiveCell[] = [];
    let dataIndex = 0;
    for (let disk = 0; disk < n; disk++) {
      if (disk === pDisk || disk === qDisk) {
        continue;
      }
      if (dataIndex < stripe.length) {
        const cell: LiveCell = { disk, row, label: stripe[dataIndex], kind: 'data' };
        cells.push(cell);
        placed.push(cell);
        dataIndex += 1;
      }
    }
    const p: LiveCell = { disk: pDisk, row, label: xorParity(stripe), kind: 'parity' };
    const q: LiveCell = { disk: qDisk, row, label: rsParity(stripe), kind: 'parity' };
    cells.push(p, q);
    placed.push(p, q);
    snapshot(frames, cells, n, 'raid-6', `Franja ${row}: P en ${diskName(pDisk)}, Q en ${diskName(qDisk)}.`, placed);
    row += 1;
  }
  addFailure(frames, cells, n, 'raid-6', 1, true);
  return frames;
}

function runRaid10(blocks: string[], n: number): RaidFrame[] {
  const cells: LiveCell[] = [];
  const frames: RaidFrame[] = [];
  const pairs = n / 2;
  snapshot(frames, cells, n, 'raid-10', `RAID 10: ${pairs} espejos unidos por striping.`);
  for (let i = 0; i < blocks.length && frames.length < MAX_STEPS; i++) {
    const pair = i % pairs;
    const row = Math.floor(i / pairs);
    const data: LiveCell = { disk: pair * 2, row, label: blocks[i], kind: 'data' };
    const mirror: LiveCell = { disk: pair * 2 + 1, row, label: blocks[i], kind: 'mirror' };
    cells.push(data, mirror);
    snapshot(frames, cells, n, 'raid-10', `${blocks[i]} en la pareja ${diskName(data.disk)}/${diskName(mirror.disk)}.`, [data, mirror]);
  }
  addFailure(frames, cells, n, 'raid-10', 0, true);
  return frames;
}

function runRaid01(blocks: string[], n: number): RaidFrame[] {
  const cells: LiveCell[] = [];
  const frames: RaidFrame[] = [];
  const half = n / 2;
  snapshot(frames, cells, n, 'raid-01', `RAID 01: dos RAID 0 de ${half} discos espejados.`);
  for (let i = 0; i < blocks.length && frames.length < MAX_STEPS; i++) {
    const disk = i % half;
    const row = Math.floor(i / half);
    const data: LiveCell = { disk, row, label: blocks[i], kind: 'data' };
    const mirror: LiveCell = { disk: disk + half, row, label: blocks[i], kind: 'mirror' };
    cells.push(data, mirror);
    snapshot(frames, cells, n, 'raid-01', `${blocks[i]} en ${diskName(disk)} y su espejo ${diskName(mirror.disk)}.`, [data, mirror]);
  }
  addFailure(frames, cells, n, 'raid-01', 0, true);
  return frames;
}

function addFailure(
  frames: RaidFrame[],
  cells: LiveCell[],
  n: number,
  slug: string,
  failed: number,
  recoverable: boolean,
): void {
  const lost = cells.filter((cell) => cell.disk === failed);
  snapshot(
    frames,
    cells,
    n,
    slug,
    `Falla ${diskName(failed)}. ${lost.length ? 'Se pierden sus celdas.' : 'Ese disco estaba vacío.'}`,
    lost,
    failed,
  );
  if (recoverable) {
    const rebuilt = lost.map((cell) => ({ ...cell }));
    snapshot(
      frames,
      cells,
      n,
      slug,
      `Se reconstruye ${diskName(failed)} con ${slug === 'raid-1' || slug === 'raid-10' || slug === 'raid-01' ? 'el espejo' : slug === 'raid-2' ? 'Hamming' : 'paridad'}.`,
      rebuilt,
      failed,
      rebuilt,
    );
  } else {
    snapshot(
      frames,
      cells,
      n,
      slug,
      'RAID 0 no puede reconstruir: el volumen queda irrecuperable.',
      lost,
      failed,
    );
  }
  snapshot(frames, cells, n, slug, 'Simulación completa.', [], recoverable ? null : failed, [], true);
}

export function lastCells(frames: RaidFrame[]): RaidCell[] {
  return frames.at(-1)?.cells ?? [];
}
