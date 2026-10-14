-- Up Migration
-- Stat views (docs/plan-backend.md "Metric definitions"). Every screen's numbers are aggregates of these views,
-- so the admin dashboard, college dashboard, Records counters and Reports agree by construction.

-- The cycle stats are computed for: the open cycle, else the most recently opened one.
CREATE VIEW v_active_cycle AS
SELECT c.*
FROM survey_cycle c
WHERE c.cycle_id = COALESCE(
  (SELECT cycle_id FROM survey_cycle WHERE status = 'open' LIMIT 1),
  (SELECT cycle_id FROM survey_cycle WHERE status <> 'draft' ORDER BY opens_on DESC, cycle_id DESC LIMIT 1)
);

-- Base population: every ALUMNUS that is neither archived nor merged, joined to its college,
-- its submitted response for the active cycle and its one current employment record.
CREATE VIEW v_alumni_current AS
SELECT
  a.alumni_id,
  a.user_id,
  a.membership_id,
  a.student_no,
  a.program_id,
  COALESCE(p.college_id, a.declared_college_id) AS college_id,
  a.year_graduated AS batch,
  a.verification_status,
  a.is_indigenous,
  a.indigenous_group,
  (a.pwd_type IS NOT NULL) AS is_pwd,
  a.pwd_type,
  a.created_at,
  r.response_id,
  r.completion_pct,
  r.first_gen_grad,
  r.submitted_at,
  (r.response_id IS NOT NULL) AS traced,
  e.employment_status,
  e.course_relevance,
  e.time_to_job_bucket,
  e.months_to_first_job,
  e.employer_name,
  e.job_title,
  e.line_of_business,
  e.org_type,
  e.occupation_class,
  (r.response_id IS NOT NULL AND e.employment_status IN ('employed', 'self_employed')) AS employed
FROM alumnus a
LEFT JOIN program p ON p.program_id = a.program_id
LEFT JOIN v_active_cycle c ON true
LEFT JOIN survey_response r ON r.alumni_id = a.alumni_id AND r.cycle_id = c.cycle_id AND r.status = 'submitted'
LEFT JOIN employment_record e ON e.alumni_id = a.alumni_id AND e.is_current
WHERE a.archived_at IS NULL AND a.merged_into_id IS NULL;

-- college x program x batch x verification status. Every aggregate is a SUM over this view.
CREATE VIEW v_stats_grain AS
SELECT
  college_id,
  program_id,
  batch,
  verification_status,
  count(*)::int                                                                         AS total,
  count(*) FILTER (WHERE traced)::int                                                   AS traced,
  COALESCE(sum(completion_pct) FILTER (WHERE traced), 0)::int                           AS completion_sum,
  count(*) FILTER (WHERE traced AND completion_pct = 100)::int                          AS completed,
  count(*) FILTER (WHERE employed)::int                                                 AS employed,
  count(*) FILTER (WHERE traced AND employment_status = 'employed')::int                AS wage_employed,
  count(*) FILTER (WHERE traced AND employment_status = 'self_employed')::int           AS self_employed,
  count(*) FILTER (WHERE traced AND employment_status = 'further_studies')::int         AS further_studies,
  count(*) FILTER (WHERE traced AND employment_status = 'not_employed')::int            AS not_employed,
  count(*) FILTER (WHERE employed AND course_relevance = 'related')::int                AS aligned,
  count(*) FILTER (WHERE traced AND first_gen_grad)::int                                AS first_gen,
  count(*) FILTER (WHERE traced AND is_indigenous)::int                                 AS ip,
  count(*) FILTER (WHERE employed AND is_indigenous)::int                               AS ip_employed,
  count(*) FILTER (WHERE traced AND is_indigenous AND employment_status = 'further_studies')::int AS ip_further,
  count(*) FILTER (WHERE traced AND is_pwd)::int                                        AS pwd,
  count(*) FILTER (WHERE employed AND is_pwd)::int                                      AS pwd_employed,
  count(*) FILTER (WHERE traced AND is_pwd AND employment_status = 'further_studies')::int AS pwd_further,
  COALESCE(sum(months_to_first_job) FILTER (WHERE employed), 0)::numeric                AS months_sum,
  count(months_to_first_job) FILTER (WHERE employed)::int                               AS months_n,
  count(*) FILTER (WHERE employed AND time_to_job_bucket = 'lt_1m')::int                AS ttj_lt_1m,
  count(*) FILTER (WHERE employed AND time_to_job_bucket = 'm1_6')::int                 AS ttj_m1_6,
  count(*) FILTER (WHERE employed AND time_to_job_bucket = 'm7_11')::int                AS ttj_m7_11,
  count(*) FILTER (WHERE employed AND time_to_job_bucket = 'y1_2')::int                 AS ttj_y1_2,
  count(*) FILTER (WHERE employed AND time_to_job_bucket = 'y2_3')::int                 AS ttj_y2_3,
  count(*) FILTER (WHERE employed AND time_to_job_bucket = 'y3_4')::int                 AS ttj_y3_4,
  count(*) FILTER (WHERE employed AND time_to_job_bucket = 'gt_4y')::int                AS ttj_gt_4y
FROM v_alumni_current
GROUP BY college_id, program_id, batch, verification_status;

-- Records counters: the population by status, plus archived records (which are outside the population).
CREATE VIEW v_records_counters AS
SELECT
  COALESCE(p.college_id, a.declared_college_id) AS college_id,
  a.program_id,
  a.year_graduated AS batch,
  count(*) FILTER (WHERE a.archived_at IS NULL AND a.verification_status = 'pending')::int  AS pending,
  count(*) FILTER (WHERE a.archived_at IS NULL AND a.verification_status = 'flagged')::int  AS flagged,
  count(*) FILTER (WHERE a.archived_at IS NULL AND a.verification_status = 'verified')::int AS verified,
  count(*) FILTER (WHERE a.archived_at IS NOT NULL)::int                                    AS archived
FROM alumnus a
LEFT JOIN program p ON p.program_id = a.program_id
WHERE a.merged_into_id IS NULL
GROUP BY 1, 2, 3;

-- Outreach list: alumni seeking work, without a survey response, or newly registered (14 days).
CREATE VIEW v_unresponsive AS
SELECT
  v.alumni_id,
  v.college_id,
  v.program_id,
  v.batch,
  a.last_name,
  a.first_name,
  a.created_at,
  CASE
    WHEN v.traced AND v.employment_status = 'not_employed' THEN 'seeking'
    WHEN NOT v.traced AND a.created_at > now() - interval '14 days' THEN 'new'
    ELSE 'no_response'
  END AS reason,
  (SELECT max(o.contacted_at) FROM outreach_contact o WHERE o.alumni_id = v.alumni_id) AS last_contacted_at
FROM v_alumni_current v
JOIN alumnus a ON a.alumni_id = v.alumni_id
WHERE NOT v.traced OR v.employment_status = 'not_employed';

-- Public directory: opted-in alumni only, visible links only, email/mobile only when their flag is on.
CREATE VIEW v_directory AS
SELECT
  a.alumni_id,
  concat_ws(' ', a.first_name, a.last_name) AS name,
  a.student_no,
  a.membership_id,
  COALESCE(p.abbr, a.course_other) AS degree,
  p.name AS program_name,
  COALESCE(p.college_id, a.declared_college_id) AS college_id,
  a.year_graduated AS batch,
  a.photo_url,
  a.industry,
  a.bio,
  e.job_title AS title,
  e.employer_name AS company,
  e.employment_status,
  e.time_to_job_bucket,
  e.course_relevance,
  extract(year FROM e.reported_at)::int AS since,
  CASE WHEN a.show_email THEN u.email END AS email,
  CASE WHEN a.show_mobile THEN a.mobile_no END AS mobile,
  COALESCE((SELECT jsonb_object_agg(l.platform, l.url) FROM social_link l WHERE l.alumni_id = a.alumni_id AND l.is_visible), '{}'::jsonb) AS links,
  COALESCE((SELECT jsonb_agg(s.name ORDER BY x.is_top DESC, s.name) FROM alumni_skill x JOIN skill s ON s.skill_id = x.skill_id WHERE x.alumni_id = a.alumni_id), '[]'::jsonb) AS skills
FROM alumnus a
LEFT JOIN program p ON p.program_id = a.program_id
LEFT JOIN user_account u ON u.user_id = a.user_id
LEFT JOIN employment_record e ON e.alumni_id = a.alumni_id AND e.is_current
WHERE a.directory_opt_in AND a.archived_at IS NULL AND a.merged_into_id IS NULL;

-- Alumni dashboard counters for one alumnus.
CREATE VIEW v_alumni_dashboard AS
SELECT
  a.alumni_id,
  (SELECT count(*) FROM event_registration r JOIN event ev ON ev.event_id = r.event_id
     WHERE r.alumni_id = a.alumni_id AND r.cancelled_at IS NULL AND ev.deleted_at IS NULL AND ev.cancelled_at IS NULL
       AND ev.starts_at >= now())::int AS upcoming_events,
  (SELECT count(*) FROM saved_job s JOIN job_posting j ON j.job_id = s.job_id
     WHERE s.alumni_id = a.alumni_id AND s.saved_at IS NOT NULL AND j.deleted_at IS NULL)::int AS saved_jobs,
  (SELECT count(*) FROM saved_job s WHERE s.alumni_id = a.alumni_id AND s.applied_at IS NOT NULL)::int AS applications
FROM alumnus a;

-- Event status and live registration counts.
CREATE VIEW v_event_stats AS
SELECT
  ev.event_id,
  ev.capacity,
  (SELECT count(*) FROM event_registration r WHERE r.event_id = ev.event_id AND r.cancelled_at IS NULL)::int AS registered,
  CASE
    WHEN ev.cancelled_at IS NOT NULL THEN 'cancelled'
    WHEN ev.ended_at IS NOT NULL OR (COALESCE(ev.ends_at, ev.starts_at) AT TIME ZONE 'Asia/Manila')::date < app_today() THEN 'past'
    WHEN ev.reg_status = 'closed' THEN 'closed'
    WHEN ev.reg_status = 'full' THEN 'full'
    WHEN ev.capacity IS NOT NULL
      AND (SELECT count(*) FROM event_registration r WHERE r.event_id = ev.event_id AND r.cancelled_at IS NULL) >= ev.capacity THEN 'full'
    ELSE 'open'
  END AS status_key
FROM event ev
WHERE ev.deleted_at IS NULL;

CREATE VIEW v_job_stats AS
SELECT
  j.job_id,
  (SELECT count(*) FROM saved_job s WHERE s.job_id = j.job_id AND s.saved_at IS NOT NULL)::int   AS saves,
  (SELECT count(*) FROM saved_job s WHERE s.job_id = j.job_id AND s.applied_at IS NOT NULL)::int AS applications
FROM job_posting j
WHERE j.deleted_at IS NULL;

-- Down Migration
DROP VIEW IF EXISTS v_job_stats, v_event_stats, v_alumni_dashboard, v_directory, v_unresponsive, v_records_counters,
  v_stats_grain, v_alumni_current, v_active_cycle;
