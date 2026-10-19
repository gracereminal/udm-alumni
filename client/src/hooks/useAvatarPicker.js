import { useEffect, useRef, useState } from 'react';
import { useProfile } from '../context/ProfileContext';

const MAX = 2 * 1024 * 1024;

/**
 * Profile photo upload / change / remove (JPG, PNG or WebP up to 2 MB). The pick is a draft: `commit()` uploads it
 * (POST /me/photo) or removes the current one (DELETE /me/photo) on Save, and leaving without committing discards it
 * (Cancel). `onChange` fires on every pick / remove.
 */
export default function useAvatarPicker(onChange) {
  const profile = useProfile();
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  // `file` is the picked image (null = unchanged or removed); `avatar` is what the form shows.
  const [draft, setDraft] = useState({ avatar: profile.avatar, file: null, changed: false });
  // The photo URL arrives with GET /me after the first render; show it until a new one is picked.
  useEffect(() => { setDraft((d) => (d.changed ? d : { ...d, avatar: profile.avatar })); }, [profile.avatar]);

  const pick = () => { if (fileRef.current) fileRef.current.click(); };
  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError('Choose a JPG or PNG image.'); e.target.value = ''; return; }
    if (file.size > MAX) { setError('That photo is larger than 2 MB. Choose a smaller one.'); e.target.value = ''; return; }
    setError('');
    const reader = new FileReader();
    reader.onload = () => { setDraft({ avatar: reader.result, file, changed: true }); if (onChange) onChange(); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  const remove = () => { setDraft({ avatar: null, file: null, changed: true }); setError(''); if (fileRef.current) fileRef.current.value = ''; if (onChange) onChange(); };
  /** Saves the photo change, if any. Throws ApiError when the upload is refused. */
  const commit = async () => {
    if (!draft.changed) return;
    if (draft.file) await profile.uploadAvatar(draft.file);
    else if (profile.avatar) await profile.removeAvatar();
    setDraft((d) => ({ ...d, file: null, changed: false }));
  };

  return { avatar: draft.avatar, fileRef, error, pick, onFile, remove, commit };
}
