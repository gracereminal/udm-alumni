
const base = { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, borderRadius: 10, minWidth: 40, height: 40, padding: '0 10px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' };

/** Previous / numbered pages / Next. */
export default function Pager({ page, pages, onPage }) {
  const nums = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== '…') nums.push('…');
  }
  const prevOff = page <= 1;
  const nextOff = page >= pages;
  return (
    <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button type="button" disabled={prevOff} onClick={() => onPage(page - 1)} style={{ border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: prevOff ? '#94A3B8' : '#0F3D2E', padding: '10px 14px', cursor: prevOff ? 'default' : 'pointer' }}>Previous</button>
      {nums.map((p, i) => (p === '…' ? (
        <div key={`gap${i}`} style={{ fontSize: 12.5, color: '#94A3B8', padding: '0 4px' }}>…</div>
      ) : (
        <button
          key={p} type="button" aria-current={p === page ? 'page' : undefined} onClick={() => onPage(p)}
          style={{ ...base, cursor: 'pointer', fontWeight: p === page ? 700 : 600, color: p === page ? '#fff' : '#0B1220', background: p === page ? '#0F3D2E' : '#fff', border: `1px solid ${p === page ? '#0F3D2E' : '#E2E5EA'}` }}
        >
          {p}
        </button>
      )))}
      <button type="button" disabled={nextOff} onClick={() => onPage(page + 1)} style={{ border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: nextOff ? '#94A3B8' : '#0F3D2E', padding: '10px 14px', cursor: nextOff ? 'default' : 'pointer' }}>Next</button>
    </nav>
  );
}
