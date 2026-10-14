const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const blank = (v) => v == null || String(v).trim() === '';
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Validate one registration step (0 = Personal, 1 = Contact, 2 = Education, 3 = Password). Returns { fieldId: message }. */
export function validateRegStep(step, a) {
  const e = {};
  if (step === 0) {
    if (blank(a.last_name)) e.last_name = 'Enter your last name.';
    if (blank(a.first_name)) e.first_name = 'Enter your first name.';
    if (blank(a.dob)) e.dob = 'Select your date of birth.';
    else if (a.dob > todayIso()) e.dob = 'Date of birth cannot be in the future.';
    if (blank(a.present_address)) e.present_address = 'Enter your present address.';
    if (blank(a.permanent_address)) e.permanent_address = 'Enter your permanent address.';
    if (blank(a.gender)) e.gender = 'Select an option.';
    if (blank(a.marital_status)) e.marital_status = 'Select an option.';
    if (a.marital_status === 'Married' && blank(a.married_name)) e.married_name = 'Enter your full name after marriage.';
    if (blank(a.indigenous)) e.indigenous = 'Select an option.';
    else if (a.indigenous === 'Yes' && blank(a.indigenous_group)) e.indigenous_group = 'Specify your Indigenous group.';
    if (blank(a.pwd)) e.pwd = 'Select an option.';
    else if (a.pwd === 'Yes' && blank(a.pwd_type)) e.pwd_type = 'Select your type of disability.';
  } else if (step === 1) {
    const digits = String(a.mobile || '').replace(/\D/g, '');
    if (blank(a.mobile)) e.mobile = 'Enter your mobile number.';
    else if (!((digits.startsWith('09') && digits.length === 11) || (digits.startsWith('639') && digits.length === 12))) e.mobile = 'Enter a valid mobile number (e.g. 09XX XXX XXXX).';
    if (blank(a.email)) e.email = 'Enter your email address.';
    else if (!EMAIL.test(String(a.email).trim())) e.email = 'Enter a valid email address.';
  } else if (step === 2) {
    if (blank(a.college)) e.college = 'Select your college / department.';
    if (blank(a.course) && blank(a.course_other)) e.course = 'Select your program or indicate it under Others.';
    const yr = String(a.year_graduated || '').trim();
    if (!yr) e.year_graduated = 'Select the year you graduated.';
    else if (!/^\d{4}$/.test(yr)) e.year_graduated = 'Enter a valid 4-digit year.';
    else if (Number(yr) > new Date().getFullYear()) e.year_graduated = 'Year graduated cannot be in the future.';
    else if (Number(yr) < 1999) e.year_graduated = 'Only years 1999 onward are allowed.';
  } else if (step === 3) {
    const pw = String(a.reg_pw || '');
    if (!pw) e.reg_pw = 'Create a password.';
    else if (pw.length < 8 || !/\d/.test(pw) || !/[A-Z]/.test(pw)) e.reg_pw = 'Use at least 8 characters, including 1 number and 1 uppercase letter.';
    if (!a.reg_pw2) e.reg_pw2 = 'Re-enter your password.';
    else if (a.reg_pw2 !== pw) e.reg_pw2 = 'Passwords do not match.';
  }
  return e;
}

/** Profile (Edit Profile) validation: required identity/contact fields + format checks. */
export function validateProfile(a) {
  const e = { ...validateRegStep(0, a), ...validateRegStep(1, a), ...validateRegStep(2, a) };
  ['facebook', 'twitter', 'instagram', 'linkedin'].forEach((k) => {
    if (!blank(a[k]) && /\s/.test(String(a[k]).trim()) && !/^https?:\/\//i.test(String(a[k]).trim())) e[k] = 'Enter a username, handle or link without spaces.';
  });
  return e;
}

