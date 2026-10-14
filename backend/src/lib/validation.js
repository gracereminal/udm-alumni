// Server-side copy of every registration / profile rule in client/src/lib/validation.js.
import { z } from 'zod';
import { CIVIL, PWD, SEX } from './vocab.js';

const blank = (v) => v == null || String(v).trim() === '';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const manilaToday = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);
const manilaYear = () => Number(manilaToday().slice(0, 4));

/** "0917 123 4567" / "+63 917 123 4567" -> "639171234567"; null when invalid. */
export function normalizeMobile(v) {
  const d = String(v || '').replace(/\D/g, '');
  if (d.startsWith('09') && d.length === 11) return `63${d.slice(1)}`;
  if (d.startsWith('639') && d.length === 12) return d;
  return null;
}
/** "639171234567" -> "09171234567" (the format the form shows). */
export const displayMobile = (v) => (v && /^639\d{9}$/.test(v) ? `0${v.slice(2)}` : v || '');

export const passwordOk = (pw) => typeof pw === 'string' && pw.length >= 8 && pw.length <= 200 && /\d/.test(pw) && /[A-Z]/.test(pw);
export const PASSWORD_MSG = 'Use at least 8 characters, including 1 number and 1 uppercase letter.';
export const password = z.string().refine(passwordOk, PASSWORD_MSG);
export const isEmail = (v) => EMAIL.test(String(v || '').trim());

/** Same messages as the client so the form can show server errors inline. Returns { field: message }. */
export function profileErrors(a, { requirePassword = false } = {}) {
  const e = {};
  if (blank(a.last_name)) e.last_name = 'Enter your last name.';
  if (blank(a.first_name)) e.first_name = 'Enter your first name.';
  if (blank(a.dob)) e.dob = 'Select your date of birth.';
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(a.dob) || Number.isNaN(Date.parse(a.dob))) e.dob = 'Enter a valid date.';
  else if (a.dob > manilaToday()) e.dob = 'Date of birth cannot be in the future.';
  if (blank(a.present_address)) e.present_address = 'Enter your present address.';
  if (blank(a.permanent_address)) e.permanent_address = 'Enter your permanent address.';
  if (blank(a.gender)) e.gender = 'Select an option.';
  else if (!SEX.toCode[a.gender]) e.gender = 'Select a valid option.';
  if (blank(a.marital_status)) e.marital_status = 'Select an option.';
  else if (!CIVIL.toCode[a.marital_status]) e.marital_status = 'Select a valid option.';
  if (a.marital_status === 'Married' && blank(a.married_name)) e.married_name = 'Enter your full name after marriage.';
  if (blank(a.indigenous)) e.indigenous = 'Select an option.';
  else if (a.indigenous === 'Yes' && blank(a.indigenous_group)) e.indigenous_group = 'Specify your Indigenous group.';
  if (blank(a.pwd)) e.pwd = 'Select an option.';
  else if (a.pwd === 'Yes' && blank(a.pwd_type)) e.pwd_type = 'Select your type of disability.';
  else if (a.pwd === 'Yes' && !PWD.toCode[a.pwd_type]) e.pwd_type = 'Select a valid type of disability.';

  if (blank(a.mobile)) e.mobile = 'Enter your mobile number.';
  else if (!normalizeMobile(a.mobile)) e.mobile = 'Enter a valid mobile number (e.g. 09XX XXX XXXX).';
  if (blank(a.email)) e.email = 'Enter your email address.';
  else if (!isEmail(a.email) || String(a.email).trim().length > 120) e.email = 'Enter a valid email address.';
  ['facebook', 'twitter', 'instagram', 'linkedin'].forEach((k) => {
    if (!blank(a[k]) && /\s/.test(String(a[k]).trim()) && !/^https?:\/\//i.test(String(a[k]).trim())) e[k] = 'Enter a username, handle or link without spaces.';
    else if (!blank(a[k]) && String(a[k]).length > 255) e[k] = 'Use at most 255 characters.';
  });

  if (blank(a.college)) e.college = 'Select your college / department.';
  if (blank(a.course) && blank(a.course_other)) e.course = 'Select your program or indicate it under Others.';
  const yr = String(a.year_graduated || '').trim();
  if (!yr) e.year_graduated = 'Select the year you graduated.';
  else if (!/^\d{4}$/.test(yr)) e.year_graduated = 'Enter a valid 4-digit year.';
  else if (Number(yr) > manilaYear()) e.year_graduated = 'Year graduated cannot be in the future.';
  else if (Number(yr) < 1999) e.year_graduated = 'Only years 1999 onward are allowed.';

  if (requirePassword) {
    const pw = a.reg_pw ?? a.password;
    if (!pw) e.reg_pw = 'Create a password.';
    else if (!passwordOk(pw)) e.reg_pw = PASSWORD_MSG;
    if (a.reg_pw2 != null && a.reg_pw2 !== pw) e.reg_pw2 = 'Passwords do not match.';
  }
  const tooLong = { last_name: 60, first_name: 60, middle_name: 60, suffix: 10, married_name: 120, indigenous_group: 80, course_other: 160, present_address: 500, permanent_address: 500 };
  Object.entries(tooLong).forEach(([k, n]) => { if (!blank(a[k]) && String(a[k]).length > n) e[k] = `Use at most ${n} characters.`; });
  return e;
}

/** Shared zod helpers for route bodies. */
export const id = z.coerce.number().int().positive();
export const str = (max) => z.string().trim().max(max);
