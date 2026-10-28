import { describe, expect, it } from 'vitest';
import { safeAccountDestination, validateNewPassword } from './account-rules';
describe('account safety', () => {
  it('keeps redirects on the app origin', () => {
    for (const path of ['//evil.example', 'https://evil.example', '/\\evil.example', '/auth']) expect(safeAccountDestination(path)).toBe('/account');
    expect(safeAccountDestination('/grades')).toBe('/grades');
  });
  it('requires at least eight password characters', () => {
    expect(validateNewPassword('1234567', '1234567')).not.toBeNull();
    expect(validateNewPassword('12345678', '12345678')).toBeNull();
  });
  it('requires matching passwords', () => expect(validateNewPassword('12345678', 'abcdefgh')).not.toBeNull());
});