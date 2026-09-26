 import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext.js';

const REQS = [
  { test: (p: string) => p.length >= 8, en: 'At least 8 characters', hi: 'कम से कम 8 अक्षर' },
  { test: (p: string) => /[A-Z]/.test(p), en: 'One uppercase letter', hi: 'एक बड़ा अक्षर' },
  { test: (p: string) => /[a-z]/.test(p), en: 'One lowercase letter', hi: 'एक छोटा अक्षर' },
  { test: (p: string) => /\d/.test(p), en: 'One number', hi: 'एक संख्या' },
];

export function SignupPage() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuth();
  const { lang, t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = REQS.every((r) => r.test(password));
  const match = password === confirm && confirm.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!valid) return setError('Please meet all password requirements');
    if (!match) return setError('Passwords do not match');
    try {
      await register(name, email, password);
      navigate('/workspace');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    }
  };

  const inputClass = 'w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500/50 transition';

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="flex items-center gap-2 mb-8">
        <Building2 className="w-10 h-10 text-amber-400" />
        <span className="text-2xl font-bold text-slate-100">{t('appName')}</span>
      </div>
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-xl">
        <h1 className="text-2xl font-bold text-slate-100 mb-2">{t('authSignupTitle')}</h1>
        <p className="text-slate-400 mb-6">{t('authSignupSubtitle')}</p>
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/50 rounded-xl mb-4 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-1.5">{t('authName')}</label>
            <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder={t('authNamePlaceholder')} required minLength={2} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-1.5">{t('authEmail')}</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" required autoComplete="email" />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-1.5">{t('authPassword')}</label>
            <div className="relative">
              <input id="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass + ' pr-12'} placeholder="••••••••" required autoComplete="new-password" />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">{show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
            </div>
            <div className="mt-2 space-y-1">
              {REQS.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${r.test(password) ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {r.test(password) ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-current" />}
                  <span>{lang === 'hi' ? `${r.hi} / ${r.en}` : r.en}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-slate-300 mb-1.5">{lang === 'hi' ? 'पासवर्ड दोबारा (Confirm Password)' : 'Confirm Password'}</label>
            <input id="confirm" type={show ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inputClass} ${confirm && !match ? 'border-red-500/50' : ''}`} placeholder="••••••••" required autoComplete="new-password" />
            {confirm && !match && <p className="mt-1 text-xs text-red-400">{t('authPasswordsNoMatch')}</p>}
          </div>
          <button type="submit" disabled={isLoading || !valid || !match} className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50 disabled:cursor-not-allowed text-slate-950 font-semibold py-3 rounded-xl">
            {isLoading ? <><Loader2 className="w-5 h-5 animate-spin" />{t('authCreating')}</> : t('authSignupAction')}
          </button>
        </form>
        <p className="text-center text-slate-400 mt-6"><Link to="/login" className="text-amber-400 hover:text-amber-300 font-medium">{t('navSignIn')}</Link></p>
      </div>
      <Link to="/workspace" className="mt-6 text-slate-500 hover:text-slate-300 text-sm">{t('authContinueGuest')} →</Link>
    </div>
  );
}