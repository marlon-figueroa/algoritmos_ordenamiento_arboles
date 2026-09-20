import { lastOutput, simulate } from './engines';
import { SAMPLE_INPUTS, sortedCopy } from './models';

const CASES = [
  [7, 3, 9, 1, 5],
  [4, 10, 3, 5, 1],
  [6, 1, 4, 3, 8],
  [1, 2, 4, 3, 5, 8],
  [9, 3, 7, 1, 8, 12],
  [1, 2, 3, 4, 5, 6],
  [10, 20, 30, 15, 25],
  [10, 20, 5, 6, 12, 30, 7],
  [4, 2, 6, 1, 5, 8],
  [8, 8, 3, 3, 5],
];

describe('simulators', () => {
  const slugs = Object.keys(SAMPLE_INPUTS);

  it.each(slugs)('%s sorts every fixture', (slug) => {
    for (const input of CASES) {
      const frames = simulate(slug, input);
      expect(frames.length).toBeGreaterThan(1);
      expect(lastOutput(frames)).toEqual(sortedCopy(input));
    }
  });
});
