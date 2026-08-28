import { Camera, LoaderCircle, Mail, Save, UserRound, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { Profile } from '@/lib/social';

interface ProfileModalProps {
  profile: Profile;
  email: string;
  onClose: () => void;
  onSave: (username: string, avatarUrl?: string) => Promise<void>;
}

function profileInitial(username: string): string {
  return Array.from(username.trim())[0]?.toUpperCase() || 'G';
}

export function ProfileModal({ profile, email, onClose, onSave }: ProfileModalProps) {
  const [username, setUsername] = useState(profile.username);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? '');
  const [imageFailed, setImageFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = username.trim();
    const trimmedAvatar = avatarUrl.trim();
    if (!trimmedName) {
      setError('アカウント名を入力してください');
      return;
    }
    if (trimmedAvatar && !/^https?:\/\//i.test(trimmedAvatar)) {
      setError('画像URLは http:// または https:// から入力してください');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSave(trimmedName, trimmedAvatar || undefined);
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'プロフィールを保存できませんでした');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative max-h-[94vh] max-h-[94dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border-t border-zinc-800 bg-zinc-950 pb-safe shadow-2xl sm:rounded-lg sm:border"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-editor-title"
      >
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur sm:px-5">
          <div className="flex items-center gap-3">
            <UserRound className="h-5 w-5 text-emerald-400" />
            <h2 id="profile-editor-title" className="text-lg font-black text-white">プロフィール編集</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-900 hover:text-white"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 px-4 py-5 sm:px-5">
          <div className="flex justify-center">
            {avatarUrl && !imageFailed ? (
              <img
                src={avatarUrl}
                alt="プロフィール画像のプレビュー"
                onError={() => setImageFailed(true)}
                className="h-24 w-24 rounded-full border-2 border-emerald-400 object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-3xl font-black text-black">
                {profileInitial(username)}
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-300">アカウント名</span>
            <span className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-800 bg-black px-3 focus-within:border-emerald-500">
              <UserRound className="h-5 w-5 shrink-0 text-zinc-500" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={30}
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none"
                required
              />
            </span>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-bold text-zinc-300">プロフィール画像URL</span>
            <span className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-800 bg-black px-3 focus-within:border-emerald-500">
              <Camera className="h-5 w-5 shrink-0 text-zinc-500" />
              <input
                type="url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="min-w-0 flex-1 bg-transparent text-base text-white outline-none placeholder:text-zinc-700"
              />
            </span>
            <p className="mt-2 text-xs text-zinc-600">空欄にすると名前の頭文字を表示します。</p>
          </label>

          <div>
            <span className="mb-2 block text-sm font-bold text-zinc-300">登録メール</span>
            <div className="flex min-h-12 items-center gap-3 rounded-lg border border-zinc-900 bg-zinc-900/60 px-3 text-zinc-500">
              <Mail className="h-5 w-5 shrink-0" />
              <span className="min-w-0 truncate text-sm">{email}</span>
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-950 bg-red-950/30 px-3 py-2 text-sm font-bold text-red-300" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !username.trim()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-black text-black hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
            {submitting ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>
    </div>
  );
}
