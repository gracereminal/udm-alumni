import { useSyncExternalStore } from 'react';
import { del, get, post, put } from './api';

/**
 * Admin "Alumni Tracer" edits to the Register and Edit Profile questions, from GET /tracer/questions (the
 * `tracer_question` table). Shape: { ov: { [questionId]: { label, placeholder, options, required, hidden } },
 * custom: [{ id, sec, label, type, options }], order: { [sectionKey]: [questionId…] } }.
 * Only the edits are stored — the default questions stay in data/formDefs.js, so "Reset" just drops an edit.
 * The forms read it synchronously, so it is loaded once at start-up (main.jsx) and replaced by each write's reply.
 */
const EMPTY = { ov: {}, custom: [], order: {} };
let cached = EMPTY;

const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

/** Current config (a stable snapshot for React until the next load or write). */
export const getQuestionConfig = () => cached;

export function setQuestionConfig(t) {
  cached = t && t.ov ? { ov: { ...t.ov }, custom: Array.isArray(t.custom) ? t.custom : [], order: { ...(t.order || {}) } } : EMPTY;
  notify();
  return cached;
}

/** GET /tracer/questions (public: registration needs it). */
export async function loadQuestionConfig() {
  return setQuestionConfig(await get('/tracer/questions'));
}

/**
 * Admin writes. Each returns the new config, which every form then uses. They throw ApiError on failure
 * (e.g. 422 when a core question would be hidden or made optional).
 */
export const questionApi = {
  /** Edit a default or added question: any of label, placeholder, options, required, hidden (`null` clears one edit). */
  update: async (id, section, patch) => setQuestionConfig(await put(`/tracer/questions/${id}`, { section, ...patch })),
  /** Add a question to a section. */
  add: async (section, { label, type, options }) => setQuestionConfig(await post('/tracer/questions', { section, label, type, options })),
  /** Reset a default question's edits, or delete an added question. */
  remove: async (id) => setQuestionConfig(await del(`/tracer/questions/${id}`)),
  /** Display order of one section. */
  order: async (section, ids) => setQuestionConfig(await put(`/tracer/sections/${section}/order`, { ids })),
  resetAll: async () => setQuestionConfig(await del('/tracer/questions')),
};

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-renders the caller whenever the questions change. */
export function useQuestionConfig() {
  return useSyncExternalStore(subscribe, getQuestionConfig, getQuestionConfig);
}

/**
 * The questions of section `sec` after the admin's edits: added questions appended, order applied, label /
 * placeholder / options / required overridden, hidden ones dropped (`raw: true` keeps them, for the admin page).
 */
export function applyQuestions(sec, qs, { raw = false } = {}) {
  const t = getQuestionConfig();
  let list = qs.concat(
    t.custom.filter((c) => c.sec === sec).map((c) => ({ id: c.id, label: c.label, type: c.type, options: c.options, span: 'span 2', custom: true, optional: true })),
  );
  const ord = t.order[sec];
  if (ord) {
    const ix = (id) => { const i = ord.indexOf(id); return i < 0 ? 999 : i; };
    list = list.map((q, i) => [q, i]).sort((x, y) => ix(x[0].id) - ix(y[0].id) || x[1] - y[1]).map((x) => x[0]);
  }
  list = list.map((q) => {
    const o = t.ov[q.id];
    const n = { ...q, required: !!q.required };
    if (!o) return n;
    if (o.label != null) n.label = o.label;
    if (o.placeholder != null) n.placeholder = o.placeholder;
    if (o.options && !q.linked) n.options = o.options;
    if (o.required != null && !q.core) n.required = o.required;
    n.hidden = !!o.hidden && !q.core;
    return n;
  });
  return raw ? list : list.filter((q) => !q.hidden);
}
