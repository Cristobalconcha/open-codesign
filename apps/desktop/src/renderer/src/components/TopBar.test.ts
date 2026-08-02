import { describe, expect, it } from 'vitest';
import { HUB_TABS } from './TopBar';

describe('TopBar hub navigation', () => {
  it('exposes Edit between Examples and Resources', () => {
    expect(HUB_TABS).toEqual(['recent', 'all', 'examples', 'edit', 'resources']);
  });
});
