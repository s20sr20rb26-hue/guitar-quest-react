import { ImagePlus, LoaderCircle, Mail, Save, Trash2, UserRound, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import type { Profile } from '@/lib/social';

interface ProfileModalProps {
  profile: Profile;
  email: string;
  onClose: () => void;
  onSave: (username: string, avatarFile?: File, removeAvatar?: boolean) => Promise<void>;
}

function profileInitial(username: string): string {
  return Array.from(username.trim())[0]?.toUpperCase() || 'G';
}

export function ProfileModal({ profile, email, onClose, onSave }: ProfileModalProps) {
  const [username, setUsername] = useState(profile.username);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(profile.avatarUrl ?? '');
  const [imageFailed, setImageFailed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setImageFailed(false);
    if (!avatarFile) {
      setPreviewUrl(removeAvatar ? '' : profile.avatarUrl ?? '');
      return;
    }

    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile, profile.avatarUrl, removeAvatar]);

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPEG・PNG・WebPの画像を選んでください');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('画像は5MB以下にしてください');
      return;
    }
    setAvatarFile(file);
    setRemoveAvatar(false);
    setError('');
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = username.trim();
    if (!trimmedName) {
      setError('アカウント名を入力してください');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSave(trimmedName, avatarFile ?? undefined, removeAvatar);
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
            {previewUrl && !imageFailed ? (
              <img
                src={previewUrl}
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

          <div>
            <span className="mb-2 block text-sm font-bold text-zinc-300">プロフィール画像</span>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-zinc-100 px-4 text-sm font-black text-black hover:bg-white">
                <ImagePlus className="h-4 w-4" />
                写真を選ぶ
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={selectAvatar}
                  className="sr-only"
                />
              </label>
              <button
                type="button"
                onClick={() => {
                  setAvatarFile(null);
                  setRemoveAvatar(true);
                  setImageFailed(false);
                }}
                disabled={!previewUrl && !avatarFile}
                className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-zinc-900 px-4 text-sm font-black text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-700"
              >
                <Trash2 className="h-4 w-4" />
                削除
              </button>
            </div>
            <p className="mt-2 text-xs text-zinc-600">JPEG・PNG・WebP、5MBまで。</p>
          </div>

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
