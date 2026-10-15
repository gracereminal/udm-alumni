import { validateProfile, validateRegStep } from './validation';

const personal = {
  last_name: 'Cruz', first_name: 'Ana', dob: '1999-05-01', present_address: '1 Main St', permanent_address: '1 Main St',
  gender: 'Female', marital_status: 'Single', indigenous: 'No', pwd: 'No',
};
const contact = { mobile: '0917 123 4567', email: 'ana@example.com' };
const education = { college: 'College of Computer Studies', course: 'BS Information Technology', year_graduated: '2022' };
const thisYear = new Date().getFullYear();

describe('registration validation', () => {
  describe('step 1 — personal information', () => {
    it('accepts a complete step', () => expect(validateRegStep(0, personal)).toEqual({}));

    it('requires every core field', () => {
      expect(Object.keys(validateRegStep(0, {})).sort()).toEqual(
        ['dob', 'first_name', 'gender', 'indigenous', 'last_name', 'marital_status', 'permanent_address', 'present_address', 'pwd'],
      );
    });

    it('treats whitespace-only text as blank', () => {
      expect(validateRegStep(0, { ...personal, last_name: '   ' })).toEqual({ last_name: 'Enter your last name.' });
    });

    it('rejects a date of birth in the future', () => {
      expect(validateRegStep(0, { ...personal, dob: `${thisYear + 1}-01-01` }).dob).toBe('Date of birth cannot be in the future.');
    });

    it('asks for the married name, IP group and disability type only when they apply', () => {
      const e = validateRegStep(0, { ...personal, marital_status: 'Married', indigenous: 'Yes', pwd: 'Yes' });
      expect(e).toEqual({
        married_name: 'Enter your full name after marriage.',
        indigenous_group: 'Specify your Indigenous group.',
        pwd_type: 'Select your type of disability.',
      });
      expect(validateRegStep(0, { ...personal, marital_status: 'Married', married_name: 'Ana Reyes', indigenous: 'Yes', indigenous_group: 'Aeta', pwd: 'Yes', pwd_type: 'Visual' })).toEqual({});
    });
  });

  describe('step 2 — contact', () => {
    it.each(['09171234567', '0917 123 4567', '+63 917 123 4567', '639171234567'])('accepts the PH mobile number %s', (mobile) => {
      expect(validateRegStep(1, { ...contact, mobile })).toEqual({});
    });

    it.each(['0917123456', '9171234567', '08171234567', '+1 415 555 0100'])('rejects the mobile number %s', (mobile) => {
      expect(validateRegStep(1, { ...contact, mobile }).mobile).toMatch(/valid mobile number/);
    });

    it.each(['ana', 'ana@', 'ana@example', 'ana @example.com'])('rejects the email %s', (email) => {
      expect(validateRegStep(1, { ...contact, email }).email).toBe('Enter a valid email address.');
    });

    it('requires both fields', () => {
      expect(validateRegStep(1, {})).toEqual({ mobile: 'Enter your mobile number.', email: 'Enter your email address.' });
    });
  });

  describe('step 3 — education', () => {
    it('accepts a listed program, or a typed one under Others', () => {
      expect(validateRegStep(2, education)).toEqual({});
      expect(validateRegStep(2, { ...education, college: 'Others', course: '', course_other: 'BS Accountancy' })).toEqual({});
    });

    it('requires a college and a program', () => {
      const e = validateRegStep(2, { year_graduated: '2022' });
      expect(e.college).toBeTruthy();
      expect(e.course).toBe('Select your program or indicate it under Others.');
    });

    it.each([
      ['', 'Select the year you graduated.'],
      ['22', 'Enter a valid 4-digit year.'],
      [String(thisYear + 1), 'Year graduated cannot be in the future.'],
      ['1998', 'Only years 1999 onward are allowed.'],
    ])('rejects the year "%s"', (year_graduated, msg) => {
      expect(validateRegStep(2, { ...education, year_graduated }).year_graduated).toBe(msg);
    });

    it('accepts 1999 and the current year', () => {
      expect(validateRegStep(2, { ...education, year_graduated: '1999' })).toEqual({});
      expect(validateRegStep(2, { ...education, year_graduated: String(thisYear) })).toEqual({});
    });
  });

  describe('step 4 — password', () => {
    it('accepts a strong, confirmed password', () => {
      expect(validateRegStep(3, { reg_pw: 'Secret123', reg_pw2: 'Secret123' })).toEqual({});
    });

    it.each(['Short1A', 'alllowercase1', 'NoNumbersHere'])('rejects the weak password %s', (pw) => {
      expect(validateRegStep(3, { reg_pw: pw, reg_pw2: pw }).reg_pw).toMatch(/at least 8 characters/);
    });

    it('requires the confirmation to match', () => {
      expect(validateRegStep(3, { reg_pw: 'Secret123', reg_pw2: 'Secret124' })).toEqual({ reg_pw2: 'Passwords do not match.' });
      expect(validateRegStep(3, { reg_pw: 'Secret123' })).toEqual({ reg_pw2: 'Re-enter your password.' });
    });
  });
});

describe('profile validation', () => {
  const profile = { ...personal, ...contact, ...education };

  it('combines the personal, contact and education rules', () => {
    expect(validateProfile(profile)).toEqual({});
    expect(Object.keys(validateProfile({ ...profile, last_name: '', email: 'x', year_graduated: '' })).sort()).toEqual(['email', 'last_name', 'year_graduated']);
  });

  it('allows handles and links but not text with spaces in social fields', () => {
    expect(validateProfile({ ...profile, facebook: 'ana.cruz', linkedin: 'https://linkedin.com/in/ana cruz' })).toEqual({});
    expect(validateProfile({ ...profile, twitter: 'ana cruz' }).twitter).toBe('Enter a username, handle or link without spaces.');
  });
});
