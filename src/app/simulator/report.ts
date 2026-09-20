import { Algorithm } from '../core/algorithms';
import { SimulationReport, reportFilename } from '../core/pdf-report';
import { lastOutput } from './engines';
import { SimFrame, sortedCopy } from './models';

function inversions(values: number[]): number {
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    for (let j = i + 1; j < values.length; j++) {
      if (values[i] > values[j]) {
        count += 1;
      }
    }
  }
  return count;
}

function same(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function buildSortConclusion(algorithm: Algorithm, input: number[], output: number[], steps: number): string[] {
  const expected = sortedCopy(input);
  const correct = same(output, expected);
  const ordered = same(input, expected);
  const reversed = same(input, [...expected].reverse());
  const inv = inversions(input);
  const unique = new Set(input).size;
  const n = input.length;
  const lines = [
    `Con la entrada [${input.join(', ')}], ${algorithm.name} obtuvo [${output.join(', ') || 'sin salida'}] en ${steps} pasos de simulación.`,
    correct
      ? 'El resultado coincide con el orden creciente esperado.'
      : `El resultado no coincide con el orden esperado [${expected.join(', ')}]. Conviene revisar el motor o la entrada.`,
  ];

  if (ordered) {
    lines.push(
      `La entrada ya estaba ordenada. En un BST clásico eso tiende a degenerar (peor caso ${algorithm.complexity.worst}); ${algorithm.name} declara ${algorithm.complexity.average} en el caso promedio.`,
    );
  } else if (reversed) {
    lines.push(
      'La entrada estaba invertida, un patrón que también estira un BST no equilibrado. Aquí el árbol se construyó en el sentido opuesto al orden natural.',
    );
  } else if (inv <= n - 1) {
    lines.push(
      `La entrada estaba casi ordenada (${inv} inversión${inv === 1 ? '' : 'es'}). Algoritmos adaptativos como Smoothsort aprovechan ese orden residual; los BST equilibrados siguen costando ${algorithm.complexity.average}.`,
    );
  } else {
    lines.push(
      `La entrada estaba desordenada (${inv} inversiones de ${((n * (n - 1)) / 2) | 0} posibles). ${algorithm.name} usó un ${algorithm.treeType.toLowerCase()} y recorrió ${steps} estados para llegar al orden.`,
    );
  }

  if (unique < n) {
    lines.push(
      `Hay ${n - unique} duplicado${n - unique === 1 ? '' : 's'}. ${algorithm.name} ${algorithm.stable ? 'es estable y conserva el orden relativo de iguales.' : 'no es estable: el orden relativo de claves iguales no está garantizado.'}`,
    );
  }

  lines.push(
    `${algorithm.inPlace ? 'El algoritmo es in-place (espacio ' + algorithm.complexity.space + ').' : 'Usa memoria auxiliar (espacio ' + algorithm.complexity.space + ').'} Con n=${n}, el costo teórico es ${algorithm.complexity.average}.`,
  );
  return lines;
}

export function buildSortReport(algorithm: Algorithm, input: number[], frames: SimFrame[]): SimulationReport {
  const output = lastOutput(frames);
  const last = frames.at(-1);
  return {
    catalog: 'AOA · Algoritmos de ordenamiento de árboles',
    algorithm: algorithm.name,
    filename: reportFilename('AOA', algorithm.slug),
    inputLines: [
      `Arreglo: [${input.join(', ')}]`,
      `Elementos: ${input.length}  ·  Tipo de árbol: ${algorithm.treeType}`,
    ],
    resultLines: [
      `Salida: [${output.join(', ') || '—'}]`,
      `Pasos simulados: ${frames.length}`,
      last?.message ? `Último estado: ${last.message}` : '',
    ].filter((line) => line.length > 0),
    conclusion: buildSortConclusion(algorithm, input, output, frames.length),
  };
}
