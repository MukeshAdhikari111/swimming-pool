export const saveAuth = ({ token, user }) => {
  localStorage.setItem('authToken', token);
  localStorage.setItem('authUser', JSON.stringify(user));
  window.dispatchEvent(new Event('auth-change'));
};

export const clearAuth = () => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('authUser');
  window.dispatchEvent(new Event('auth-change'));
};

export const getAuthUser = () => {
  const raw = localStorage.getItem('authUser');
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const isAuthenticated = () => Boolean(localStorage.getItem('authToken'));
