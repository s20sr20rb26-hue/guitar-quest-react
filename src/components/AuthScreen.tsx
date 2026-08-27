import { Guitar, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

type AuthMode = 'login' | 'signup';

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setMessage('');
    setError('');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      if (mode === 'signup') {
        const trimmedName = username.trim();
        if (!trimmedName) throw new Error('アカウント名を入力してください');

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { username: trimmedName },
            emailRedirectTo: window.location.href.split('#')[0].split('?')[0],
          },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage('確認メールを送りました。メール内のリンクを開いて登録を完了してください。');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (caught) {
      const text = caught instanceof Error ? caught.message : 'ログインに失敗しました';
      setError(
        text === 'Invalid login credentials'
          ? 'メールアドレスかパスワードが違います'
          : text
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetPassword = async () => {
    if (!email.trim()) {
      setError('先にメールアドレスを入力してください');
      return;
    }
    setSubmitting(true);
    setError('');
    setMessage('');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.href.split('#')[0].split('?')[0],
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage('パスワード再設定メールを送りました。');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-5 py-10 text-zinc-100">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-500 text-black">
            <Guitar className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Guitar Quest</h1>
            <p className="text-sm font-bold text-zinc-500">練習を記録して、仲間と続ける</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 border-b border-zinc-800" role="tablist" aria-label="ログイン方法">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            onClick={() => switchMode('login')}
            className={`min-h-12 border-b-2 text-base font-black ${mode === 'login' ? 'border-emerald-400 text-white' : 'border-transparent text-zinc-500'}`}
          >
            ログイン
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => switchMode('signup')}
            className={`min-h-12 border-b-2 text-base font-black ${mode === 'signup' ? 'border-emerald-400 text-white' : 'border-transparent text-zinc-500'}`}
          >
            新規登録
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === 'signup' && (
            <label className="block">
              <span className="mb-2 block text-sm font-bold text-zinc-300">アカウント名</span>
              <span className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 focus-within:border-emerald-500">
                <UserRound className="h-5 w-5 shrink-0 text-zinc-500" />
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  maxLength={30}
                  autoComplete="username"
                  placeholder="例：みーや"
                  className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                  required
                />
              </span>
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-300">メールアドレス</span>
            <span className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 focus-within:border-emerald-500">
              <Mail className="h-5 w-5 shrink-0 text-zinc-500" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                placeholder="you@example.com"
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                required
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-300">パスワード</span>
            <span className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 focus-within:border-emerald-500">
              <LockKeyhole className="h-5 w-5 shrink-0 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                placeholder="6文字以上"
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-600"
                required
              />
            </span>
          </label>

          {error && <p className="rounded-lg bg-red-950/70 px-3 py-2 text-sm font-bold text-red-200" role="alert">{error}</p>}
          {message && <p className="rounded-lg bg-emerald-950 px-3 py-2 text-sm font-bold text-emerald-200" role="status">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full rounded-full bg-emerald-500 px-5 text-base font-black text-black hover:bg-emerald-400 disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? '処理中...' : mode === 'login' ? 'ログインする' : 'アカウントを作る'}
          </button>
        </form>

        {mode === 'login' && (
          <button
            type="button"
            onClick={resetPassword}
            disabled={submitting}
            className="mt-4 min-h-11 w-full text-sm font-bold text-zinc-500 hover:text-white"
          >
            パスワードを忘れた
          </button>
        )}
      </div>
    </main>
  );
}
