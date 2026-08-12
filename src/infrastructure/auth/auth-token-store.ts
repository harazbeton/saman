let authToken: string | null = null;

export function setAuthToken(token: string) {
  authToken = token;
  localStorage.setItem('saman_auth_token', token);
}

export function getAuthToken(): string | null {
  if (!authToken) {
    authToken = localStorage.getItem('saman_auth_token');
  }
  return authToken;
}

export async function ensureAuthenticated(): Promise<string> {
  let token = getAuthToken();
  if (token) return token;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'saman123' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        setAuthToken(data.token);
        return data.token;
      }
    }
  } catch (err) {
    console.error('Auto-login failed:', err);
  }
  return '';
}
