import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from '../ConfirmDialog';

// Mock HTMLDialogElement
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = jest.fn();
  HTMLDialogElement.prototype.close = jest.fn();
});

describe('ConfirmDialog', () => {
  const defaultProps = {
    open: true,
    title: 'Delete record',
    description: 'This action cannot be undone.',
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  it('renders title and description when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    expect(screen.getByText('Delete record')).toBeInTheDocument();
    expect(screen.getByText('This action cannot be undone.')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />);
    expect(screen.queryByText('Delete record')).not.toBeInTheDocument();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = jest.fn();
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} confirmLabel="Delete" />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete', hidden: true }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = jest.fn();
    render(<ConfirmDialog {...defaultProps} onCancel={onCancel} cancelLabel="Cancel" />);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel', hidden: true }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables cancel button when loading', () => {
    render(<ConfirmDialog {...defaultProps} loading confirmLabel="Delete" cancelLabel="Cancel" />);
    expect(screen.getByRole('button', { name: 'Cancel', hidden: true })).toBeDisabled();
  });
});
