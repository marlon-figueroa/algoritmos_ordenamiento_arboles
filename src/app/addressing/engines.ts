import { ADDRESSING } from '../core/addressing';
import {
  AddressFrame,
  AddressPlanInput,
  NetworkKind,
  ParentNetwork,
  PlannedNetwork,
  alignUp,
  blockSize,
  classNameForPrefix,
  formatIPv4,
  maskFromPrefix,
  parseGateway,
  parseIPv4,
  prefixForDevices,
  usableHosts,
} from './models';

interface NetworkRequest {
  kind: NetworkKind;
  index: number;
  hosts: number;
}

const KIND_ORDER: Record<NetworkKind, number> = { LAN: 0, MAN: 1, WAN: 2 };

function resolveParent(gatewayRaw: string): ParentNetwork {
  const { ip, prefix } = parseGateway(gatewayRaw);
  const mask = maskFromPrefix(prefix);
  const network = (ip & mask) >>> 0;
  const size = blockSize(prefix);
  const broadcast = (network + size - 1) >>> 0;
  return {
    gateway: formatIPv4(ip),
    network: formatIPv4(network),
    broadcast: formatIPv4(broadcast),
    mask: formatIPv4(mask),
    prefix,
    className: classNameForPrefix(prefix, ip),
    addressCount: size,
  };
}

function parentBounds(parent: ParentNetwork): { start: number; end: number } {
  const start = parseIPv4(parent.network);
  return { start, end: start + parent.addressCount - 1 };
}

function buildRequests(input: AddressPlanInput, mode: 'vlsm' | 'flsm'): NetworkRequest[] {
  const items: NetworkRequest[] = [
    ...Array.from({ length: input.lanCount }, (_, index) => ({
      kind: 'LAN' as const,
      index: index + 1,
      hosts: input.lanHosts,
    })),
    ...Array.from({ length: input.manCount }, (_, index) => ({
      kind: 'MAN' as const,
      index: index + 1,
      hosts: input.manHosts,
    })),
    ...Array.from({ length: input.wanCount }, (_, index) => ({
      kind: 'WAN' as const,
      index: index + 1,
      hosts: input.wanHosts,
    })),
  ];
  if (mode === 'vlsm') {
    return items.sort(
      (left, right) =>
        right.hosts - left.hosts || KIND_ORDER[left.kind] - KIND_ORDER[right.kind] || left.index - right.index,
    );
  }
  return items;
}

function buildNetwork(request: NetworkRequest, address: number, prefix: number): PlannedNetwork {
  const size = blockSize(prefix);
  const broadcast = address + size - 1;
  return {
    name: `${request.kind} ${request.index}`,
    kind: request.kind,
    network: formatIPv4(address),
    firstHost: formatIPv4(address + 1),
    lastHost: formatIPv4(broadcast - 1),
    broadcast: formatIPv4(broadcast),
    mask: formatIPv4(maskFromPrefix(prefix)),
    prefix,
    usableHosts: usableHosts(prefix),
    requestedHosts: request.hosts,
  };
}

function assertFits(parent: ParentNetwork, start: number, prefix: number, name: string): void {
  const { start: parentStart, end: parentEnd } = parentBounds(parent);
  const size = blockSize(prefix);
  const end = start + size - 1;
  if (start < parentStart || end > parentEnd) {
    throw new Error(
      `${name} (${size.toLocaleString('es-GT')} direcciones, /${prefix}) no cabe en ${parent.network}/${parent.prefix}. Amplía el bloque del gateway o reduce redes o dispositivos.`,
    );
  }
}

function allocateFlsm(parent: ParentNetwork, requests: NetworkRequest[]): PlannedNetwork[] {
  const subnetBits = Math.ceil(Math.log2(requests.length));
  const prefix = parent.prefix + subnetBits;
  if (prefix > 30) {
    throw new Error(
      `FLSM necesita ${subnetBits} bits de subred sobre /${parent.prefix} y eso deja bloques sin hosts útiles.`,
    );
  }
  const usable = usableHosts(prefix);
  const maxHosts = Math.max(...requests.map((request) => request.hosts));
  if (usable < maxHosts) {
    throw new Error(
      `FLSM con /${prefix} deja ${usable.toLocaleString('es-GT')} hosts por red, pero se piden ${maxHosts.toLocaleString('es-GT')}. Usa un bloque padre más grande o VLSM.`,
    );
  }
  const { start } = parentBounds(parent);
  return requests.map((request, index) => {
    const address = start + index * blockSize(prefix);
    assertFits(parent, address, prefix, `${request.kind} ${request.index}`);
    return buildNetwork(request, address, prefix);
  });
}

function allocateVlsm(parent: ParentNetwork, requests: NetworkRequest[]): PlannedNetwork[] {
  const { start, end: parentEnd } = parentBounds(parent);
  let cursor = start;
  const networks: PlannedNetwork[] = [];
  for (const request of requests) {
    const prefix = prefixForDevices(request.hosts);
    if (prefix < parent.prefix) {
      throw new Error(
        `${request.kind} ${request.index} pide ${request.hosts.toLocaleString('es-GT')} dispositivos y necesita /${prefix}, más grande que el bloque ${parent.network}/${parent.prefix}.`,
      );
    }
    const address = alignUp(cursor, prefix);
    assertFits(parent, address, prefix, `${request.kind} ${request.index}`);
    const network = buildNetwork(request, address, prefix);
    networks.push(network);
    cursor = parseIPv4(network.broadcast) + 1;
    if (cursor > parentEnd + 1 || (cursor === 0 && address !== 0)) {
      throw new Error(`Se agotó el espacio IPv4 al asignar ${network.name}.`);
    }
  }
  return networks;
}

function unusedAddresses(parent: ParentNetwork, networks: PlannedNetwork[]): number {
  const used = networks.reduce((sum, network) => sum + blockSize(network.prefix), 0);
  return Math.max(0, parent.addressCount - used);
}

function parentMessage(parent: ParentNetwork): string {
  return `La IP de gateway ${parent.gateway} pertenece a ${parent.network}/${parent.prefix} (${parent.className}, máscara ${parent.mask}, ${parent.addressCount.toLocaleString('es-GT')} direcciones, broadcast ${parent.broadcast}).`;
}

function requestMessage(input: AddressPlanInput, mode: 'vlsm' | 'flsm', requests: NetworkRequest[]): string {
  const counts = `${input.lanCount} LAN, ${input.manCount} MAN y ${input.wanCount} WAN`;
  if (mode === 'vlsm') {
    const first = requests[0];
    const firstName = first ? `${first.kind} ${first.index}` : '—';
    return `Se requieren ${counts}. VLSM asigna primero las redes más grandes (${firstName}) para no fragmentar el bloque.`;
  }
  const bits = Math.ceil(Math.log2(requests.length));
  return `Se requieren ${counts} (${requests.length} en total). FLSM toma ${bits} bit${bits === 1 ? '' : 's'} de subred y usa la misma máscara en todas las filas.`;
}

function rowMessage(network: PlannedNetwork): string {
  return `${network.name} → IP inicial ${network.network}/${network.prefix}, rango ${network.firstHost}–${network.lastHost}, broadcast ${network.broadcast}, máscara ${network.mask}, ${network.usableHosts.toLocaleString('es-GT')} dispositivos útiles.`;
}

function doneMessage(parent: ParentNetwork, networks: PlannedNetwork[], unused: number): string {
  const waste = networks.reduce((sum, network) => sum + Math.max(0, network.usableHosts - network.requestedHosts), 0);
  return `Tabla lista: ${networks.length} red${networks.length === 1 ? '' : 'es'} sobre ${parent.network}/${parent.prefix}. Quedan ${unused.toLocaleString('es-GT')} direcciones libres y ${waste.toLocaleString('es-GT')} hosts de más dentro de los bloques asignados.`;
}

export function simulateAddressing(slug: string, input: AddressPlanInput): AddressFrame[] {
  const algorithm = ADDRESSING.find((item) => item.slug === slug);
  if (!algorithm) {
    throw new Error(`No hay un método de direccionamiento llamado ${slug}.`);
  }
  const mode = slug === 'flsm' ? 'flsm' : 'vlsm';
  const parent = resolveParent(input.gateway);
  const requests = buildRequests(input, mode);
  const networks = mode === 'flsm' ? allocateFlsm(parent, requests) : allocateVlsm(parent, requests);
  const unused = unusedAddresses(parent, networks);

  const frames: AddressFrame[] = [
    {
      message: parentMessage(parent),
      parent,
      networks: [],
      highlightName: null,
      unused: parent.addressCount,
      done: false,
    },
    {
      message: requestMessage(input, mode, requests),
      parent,
      networks: [],
      highlightName: null,
      unused: parent.addressCount,
      done: false,
    },
  ];

  networks.forEach((network, index) => {
    const assigned = networks.slice(0, index + 1);
    frames.push({
      message: rowMessage(network),
      parent,
      networks: assigned,
      highlightName: network.name,
      unused: unusedAddresses(parent, assigned),
      done: false,
    });
  });

  frames.push({
    message: doneMessage(parent, networks, unused),
    parent,
    networks,
    highlightName: null,
    unused,
    done: true,
  });

  return frames;
}

export function lastNetworks(frames: AddressFrame[]): PlannedNetwork[] {
  return frames.at(-1)?.networks ?? [];
}

export function lastParent(frames: AddressFrame[]): ParentNetwork | null {
  return frames.at(-1)?.parent ?? null;
}
