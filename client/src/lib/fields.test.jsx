import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FormField from '../components/FormField';
import { buildField } from './fields';
import { tidyName } from './format';

function NameField({ format = 'name' }) {
  const [a, setAll] = useState({});
  const setA = (id, v) => setAll((x) => ({ ...x, [id]: v }));
  const f = buildField({ id: 'first_name', label: 'First Name', type: 'text', format }, a, { setA, toggleA: () => {} });
  return <FormField f={f} />;
}

describe('name fields', () => {
  it('capitalizes the first letter of each word while typing', () => {
    render(<NameField />);
    const input = screen.getByLabelText('First Name');
    fireEvent.change(input, { target: { value: 'juan miguel' } });
    expect(input).toHaveValue('Juan Miguel');
    expect(input).toHaveAttribute('autocapitalize', 'words');
  });

  it('collapses spaces and trims on blur', () => {
    render(<NameField />);
    const input = screen.getByLabelText('First Name');
    fireEvent.change(input, { target: { value: '  ana   marie ' } });
    fireEvent.blur(input);
    expect(input).toHaveValue('Ana Marie');
  });

  it('leaves plain text fields as typed', () => {
    render(<NameField format={null} />);
    const input = screen.getByLabelText('First Name');
    fireEvent.change(input, { target: { value: 'juan' } });
    expect(input).toHaveValue('juan');
  });

  it('tidyName keeps the rest of each word as typed', () => {
    expect(tidyName('maria  de la paz-mcdonald ')).toBe('Maria De La Paz-Mcdonald');
    expect(tidyName('JUAN')).toBe('JUAN');
  });
});
