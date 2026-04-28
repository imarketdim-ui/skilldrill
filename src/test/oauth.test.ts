import { describe, expect, it, beforeEach } from 'vitest';
import {
  AUTH_CALLBACK_PATH,
  buildVkAuthUrl,
  consumePostAuthRedirect,
  storePostAuthRedirect,
} from '@/lib/oauth';

describe('oauth helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('stores and consumes post-auth redirect path', () => {
    storePostAuthRedirect('/dashboard');

    expect(consumePostAuthRedirect('/')).toBe('/dashboard');
    expect(consumePostAuthRedirect('/')).toBe('/');
  });

  it('replaces VK callback placeholder with encoded callback url', () => {
    const url = buildVkAuthUrl(
      'https://example.com/auth?redirect_to=__REDIRECT_TO__',
      'https://skilldrill.lovable.app/auth/callback'
    );

    expect(url).toContain(encodeURIComponent(`https://skilldrill.lovable.app${AUTH_CALLBACK_PATH}`));
  });

  it('keeps VK auth url intact when placeholder is absent', () => {
    const url = buildVkAuthUrl(
      'https://example.com/auth?provider=vk',
      'https://skilldrill.lovable.app/auth/callback'
    );

    expect(url).toBe('https://example.com/auth?provider=vk');
  });
});
