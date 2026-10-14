import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';

describe('test tooling', () => {
  it('renders with React Testing Library', () => {
    render(<button type="button">Sign in</button>);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('runs axe accessibility checks', async () => {
    const { container } = render(
      <label>
        Email <input type="email" />
      </label>,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
