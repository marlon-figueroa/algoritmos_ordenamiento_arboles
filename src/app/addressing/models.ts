export type NetworkKind = 'LAN' | 'MAN' | 'WAN';

export interface AddressPlanInput {
  gateway: string;
  lanCount: number;
  manCount: number;
  wanCount: number;
  lanHosts: number;
  manHosts: number;
  wanHosts: number;
}

export interface ParentNetwork {
  gateway: string;
  network: string;
  broadcast: string;
  mask: string;
  prefix: number;
  className: string;
  addressCount: number;
}

export interface PlannedNetwork {
  name: string;
  kind: NetworkKind;
  network: string;
  firstHost: string;
  lastHost: string;
  broadcast: string;
  mask: string;
  prefix: number;
  usableHosts: number;
  requestedHosts: number;
}

export interface AddressFrame {
  message: string;
  parent: ParentNetwork | null;
  networks: PlannedNetwork[];
  highlightName: string | null;
  unused: number;
  done: boolean;
}

export const KIND_COLORS: Record<NetworkKind, string> = {
  LAN: '#1d4ed8',
  MAN: '#0284c7',
  WAN: '#4338ca',
};

export const SAMPLE_PLAN: AddressPlanInput = {
  gateway: '172.16.0.1/16',
  lanCount: 3,
  manCount: 2,
  wanCount: 2,
  lanHosts: 254,
  manHosts: 30,
  wanHosts: 2,
};

export const emptyAddressFrame: AddressFrame = {
  message: 'Indica la IP de gateway y cuántas redes LAN, MAN y WAN necesitas.',
  parent: null,
  networks: [],
  highlightName: null,
  unused: 0,
  done: false,
};

const MAX_NETWORKS = 32;
const MAX_HOSTS = 1_048_574;

export function formatIPv4(value: number): string {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ].join('.');
}

export function parseIPv4(raw: string): number {
  const parts = raw.trim().split('.');
  if (parts.length !== 4 || parts.some((part) => part === '')) {
    throw new Error('La IPv4 debe tener cuatro octetos, por ejemplo 172.16.0.1.');
  }
  const octets = parts.map((part) => {
    if (!/^\d{1,3}$/.test(part)) {
      throw new Error(`El octeto "${part}" no es válido.`);
    }
    const value = Number(part);
    if (value > 255) {
      throw new Error(`El octeto ${part} supera 255.`);
    }
    return value;
  });
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0;
}

export function classfulPrefix(ip: number): number {
  const first = ip >>> 24;
  if (first === 0 || first === 127 || first >= 224) {
    throw new Error('Usa una IPv4 de clase A, B o C (no loopback, no multicast).');
  }
  if (first < 128) {
    return 8;
  }
  if (first < 192) {
    return 16;
  }
  return 24;
}

export function classNameForPrefix(prefix: number, ip: number): string {
  const first = ip >>> 24;
  if (prefix === 8 && first < 128) {
    return 'Clase A';
  }
  if (prefix === 16 && first >= 128 && first < 192) {
    return 'Clase B';
  }
  if (prefix === 24 && first >= 192 && first < 224) {
    return 'Clase C';
  }
  return `CIDR /${prefix}`;
}

export function maskFromPrefix(prefix: number): number {
  if (prefix <= 0) {
    return 0;
  }
  if (prefix >= 32) {
    return 0xffffffff;
  }
  return (0xffffffff << (32 - prefix)) >>> 0;
}

export function blockSize(prefix: number): number {
  if (prefix <= 0) {
    return 2 ** 32;
  }
  if (prefix >= 32) {
    return 1;
  }
  return 2 ** (32 - prefix);
}

export function prefixForDevices(devices: number): number {
  if (devices < 1) {
    throw new Error('Cada red necesita al menos 1 dispositivo.');
  }
  const hostBits = Math.ceil(Math.log2(devices + 2));
  if (hostBits > 30) {
    throw new Error('Demasiados dispositivos para una sola subred IPv4.');
  }
  return 32 - Math.max(2, hostBits);
}

export function usableHosts(prefix: number): number {
  const size = blockSize(prefix);
  return Math.max(0, size - 2);
}

export function alignUp(address: number, prefix: number): number {
  const size = blockSize(prefix);
  const rem = address % size;
  return rem === 0 ? address : address + (size - rem);
}

export function parseGateway(raw: string): { ip: number; prefix: number } {
  const trimmed = raw.trim().replace(/\s+/g, '');
  if (!trimmed) {
    throw new Error('Escribe la IP de gateway, por ejemplo 172.16.0.1/16.');
  }
  const [ipPart, prefixPart] = trimmed.split('/');
  const ip = parseIPv4(ipPart);
  if (prefixPart === undefined || prefixPart === '') {
    return { ip, prefix: classfulPrefix(ip) };
  }
  if (!/^\d{1,2}$/.test(prefixPart)) {
    throw new Error('El prefijo CIDR debe ser un número, por ejemplo /16.');
  }
  const prefix = Number(prefixPart);
  if (prefix < 8 || prefix > 30) {
    throw new Error('El prefijo del bloque padre debe estar entre /8 y /30.');
  }
  return { ip, prefix };
}

export function parseCount(raw: string, label: string): number {
  const value = Number(String(raw).trim());
  if (!Number.isInteger(value) || value < 0 || value > MAX_NETWORKS) {
    throw new Error(`La cantidad de redes ${label} debe ser un entero entre 0 y ${MAX_NETWORKS}.`);
  }
  return value;
}

export function parseHosts(raw: string, label: string): number {
  const value = Number(String(raw).trim());
  if (!Number.isInteger(value) || value < 1 || value > MAX_HOSTS) {
    throw new Error(`Los dispositivos de ${label} deben ser un entero entre 1 y ${MAX_HOSTS.toLocaleString('es-GT')}.`);
  }
  return value;
}

export function parsePlanInput(
  gateway: string,
  lanCount: string,
  manCount: string,
  wanCount: string,
  lanHosts: string,
  manHosts: string,
  wanHosts: string,
): AddressPlanInput {
  const plan: AddressPlanInput = {
    gateway: gateway.trim(),
    lanCount: parseCount(lanCount, 'LAN'),
    manCount: parseCount(manCount, 'MAN'),
    wanCount: parseCount(wanCount, 'WAN'),
    lanHosts: parseHosts(lanHosts, 'LAN'),
    manHosts: parseHosts(manHosts, 'MAN'),
    wanHosts: parseHosts(wanHosts, 'WAN'),
  };
  if (plan.lanCount + plan.manCount + plan.wanCount < 1) {
    throw new Error('Pide al menos una red LAN, MAN o WAN.');
  }
  parseGateway(plan.gateway);
  return plan;
}

export function formatPlan(plan: AddressPlanInput): AddressPlanInput {
  return { ...plan, gateway: plan.gateway.trim() };
}

export function randomPlan(): AddressPlanInput {
  const gateways = ['10.0.0.1/8', '172.16.0.1/16', '192.168.0.1/21', '192.168.10.1/22'];
  const lanCount = 1 + Math.floor(Math.random() * 4);
  const manCount = Math.floor(Math.random() * 3);
  const wanCount = 1 + Math.floor(Math.random() * 3);
  return {
    gateway: gateways[Math.floor(Math.random() * gateways.length)],
    lanCount,
    manCount,
    wanCount,
    lanHosts: [50, 100, 126, 200, 254][Math.floor(Math.random() * 5)],
    manHosts: [14, 30, 62][Math.floor(Math.random() * 3)],
    wanHosts: 2,
  };
}

export function kindLabel(kind: NetworkKind): string {
  switch (kind) {
    case 'LAN':
      return 'Red de área local';
    case 'MAN':
      return 'Red de área metropolitana';
    default:
      return 'Red de área amplia';
  }
}
