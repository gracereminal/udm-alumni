/**
 * UDM-AMES — ISO/IEC 25010 System Evaluation (Google Form builder)
 *
 * How to use:
 *   1. Go to https://script.google.com and click "New project".
 *   2. Replace the contents of Code.gs with this file and click Save.
 *   3. Select the function `createEvaluationForm` and click Run.
 *      Approve the permissions Google asks for (Forms + Sheets in your Drive).
 *   4. Open View > Logs (or Execution log) for the form's edit link, public link
 *      and the linked response spreadsheet.
 *
 * Each run makes a new form, so run it once and edit the form in Google Forms after.
 *
 * Characteristics evaluated (ISO/IEC 25010): Functional Suitability, Reliability,
 * Performance Efficiency, Usability, Security and Portability. Each sub-characteristic
 * is a 5-point Likert grid, so a weighted mean can be computed per statement,
 * per sub-characteristic and per characteristic.
 */

const SYSTEM_NAME = 'UDM-AMES';
const SYSTEM_SUBTITLE = 'A Data-Driven Approach to Graduate Employability Tracking';
const PRODUCTION_URL = 'https://udm-alumni-production.up.railway.app/signin';
const DEMO_VIDEO_ALUMNI_URL =
  'https://drive.google.com/drive/folders/1olHwml9Zu1PYkA2r8QNf-_7mvKGJs9kY';
const DEMO_VIDEO_ADMIN_COLLEGE_URL =
  'https://drive.google.com/drive/folders/1fVwCK-0Ndt0Jupb6Qhc_LttdFF6dPgLe';

const SCALE = [
  '1 – Strongly Disagree',
  '2 – Disagree',
  '3 – Neutral',
  '4 – Agree',
  '5 – Strongly Agree',
];

// Functional Suitability differs by role, so each respondent type gets its own section.
const FUNCTIONALITY = {
  Alumni: {
    'Functional Completeness': [
      'The system allows me to register as an alumnus online, including the Data Privacy consent and my academic details.',
      'The system allows me to view my profile and update my personal, employment and tracer survey information.',
      'The system allows me to browse job postings and apply or contact the employer.',
      'The system allows me to view and register for university events and sends a confirmation email with an entry pass.',
      'The system allows me to reset my password through the Forgot Password feature.',
    ],
    'Functional Correctness': [
      'The system displays dashboard and profile information that matches what I entered.',
      'The system sends emails (password reset, event confirmation) that contain correct details.',
      'The system shows job and event details that are accurate and up to date.',
    ],
    'Functional Appropriateness': [
      'The system helps me stay connected with UDM and find career opportunities.',
      'The system lets me complete my tasks (registration, survey, profile update) without unnecessary steps.',
    ],
  },
  'College / Department': {
    'Functional Completeness': [
      'The system allows me to view, search and filter the alumni records of my college.',
      'The system shows employment statistics and course-to-job relevance for my programs on the dashboard.',
      'The system allows me to track outreach to alumni and record the channel used.',
      'The system allows me to generate and export reports for my college.',
    ],
    'Functional Correctness': [
      'The system produces statistics and report figures that are accurate and consistent with the alumni records.',
      'The system shows only alumni belonging to my college in my records, dashboard and reports.',
    ],
    'Functional Appropriateness': [
      'The system supports accreditation, program review and decision-making through its dashboard and reports.',
      'The system reduces the time and effort needed to produce employability reports.',
    ],
  },
  'Admin (Alumni Relations Office)': {
    'Functional Completeness': [
      'The system allows me to approve or reject self-registered alumni accounts.',
      'The system allows me to view, search, edit and archive alumni records across all colleges.',
      'The system allows me to post, edit and close job openings.',
      'The system allows me to create and manage events and view their registrants.',
      'The system allows me to add, edit and organize the tracer survey questions.',
      'The system allows me to generate and export university-wide reports.',
    ],
    'Functional Correctness': [
      'The system produces university-wide statistics and reports that are accurate and consistent with the records.',
      'The system correctly reflects approvals, edits and archived records across all pages.',
    ],
    'Functional Appropriateness': [
      'The system provides the functions the Alumni Relations Office needs to manage alumni data.',
      'The system lets me complete administrative tasks without unnecessary steps.',
    ],
  },
  'IT Professional / Evaluator': {
    'Functional Completeness': [
      'The system provides all specified functions for the Alumni, College / Department and Admin roles.',
      'The system covers the full alumni tracer workflow: registration, approval, survey, records and reporting.',
    ],
    'Functional Correctness': [
      'The system produces correct results with the needed degree of precision.',
      'The system validates inputs (email, student number, graduation year, required fields) with clear error messages.',
      'The system computes statistics (employment rate, survey coverage, course relevance) correctly.',
    ],
    'Functional Appropriateness': [
      'The system facilitates the accomplishment of the specified tasks and objectives.',
      'The system gives each role only the functions appropriate to it.',
    ],
  },
};

// Shared by every respondent.
const CHARACTERISTICS = [
  {
    title: 'Reliability',
    description:
      'The degree to which the system performs its functions under specified conditions for a specified period of time.',
    subs: {
      Maturity: [
        'The system operates without errors or crashes during normal use.',
        'The system behaves the same way every time I use its features.',
      ],
      Availability: [
        'The system is accessible and working whenever I need to use it.',
      ],
      'Fault Tolerance': [
        'The system shows a clear message instead of failing when a problem occurs (e.g., a lost connection or invalid input).',
        'The system does not lose what I have typed when an error occurs.',
      ],
      Recoverability: [
        'The system lets me continue my task without starting over after an error or interruption.',
        'The system keeps my saved data complete and intact after I sign out and sign back in.',
      ],
    },
  },
  {
    title: 'Performance Efficiency',
    description:
      'The performance of the system relative to the amount of resources used under stated conditions.',
    subs: {
      'Time Behaviour': [
        'The system loads pages within a few seconds.',
        'The system responds promptly when searching, filtering and saving.',
        'The system generates dashboards, statistics and reports quickly.',
      ],
      'Resource Utilization': [
        'The system runs smoothly on my device without slowing it down.',
        'The system does not use excessive mobile data or battery.',
      ],
      Capacity: [
        'The system stays responsive while handling many records or many users at the same time.',
      ],
    },
  },
  {
    title: 'Usability',
    description:
      'The degree to which the system can be used by its users to achieve their goals with effectiveness, efficiency and satisfaction.',
    subs: {
      'Appropriateness Recognizability': [
        'The system makes it easy to tell what it is for and which features are available to me.',
      ],
      Learnability: [
        'The system is easy to learn without needing training.',
        'The system uses labels, instructions and icons that are easy to understand.',
      ],
      Operability: [
        'The system has navigation and menus that are easy to use and consistent across pages.',
        'The system has buttons, forms and other controls that work the way I expect.',
      ],
      'User Error Protection': [
        'The system helps prevent mistakes, such as asking for confirmation before deleting or rejecting.',
        'The system shows error messages that clearly explain what went wrong and how to fix it.',
      ],
      'User Interface Aesthetics': [
        'The system has an attractive, uncluttered interface consistent with UDM branding.',
      ],
      Accessibility: [
        'The system displays readable text with enough size and contrast.',
        'The system can be used comfortably on a small screen and with a keyboard.',
      ],
    },
  },
  {
    title: 'Security',
    description:
      'The degree to which the system protects information and data so that people have access appropriate to their authorization.',
    subs: {
      Confidentiality: [
        'The system allows me to access only the pages and data allowed for my role.',
        'The system handles personal information in line with the Data Privacy Act of 2012 (RA 10173).',
      ],
      Integrity: [
        'The system prevents unauthorized access to or changes in records.',
      ],
      'Non-repudiation': [
        'The system records important actions (consent, approvals, submissions) so they cannot be denied later.',
      ],
      Accountability: [
        'The system traces actions to the user who performed them.',
      ],
      Authenticity: [
        'The system requires valid credentials to sign in and handles password reset securely.',
        'The system ends my session securely when I sign out.',
      ],
    },
  },
  {
    title: 'Portability',
    description:
      'The degree to which the system can be transferred from one hardware, software or usage environment to another.',
    subs: {
      Adaptability: [
        'The system works properly on different devices (desktop, laptop, tablet, phone).',
        'The system works properly on different browsers (Chrome, Edge, Firefox, Safari).',
        'The system adjusts its page layouts well to different screen sizes and orientations.',
      ],
      Installability: [
        'The system can be used through a web browser without installing any software.',
      ],
      Replaceability: [
        'The system can replace the existing manual or paper-based alumni tracer process.',
      ],
    },
  },
];

function createEvaluationForm() {
  const form = FormApp.create(`Evaluation of ${SYSTEM_NAME}: ${SYSTEM_SUBTITLE}`);
  form
    .setDescription(
      `This survey aims to evaluate the ${SYSTEM_NAME} system based on ISO 25010 standards. ` +
        "Your responses will help assess the system's quality in terms of functional suitability, " +
        'reliability, performance efficiency, usability, security, and portability.\n\n' +
        'No personal identifiers (such as your name, ID number, or contact information) will be ' +
        'included or published in the results of this study. By continuing to answer this form, you ' +
        'are giving your consent for your responses to be used for the stated purpose.\n\n' +
        `Please use the system before answering: ${PRODUCTION_URL}\n\n` +
        'Demo videos:\n' +
        `• ${SYSTEM_NAME} (Alumni): ${DEMO_VIDEO_ALUMNI_URL}\n` +
        `• ${SYSTEM_NAME} (Admin and College / Department): ${DEMO_VIDEO_ADMIN_COLLEGE_URL}`
    )
    .setConfirmationMessage(
      `Thank you! Your evaluation of the ${SYSTEM_NAME} has been recorded.`
    )
    .setProgressBar(true)
    .setAllowResponseEdits(false)
    .setLimitOneResponsePerUser(false);

  // ── Section 1: respondent profile ──────────────────────────────────────────
  form
    .addMultipleChoiceItem()
    .setTitle('Device used to access the system')
    .setChoiceValues(['Desktop / Laptop', 'Mobile phone', 'Tablet'])
    .showOtherOption(true)
    .setRequired(true);

  form
    .addCheckboxItem()
    .setTitle('Browser(s) used')
    .setChoiceValues(['Google Chrome', 'Microsoft Edge', 'Mozilla Firefox', 'Safari'])
    .showOtherOption(true)
    .setRequired(true);

  const roleItem = form
    .addMultipleChoiceItem()
    .setTitle('Respondent type')
    .setHelpText('The Functional Suitability section that follows depends on your answer.')
    .setRequired(true);

  // ── Section 2: Functional Suitability, one section per respondent type ─────
  const roles = Object.keys(FUNCTIONALITY);
  const rolePages = roles.map((role) => {
    const page = form
      .addPageBreakItem()
      .setTitle(`Functional Suitability — ${role}`)
      .setHelpText(
        'The degree to which the system provides functions that meet stated and implied needs ' +
          'when used under specified conditions.'
      );
    addGrids(form, FUNCTIONALITY[role]);
    return page;
  });

  // ── Sections 3–7: shared characteristics ───────────────────────────────────
  const characteristicPages = CHARACTERISTICS.map((c) => {
    const page = form
      .addPageBreakItem()
      .setTitle(c.title)
      .setHelpText(c.description);
    addGrids(form, c.subs);
    form
      .addParagraphTextItem()
      .setTitle(`Comments on ${c.title} (optional)`);
    return page;
  });

  // ── Final section: overall evaluation ──────────────────────────────────────
  form
    .addPageBreakItem()
    .setTitle('Overall Evaluation');
  form
    .addScaleItem()
    .setTitle('The system, overall, meets my expectations.')
    .setBounds(1, 5)
    .setLabels('Strongly Disagree', 'Strongly Agree')
    .setRequired(true);
  form
    .addParagraphTextItem()
    .setTitle('What did you like most about the system?');
  form
    .addParagraphTextItem()
    .setTitle('What problems did you encounter, and what improvements do you suggest?');

  // Route each respondent type to its Functional Suitability section, then on to Reliability.
  roleItem.setChoices(
    roles.map((role, i) => roleItem.createChoice(role, rolePages[i]))
  );
  const reliabilityPage = characteristicPages[0];
  // A page break's "go to" applies to the section just before it.
  for (let i = 1; i < rolePages.length; i++) {
    rolePages[i].setGoToPage(reliabilityPage);
  }

  // Store responses in a linked spreadsheet for computing weighted means.
  const sheet = SpreadsheetApp.create(`${SYSTEM_NAME} — ISO 25010 Evaluation (Responses)`);
  form.setDestination(FormApp.DestinationType.SPREADSHEET, sheet.getId());

  Logger.log('Edit the form:     ' + form.getEditUrl());
  Logger.log('Share with raters: ' + form.getPublishedUrl());
  Logger.log('Short link:        ' + form.shortenFormUrl(form.getPublishedUrl()));
  Logger.log('Responses sheet:   ' + sheet.getUrl());
}

function addGrids(form, subs) {
  Object.keys(subs).forEach((sub) => {
    form
      .addGridItem()
      .setTitle(sub)
      .setRows(subs[sub])
      .setColumns(SCALE)
      .setRequired(true);
  });
}
