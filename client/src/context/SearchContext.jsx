import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useProfile } from './ProfileContext';
import { useRecords, recInScope } from './RecordsContext';
import { CONTACT_TYPES, DATA, PUBLIC_PROFILE } from '../data/alumniDirectory';
import { ROLE_BASE } from '../data/navigation';
import { initials } from '../lib/format';
import { progNorm } from '../lib/colleges';
import SearchOverlayView from '../views/SearchOverlayView';
import AlumniCardView from '../views/AlumniCardView';
import ContactModalView from '../views/ContactModalView';

const SearchContext = createContext({ openSearch: () => {} });
export const useSearch = () => useContext(SearchContext);

/**
 * Global "Search for an Alumni" experience: overlay (Ctrl+K or "/"), alumni profile card and contact sheet.
 * Alumni search opt-in public profiles only; staff search verified records and open the record quick view.
 */
export function SearchProvider({ children }) {
  const { user, role } = useAuth();
  const { alumniName } = useProfile();
  const records = useRecords();
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [idx, setIdx] = useState(0);
  const [kbd, setKbd] = useState(false);
  const [filters, setFilters] = useState({});
  const [menu, setMenu] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [card, setCard] = useState(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [narrow, setNarrow] = useState(() => window.innerWidth <= 760);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const cardCtaRef = useRef(null);
  const contactCloseRef = useRef(null);
  const pulseT = useRef(null);
  const resultsRef = useRef([]);
  const scrollTop = useRef(0);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= 760);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const focusSoon = (ref) => setTimeout(() => { const el = ref.current; if (el) el.focus({ preventScroll: true }); }, 40);
  const pulse = useCallback(() => {
    clearTimeout(pulseT.current);
    setLoading(true);
    pulseT.current = setTimeout(() => setLoading(false), 380);
  }, []);

  const openSearch = useCallback(() => {
    if (!user) return;
    setOpen(true); setQuery(''); setIdx(0); setKbd(false); setFilters({}); setMenu(null); setFiltersOpen(false); setLoading(false);
    setTimeout(() => { const el = inputRef.current; if (el) el.focus({ preventScroll: true }); }, 40);
  }, [user]);
  const closeSearch = useCallback(() => setOpen(false), []);

  // close everything on sign-out / route change
  useEffect(() => { setOpen(false); setCard(null); setContactOpen(false); }, [location.pathname, role]);

  const openCard = (p) => {
    scrollTop.current = listRef.current ? listRef.current.scrollTop : 0;
    setOpen(false); setCard(p); setContactOpen(false); setMenu(null);
    focusSoon(cardCtaRef);
  };
  const returnToSearch = (patch) => {
    setCard(null); setContactOpen(false); setOpen(true);
    if (patch) { setQuery(patch.query); setIdx(0); setFilters({}); scrollTop.current = 0; pulse(); }
    setTimeout(() => { const list = listRef.current; if (list) list.scrollTop = scrollTop.current; const el = inputRef.current; if (el) el.focus({ preventScroll: true }); }, 40);
  };

  // --- keyboard shortcuts ---
  const stateRef = useRef({});
  stateRef.current = { open, card, contactOpen, menu };
  useEffect(() => {
    if (!user) return undefined;
    const onKey = (e) => {
      const k = (e.key || '').toLowerCase();
      const typing = /^(input|textarea|select)$/i.test((e.target && e.target.tagName) || '');
      const s = stateRef.current;
      if ((e.ctrlKey || e.metaKey) && k === 'k') { e.preventDefault(); s.open ? closeSearch() : openSearch(); }
      else if (k === '/' && !typing && !s.open) { e.preventDefault(); openSearch(); }
      else if (k === 'escape') {
        if (s.contactOpen) { setContactOpen(false); focusSoon(cardCtaRef); return; }
        if (s.card) { returnToSearch(); return; }
        if (s.open && s.menu) { setMenu(null); return; }
        if (s.open) closeSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, openSearch, closeSearch]);

  // --- the searchable index ---
  const staff = role !== 'alumni';
  const index = useMemo(() => {
    if (!open) return [];
    if (staff) {
      return records.rows.filter((r) => r.status === 'verified' && (role !== 'dept' || recInScope(r))).map((r) => {
        const co = String(r.company || '').replace(/\s*\(self-reported\)$/, '');
        const company = co === '—' ? '' : co;
        const college = r.college || '';
        return {
          name: r.name, initials: initials(r.name), role: [r.jobTitle || r.employment, company].filter(Boolean).join(' · '), program: r.program, batch: String(r.batch || ''), college, industry: '', skills: [],
          text: [r.name, r.sid, r.jobTitle, r.employment, company, r.program, r.batch, college].join(' ').toLowerCase(),
          go: () => { setOpen(false); navigate(`${ROLE_BASE[role]}/records`, { state: { openSid: r.sid } }); },
        };
      });
    }
    const me = String(alumniName || '').toLowerCase();
    return DATA.filter((p) => p.name !== 'Alumni Demo User' && p.name.toLowerCase() !== me).map((p) => {
      const pub = PUBLIC_PROFILE[p.name] || {};
      const n = progNorm({ degree: p.degree });
      const college = n.college;
      return {
        p, name: p.name, initials: initials(p.name), role: [p.title, p.company].filter(Boolean).join(' · '), program: n.program, batch: String(p.batch || ''), college, industry: pub.industry || '', skills: p.skills || [],
        text: [p.name, p.title, p.company, n.program, p.batch, college, pub.industry, (p.skills || []).join(' ')].join(' ').toLowerCase(),
        go: () => openCard(p),
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, staff, role, records.rows, alumniName]);

  const q = query.trim().toLowerCase();
  const FK = staff
    ? [['program', 'Program'], ['batch', 'Batch'], ['college', 'College']]
    : [['program', 'Program'], ['batch', 'Batch'], ['college', 'College'], ['skill', 'Skills'], ['industry', 'Industry']];
  const nF = FK.filter(([k]) => filters[k]).length;
  const has = (r, k, v) => (k === 'skill' ? r.skills.indexOf(v) > -1 : r[k] === v);
  let results = index.filter((r) => FK.every(([k]) => !filters[k] || has(r, k, filters[k])));
  if (q) {
    const terms = q.split(/\s+/);
    results = results.filter((r) => terms.every((w) => r.text.indexOf(w) > -1))
      .map((r) => { const n = r.name.toLowerCase(); return { r, s: n.indexOf(q) === 0 ? 3 : n.indexOf(q) > -1 ? 2 : 1 }; })
      .sort((x, y) => y.s - x.s).map((x) => x.r).slice(0, 20);
  } else if (!nF) results = results.slice(0, 8);
  const isLoading = loading && (!!q || nF > 0);
  if (isLoading) results = [];
  resultsRef.current = results;

  const optsFor = (k) => {
    const c = {};
    index.forEach((r) => (k === 'skill' ? r.skills : [r[k]]).forEach((v) => { if (v) c[v] = (c[v] || 0) + 1; }));
    let arr = Object.keys(c);
    if (k === 'batch') arr.sort((x, y) => y - x);
    else if (k === 'skill') arr = arr.sort((x, y) => c[y] - c[x] || x.localeCompare(y)).slice(0, 14);
    else arr.sort();
    return arr;
  };
  const setF = (k, v) => {
    setFilters((s) => { const nf = { ...s }; if (!v || nf[k] === v) delete nf[k]; else nf[k] = v; return nf; });
    setMenu(null); setIdx(0); pulse();
  };
  const chips = FK.map(([k, L]) => {
    const v = filters[k];
    const isOpen = menu === k;
    return {
      label: v ? (k === 'batch' ? `Batch ${v}` : v) : L, caret: isOpen ? '▴' : '▾', expanded: isOpen ? 'true' : 'false', aria: L + (v ? `: ${v}` : ''),
      bg: v ? '#0F3D2E' : isOpen ? '#EEF6F2' : '#fff', color: v ? '#fff' : '#0F3D2E', border: v ? '#0F3D2E' : isOpen ? '#9FBFB1' : '#DCE5E0',
      toggle: () => setMenu((m) => (m === k ? null : k)),
    };
  });
  const menuOpts = menu ? optsFor(menu).map((v) => {
    const sel = filters[menu] === v;
    return { label: menu === 'batch' ? `Batch ${v}` : v, sel: sel ? 'true' : 'false', check: sel ? '✓ ' : '', bg: sel ? '#E6F0EB' : '#fff', color: sel ? '#0F3D2E' : '#334155', border: sel ? '#9FBFB1' : '#E2E5EA', pick: () => setF(menu, v) };
  }) : [];
  const activeIdx = Math.min(idx, Math.max(0, results.length - 1));
  const terms = q ? q.split(/\s+/) : [];
  const rows = results.map((r, i) => {
    const on = i === activeIdx;
    const isKbd = on && kbd;
    const sk = r.skills.map((s) => ({ s, m: filters.skill === s || terms.some((w) => s.toLowerCase().indexOf(w) > -1) })).sort((x, y) => y.m - x.m);
    const shown = sk.slice(0, 3);
    const extra = sk.length - shown.length;
    return {
      domId: `alum-opt-${i}`, selected: on ? 'true' : 'false', aria: `${r.name}, ${r.role || ''}, ${r.program} batch ${r.batch}. View profile`,
      name: r.name, initials: r.initials, role: r.role || 'Role not shared', meta: [r.program, r.batch ? `Batch ${r.batch}` : ''].filter(Boolean).join(' · '),
      hasTags: shown.length > 0, tags: shown.map((t) => ({ s: t.s, bg: t.m ? '#FEF6DC' : '#F1F5F3', color: t.m ? '#92680B' : '#475569' })), hasMore: extra > 0, more: `+${extra}`,
      bg: on ? '#F5FAF7' : '#fff', border: on ? '#C3DACE' : '#EEF0F3', ring: isKbd ? '0 0 0 3px rgba(15,107,79,.18)' : 'none',
      ctaColor: on ? '#0F3D2E' : '#64748B', ctaBg: on ? '#E6F0EB' : 'transparent', kbd: isKbd, go: r.go,
      keyOpen: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); r.go(); } },
      hover: () => { if (idx !== i || kbd) { setIdx(i); setKbd(false); } },
    };
  });
  const fNames = FK.filter(([k]) => filters[k]).map(([k]) => (k === 'batch' ? `Batch ${filters[k]}` : filters[k]));

  const scrollTo = (i) => setTimeout(() => {
    const list = listRef.current;
    const el = document.getElementById(`alum-opt-${i}`);
    if (!list || !el) return;
    const t = el.offsetTop - list.offsetTop;
    const b = t + el.offsetHeight;
    if (t < list.scrollTop + 6) list.scrollTop = t - 6;
    else if (b > list.scrollTop + list.clientHeight - 6) list.scrollTop = b - list.clientHeight + 6;
  }, 0);

  const overlay = {
    closeSearch,
    stopProp: (e) => e.stopPropagation(),
    searchInputRef: inputRef,
    srListRef: listRef,
    searchQuery: query,
    setSearchQuery: (e) => { const v = e.target.value; setQuery(v); setIdx(0); setKbd(false); if (v.trim()) pulse(); },
    srPlaceholder: narrow ? 'Search alumni…' : staff ? 'Search verified alumni records by name, Membership ID, program or employer…' : 'Search alumni by name, program, batch, skill, or company…',
    srHasQuery: !!query,
    srClearQuery: () => { setQuery(''); setIdx(0); focusSoon(inputRef); },
    srMobile: narrow,
    srDesktop: !narrow,
    srPad: narrow ? '0' : '10vh 16px 16px',
    srRadius: narrow ? '0' : '18px',
    srMaxH: narrow ? '100%' : '78vh',
    srH: narrow ? '100%' : 'auto',
    srHeadPad: narrow ? '8px 12px' : '12px 18px',
    srChipH: narrow ? '40px' : '32px',
    srShowChips: !narrow || filtersOpen || nF > 0,
    srToggleFilters: () => { setFiltersOpen((o) => !o); if (filtersOpen) setMenu(null); },
    srFiltersExpanded: filtersOpen ? 'true' : 'false',
    srFilterBtnBg: filtersOpen || nF ? '#EEF6F2' : '#fff',
    srFilterBtnBorder: filtersOpen || nF ? '#9FBFB1' : '#DCE5E0',
    srChips: chips,
    srHasFilters: nF > 0,
    srFilterCount: String(nF),
    srClearFilters: () => { setFilters({}); setMenu(null); setIdx(0); pulse(); },
    srMenuOn: !!menu,
    srMenuLabel: menu ? `Filter by ${FK.find(([k]) => k === menu)[1].toLowerCase()}` : '',
    srMenuOpts: menuOpts,
    srHeading: q || nF ? 'Results' : staff ? 'Verified alumni records' : 'Fellow UDM alumni',
    srLoading: isLoading,
    srBusy: isLoading ? 'true' : 'false',
    srSkeletons: [1, 2, 3],
    searchActiveId: results.length ? `alum-opt-${activeIdx}` : '',
    searchKeyDown: (e) => {
      const n = resultsRef.current.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!n) return;
        const d = e.key === 'ArrowDown' ? 1 : -1;
        const ni = (idx + d + n) % n;
        setKbd(true); setIdx(ni); scrollTo(ni);
      } else if (e.key === 'Enter') {
        const r = resultsRef.current[Math.min(idx, n - 1)];
        if (r) r.go();
      } else if (e.key === 'Escape' && menu) { e.preventDefault(); e.stopPropagation(); setMenu(null); }
    },
    searchRows: rows,
    searchEmpty: !isLoading && results.length === 0 && !!q && !nF,
    srNoMatch: !isLoading && results.length === 0 && nF > 0,
    srNoMatchSub: `Nothing matches ${fNames.join(' + ')}${q ? ` for “${query.trim()}”` : ''}. Remove a filter or broaden your search.`,
    searchCountLabel: isLoading ? 'Searching…' : q || nF ? results.length + (results.length === 1 ? ' alumnus' : ' alumni') : staff ? 'From Alumni Records' : 'Suggested for you',
  };

  // --- alumni profile card + contact sheet (alumni role only) ---
  const a = card || {};
  const pub = PUBLIC_PROFILE[a.name] || {};
  const contacts = CONTACT_TYPES.filter((t) => (pub.contacts || {})[t.key]).map((t) => {
    const val = pub.contacts[t.key];
    return { label: t.label, value: val, glyph: t.glyph, bg: t.bg, color: t.color, href: t.href(val), target: t.key === 'email' ? '_self' : '_blank' };
  });
  const career = [{ k: 'Current Position', v: a.title }, { k: 'Employer', v: a.company }, { k: 'Industry', v: pub.industry }].filter((r) => r.v)
    .map((r, i, arr) => ({ ...r, span: arr.length === 3 && i === 2 ? '1 / -1' : 'auto' }));
  const journey = [{ k: 'Current Role Since', v: pub.since }, { k: 'First Job After Graduation', v: pub.firstJob }].filter((r) => r.v);
  const rel = pub.related === 'Yes' ? 'yes' : pub.related === 'No' ? 'no' : '';
  const first = (a.name || '').split(' ')[0] || 'This alumnus';
  const cardVals = {
    cardName: a.name || '',
    cardInitials: initials(a.name),
    cardRole: [a.title, a.company].filter(Boolean).join(' · '),
    cardHasRole: !!(a.title || a.company),
    cardProgram: [a.degree, a.batch ? `Batch ${a.batch}` : ''].filter(Boolean).join(' · '),
    cardSkills: (a.skills || []).map((s) => ({ s, go: () => returnToSearch({ query: s }) })),
    cardHasSkills: !!(a.skills || []).length,
    cardCareer: career, cardHasCareer: career.length > 0,
    cardJourney: journey, cardHasJourney: journey.length > 0 || !!rel, cardHasRelevance: !!rel,
    cardRelLabel: rel === 'yes' ? 'Related to degree' : 'Not related to degree', cardRelGlyph: rel === 'yes' ? '✓' : '–',
    cardRelBg: rel === 'yes' ? '#E6F0EB' : '#F1F3F5', cardRelColor: rel === 'yes' ? '#0F6B4F' : '#64748B',
    cardHasUpdated: !!(a.updatedAt || pub.updatedAt), cardUpdated: a.updatedAt || pub.updatedAt || '',
    cardCtaRef, contactCloseRef,
    closeCard: () => returnToSearch(),
    stopProp: (e) => e.stopPropagation(),
    contactList: contacts, contactHas: contacts.length > 0, contactNone: contacts.length === 0, contactFirst: first,
    contactCountLabel: contacts.length ? `${contacts.length} ${contacts.length === 1 ? 'method' : 'methods'} shared by ${first}` : 'No methods shared',
    openContact: () => { setContactOpen(true); focusSoon(contactCloseRef); },
    closeContact: () => { setContactOpen(false); focusSoon(cardCtaRef); },
  };

  const value = useMemo(() => ({ openSearch, closeSearch }), [openSearch, closeSearch]);
  return (
    <SearchContext.Provider value={value}>
      {children}
      {user && open ? <SearchOverlayView {...overlay} /> : null}
      {user && card ? <AlumniCardView {...cardVals} /> : null}
      {user && card && contactOpen ? <ContactModalView {...cardVals} /> : null}
    </SearchContext.Provider>
  );
}

