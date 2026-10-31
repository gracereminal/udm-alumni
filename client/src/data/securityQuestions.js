// Security questions for two-step verification ("Security questions" tab of "MFA Verification" in UDM Alumni.dc.html).
// Each account picks two different ones. Same list as backend/app/Services/SecurityQuestionService.php.
export const SECURITY_QUESTIONS = [
  'What was the name of your first-year adviser?',
  'In what city were you born?',
  'What was the name of your first pet?',
  'What is your mother’s maiden name?',
  'What elementary school did you attend?',
  'Who was your favorite teacher in high school?',
];

export const SQ_IDS = ['sq1', 'sq1_answer', 'sq2', 'sq2_answer'];

/** Field errors for {sq1, sq1_answer, sq2, sq2_answer}, with the server's messages. */
export function securityQuestionErrors(a) {
  const e = {};
  [1, 2].forEach((n) => {
    const ans = String(a[`sq${n}_answer`] || '').trim().replace(/\s+/g, ' ');
    if (!SECURITY_QUESTIONS.includes(a[`sq${n}`])) e[`sq${n}`] = 'Choose a question.';
    if (!ans) e[`sq${n}_answer`] = 'Enter your answer.';
    else if (ans.length < 2) e[`sq${n}_answer`] = 'Use at least 2 characters.';
    else if (ans.length > 100) e[`sq${n}_answer`] = 'Keep this under 100 characters.';
  });
  if (!e.sq1 && !e.sq2 && a.sq1 === a.sq2) e.sq2 = 'Choose a different question.';
  return e;
}
