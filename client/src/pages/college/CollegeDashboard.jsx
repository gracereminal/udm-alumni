import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollegeDashboardView from '../../views/CollegeDashboardView';
import OfflineContactModal from '../../components/OfflineContactModal';
import useChartTip from '../../hooks/useChartTip';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { OUTREACH_METHOD, buildCollegeDash, contactedLabel, deptRange, deptRequests, emptyDeptData } from '../../lib/collegeDash';
import { del, get, post } from '../../lib/api';
import { RANGE_ERROR, pickYear } from '../../lib/batchRange';
import { copyText, isEmail, mailtoUrl, messengerLabel, messengerUrl } from '../../lib/contact';

const PAGES = {
  dashboard: { title: 'College Dashboard', kpis: true, insights: true, outreach: true },
  outreach: { title: 'Outreach', kpis: false, insights: false, outreach: true },
};

const REFRESH_MS = 60000;
const SUBJECT ='UDM Alumni Tracer — we’d love to hear from you';
/** Default outreach message; the dean can edit it before sending. */
const outreachMessage = (first, status, college) => (status === 'Seeking work'
  ? `Hi ${first}! This is the ${college}, Universidad de Manila. We saw that you’re still looking for work — the UDM Alumni portal has new job postings from partner employers, and we’d be glad to help with referrals. Could you also update your employment details in the Alumni Tracer survey when you have a minute? Thank you!`
  : `Hi ${first}! This is the ${college}, Universidad de Manila. We’re updating our graduate records and haven’t received your Alumni Tracer survey yet. It takes about 5 minutes — just sign in to the UDM Alumni portal and complete your profile. Thank you!`);

/**
 * College / Department dashboard, scoped by the API to the signed-in user's college.
 * `section` selects the page: the full dashboard or Outreach. "Contact" hands the conversation to
 * Facebook Messenger or email (outside the portal); POST /outreach records when and how the alumnus was contacted.
 */
export default function CollegeDashboard({ section = 'dashboard' }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { tipH, donutMove, vals: tipVals } = useChartTip();
  const [course, setCourse] = useState('all');
  const [range, setRange] = useState(() => { const r = deptRange({}); return { from: r.from, to: r.to }; });
  const [rangeError, setRangeError] = useState('');
  const [hover, setHover] = useState(null);
  const [data, setData] = useState(emptyDeptData);
  const [reloadKey, setReloadKey] = useState(0);
  const quiet = useRef(false); // the next fetch is a background refresh
  const [target, setTarget] = useState(null); // outreach row being contacted
  const [message, setMessage] = useState('');
  const page = PAGES[section] || PAGES.dashboard;
  const collegeName = (user && user.college) || 'College';

  const reqKey = JSON.stringify(deptRequests({ course, from: range.from, to: range.to }));
  useEffect(() => {
    let live = true;
    const r = JSON.parse(reqKey);
    const keys = Object.keys(r);
    const background = quiet.current;
    quiet.current = false;
    Promise.all(keys.map((k) => get(r[k])))
      .then((res) => { if (live) setData(Object.fromEntries(keys.map((k, i) => [k, res[i]]))); })
      .catch((err) => { if (live && !background) toast(err.message, false); });
    return () => { live = false; };
  }, [reqKey, reloadKey, toast]);
  // Keep the numbers in step with survey answers submitted while the page is open: refetch when the tab comes back
  // into view and every minute while it is (background refreshes fail silently).
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === 'visible') { quiet.current = true; setReloadKey((k) => k + 1); } };
    const timer = setInterval(refresh, REFRESH_MS);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);

  const close = () => setTarget(null);
  const done = (msg) => { close(); toast(msg); setReloadKey((k) => k + 1); };
  const failed = (err) => toast(err.message || 'Something went wrong. Please try again.', false);
  const onYear = (key) => (e) => {
    const next = pickYear(range, key, e.target.value);
    setRangeError(next ? '' : RANGE_ERROR);
    if (next) setRange(next);
  };

  const { vals, slices } = buildCollegeDash({ course, from: range.from, to: range.to }, data, {
    user, setHover, hoverId: hover, tipH,
    setCourse: (c) => { setCourse(c); setHover(null); },
    openContact: (row) => { setTarget(row); setMessage(outreachMessage(row.name.split(' ')[0], row.status, collegeName)); },
  });

  const contactVals = () => {
    if (!target) return null;
    const { id, name, contacts, contacted: mark } = target;
    const first = name.split(' ')[0];
    const channels = [];
    if (isEmail(contacts.email)) {
      channels.push({ key: 'email', label: 'Email', via: 'Email', value: contacts.email, copy: contacts.email, href: mailtoUrl(contacts.email, SUBJECT, message), openLabel: 'Open email' });
    }
    const fb = messengerUrl(contacts.facebook);
    // Messenger links can't carry a prefilled message, so it goes to the clipboard to paste into the chat.
    if (fb) channels.push({ key: 'fb', label: 'Facebook Messenger', via: 'Messenger', value: messengerLabel(contacts.facebook), href: fb, external: true, openLabel: 'Open Messenger', onOpen: () => copyText(message) });
    return {
      title: `Contact ${name}`,
      lead: 'The system does not send messages. Reach out through your own email or Messenger, then mark the alumnus as contacted here.',
      note: mark ? `Last contacted ${contactedLabel(mark)}` : '',
      message, onMessage: (e) => setMessage(e.target.value),
      messageHint: 'Included automatically when you open email. Paste it into Messenger.',
      channels,
      noneText: `${first} has no Facebook / Messenger or email on file. Ask the Alumni Office to update the record, or reach out through the registrar’s contact details.`,
      // The API records which channel was used, so there is nothing to mark without one.
      doneLabel: channels.length ? 'Mark as contacted' : null,
      onClose: close,
      onConfirm: (via) => post('/outreach', { alumni_id: id, method: OUTREACH_METHOD[via] || 'email', message }).then(
        () => done(`${name} marked as contacted via ${via}.`), failed,
      ),
      undo: mark && mark.id ? { label: 'Remove contacted mark', onClick: () => del(`/outreach/${mark.id}`).then(() => done(`Contact mark removed for ${name}.`), failed) } : null,
    };
  };

  const v = {
    ...vals,
    ...tipVals,
    pageTitle: page.title,
    showKpis: page.kpis,
    showInsights: page.insights,
    showOutreach: page.outreach,
    onDeptCourseChange: (e) => { setCourse(e.target.value); setHover(null); },
    onDeptFromChange: onYear('from'),
    onDeptToChange: onYear('to'),
    rangeError,
    onDeptStatusMove: donutMove(slices, 'edge'),
    goRecords: () => navigate('/college/records'),
    goReports: () => navigate('/college/reports', { state: { course, from: range.from, to: range.to } }),
    exportHover: { background: '#0B3123' },
    rowHover: { background: '#FBFCFC' },
  };
  const cv = contactVals();
  return (
    <>
      <CollegeDashboardView {...v} />
      {cv ? <OfflineContactModal key={target.id} {...cv} /> : null}
    </>
  );
}
