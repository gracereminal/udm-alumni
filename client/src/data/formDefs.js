import { COLLEGES, gradYears } from './colleges';

// Registration = II. Personal Information + Contact + selected III. Educational Background only.
export function regStepDefs(a) {
  const courseOpts = COLLEGES[a.college] || [];
  return [
    {
      title: 'Personal Information', sub: 'Basic information, address, and civil status',
      heading: 'Personal Information', desc: 'Section II of the alumni survey — entered once, reused everywhere.',
      questions: [
        { id: 'last_name', label: 'Last Name', type: 'text', span: 'span 1' },
        { id: 'first_name', label: 'First Name', type: 'text', span: 'span 1' },
        { id: 'middle_name', label: 'Middle Name', type: 'text', span: 'span 1' },
        { id: 'dob', label: 'Date of Birth', type: 'date', span: 'span 1' },
        { id: 'present_address', label: 'Present Address', type: 'text', span: 'span 1', placeholder: 'House No., Street, Barangay' },
        { id: 'permanent_address', label: 'Permanent Address', type: 'text', span: 'span 1', placeholder: 'House No., Street, Barangay' },
        { id: 'gender', label: 'Gender', type: 'choice', options: ['Male', 'Female', 'Prefer not to say'], span: 'span 1' },
        { id: 'marital_status', label: 'Marital Status', type: 'choice', options: ['Single', 'Married', 'Separated', 'Widowed'], span: 'span 1' },
        { id: 'married_name', label: 'If Married, provide the Full Name after marriage:', type: 'text', span: 'span 2', when: (x) => x.marital_status === 'Married', hint: 'Shown because Marital Status = Married' },
        { id: 'indigenous', label: 'Are you a member of an Indigenous People (IP) group?', type: 'choice', options: ['Yes', 'No'], span: 'span 1' },
        { id: 'pwd', label: 'Are you a Person with Disability (PWD)?', type: 'choice', options: ['Yes', 'No'], span: 'span 1' },
        {
          id: 'indigenous_group', label: 'If Yes, specify your Indigenous group:', type: 'text', span: 'span 1', placeholder: 'e.g. Aeta, Igorot, Lumad, Mangyan',
          when: (x) => x.indigenous === 'Yes', hint: 'Shown because IP = Yes',
        },
        {
          id: 'pwd_type', label: 'If Yes, type of disability:', type: 'select', span: 'span 1', placeholder: 'Select type of disability',
          options: ['Visual', 'Hearing', 'Speech and Language', 'Physical / Orthopedic', 'Intellectual', 'Learning', 'Psychosocial', 'Mental', 'Chronic Illness', 'Others'],
          when: (x) => x.pwd === 'Yes', hint: 'Shown because PWD = Yes',
        },
      ],
    },
    {
      title: 'Contact & Social Media', sub: 'Mobile number, email, and social accounts',
      heading: 'Contact Information', desc: 'How the university reaches you for survey follow-ups.',
      questions: [
        { id: 'mobile', label: 'Mobile Number', type: 'text', span: 'span 1', placeholder: '09XX XXX XXXX' },
        { id: 'email', label: 'Email Address', type: 'text', span: 'span 1', placeholder: 'you@email.com' },
        { id: 'facebook', label: 'FACEBOOK :', type: 'text', span: 'span 1' },
        { id: 'twitter', label: 'TWITTER :', type: 'text', span: 'span 1' },
        { id: 'instagram', label: 'INSTAGRAM :', type: 'text', span: 'span 1' },
        { id: 'linkedin', label: 'LINKEDIN:', type: 'text', span: 'span 1' },
      ],
    },
    {
      title: 'Educational Background', sub: 'College, program, and year graduated',
      heading: 'Educational Background', desc: 'Program options change with the college/department you select.',
      questions: [
        { id: 'college', label: 'Select your College /Department', type: 'select', options: Object.keys(COLLEGES), span: 'span 2', placeholder: 'Select your College / Department' },
        {
          id: 'course', label: 'Program', type: 'select', options: courseOpts, span: 'span 2',
          placeholder: a.college ? (courseOpts.length ? 'Select your program' : 'No program list — use Others below') : 'Select a college first',
          hint: 'Dependent on the selected college/department',
        },
        {
          id: 'course_other', label: 'Others:', type: 'text', span: 'span 2',
          disabled: !!a.college && a.college !== 'Others',
          placeholder: a.college && a.college !== 'Others' ? 'Not needed — choose your program from the list above' : 'Indicate your program if not listed (e.g. accounting or engineering programs)',
        },
        {
          id: 'year_graduated', label: 'Year Graduated', type: 'combo', options: gradYears(), span: 'span 2', placeholder: 'Type or select year (e.g. 2024)',
          hint: 'Type a year or pick one from the list',
        },
      ],
    },
  ];
}

// Registration step 4 — kept apart from regStepDefs so Edit Profile never shows it (values are never persisted).
export const REG_PW_IDS = ['reg_pw', 'reg_pw2'];
export const regPasswordStep = {
  title: 'Account Password', sub: 'Create a password to sign in',
  heading: 'Create Your Password', desc: 'You will use your email or Alumni ID and this password to sign in.',
  questions: [
    { id: 'reg_pw', label: 'Password', type: 'password', span: 'span 2', placeholder: 'At least 8 characters, 1 number, 1 uppercase letter' },
    { id: 'reg_pw2', label: 'Confirm Password', type: 'password', span: 'span 2', placeholder: 'Re-enter your password' },
  ],
};

// Everything else stays in the Alumni Survey.
export function surveySectionDefs() {
  return [
    {
      id: 'edu', title: 'Educational Background', short: 'Education', desc: 'Remaining Section III questions.',
      questions: [
        { id: 'first_grad', label: 'Are you the first person that graduated college in your family?', type: 'choice', options: ['Yes', 'No'], span: 'span 1' },
        { id: 'udmcat', label: 'Did you pass the UDMCAT Entrance Exam?', type: 'choice', options: ['Yes', 'No'], span: 'span 1' },
        { id: 'honors', label: 'Latin Honor / Awards Received', type: 'text', span: 'span 1', placeholder: 'e.g. Cum Laude — or type None' },
        { id: 'prof_exams', label: 'Professional Examination(s) Passed', type: 'text', span: 'span 1', placeholder: 'e.g. Licensure Examination for Teachers — or None' },
      ],
    },
    {
      id: 'employment', title: 'Employment Information', short: 'Employment', desc: 'Section IV — your employment status after graduating.',
      questions: [
        { id: 'ever_employed', label: 'Have you ever been employed?', type: 'choice', options: ['Yes', 'No'], span: 'span 2' },
        {
          id: 'unemployed_reason', label: 'What is the reason(s) why you are still unemployed?', type: 'multi', span: 'span 2',
          when: (x) => x.ever_employed === 'No', hint: 'Shown because you answered No',
          options: ['Advance or further study', 'Family concern and decided not to find a job', 'Health-related reason(s)', 'Lack of work experience', 'No job opportunity available', 'Did not look for a job', 'Awaiting results of a job application'],
        },
      ],
    },
    {
      id: 'details', title: 'Employment Details', short: 'Job Details', desc: 'Section V — shown because you have been employed.',
      when: (x) => x.ever_employed === 'Yes',
      questions: [
        { id: 'job_name', label: 'What is the name of your Job :', type: 'text', span: 'span 1' },
        { id: 'job_address', label: 'Job Address / Location', type: 'text', span: 'span 1' },
        { id: 'employer', label: 'Name of Organization/Employer', type: 'text', span: 'span 2' },
        { id: 'job_status', label: 'Job Employment Status', type: 'choice', span: 'span 2', options: ['Regular or Permanent', 'Temporary', 'Casual', 'Contractual', 'Self-employed'] },
        { id: 'org_type', label: 'Type of Organization/Employer', type: 'choice', span: 'span 2', options: ['Private', 'Government', 'Non-profit / NGO', 'Self-owned business'] },
        {
          id: 'business_line', label: 'For the major line of business of your company/employer, kindly pick one.', type: 'select', span: 'span 2',
          options: ['Agriculture, forestry and fishing', 'Mining and quarrying', 'Manufacturing', 'Electricity, gas, steam and water supply', 'Construction', 'Wholesale and retail trade', 'Transportation and storage', 'Accommodation and food service activities', 'Information and communication', 'Financial and insurance activities', 'Real estate activities', 'Professional, scientific and technical activities', 'Administrative and support service activities', 'Public administration and defense', 'Education', 'Human health and social work activities', 'Arts, entertainment and recreation', 'Other service activities'],
        },
        {
          id: 'occ_class', label: 'Occupational Classification', type: 'select', span: 'span 2',
          options: ['Managers', 'Professionals', 'Technicians and associate professionals', 'Clerical support workers', 'Service and sales workers', 'Skilled agricultural, forestry and fishery workers', 'Craft and related trades workers', 'Plant and machine operators and assemblers', 'Elementary occupations', 'Armed forces occupations'],
        },
        { id: 'place_of_work', label: 'Place of Work', type: 'choice', options: ['Local (within the Philippines)', 'Abroad'], span: 'span 2' },
        {
          id: 'time_to_job', label: 'How long did it take you to get a job after graduating from UDM?', type: 'select', span: 'span 2',
          options: ['Less than a month', '1 to 6 months', '7 to 11 months', '1 year to less than 2 years', '2 years to less than 3 years', '3 years to less than 4 years', 'More than 4 years'],
        },
        { id: 'job_related', label: 'Is your job related to the course you took up in college?', type: 'choice', options: ['Yes', 'No'], span: 'span 1' },
        { id: 'still_working', label: 'Are you still working here?', type: 'choice', options: ['Yes', 'No'], span: 'span 1' },
        {
          id: 'stay_reasons', label: 'If Yes, What are your reason(s) for staying on the job after college? You may pick more than one answer', type: 'multi', span: 'span 2',
          when: (x) => x.still_working === 'Yes', hint: 'Shown because you are still working there',
          options: ['Salaries and benefits', 'Career challenge', 'Related to special skill', 'Related to course or program of study', 'Proximity to residence', 'Peer influence', 'Family influence'],
        },
      ],
    },
    {
      id: 'self', title: 'Self-Employment Information', short: 'Self-Employment', desc: 'Section VI — shown because you indicated you are self-employed.',
      when: (x) => x.job_status === 'Self-employed' || x.org_type === 'Self-owned business',
      questions: [
        { id: 'se_years', label: 'Number of years you are Self-Employed', type: 'select', span: 'span 1', options: ['Less than a year', '1 year', '2 years', '3 years', '4 years', '5 years or more'] },
        { id: 'se_nature', label: 'What is the nature of your business ?', type: 'text', span: 'span 1' },
        {
          id: 'se_reason', label: 'What is your reason for being self-employed? You may pick one or more if necessary', type: 'multi', span: 'span 2',
          options: ['Higher income potential', 'Flexible working hours', 'Family business', 'No available employment opportunity', 'Related to my course or special skill', 'Personal passion or advocacy', 'Independence at work'],
        },
        { id: 'se_related', label: 'Is your job related to the course you took up in college?', type: 'choice', options: ['Yes', 'No'], span: 'span 1' },
        { id: 'se_other_job', label: 'Do you still have a job aside from your business?', type: 'choice', options: ['Yes', 'No'], span: 'span 1' },
      ],
    },
    {
      id: 'feedback', title: 'Alumni Feedback', short: 'Feedback', desc: 'Section VII — your recommendations to the university.',
      questions: [
        { id: 'fb_contribute', label: 'Given the chance, how would you like to contribute to UDM?', type: 'textarea', span: 'span 2' },
        { id: 'fb_activity', label: 'Activity you would like to suggest for the UDM Alumni Relations Office?', type: 'textarea', span: 'span 2' },
      ],
    },
  ];
}

export const visibleQs = (section, a) => section.questions.filter((q) => (q.when ? q.when(a) : true));
export const visibleSections = (a) => surveySectionDefs().filter((s) => (s.when ? s.when(a) : true));
export const isAnswered = (a, id) => {
  const v = a[id];
  if (Array.isArray(v)) return v.length > 0;
  return v != null && String(v).trim() !== '';
};
