import { ALGORITHMS } from './algorithms';
import { SCHEDULERS } from './schedulers';
import { RAIDS } from './raids';
import { simulate } from '../simulator/engines';
import { buildSortConclusion, buildSortReport } from '../simulator/report';
import { simulateSchedule } from '../scheduler/engines';
import { buildScheduleConclusion } from '../scheduler/report';
import { SAMPLE_PROCESSES } from '../scheduler/models';
import { simulateRaid } from '../raid/engines';
import { buildRaidConclusion } from '../raid/report';
import { SAMPLE_BLOCKS } from '../raid/models';
import { ADDRESSING } from './addressing';
import { simulateAddressing } from '../addressing/engines';
import { buildAddressConclusion } from '../addressing/report';
import { SAMPLE_PLAN } from '../addressing/models';

describe('informes PDF', () => {
  it('Tree Sort concluye que el resultado está ordenado', () => {
    const algorithm = ALGORITHMS.find((item) => item.slug === 'tree-sort')!;
    const input = [7, 3, 9, 1, 5];
    const frames = simulate('tree-sort', input);
    const report = buildSortReport(algorithm, input, frames);
    const text = report.conclusion.join(' ');
    expect(text).toContain('[1, 3, 5, 7, 9]');
    expect(text).toContain('coincide con el orden creciente');
    expect(report.filename).toContain('tree-sort');
  });

  it('detecta una entrada ya ordenada', () => {
    const algorithm = ALGORITHMS.find((item) => item.slug === 'tree-sort')!;
    const lines = buildSortConclusion(algorithm, [1, 2, 3, 4], [1, 2, 3, 4], 8);
    expect(lines.join(' ')).toContain('ya estaba ordenada');
  });

  it('FCFS menciona el efecto convoy cuando el primero es el más largo', () => {
    const algorithm = SCHEDULERS.find((item) => item.slug === 'fcfs')!;
    const input = [
      { id: 'P1', arrival: 0, burst: 8, priority: 2 },
      { id: 'P2', arrival: 1, burst: 2, priority: 1 },
    ];
    const frames = simulateSchedule('fcfs', input);
    const text = buildScheduleConclusion(algorithm, input, frames, 2).join(' ');
    expect(text).toContain('efecto convoy');
    expect(text).toContain('P1');
  });

  it('RAID 0 concluye que no se puede reconstruir', () => {
    const algorithm = RAIDS.find((item) => item.slug === 'raid-0')!;
    const frames = simulateRaid('raid-0', SAMPLE_BLOCKS, 4);
    const text = buildRaidConclusion(algorithm, SAMPLE_BLOCKS, 4, frames).join(' ');
    expect(text).toContain('no pudo reconstruir');
  });

  it('VLSM concluye que aprovecha mejor el bloque del gateway', () => {
    const algorithm = ADDRESSING.find((item) => item.slug === 'vlsm')!;
    const frames = simulateAddressing('vlsm', SAMPLE_PLAN);
    const text = buildAddressConclusion(algorithm, SAMPLE_PLAN, frames).join(' ');
    expect(text).toContain('VLSM');
    expect(text).toContain('172.16.0.0/16');
    expect(text).toContain('aprovecha mejor');
  });

  it('RAID 5 concluye que se reconstruye tras el fallo', () => {
    const algorithm = RAIDS.find((item) => item.slug === 'raid-5')!;
    const frames = simulateRaid('raid-5', SAMPLE_BLOCKS, 4);
    const text = buildRaidConclusion(algorithm, SAMPLE_BLOCKS, 4, frames).join(' ');
    expect(text).toContain('reconstruyó');
  });
});
