import Modal from '../Modal';
import { jobKey } from '../../data/jobs';
import { applyUrl, messengerLabel, messengerUrl } from '../../lib/contact';

const chip = { fontSize: 11.5, fontWeight: 600, color: '#64748B', background: '#F1F5F9', padding: '4px 10px', borderRadius: 8 };

/** Full job posting with save / apply actions. */
export default function JobDetailsModal({ job, saved, application, onClose, onSave, onApply }) {
  if (!job) return null;
  const key = jobKey(job);
  const applyHref = applyUrl(job.applyVia, `Application — ${job.title} (UDM alumnus)`);
  const rows = [
    ['Company', job.company], ['Location & setup', job.location], ['Employment type', job.type], ['Salary', `${job.salary}${job.salaryNote ? ` · ${job.salaryNote}` : ''}`],
    ['Posted', job.posted], ['Apply by', job.deadline || 'Open until filled'], ['Apply via', job.applyVia || 'UDM Alumni Relations Office'],
    ...(messengerUrl(job.messenger) ? [['Messenger', messengerLabel(job.messenger)]] : []),
  ];
  return (
    <Modal
      open onClose={onClose} width={620} eyebrow={`${job.type} · ${job.badge || 'Job posting'}`} title={job.title}
      footer={(
        <>
          <button type="button" onClick={() => onSave(key)} style={{ border: '1px solid #E2E5EA', background: saved ? '#E6F0EB' : '#fff', color: '#0F3D2E', borderRadius: 10, padding: '11px 18px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
            {saved ? '★ Saved' : '☆ Save job'}
          </button>
          <button type="button" onClick={() => onApply(key)} style={{ border: '1px solid #0F3D2E', background: application ? '#E6F0EB' : '#0F3D2E', color: application ? '#0F3D2E' : '#fff', borderRadius: 10, padding: '11px 22px', fontFamily: 'inherit', fontWeight: 700, fontSize: 13.5, cursor: 'pointer' }}>
            {application ? '✓ Applied — withdraw' : 'Apply now'}
          </button>
        </>
      )}
    >
      {application ? (
        <div style={{ background: '#E6F0EB', border: '1px solid #B9D4C7', borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#0F3D2E', fontWeight: 600 }}>
          {application.status} · {new Date(application.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,230px),1fr))', gap: '12px 20px', marginBottom: 16 }}>
        {rows.map(([k, v]) => (
          <div key={k} style={{ minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 3 }}>{k}</div>
            <div style={{ fontSize: 13.5, color: '#0B1220', fontWeight: 600, wordBreak: 'break-word' }}>
              {k === 'Messenger'
                ? <a href={messengerUrl(job.messenger)} target="_blank" rel="noopener noreferrer" style={{ color: '#0F6B4F' }}>{v} ↗</a>
                : k === 'Apply via' && applyHref
                ? <a href={applyHref} target={/^mailto:/.test(applyHref) ? undefined : '_blank'} rel="noopener noreferrer" style={{ color: '#0F6B4F' }}>{v} ↗</a>
                : v}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: '#94A3B8', marginBottom: 6 }}>About the role</div>
      <div style={{ color: '#334155', marginBottom: 14, whiteSpace: 'pre-wrap' }}>{job.desc || 'No description provided.'}</div>
      {(job.tags || []).length ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{job.tags.map((t) => <span key={t} style={chip}>{t}</span>)}</div> : null}
      {job.note ? <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 600, color: '#0F3D2E' }}>{job.note}</div> : null}
    </Modal>
  );
}
