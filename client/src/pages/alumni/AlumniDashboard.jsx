import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AlumniDashboardView from '../../views/AlumniDashboardView';
import { useProfile } from '../../context/ProfileContext';
import { useJobs } from '../../context/JobsContext';
import { useEvents } from '../../context/EventsContext';
import { isAnswered } from '../../data/formDefs';
import { jobKey } from '../../data/jobs';
import { initials, RECORD_STATUS } from '../../lib/format';

/* SVG paths for the KPI card icons. */
const ICONS = {
  portal: 'M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z M8.5 12l2.5 2.5L16 9.5',
  employment: 'M3 8h18v11H3z M8 8V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M3 13h18',
  months: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 7v5l3 2',
  relevance: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M12 12.01V12',
};

/** Alumni Dashboard — profile summary, survey status, announcements & events feed, job matches. */
export default function AlumniDashboard() {
  const navigate = useNavigate();
  const { a, surveyComplete, progress, alumniName, avatar, record } = useProfile();
  const { activeJobs, recommended } = useJobs();
  const { announcementItems } = useEvents();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [annTab, setAnnTab] = useState('all');

  const ink = '#0A0A0A';
  const muted = 'rgba(0,0,0,.62)';
  const set = (id) => isAnswered(a, id);
  const av = (id, fb) => {
    const v = a[id];
    if (Array.isArray(v)) return v.length ? v.join(', ') : fb || 'Not answered';
    return v != null && String(v).trim() !== '' ? v : fb || 'Not answered';
  };
  const f = (label, id, fb) => ({ label, value: av(id, fb), color: set(id) ? ink : muted });

  const { total, done, pct } = progress;
  const employed = a.ever_employed === 'Yes';
  const selfEmp = a.job_status === 'Self-employed' || a.org_type === 'Self-owned business';
  const empValue = a.ever_employed == null ? 'Not answered' : employed ? a.job_status || 'Employed' : 'Not yet employed';
  const relevance = a.job_related === 'Yes' ? 'Related to course' : a.job_related === 'No' ? 'Not related to course' : 'Not answered';
  const complete = surveyComplete;
  const remaining = Math.max(total - done, 0);

  const items = announcementItems();
  const evs = items.filter((x) => x.isEvent);
  const ns = items.filter((x) => !x.isEvent);
  const feed = (annTab === 'events' ? evs : annTab === 'announcements' ? ns : items)
    .map((it) => ({ ...it, onOpen: it.isEvent ? () => navigate('/alumni/events', { state: { eventId: it.id } }) : null }));
  const annTabs = [['all', 'All', items.length], ['announcements', 'Announcements', ns.length], ['events', 'Events', evs.length]].map(([k, label, count]) => {
    const on = k === annTab;
    return {
      label, count, selected: on ? 'true' : 'false', line: on ? '#0F3D2E' : 'transparent', weight: on ? 700 : 600, color: on ? '#0B1220' : '#64748B',
      countColor: on ? '#0F3D2E' : '#64748B', countBg: on ? '#E6F0EB' : '#F1F3F5', onClick: () => setAnnTab(k),
    };
  });

  // "Recommended jobs for you" (matched to the course and skills by the API); the latest postings when nothing matches.
  const recs = (recommended || []).filter((j) => j.status === 'active');
  const cardJobs = (recs.length ? recs : activeJobs).slice(0, 3)
    .map((j) => ({
      ...j, why: j.match?.terms?.length ? `Matches: ${j.match.terms.join(', ')}` : '',
      onOpen: () => navigate('/alumni/jobs', { state: { jobKey: jobKey(j) } }),
    }));

  const course = a.course || a.course_other;
  const status = RECORD_STATUS[record?.status] || null;

  const v = {
    alumniName,
    dashStatus: status ? { label: status[0], color: status[1], bg: status[2] } : null,
    dashBatch: a.year_graduated ? `CLASS OF ${String(a.year_graduated).slice(0, 4)}` : null,
    dashSubline: [course ? course.replace(/^Bachelor of Science in /, 'BS ').replace(/^Bachelor of Arts in /, 'BA ') : 'Course not set', record?.membershipId || 'Alumni ID not yet assigned'].join(' · '),
    avatarInitials: initials(alumniName),
    avatarCss: avatar ? `url("${avatar}") center/cover no-repeat` : 'none',
    hasAvatar: !!avatar,
    noAvatar: !avatar,
    surveyComplete: complete,
    surveyIncomplete: !complete,
    showSurveyBanner: !complete && !bannerDismissed,
    showSurveyGhostCta: !complete && bannerDismissed,
    surveyGhostCtaLabel: 'Continue Profile',
    dismissSurveyBanner: () => setBannerDismissed(true),
    dashSurveyPct: `${pct}%`,
    dashSurveyRemainingLabel: remaining === 1 ? '1 question still needs an answer.' : `${remaining} questions still need answers.`,
    jobsOrder: 1,
    announceOrder: 2, // jobs on the left, Announcements & Events on the right
    jobsCardShadow: complete ? '0 10px 28px rgba(0,40,33,.10)' : 'none',
    dashMetrics: [
      { label: 'Portal Status', icon: ICONS.portal, value: 'Active', sub: 'Alumni account in good standing', tag: '', valueColor: '#0A0A0A', tagColor: '#0F8A5F', tagBg: '#E1F3EA' },
      {
        label: 'Employment Status', icon: ICONS.employment, value: empValue, sub: employed ? av('org_type', 'Organization type not answered') : 'Section IV response',
        tag: employed ? 'EMPLOYED' : a.ever_employed === 'No' ? 'UNEMPLOYED' : 'NOT ANSWERED', valueColor: set('ever_employed') ? ink : muted,
        tagColor: employed ? '#0F8A5F' : '#8A6D1F', tagBg: employed ? '#E1F3EA' : '#FBF0D8',
      },
      {
        label: 'Months Before First Job', icon: ICONS.months, value: av('time_to_job'), sub: employed ? 'Months after graduating from UDM' : 'Answer Section V to record this',
        tag: set('time_to_job') ? 'RECORDED' : 'NOT ANSWERED', valueColor: set('time_to_job') ? ink : muted,
        tagColor: set('time_to_job') ? '#0F3D2E' : '#8A6D1F', tagBg: set('time_to_job') ? '#E6F0EB' : '#FBF0D8',
      },
      {
        label: 'Course Relevance', icon: ICONS.relevance, value: relevance, sub: av('occ_class', 'Occupational classification not answered'),
        tag: selfEmp ? 'SELF-EMPLOYED' : 'GRADUATE OUTCOME', valueColor: set('job_related') ? ink : muted, tagColor: 'rgba(0,0,0,.5)', tagBg: '#F2F0EA',
      },
    ],
    annTabs,
    annFeed: feed.slice(0, 3),
    annFeedEmpty: feed.length === 0,
    annShowFooter: feed.length > 0,
    annFeedEmptyText: annTab === 'events' ? 'No upcoming events right now.' : annTab === 'announcements' ? 'No announcements right now.' : 'Nothing posted yet.',
    dashJobs: cardJobs,
    dashJobsMatched: recs.length > 0,
    dashJobsTitle: recs.length ? 'Recommended jobs for you' : 'Job Board',
    dashJobsBrowseLabel: activeJobs.length === 1 ? 'Browse 1 posting →' : `Browse all ${activeJobs.length} postings →`,
    goJobs: () => navigate('/alumni/jobs'),
    goEvents: () => navigate('/alumni/events'),
    goProfile: () => navigate('/alumni/profile'),
    goSurvey: () => navigate('/alumni/profile/edit'),
  };
  void f;
  return <AlumniDashboardView {...v} />;
}
