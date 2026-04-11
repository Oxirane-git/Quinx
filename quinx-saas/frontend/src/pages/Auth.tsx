import { useState } from 'react';
import { api } from '../lib/api';

export default function Auth() {
 const [isLogin, setIsLogin] = useState(true);
 const [email, setEmail] = useState('');
 const [password, setPassword] = useState('');
 const [name, setName] = useState('');
 const [error, setError] = useState('');
 const [loading, setLoading] = useState(false);

 const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
  e.preventDefault();
  setError('');
  setLoading(true);
  try {
   let data;
   if (isLogin) {
    data = await api.postForm('/api/auth/login', { username: email, password });
   } else {
    data = await api.post('/api/auth/register', { email, password, name });
   }
   localStorage.setItem('token', data.access_token);
   // Fetch user name after login
   const me = await fetch('http://localhost:8000/api/users/me', {
    headers: { Authorization: `Bearer ${data.access_token}` },
   }).then(r => r.json());
   localStorage.setItem('userName', me.name || me.email);
   window.location.reload();
  } catch (err: unknown) {
   setError(err instanceof Error ? err.message : 'Authentication failed');
  } finally {
   setLoading(false);
  }
 };

 return (
  <div className="min-h-screen bg-background flex items-center justify-center text-textMain p-4">
   <div className="max-w-md w-full border border-border bg-surface shadow-md overflow-hidden relative rounded-lg">
    <div className="absolute top-0 left-0 w-full h-1 bg-primary"></div>
    <div className="p-6 border-b border-border flex justify-between items-center">
     <h2 className="text-xl font-bold text-textMain tracking-tight">QUINX // {isLogin ? 'LOGIN' : 'REGISTER'}</h2>
    </div>

    <form onSubmit={handleSubmit} className="p-6 space-y-4">
     {!isLogin && (
      <div>
       <label className="block text-xs font-medium text-textMuted mb-1 uppercase tracking-wider">Full Name</label>
       <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-surface border border-border rounded px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-textMain transition-shadow"
        placeholder="Jane Doe"
        required
       />
      </div>
     )}

     <div>
      <label className="block text-xs font-medium text-textMuted mb-1 uppercase tracking-wider">Email Address</label>
      <input
       type="email"
       value={email}
       onChange={e => setEmail(e.target.value)}
       className="w-full bg-surface border border-border rounded px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-textMain transition-shadow"
       placeholder="hello@company.com"
       required
      />
     </div>

     <div>
      <label className="block text-xs font-medium text-textMuted mb-1 uppercase tracking-wider">Password</label>
      <input
       type="password"
       value={password}
       onChange={e => setPassword(e.target.value)}
       className="w-full bg-surface border border-border rounded px-4 py-2 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-textMain transition-shadow"
       placeholder="••••••••"
       required
      />
     </div>

     {error && (
      <p className="text-danger-700 text-xs bg-red-50 border border-red-100 rounded px-3 py-2">{error}</p>
     )}

     <button
      type="submit"
      disabled={loading}
      className="w-full bg-primary hover:bg-primaryHover text-white font-medium py-2 rounded transition-colors mt-6 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
     >
      {loading ? 'Please wait...' : isLogin ? 'Login to Dashboard' : 'Create Account'}
     </button>

     <div className="text-center pt-4 text-sm text-textMuted">
      {isLogin ? "Don't have an account? " : "Already have an account? "}
      <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-primary font-medium hover:underline">
       {isLogin ? "Sign up" : "Login"}
      </button>
     </div>
    </form>
   </div>
  </div>
 );
}
