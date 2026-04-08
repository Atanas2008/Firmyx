import { render, screen } from '@testing-library/react';
import { Card } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content here</Card>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Card title="My Card">Content</Card>);
    expect(screen.getByText('My Card')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<Card title="Title" subtitle="Description">Content</Card>);
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('renders actions when provided', () => {
    render(<Card title="Title" actions={<button>Action</button>}>Content</Card>);
    expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
  });
});
