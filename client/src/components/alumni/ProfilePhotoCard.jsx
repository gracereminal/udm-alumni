import { useRef, useState } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { initials } from '../../lib/format';
import { card } from '../../layouts/PortalPage';

const MAX = 2 * 1024 * 1024;

/** Avatar card: upload / change / remove photo, name, program and batch. */
export default function ProfilePhotoCard({ course, batch, note = 'Saving updates your record in Alumni Records.' }) {
  const { alumniName, avatar, uploadAvatar, removeAvatar } = useProfile();
  const fileRef = useRef(null);
  const [error, setError] = useState('');
  const [avatarName, setAvatarName] = useState(null);
  const [busy, setBusy] = useState(false);

  const pick = () => { if (fileRef.current) fileRef.current.click(); };
  const onFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { setError('Choose a JPG or PNG image.'); e.target.value = ''; return; }
    if (file.size > MAX) { setError('That photo is larger than 2 MB. Choose a smaller one.'); e.target.value = ''; return; }
    setError('');
    setBusy(true);
    // The server checks the real file type and size again and stores it; the record keeps only the file key.
    uploadAvatar(file).then(() => setAvatarName(file.name)).catch((err) => setError(err.message)).finally(() => { setBusy(false); e.target.value = ''; });
  };
  const remove = () => {
    setBusy(true);
    removeAvatar().then(() => { setAvatarName(null); setError(''); }).catch((err) => setError(err.message)).finally(() => setBusy(false));
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div style={{ ...card, padding: 24, textAlign: 'center' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 18 }}>Profile Photo</div>
      <div style={{ position: 'relative', width: 132, height: 132, margin: '0 auto 16px' }}>
        {avatar ? (
          <div role="img" aria-label="Profile photo" style={{ width: 132, height: 132, borderRadius: '50%', border: '3px solid #F0C428', boxSizing: 'border-box', background: `url("${avatar}") center/cover no-repeat` }} />
        ) : (
          <div style={{ width: 132, height: 132, borderRadius: '50%', background: '#EEF2F6', border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter,sans-serif', fontWeight: 700, fontSize: 38, color: '#94A3B8' }}>
            {initials(alumniName) || 'AL'}
          </div>
        )}
        <button
          type="button" onClick={pick} title="Change photo" aria-label="Change photo"
          style={{ position: 'absolute', right: -2, bottom: -2, width: 38, height: 38, borderRadius: '50%', background: '#0F3D2E', color: '#fff', border: '3px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: 'pointer', padding: 0 }}
        >
          ✎
        </button>
      </div>
      <div style={{ fontFamily: 'Inter,sans-serif', fontWeight: 600, fontSize: 17, color: '#0B1220', lineHeight: 1.3 }}>{alumniName}</div>
      <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4, lineHeight: 1.5 }}>
        {course || 'Course not set'}
        <br />
        {batch ? `Class of ${String(batch).slice(0, 4)}` : 'Batch year not set'}
      </div>
      <input type="file" accept="image/png,image/jpeg,image/webp" ref={fileRef} onChange={onFile} style={{ display: 'none' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
        <button type="button" onClick={pick} style={{ background: '#0F3D2E', color: '#fff', border: 'none', borderRadius: 12, padding: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          {busy ? 'Uploading…' : avatar ? 'Change Photo' : 'Upload Photo'}
        </button>
        {avatar ? (
          <button type="button" onClick={remove} style={{ background: '#fff', border: '1px solid #E2E5EA', color: '#B3213C', borderRadius: 12, padding: 11, fontFamily: 'inherit', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
            Remove Photo
          </button>
        ) : null}
      </div>
      {error ? <div role="alert" style={{ fontSize: 12, color: '#B3261E', marginTop: 10 }}>{error}</div> : null}
      <div style={{ fontSize: 11.5, color: '#94A3B8', marginTop: 12, lineHeight: 1.5 }}>
        {avatarName || (avatar ? 'Photo on file.' : 'No photo uploaded yet.')}
        <br />
        Square JPG or PNG, up to 2 MB.
      </div>
      {note ? <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 14, paddingTop: 14, borderTop: '1px solid #EEF0F3', lineHeight: 1.5 }}>{note}</div> : null}
    </div>
  );
}
