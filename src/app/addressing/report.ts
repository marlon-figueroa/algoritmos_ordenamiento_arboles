import { AddressingAlgorithm } from '../core/addressing';
import { SimulationReport, reportFilename } from '../core/pdf-report';
import { lastNetworks, lastParent } from './engines';
import { AddressFrame, AddressPlanInput } from './models';

export function buildAddressConclusion(
  algorithm: AddressingAlgorithm,
  input: AddressPlanInput,
  frames: AddressFrame[],
): string[] {
  const parent = lastParent(frames);
  const networks = lastNetworks(frames);
  if (!parent || !networks.length) {
    return ['No se generó una tabla de direccionamiento.'];
  }
  const unused = frames.at(-1)?.unused ?? 0;
  const waste = networks.reduce((sum, network) => sum + Math.max(0, network.usableHosts - network.requestedHosts), 0);
  const used = parent.addressCount - unused;
  const byKind = (kind: string) => networks.filter((network) => network.kind === kind);
  const maskList = [...new Set(networks.map((network) => `/${network.prefix}`))].join(', ');
  const lines = [
    `${algorithm.name} planificó ${input.lanCount} LAN, ${input.manCount} MAN y ${input.wanCount} WAN a partir del gateway ${input.gateway}, anclado en ${parent.network}/${parent.prefix} (${parent.className}).`,
    `La tabla cubre ${networks.length} redes con máscara${maskList.includes(',') ? 's' : ''} ${maskList}. Se ocuparon ${used.toLocaleString('es-GT')} direcciones del bloque y quedan ${unused.toLocaleString('es-GT')} libres.`,
  ];

  const lan = byKind('LAN')[0];
  const wan = byKind('WAN')[0];
  if (algorithm.slug === 'vlsm') {
    lines.push(
      `VLSM asignó primero el bloque más grande${lan ? ` (${lan.name} en ${lan.network}/${lan.prefix})` : ''}. Las WAN ${wan ? `quedaron en ${wan.network}/${wan.prefix}` : 'se dimensionaron al mínimo'} para no gastar un /24 en un enlace de dos routers.`,
    );
  } else {
    lines.push(
      `FLSM usó una sola máscara, así que ${wan ? wan.name + ' tiene ' + wan.usableHosts.toLocaleString('es-GT') + ' hosts útiles aunque solo pide ' + wan.requestedHosts + '.' : 'todas las filas miden lo mismo.'} Es más simple de operar y más derrochador.`,
    );
  }

  lines.push(
    `Dentro de los bloques asignados sobran ${waste.toLocaleString('es-GT')} hosts respecto de lo pedido. Conclusión: ${algorithm.slug === 'vlsm' ? 'VLSM aprovecha mejor el bloque del gateway cuando LAN, MAN y WAN no piden el mismo tamaño.' : 'FLSM conviene solo si todas las redes tienen una demanda parecida; si no, cambia a VLSM.'}`,
  );
  return lines;
}

export function buildAddressReport(
  algorithm: AddressingAlgorithm,
  input: AddressPlanInput,
  frames: AddressFrame[],
): SimulationReport {
  const parent = lastParent(frames);
  const networks = lastNetworks(frames);
  const last = frames.at(-1);
  return {
    catalog: 'TDR · Tabla de direccionamiento de redes',
    algorithm: algorithm.name,
    filename: reportFilename('TDR', algorithm.slug),
    inputLines: [
      `Gateway: ${input.gateway}`,
      `Redes: ${input.lanCount} LAN (${input.lanHosts} disp.), ${input.manCount} MAN (${input.manHosts} disp.), ${input.wanCount} WAN (${input.wanHosts} disp.)`,
      parent ? `Bloque padre: ${parent.network}/${parent.prefix}  ·  ${parent.className}  ·  máscara ${parent.mask}` : '',
    ].filter((line) => line.length > 0),
    resultLines: [
      `Filas: ${networks.length}  ·  Direcciones libres: ${(last?.unused ?? 0).toLocaleString('es-GT')}`,
      last?.message ? `Último estado: ${last.message}` : '',
    ].filter((line) => line.length > 0),
    resultTable: {
      headers: ['Red', 'IP inicial', 'Primera IP', 'Última IP', 'Broadcast', 'Máscara', 'Dispositivos'],
      rows: networks.map((network) => [
        network.name,
        `${network.network}/${network.prefix}`,
        network.firstHost,
        network.lastHost,
        network.broadcast,
        `${network.mask} /${network.prefix}`,
        String(network.usableHosts),
      ]),
    },
    conclusion: buildAddressConclusion(algorithm, input, frames),
  };
}
