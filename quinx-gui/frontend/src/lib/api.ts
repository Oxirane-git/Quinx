const BASE = 'http://localhost:8000';

function authHeader(): Record<string, string> {
 const token = localStorage.getItem('token');
 return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handleResponse(res: Response) {
 if (res.status === 401) {
  localStorage.removeItem('token');
  localStorage.removeItem('userName');
  window.location.reload();
 }
 if (!res.ok) {
  const body = await res.json().catch(() => ({ detail: res.statusText }));
  throw new Error(body.detail || 'Request failed');
 }
 return res.json();
}

export const api = {
 get(path: string) {
  return fetch(`${BASE}${path}`, {
   headers: { ...authHeader() },
  }).then(handleResponse);
 },

 post(path: string, body: unknown) {
  return fetch(`${BASE}${path}`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/json', ...authHeader() },
   body: JSON.stringify(body),
  }).then(handleResponse);
 },

 async download(path: string, filename: string) {
  const res = await fetch(`${BASE}${path}`, { headers: { ...authHeader() } });
  if (res.status === 401) { localStorage.removeItem('token'); window.location.reload(); return; }
  if (!res.ok) throw new Error(`Download failed: ${res.statusText}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
 },

 // For FastAPI OAuth2PasswordRequestForm (requires x-www-form-urlencoded)
 postForm(path: string, data: Record<string, string>) {
  return fetch(`${BASE}${path}`, {
   method: 'POST',
   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
   body: new URLSearchParams(data).toString(),
  }).then(handleResponse);
 },
};
