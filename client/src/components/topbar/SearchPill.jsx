import { useSearch } from '../../context/SearchContext';
import { hv } from '../../lib/stateStyle';

/** The "Search for an Alumni" pill in the topbar — opens the global search overlay (Ctrl+K or "/"). */
export default function SearchPill() {
  const { openSearch } = useSearch();
  return (
    <div
      data-m="tb-search" role="button" tabIndex={0} aria-label="Search for an alumni" onClick={openSearch} title="Search (Ctrl+K)"
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openSearch(); } }}
      style={{ width: 280, height: 40, borderRadius: 999, background: '#fff', border: '1px solid #E7E9ED', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 0 14px', color: '#64748B', cursor: 'text', flex: 'none' }}
      {...hv({ borderColor: '#CFE3DA', color: '#0B1220' })}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ width: 17, height: 17, flex: 'none' }}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
      <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: '#94A3B8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Search for an Alumni</span>
      <span style={{ flex: 'none', fontSize: 10.5, fontWeight: 700, color: '#94A3B8', border: '1px solid #E7E9ED', borderRadius: 6, padding: '2px 6px' }}>Ctrl K</span>
    </div>
  );
}
