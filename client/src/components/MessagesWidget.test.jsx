import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { mockApi } from '../test/mockApi';
import MessagesWidget from './MessagesWidget';

let auth;
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));

const ALUMNI = { role: 'alumni', user: { id: 11, email: 'lia.santos@example.com', name: 'Lia Santos', college: 'College of Computing Studies', collegeCode: 'CCS' } };
const ADMIN = { role: 'admin', user: { id: 1, email: 'admin@udmalumni.edu', name: 'System Admin' } };
const DEPT = { role: 'dept', user: { id: 2, email: 'cet.dean@example.com', name: 'Dean Cruz', college: 'College of Engineering', collegeCode: 'CET' } };
const AT = '2026-10-22T01:00:00Z';
const LIA_THREAD = { id: 7, channel: 'office', alumnus: { id: 40, name: 'Lia Santos', meta: 'BSIT · Batch 2023', collegeCode: 'CCS' }, staff: null, lastMessage: { body: 'Hello, how do I update my job?', mine: false, at: AT }, unread: 1, updatedAt: AT };

describe('Messages widget', () => {
  it('starts an alumnus’ conversation with the Alumni Office and sends the message', async () => {
    const user = userEvent.setup();
    auth = ALUMNI;
    const started = [];
    const api = mockApi([
      ['GET', '/messages/threads', () => ({ data: started, meta: { unread: 0 } })],
      ['GET', '/messages/threads/9', () => ({ ...started[0], messages: [{ id: 100, body: 'Hello, how do I update my job?', from: 'alumni', mine: true, at: AT }] })],
      ['POST', '/messages/threads', (req) => { started.push({ ...LIA_THREAD, id: 9, channel: req.body.channel, lastMessage: null, unread: 0 }); return { ...started[0], messages: [] }; }],
      ['POST', '/messages/threads/9/messages', (req) => ({ status: 201, body: { id: 100, body: req.body.body, from: 'alumni', mine: true, at: AT } })],
    ]);
    render(<MessagesWidget />);
    await user.click(screen.getByRole('button', { name: /^Messages/ }));
    const panel = screen.getByRole('dialog', { name: 'Messages' });
    expect(within(panel).getByRole('tab', { name: 'Alumni Office', selected: true })).toBeInTheDocument();
    expect(within(panel).getByRole('tab', { name: 'My College (CCS)' })).toBeInTheDocument();
    expect(within(panel).getByText('No messages yet. Say hello!')).toBeInTheDocument();

    await user.type(within(panel).getByRole('textbox', { name: 'Message' }), 'Hello, how do I update my job?{Enter}');
    expect(await within(screen.getByRole('log')).findByText('Hello, how do I update my job?')).toBeInTheDocument();
    expect(api.last('POST', '/messages/threads').body).toEqual({ channel: 'office' });
    expect(api.last('POST', '/messages/threads/9/messages').body).toEqual({ body: 'Hello, how do I update my job?' });
  });

  it('shows the admin the alumni conversations with an unread dot, and replies in the open one', async () => {
    const user = userEvent.setup();
    auth = ADMIN;
    const api = mockApi([
      ['GET', '/messages/threads', { data: [LIA_THREAD], meta: { unread: 1 } }],
      ['GET', '/messages/threads/7', { ...LIA_THREAD, messages: [{ id: 50, body: 'Hello, how do I update my job?', from: 'alumni', mine: false, at: AT }] }],
      ['POST', '/messages/threads/7/messages', (req) => ({ status: 201, body: { id: 51, body: req.body.body, from: 'admin', mine: true, at: AT } })],
    ]);
    render(<MessagesWidget />);
    await user.click(await screen.findByRole('button', { name: 'Messages, 1 unread' }));
    expect(screen.getByRole('button', { name: /Lia Santos/ })).toHaveAttribute('aria-current', 'true');
    expect(await within(screen.getByRole('log')).findByText('Hello, how do I update my job?')).toBeInTheDocument();
    expect(screen.getByText('BSIT · Batch 2023')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Open Edit Profile → Employment.');
    await user.click(screen.getByRole('button', { name: 'Send' }));
    expect(await within(screen.getByRole('log')).findByText('Open Edit Profile → Employment.')).toBeInTheDocument();
    expect(api.find('POST', '/messages/threads')).toHaveLength(0);
  });

  it('gives college staff an empty list until alumni write, and a College–Admin chat', async () => {
    const user = userEvent.setup();
    auth = DEPT;
    const started = [];
    const ADMIN_THREAD = { id: 3, channel: 'admin', alumnus: null, staff: { id: 2, name: 'Dean Cruz', collegeCode: 'CET' }, lastMessage: null, unread: 0 };
    const api = mockApi([
      ['GET', '/messages/threads', () => ({ data: started, meta: { unread: 0 } })],
      ['GET', '/messages/threads/3', { ...ADMIN_THREAD, messages: [{ id: 60, body: 'Summary sent.', from: 'dept', mine: true, at: AT }] }],
      ['POST', '/messages/threads', () => { started.push(ADMIN_THREAD); return { ...ADMIN_THREAD, messages: [] }; }],
      ['POST', '/messages/threads/3/messages', { status: 201, body: { id: 60, body: 'Summary sent.', from: 'dept', mine: true, at: AT } }],
    ]);
    render(<MessagesWidget />);
    await user.click(screen.getByRole('button', { name: /^Messages/ }));
    expect(screen.getByRole('tab', { name: 'College–Alumni', selected: true })).toBeInTheDocument();
    expect(screen.getByText('No conversations yet. Messages from alumni appear here.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Message' })).toBeDisabled();

    await user.click(screen.getByRole('tab', { name: 'College–Admin' }));
    expect(screen.getByText('UDM Alumni Relations Office')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'Message' }), 'Summary sent.{Enter}');
    await waitFor(() => expect(api.last('POST', '/messages/threads').body).toEqual({ channel: 'admin' }));
    expect(await within(screen.getByRole('log')).findByText('Summary sent.')).toBeInTheDocument();
  });
});
