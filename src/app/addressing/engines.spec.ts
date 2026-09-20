import { ADDRESSING } from '../core/addressing';
import { lastNetworks, lastParent, simulateAddressing } from './engines';
import { SAMPLE_PLAN, parseGateway, parsePlanInput, prefixForDevices } from './models';

describe('direccionamiento', () => {
  it.each(ADDRESSING.map((item) => item.slug))('%s planifica el ejemplo y termina', (slug) => {
    const frames = simulateAddressing(slug, SAMPLE_PLAN);
    expect(frames.length).toBeGreaterThan(3);
    expect(frames.at(-1)?.done).toBe(true);
    const networks = lastNetworks(frames);
    expect(networks).toHaveLength(SAMPLE_PLAN.lanCount + SAMPLE_PLAN.manCount + SAMPLE_PLAN.wanCount);
  });

  it('infiere clase B cuando el gateway no trae prefijo', () => {
    expect(parseGateway('172.16.0.1')).toEqual({ ip: parseGateway('172.16.0.1/16').ip, prefix: 16 });
  });

  it('calcula el prefijo mínimo según dispositivos', () => {
    expect(prefixForDevices(254)).toBe(24);
    expect(prefixForDevices(30)).toBe(27);
    expect(prefixForDevices(2)).toBe(30);
    expect(prefixForDevices(100)).toBe(25);
  });

  it('VLSM asigna LAN /24 y WAN /30 desde el gateway', () => {
    const networks = lastNetworks(
      simulateAddressing('vlsm', {
        gateway: '172.16.0.1/16',
        lanCount: 2,
        manCount: 0,
        wanCount: 1,
        lanHosts: 254,
        manHosts: 30,
        wanHosts: 2,
      }),
    );
    expect(networks[0]).toMatchObject({
      name: 'LAN 1',
      network: '172.16.0.0',
      firstHost: '172.16.0.1',
      lastHost: '172.16.0.254',
      broadcast: '172.16.0.255',
      mask: '255.255.255.0',
      prefix: 24,
      usableHosts: 254,
    });
    expect(networks[1]).toMatchObject({
      name: 'LAN 2',
      network: '172.16.1.0',
      prefix: 24,
    });
    expect(networks[2]).toMatchObject({
      name: 'WAN 1',
      network: '172.16.2.0',
      firstHost: '172.16.2.1',
      lastHost: '172.16.2.2',
      broadcast: '172.16.2.3',
      mask: '255.255.255.252',
      prefix: 30,
      usableHosts: 2,
    });
  });

  it('FLSM usa la misma máscara para LAN y WAN', () => {
    const networks = lastNetworks(
      simulateAddressing('flsm', {
        gateway: '172.16.0.1/16',
        lanCount: 2,
        manCount: 0,
        wanCount: 1,
        lanHosts: 254,
        manHosts: 30,
        wanHosts: 2,
      }),
    );
    expect(networks.map((network) => network.prefix)).toEqual([18, 18, 18]);
    expect(networks[0].network).toBe('172.16.0.0');
    expect(networks[1].network).toBe('172.16.64.0');
    expect(networks[2]).toMatchObject({
      name: 'WAN 1',
      network: '172.16.128.0',
      firstHost: '172.16.128.1',
      lastHost: '172.16.191.254',
      broadcast: '172.16.191.255',
      mask: '255.255.192.0',
    });
  });

  it('rechaza un bloque padre demasiado pequeño', () => {
    expect(() =>
      simulateAddressing('vlsm', {
        gateway: '192.168.1.1/24',
        lanCount: 3,
        manCount: 0,
        wanCount: 0,
        lanHosts: 254,
        manHosts: 30,
        wanHosts: 2,
      }),
    ).toThrow(/no cabe/);
  });

  it('exige al menos una red', () => {
    expect(() => parsePlanInput('10.0.0.1/8', '0', '0', '0', '10', '10', '2')).toThrow(/al menos una red/);
  });

  it('expone el bloque padre del gateway', () => {
    const parent = lastParent(simulateAddressing('vlsm', SAMPLE_PLAN));
    expect(parent).toMatchObject({
      gateway: '172.16.0.1',
      network: '172.16.0.0',
      prefix: 16,
      mask: '255.255.0.0',
      className: 'Clase B',
    });
  });
});
