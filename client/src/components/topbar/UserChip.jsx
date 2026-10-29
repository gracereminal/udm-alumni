import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import { ROLE_LABEL } from '../../data/navigation';

const initialsOf = (n) => String(n || '').split(' ').filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

/** Avatar initials + name + role label at the right end of every topbar (`compact`: the avatar alone, named by its tooltip). */
export default function UserChip({ compact = false }) {
  const { user, role } = useAuth();
  const { alumniName } = useProfile();
  const name = role === 'alumni' ? alumniName : user?.name || '';
  const initials = role === 'alumni' ? initialsOf(name) : user?.initials || initialsOf(name);
  if (compact) {
    return <div title={`${name} · ${ROLE_LABEL[role]}`} style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0C428', color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12.5, flex: 'none' }}>{initials}</div>;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingLeft: 4, minWidth: 0 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0C428', color: '#0F3D2E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12.5, flex: 'none' }}>{initials}</div>
      <div data-m="tb-user" style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#0B1220', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ fontSize: 11.5, color: '#64748B', whiteSpace: 'nowrap' }}>{ROLE_LABEL[role]}</div>
      </div>
    </div>
  );
}
