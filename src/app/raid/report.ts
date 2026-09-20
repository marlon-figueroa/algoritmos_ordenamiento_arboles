import { RaidAlgorithm } from '../core/raids';
import { SimulationReport, reportFilename } from '../core/pdf-report';
import { lastCells } from './engines';
import { RaidFrame } from './models';

export function buildRaidConclusion(
  algorithm: RaidAlgorithm,
  blocks: string[],
  disks: number,
  frames: RaidFrame[],
): string[] {
  const cells = lastCells(frames);
  const dataCells = cells.filter((cell) => cell.kind === 'data' || cell.kind === 'mirror');
  const parityCells = cells.filter((cell) => cell.kind === 'parity' || cell.kind === 'hamming');
  const failFrame = [...frames].reverse().find((frame) => frame.failedDisk !== null);
  const rebuilt = frames.some((frame) => frame.cells.some((cell) => cell.reconstructed));
  const lost = algorithm.slug === 'raid-0';
  const rows = cells.reduce((max, cell) => Math.max(max, cell.row + 1), 0);
  const lines = [
    `${algorithm.name} colocó ${blocks.length} bloques (${blocks.join(' ')}) en ${disks} discos, ocupando ${rows} franja${rows === 1 ? '' : 's'}.`,
    `Quedaron ${dataCells.length} celdas de dato/espejo y ${parityCells.length} de paridad o Hamming. Capacidad usable declarada: ${algorithm.traits.usable}. Tolerancia: ${algorithm.traits.faultTolerance}.`,
  ];

  if (failFrame?.failedDisk !== null && failFrame) {
    const failed = `D${failFrame.failedDisk}`;
    if (lost) {
      lines.push(
        `Al fallar ${failed}, RAID 0 no pudo reconstruir: cada bloque vive en un solo disco. Con esta entrada se pierden los bloques que estaban en ${failed}. Conviene un esquema con espejo o paridad si hay que conservar los datos.`,
      );
    } else if (rebuilt) {
      lines.push(
        `Se simuló el fallo de ${failed} y el arreglo reconstruyó sus celdas (${algorithm.traits.kind.toLowerCase()}). Con la entrada dada, un disco caído no impide recuperar el volumen.`,
      );
    } else {
      lines.push(`Se marcó el fallo de ${failed}. ${algorithm.name} declara tolerancia de ${algorithm.traits.faultTolerance}.`);
    }
  }

  if (algorithm.slug === 'raid-5' || algorithm.slug === 'raid-6') {
    lines.push(
      `La paridad rota evita saturar un solo disco. Un segundo fallo ${algorithm.slug === 'raid-6' ? 'aún se tolera (P y Q); un tercero no.' : 'en la misma franja haría irrecuperables esos bloques.'}`,
    );
  } else if (algorithm.slug === 'raid-10') {
    lines.push(
      'RAID 10 sobrevive si no caen los dos discos de la misma pareja. Es más costoso en capacidad (50%) pero la reconstrucción es una copia, no un XOR de toda la franja.',
    );
  } else if (algorithm.slug === 'raid-01') {
    lines.push(
      'En RAID 01, un fallo degrada toda una mitad. Un segundo fallo en la otra mitad puede destruir datos aunque queden discos sanos; por eso suele preferirse RAID 10.',
    );
  }

  lines.push(
    `Conclusión para esta ejecución: ${lost ? 'el rendimiento de striping no compensa la pérdida total ante un fallo.' : 'la entrada quedó colocada según ' + algorithm.name + ' y el esquema cumplió su redundancia (' + algorithm.traits.kind.toLowerCase() + ').'}`,
  );
  return lines;
}

export function buildRaidReport(
  algorithm: RaidAlgorithm,
  blocks: string[],
  disks: number,
  frames: RaidFrame[],
): SimulationReport {
  const cells = lastCells(frames);
  const last = frames.at(-1);
  const rows = last?.rows ?? 0;
  const tableRows: string[][] = [];
  for (let row = 0; row < rows; row++) {
    tableRows.push(
      Array.from({ length: disks }, (_, disk) => {
        const cell = cells.find((item) => item.disk === disk && item.row === row);
        return cell ? cell.label : '—';
      }),
    );
  }
  return {
    catalog: 'ARD · RAIDs existentes para discos',
    algorithm: algorithm.name,
    filename: reportFilename('ARD', algorithm.slug),
    inputLines: [`Bloques: ${blocks.join(' ')}`, `Discos: ${disks}  ·  Familia: ${algorithm.family}`],
    resultLines: [
      `Franjas: ${rows}  ·  Celdas: ${cells.length}`,
      last?.message ? `Último estado: ${last.message}` : '',
    ].filter((line) => line.length > 0),
    resultTable: {
      headers: Array.from({ length: disks }, (_, index) => `D${index}`),
      rows: tableRows,
    },
    conclusion: buildRaidConclusion(algorithm, blocks, disks, frames),
  };
}
