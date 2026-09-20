import { RAIDS } from '../core/raids';

export type CellKind = 'data' | 'parity' | 'mirror' | 'hamming' | 'empty';

export interface RaidCell {
  disk: number;
  row: number;
  label: string;
  kind: CellKind;
  highlight: boolean;
  reconstructed: boolean;
}

export interface RaidDiskView {
  index: number;
  name: string;
  failed: boolean;
  role: string;
}

export interface RaidFrame {
  message: string;
  disks: RaidDiskView[];
  cells: RaidCell[];
  rows: number;
  failedDisk: number | null;
  done: boolean;
}

export const emptyRaidFrame: RaidFrame = {
  message: 'Carga bloques para ver cómo se colocan en los discos.',
  disks: [],
  cells: [],
  rows: 0,
  failedDisk: null,
  done: false,
};

export const SAMPLE_BLOCKS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
export const MAX_BLOCKS = 16;

export const CELL_COLORS: Record<CellKind, string> = {
  data: '#1d4ed8',
  parity: '#4338ca',
  mirror: '#0284c7',
  hamming: '#6366f1',
  empty: 'transparent',
};

export function formatBlocks(blocks: string[]): string {
  return blocks.join(' ');
}

export function parseBlocks(raw: string): string[] {
  const blocks = raw
    .split(/[\s,;]+/)
    .map((token) => token.trim().toUpperCase())
    .filter((token) => token.length > 0);

  if (blocks.length < 2) {
    throw new Error('Necesitas al menos 2 bloques (por ejemplo A B C D).');
  }
  if (blocks.length > MAX_BLOCKS) {
    throw new Error(`Como máximo ${MAX_BLOCKS} bloques para que el arreglo se lea bien.`);
  }
  if (blocks.some((block) => !/^[A-Z0-9]{1,3}$/.test(block))) {
    throw new Error('Usa letras o números cortos: A B C D o 1 2 3 4.');
  }
  return blocks;
}

export function randomBlocks(): string[] {
  const count = 6 + Math.floor(Math.random() * 5);
  return Array.from({ length: count }, (_, index) => String.fromCharCode(65 + (index % 26)));
}

export function clampDisks(slug: string, requested: number): number {
  const raid = RAIDS.find((item) => item.slug === slug);
  if (!raid) {
    return requested;
  }
  let disks = Math.min(raid.maxDisks, Math.max(raid.minDisks, Math.floor(requested) || raid.defaultDisks));
  if (raid.evenDisks && disks % 2 === 1) {
    disks += 1;
    if (disks > raid.maxDisks) {
      disks -= 2;
    }
  }
  return disks;
}

export function kindLabel(kind: CellKind): string {
  switch (kind) {
    case 'parity':
      return 'Paridad';
    case 'mirror':
      return 'Espejo';
    case 'hamming':
      return 'Hamming';
    case 'data':
      return 'Dato';
    default:
      return 'Vacío';
  }
}
