export interface AddressingTraits {
  maskKind: string;
  allocation: string;
  waste: string;
  order: string;
}

export interface AddressingAlgorithm {
  slug: string;
  name: string;
  family: string;
  summary: string;
  description: string;
  howItWorks: string[];
  traits: AddressingTraits;
  pseudocode: string;
  example: string;
}

export const ADDRESSING: AddressingAlgorithm[] = [
  {
    slug: 'vlsm',
    name: 'VLSM',
    family: 'Máscara variable',
    summary: 'Parte el bloque del gateway en subredes del tamaño justo para LAN, MAN y WAN.',
    description:
      'Variable Length Subnet Mask (VLSM) planifica la tabla de direccionamiento asignando primero las redes que más hosts piden. Cada LAN, MAN o WAN recibe su propia máscara: las LAN quedan grandes, las MAN medianas y las WAN suelen ser /30. Así se aprovecha el bloque que ancla la IP de gateway y se reduce el desperdicio frente a FLSM.',
    howItWorks: [
      'Se toma la IP de gateway y, si no trae prefijo, se infiere la máscara de clase (A /8, B /16, C /24).',
      'Se cuenta cuántas redes LAN, MAN y WAN hacen falta y cuántos dispositivos pide cada tipo.',
      'Se calcula el prefijo mínimo de cada tipo: 2^(32−prefijo) − 2 ≥ dispositivos.',
      'Se ordenan las peticiones de mayor a menor y se alinea cada bloque a su frontera natural.',
      'Para cada red se anotan IP inicial, primer y último host, broadcast, máscara y dispositivos útiles.',
    ],
    traits: {
      maskKind: 'Variable',
      allocation: 'Mayor a menor',
      waste: 'Bajo',
      order: 'Por tamaño',
    },
    pseudocode: `function vlsm(gateway, lans, mans, wans):
  parent ← red(gateway)
  reqs  ← redes pedidas, de mayor a menor
  cursor ← parent.network
  for req in reqs:
    prefix ← prefijoPara(req.hosts)
    net    ← alinear(cursor, prefix)
    anotar(net, first, last, broadcast, mask)
    cursor ← broadcast + 1`,
    example:
      'Gateway 172.16.0.1/16, 2 LAN (254), 1 WAN (2).\nLAN 1: 172.16.0.0/24 · 1–254 · bc 255\nLAN 2: 172.16.1.0/24\nWAN 1: 172.16.2.0/30 · 1–2 · bc 3',
  },
  {
    slug: 'flsm',
    name: 'FLSM',
    family: 'Máscara fija',
    summary: 'Divide el bloque del gateway en subredes iguales, una por cada LAN, MAN o WAN pedida.',
    description:
      'Fixed Length Subnet Mask (FLSM) usa una sola máscara para todas las redes. El número total de LAN + MAN + WAN determina cuántos bits de subred se toman del bloque del gateway. Todas las filas de la tabla quedan del mismo tamaño: simple de operar, pero las WAN de dos routers desperdician casi todo el bloque.',
    howItWorks: [
      'Se identifica la red padre a partir de la IP de gateway y su prefijo (o la clase por defecto).',
      'Se suma la cantidad de redes LAN, MAN y WAN; los bits de subred son ⌈log₂(total)⌉.',
      'La máscara común es prefijo_padre + bits_de_subred; todos los bloques miden lo mismo.',
      'Se comprueba que los hosts útiles de ese tamaño cubran el tipo más exigente (casi siempre LAN).',
      'Se rellenan las filas en orden LAN, MAN y WAN con la misma máscara, rangos y broadcast.',
    ],
    traits: {
      maskKind: 'Fija',
      allocation: 'Secuencial',
      waste: 'Alto en WAN',
      order: 'LAN · MAN · WAN',
    },
    pseudocode: `function flsm(gateway, lans, mans, wans):
  parent ← red(gateway)
  n      ← lans + mans + wans
  prefix ← parent.prefix + ⌈log₂(n)⌉
  cursor ← parent.network
  for req in [LAN…, MAN…, WAN…]:
    anotar(cursor, first, last, broadcast, mask)
    cursor ← cursor + tamaño(prefix)`,
    example:
      'Gateway 172.16.0.1/16, 2 LAN + 1 WAN → 3 redes, 2 bits, /18.\nLAN 1: 172.16.0.0/18\nLAN 2: 172.16.64.0/18\nWAN 1: 172.16.128.0/18\nQueda libre 172.16.192.0/18.',
  },
];
