import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { SearchProvider, useSearch } from './SearchContext';
import { mockApi, listOf, session, loadTestCatalog, USERS } from '../test/mockApi';

const person = (id, name, extra = {}) => ({
  id, name, degree: 'BSIT', program: 'BS Information Technology', college: 'College of Computer Studies', batch: 2020, title: '', company: '',
  skills: [], allSkills: [], profile: { industry: '', contacts: {} }, ...extra,
});

function Opener() {
  const { openSearch } = useSearch();
  return <button type="button" onClick={openSearch}>open search</button>;
}

async function openAndType(role, text) {
  loadTestCatalog();
  render(
    <MemoryRouter>
      <AuthProvider>
        <SearchProvider>
          <Opener />
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  await screen.findByRole('button', { name: 'open search' });
  await waitFor(() => { fireEvent.click(screen.getByRole('button', { name: 'open search' })); expect(screen.getByRole('combobox')).toBeTruthy(); });
  fireEvent.change(screen.getByRole('combobox'), { target: { value: text } });
}

describe('global search', () => {
  it('lets an alumnus find alumni of other colleges and admin / college accounts', async () => {
    const api = mockApi([
      session('alumni'),
      ['GET', '/directory', listOf([person(5, 'Mika Reyes', { degree: 'BSCE', college: 'College of Engineering and Technology' })])],
      ['GET', '/directory/accounts', { data: [
        { id: 31, name: 'Alumni Office', role: 'admin', roleLabel: 'Director', email: 'admin@udm.test', college: null },
        { id: 40, name: 'Dr. Mia Cruz', role: 'dept', roleLabel: 'College Dean', email: 'dean@udm.test', college: 'College of Computer Studies' },
        { id: USERS.alumni.id, name: 'Me', role: 'dept', roleLabel: '', email: 'me@udm.test', college: null },
      ] }],
    ]);
    await openAndType('alumni', 'mi');

    expect(await screen.findByText('Mika Reyes')).toBeTruthy();
    expect(screen.getByText('Dr. Mia Cruz')).toBeTruthy();
    expect(screen.getByText('College account')).toBeTruthy();
    expect(screen.getByText('Admin account')).toBeTruthy();
    expect(screen.queryByText('Me')).toBeNull();
    expect(api.find('GET', '/alumni')).toHaveLength(0); // alumni never read Alumni Records
    expect(api.last('GET', '/directory/accounts').query.q).toBe('mi');
  });

  it('says "Searching…" until a slow API answers, not "No results found"', async () => {
    let answer;
    const slow = new Promise((resolve) => { answer = resolve; });
    mockApi([
      session('alumni'),
      ['GET', '/directory', () => slow.then(() => listOf([]))],
      ['GET', '/directory/accounts', () => slow.then(() => ({ data: [{ id: 40, name: 'Dr. Mia Cruz', role: 'dept', roleLabel: 'College Dean', email: 'dean@udm.test', college: 'CCS' }] }))],
    ]);
    await openAndType('alumni', 'mi');
    await new Promise((r) => { setTimeout(r, 700); }); // past the debounce and the 380 ms pulse

    expect(screen.getByText('Searching…')).toBeTruthy();
    expect(screen.queryByText('No results found')).toBeNull();
    answer();
    expect(await screen.findByText('Dr. Mia Cruz')).toBeTruthy();
  });

  it('still shows accounts when the directory request fails', async () => {
    mockApi([
      session('alumni'),
      ['GET', '/directory', { status: 500, body: { error: 'boom' } }],
      ['GET', '/directory/accounts', { data: [{ id: 40, name: 'Dr. Mia Cruz', role: 'dept', roleLabel: 'College Dean', email: 'dean@udm.test', college: 'College of Computer Studies' }] }],
    ]);
    await openAndType('alumni', 'mi');

    expect(await screen.findByText('Dr. Mia Cruz')).toBeTruthy();
  });
});
