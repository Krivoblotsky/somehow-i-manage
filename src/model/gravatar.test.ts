import { describe, expect, it } from 'vitest';
import { gravatarUrl } from './gravatar';
import { sha256Hex } from './sha256';

describe('sha256Hex', () => {
  it('matches the standard test vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
    // two blocks
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });
  it('hashes UTF-8, not UTF-16', () => {
    expect(sha256Hex('Віра')).toHaveLength(64);
    expect(sha256Hex('Віра')).not.toBe(sha256Hex('Vira'));
  });
});

describe('gravatarUrl', () => {
  it('lowercases and trims the email and asks for a 404 when missing', () => {
    const a = gravatarUrl('  Vira@Company.com ');
    const b = gravatarUrl('vira@company.com');
    expect(a).toBe(b);
    expect(a).toMatch(/^https:\/\/gravatar\.com\/avatar\/[0-9a-f]{64}\?s=160&d=404$/);
  });
});
