import { regStepDefs, surveySectionDefs, visibleQs, isAnswered } from '../data/formDefs';

const SHORT = ['Personal', 'Contact', 'Education'];

/** Personal, contact, education and employment fields shown on the Profile page. */
export function profileGroups(a) {
  const defs = surveySectionDefs();
  const sec = (id) => defs.find((s) => s.id === id);
  const shown = (id) => (sec(id).when ? sec(id).when(a) : true);
  const steps = regStepDefs(a).map((s, i) => ({ title: s.title, sub: s.sub, short: SHORT[i] || s.title, questions: s.questions }));
  const edu = steps.find((s) => s.short === 'Education');
  edu.questions = [...edu.questions, ...sec('edu').questions];
  steps.push({
    title: 'Employment & Career',
    sub: 'Current job, employer and how you got there',
    short: 'Employment',
    questions: [...sec('employment').questions, ...(shown('details') ? sec('details').questions : []), ...(shown('self') ? sec('self').questions : [])],
  });
  const feedback = sec('feedback');
  steps.push({ title: feedback.title, sub: 'Your recommendations to the university', short: feedback.short, questions: feedback.questions });
  return steps;
}

// Only Required questions count (the Admin's Required toggle in Alumni Tracer decides), so they drive the Dashboard's
// "Action Required" banner and the Edit Profile progress. Program and "Others" are alternatives — either one answers
// the program question.
export const countedQs = (qs) => qs.filter((q) => q.id !== 'course_other' && q.required);
export const answered = (a, q) => (q.id === 'course' ? isAnswered(a, 'course') || isAnswered(a, 'course_other') : isAnswered(a, q.id));

/** Answered / total questions across the profile — shared by Dashboard, Profile, Edit Profile and the alumnus' record. */
export function profileProgress(a) {
  let total = 0;
  let done = 0;
  profileGroups(a).forEach((g) =>
    countedQs(visibleQs(g, a)).forEach((q) => {
      total += 1;
      if (answered(a, q)) done += 1;
    }),
  );
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
}
