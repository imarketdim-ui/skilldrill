const POST_AUTH_REDIRECT_KEY = 'skillspot_post_auth_redirect';
export const AUTH_CALLBACK_PATH = '/auth/callback';

export const buildAuthCallbackUrl = (origin = window.location.origin) => (
  new URL(AUTH_CALLBACK_PATH, origin).toString()
);

export const storePostAuthRedirect = (path = '/dashboard') => {
  localStorage.setItem(POST_AUTH_REDIRECT_KEY, path);
};

export const consumePostAuthRedirect = (fallback = '/dashboard') => {
  const savedPath = localStorage.getItem(POST_AUTH_REDIRECT_KEY);
  localStorage.removeItem(POST_AUTH_REDIRECT_KEY);
  return savedPath || fallback;
};

export const buildVkAuthUrl = (template: string, callbackUrl: string) => (
  template.includes('__REDIRECT_TO__')
    ? template.split('__REDIRECT_TO__').join(encodeURIComponent(callbackUrl))
    : template
);
