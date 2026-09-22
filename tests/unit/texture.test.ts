import { describe, expect, it } from 'vitest';
import { classifyUsdaTexture } from '../../src/lib/soil/texture';

describe('Triangle textural USDA (§4.3)', () => {
  it.each([
    [90, 5, 5, 'sable'],
    [5, 85, 10, 'limon_pur'],
    [40, 40, 20, 'limon'],
    [20, 20, 60, 'argile'],
    [10, 50, 40, 'argile_limoneuse_pure'],
    [50, 10, 40, 'argile_sableuse'],
    [10, 55, 35, 'argile_limoneuse_limoneuse'],
    [30, 35, 35, 'argile_limoneuse'],
    [55, 15, 30, 'argile_sableuse_limoneuse'],
    [65, 25, 10, 'limon_sableux'],
    [82, 12, 6, 'sable_limoneux'],
  ])('sable=%i, limon=%i, argile=%i → %s', (sand, silt, clay, expected) => {
    expect(classifyUsdaTexture(sand, silt, clay)).toBe(expected);
  });
});
