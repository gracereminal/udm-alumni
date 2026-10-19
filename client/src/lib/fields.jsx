import DatePicker from '../components/DatePicker';
import { capitalizeWords, tidyAddress } from './format';

/**
 * Builds the view-model for one survey/registration question (text, date, select, textarea, choice chips).
 * `errors` is an optional map of question id -> message (shown in red below the field).
 */
export function buildField(q, a, { setA, toggleA }, errors = {}) {
  const v = a[q.id];
  const error = errors[q.id] || '';
  const base = {
    id: q.id, label: q.label, span: q.span || 'span 2', hint: q.hint || '', error,
    borderColor: error ? '#B3261E' : 'rgba(0,0,0,.14)',
    isText: false, isDate: false, dateEl: null, isTextarea: false, isSelect: false, isChoice: false,
    inputType: 'text', value: '', placeholder: q.placeholder || '', options: [], chips: [],
    onInput: () => {},
  };
  if (q.type === 'date') {
    return Object.assign(base, { isDate: true, dateEl: <DatePicker key={q.id} value={v || ''} invalid={!!error} onChange={(iso) => setA(q.id, iso)} /> });
  }
  if (q.type === 'text' && q.format === 'address') {
    // `sameAs` adds a checkbox that copies another address field and locks this one while ticked.
    const same = !!(q.sameAs && a[q.sameAs.flag]);
    return Object.assign(base, {
      isText: true,
      inputType: 'text',
      value: same ? a[q.sameAs.id] || '' : v || '',
      disabled: same,
      autoCapitalize: 'words',
      sameAs: q.sameAs ? { label: q.sameAs.label, checked: same, onToggle: (e) => setA(q.sameAs.flag, e.target.checked) } : null,
      onInput: (e) => {
        // Capitalizing never changes the length, so the caret can be put back where the user was typing.
        const el = e.target;
        const next = capitalizeWords(el.value);
        if (next !== el.value) {
          const pos = el.selectionStart;
          el.value = next;
          el.setSelectionRange(pos, pos);
        }
        setA(q.id, next);
      },
      onBlur: (e) => {
        const next = tidyAddress(e.target.value);
        if (next !== (v || '')) setA(q.id, next);
      },
    });
  }
  if (q.type === 'text') {
    return Object.assign(base, { isText: true, inputType: 'text', value: v || '', disabled: !!q.disabled, onInput: (e) => setA(q.id, e.target.value) });
  }
  if (q.type === 'password') {
    return Object.assign(base, { isText: true, inputType: 'password', value: v || '', onInput: (e) => setA(q.id, e.target.value) });
  }
  if (q.type === 'textarea') {
    return Object.assign(base, { isTextarea: true, value: v || '', placeholder: q.placeholder || 'Type your answer…', onInput: (e) => setA(q.id, e.target.value) });
  }
  if (q.type === 'select') {
    return Object.assign(base, {
      isSelect: true,
      value: v || '',
      options: [{ value: '', label: q.placeholder || 'Select…' }].concat((q.options || []).map((o) => ({ value: o, label: o }))),
      onInput: (e) => setA(q.id, e.target.value),
    });
  }
  if (q.type === 'combo') {
    return Object.assign(base, {
      isCombo: true,
      value: v || '',
      comboOptions: q.options || [],
      onInput: (e) => setA(q.id, e.target.value.replace(/\D/g, '').slice(0, 4)),
      onPick: (o) => setA(q.id, o),
    });
  }
  const multi = q.type === 'multi';
  const sel = multi ? v || [] : v;
  return Object.assign(base, {
    isChoice: true,
    hint: q.hint || (multi ? 'You may pick more than one' : ''),
    chips: (q.options || []).map((o) => {
      const on = multi ? sel.indexOf(o) > -1 : sel === o;
      return {
        label: o,
        bg: on ? '#0F3D2E' : '#fff',
        color: on ? '#fff' : '#334155',
        border: on ? '#0F3D2E' : '#E2E5EA',
        onClick: () => (multi ? toggleA(q.id, o) : setA(q.id, o)),
      };
    }),
  });
}

