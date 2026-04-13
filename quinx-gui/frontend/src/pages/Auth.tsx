import { useState } from 'react';
import { api } from '../lib/api';
import logo from '../assets/logo/q__2_-removebg-preview.png';

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
  <div className="min-h-screen bg-obsidian flex items-center justify-center text-white p-4 relative selection:bg-matrix selection:text-obsidian">
   <div className="absolute inset-0 bg-noise pointer-events-none z-0"></div>
   <div className="absolute inset-0 scanlines pointer-events-none z-0 opacity-20"></div>

   <div className="max-w-md w-full border border-divider bg-gunmetal shadow-2xl overflow-hidden relative rounded-lg z-10 group">
    <div className="absolute top-0 left-0 w-full h-1 bg-matrix"></div>
    <div className="p-6 border-b border-divider flex justify-between items-center bg-obsidian">
     <h2 className="text-xl font-bold font-mono text-white tracking-tight flex items-center gap-2">
      <img src={logo} alt="Q" className="h-10 w-10 object-contain opacity-90" />
      <span className="font-mono font-bold text-lg text-white tracking-tight">Quinx</span>
      <span className="text-gray-500 font-mono text-sm">// {isLogin ? 'LOGIN' : 'INIT_OPERATOR'}</span>
     </h2>
    </div>

    <form onSubmit={handleSubmit} className="p-8 space-y-5 font-mono">
     {!isLogin && (
      <div>
       <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Your Name</label>
       <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-matrix focus:ring-1 focus:ring-matrix text-white transition-shadow"
        placeholder="Jane Doe"
        required
       />
      </div>
     )}

     <div>
      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Email</label>
      <input
       type="email"
       value={email}
       onChange={e => setEmail(e.target.value)}
       className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-matrix focus:ring-1 focus:ring-matrix text-white transition-shadow"
       placeholder="hello@company.com"
       required
      />
     </div>

     <div>
      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Password</label>
      <input
       type="password"
       value={password}
       onChange={e => setPassword(e.target.value)}
       className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-matrix focus:ring-1 focus:ring-matrix text-white transition-shadow"
       placeholder="••••••••"
       required
      />
     </div>

     {error && (
      <p className="text-red-500 text-xs bg-red-900/10 border border-red-900/50 rounded-lg px-4 py-3">ERR: {error}</p>
     )}

     <button
      type="submit"
      disabled={loading}
      className="w-full bg-matrix hover:bg-matrix-hover text-obsidian font-bold font-mono py-3 rounded-lg transition-colors mt-8 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed group-hover:shadow-[0_0_15px_rgba(0,255,65,0.2)]"
     >
      {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Create Account'}
     </button>

     <div className="text-center pt-6 text-xs text-gray-500">
      {isLogin ? "Don't have an account? " : "Already have an account? "}
      <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-matrix font-medium hover:underline focus:outline-none">
       {isLogin ? "Sign up" : "Log in"}
      </button>
     </div>
    </form>
   </div>
  </div>
 );
}
