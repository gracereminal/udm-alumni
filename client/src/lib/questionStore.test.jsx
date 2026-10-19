import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { regStepDefs, surveySectionDefs } from '../data/formDefs';
import { validateProfile, validateRegStep } from './validation';
import { getQuestionConfig, setQuestionConfig } from './questionStore';
import { profileProgress } from './profileProgress';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { ProfileProvider } from '../context/ProfileContext';
import { mockApi, session } from '../test/mockApi';
import AlumniTracer from '../pages/admin/AlumniTracer';

const ids = (qs) => qs.map((q) => q.id);
const personal = () => regStepDefs({})[0].questions;

/** Applies `fn(draft)` to a copy of the config, as GET /tracer/questions would return it after the Admin's edits. */
const updateQuestionConfig = (fn) => {
  const t = JSON.parse(JSON.stringify(getQuestionConfig()));
  fn(t);
  setQuestionConfig(t);
};

beforeEach(() => setQuestionConfig(null));

describe('Alumni Tracer question edits reach the forms', () => {
  it('relabels, reorders, hides and adds questions', () => {
    updateQuestionConfig((x) => {
      x.ov.middle_name = { label: 'Middle Name (optional)' };
      x.ov.gender = { hidden: true };
      x.order.personal = ['first_name', 'last_name'];
      x.custom.push({ id: 'x_nick', sec: 'personal', label: 'Nickname', type: 'text' });
    });
    const qs = personal();
    expect(ids(qs).slice(0, 2)).toEqual(['first_name', 'last_name']);
    expect(qs.find((q) => q.id === 'middle_name').label).toBe('Middle Name (optional)');
    expect(ids(qs)).not.toContain('gender');
    expect(ids(qs)).toContain('x_nick');
    // The admin page still sees the hidden one.
    expect(ids(regStepDefs({}, { raw: true })[0].questions)).toContain('gender');
  });

  it('core fields cannot be hidden or made optional', () => {
    updateQuestionConfig((x) => { x.ov.email = { hidden: true, required: false }; });
    const email = regStepDefs({})[1].questions.find((q) => q.id === 'email');
    expect(email).toBeDefined();
    expect(email.required).toBe(true);
  });

  it('validation follows required / hidden', () => {
    expect(validateRegStep(0, {}).gender).toBeTruthy();
    updateQuestionConfig((x) => { x.ov.gender = { required: false }; x.ov.dob = { hidden: true }; x.ov.middle_name = { required: true }; });
    const e = validateRegStep(0, {});
    expect(e.gender).toBeUndefined();
    expect(e.dob).toBeUndefined();
    expect(e.middle_name).toBe('This field is required.');
    // Format checks still apply to an optional field once it is answered.
    updateQuestionConfig((x) => { x.ov.present_address = { required: false }; });
    expect(validateRegStep(0, {}).present_address).toBeUndefined();
    expect(validateRegStep(0, { present_address: '12' }).present_address).toBeTruthy();
  });

  it('a required survey question blocks Edit Profile save; added questions are optional for progress', () => {
    const before = profileProgress({}).total;
    updateQuestionConfig((x) => { x.custom.push({ id: 'x_extra', sec: 'feedback', label: 'Anything else?', type: 'textarea' }); });
    expect(profileProgress({}).total).toBe(before);
    expect(validateProfile({}).x_extra).toBeUndefined();
    updateQuestionConfig((x) => { x.ov.x_extra = { required: true }; });
    expect(validateProfile({}).x_extra).toBe('This field is required.');
    expect(profileProgress({}).total).toBe(before + 1);
    expect(ids(surveySectionDefs().find((s) => s.id === 'feedback').questions)).toContain('x_extra');
  });

  it('progress counts only required questions', () => {
    const before = profileProgress({}).total;
    updateQuestionConfig((x) => { x.ov.gender = { required: false }; x.ov.fb_activity = { required: false }; });
    expect(profileProgress({}).total).toBe(before - 2);
    updateQuestionConfig((x) => { x.ov.middle_name = { required: true }; });
    expect(profileProgress({}).total).toBe(before - 1);
  });
});

describe('Alumni Tracer admin page', () => {
  // A tiny stand-in for the tracer_question API: every write answers with the whole new config.
  const tracerApi = () => {
    const cfg = { ov: {}, custom: [], order: {} };
    return mockApi([
      session('admin'),
      ['PUT', /^\/tracer\/questions\/\w+$/, (req) => { const id = req.path.split('/').pop(); const edit = { ...req.body }; delete edit.section; cfg.ov[id] = { ...cfg.ov[id], ...edit }; return cfg; }],
      ['POST', '/tracer/questions', (req) => { cfg.custom.push({ id: 'custom_abc', sec: req.body.section, label: req.body.label, type: req.body.type, options: req.body.options }); return { status: 201, body: { id: 'custom_abc', ...cfg } }; }],
    ]);
  };
  const renderPage = () => render(<MemoryRouter><ToastProvider><AuthProvider><ProfileProvider><AlumniTracer /></ProfileProvider></AuthProvider></ToastProvider></MemoryRouter>);

  it('edits a question label and adds a question', async () => {
    const api = tracerApi();
    renderPage();
    const section = screen.getByRole('region', { name: 'Personal Information' });
    fireEvent.click(within(section).getAllByRole('button', { name: 'Edit' })[2]); // middle_name
    const box = within(section).getByDisplayValue('Middle Name');
    fireEvent.change(box, { target: { value: 'Middle Name / Initial' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(getQuestionConfig().ov.middle_name.label).toBe('Middle Name / Initial'));
    expect(api.last('PUT', '/tracer/questions/middle_name').body).toEqual({ section: 'personal', label: 'Middle Name / Initial', placeholder: '' });
    expect(within(section).getByText('Middle Name / Initial')).toBeInTheDocument();

    fireEvent.click(within(section).getByRole('button', { name: '+ Add question' }));
    fireEvent.change(within(section).getByLabelText('Question text'), { target: { value: 'Preferred pronouns' } });
    fireEvent.click(within(section).getByRole('radio', { name: 'Single choice' }));
    fireEvent.change(within(section).getByLabelText('Answer options'), { target: { value: 'She/her\nHe/him\nThey/them' } });
    fireEvent.click(within(section).getByRole('button', { name: 'Add question' }));
    await waitFor(() => expect(getQuestionConfig().custom).toHaveLength(1));
    expect(api.last('POST', '/tracer/questions').body).toEqual({ section: 'personal', label: 'Preferred pronouns', type: 'choice', options: ['She/her', 'He/him', 'They/them'] });
    const added = getQuestionConfig().custom[0];
    expect(added).toMatchObject({ sec: 'personal', label: 'Preferred pronouns', type: 'choice', options: ['She/her', 'He/him', 'They/them'] });
    expect(ids(personal())).toContain(added.id);
  });

  it('filters by form and hides a question', async () => {
    const api = tracerApi();
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Register/ }));
    expect(screen.queryByRole('region', { name: 'Alumni Feedback' })).toBeNull();
    expect(screen.getByRole('region', { name: 'Account Password' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: 'Shown: Middle Name' }));
    await waitFor(() => expect(ids(personal())).not.toContain('middle_name'));
    expect(api.last('PUT', '/tracer/questions/middle_name').body).toEqual({ section: 'personal', hidden: true });
    expect(screen.getByText('1 customised')).toBeInTheDocument();
  });
});
