import { Guitar, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface PasswordResetScreenProps {
  onDone: () => void;
}

export function PasswordResetScreen({ onDone }: PasswordResetScreenProps) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('確認用パスワードが一致しません');
      return;
    }

    setSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      onDone();
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
            <h1 className="text-2xl font-black text-white">新しいパスワード</h1>
            <p className="text-sm font-bold text-zinc-500">6文字以上で設定してください</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-300">新しいパスワード</span>
            <span className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 focus-within:border-emerald-500">
              <LockKeyhole className="h-5 w-5 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={6}
                autoComplete="new-password"
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none"
                required
              />
            </span>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-300">もう一度入力</span>
            <span className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950 px-3 focus-within:border-emerald-500">
              <LockKeyhole className="h-5 w-5 text-zinc-500" />
              <input
                type="password"
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                minLength={6}
                autoComplete="new-password"
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none"
                required
              />
            </span>
          </label>
          {error && <p className="rounded-lg bg-red-950/70 px-3 py-2 text-sm font-bold text-red-200" role="alert">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full rounded-full bg-emerald-500 px-5 text-base font-black text-black disabled:cursor-wait disabled:opacity-60"
          >
            {submitting ? '更新中...' : 'パスワードを更新'}
          </button>
        </form>
      </div>
    </main>
  );
}
