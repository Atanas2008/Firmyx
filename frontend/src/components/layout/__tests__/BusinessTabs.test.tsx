import { render, screen } from '@testing-library/react';
import { BusinessTabs } from '../BusinessTabs';

// Mock useLanguage
jest.mock('@/hooks/useLanguage', () => ({
  useLanguage: () => ({
    language: 'en',
    t: {
      nav: {
        overview: 'Overview',
        financials: 'Financials',
        analysis: 'Analysis',
        scenario: 'Scenario',
        reports: 'Reports',
      },
    },
  }),
}));

describe('BusinessTabs', () => {
  it('renders all 5 tabs', () => {
    render(<BusinessTabs businessId="123" activeTab="overview" />);
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Financials')).toBeInTheDocument();
    expect(screen.getByText('Analysis')).toBeInTheDocument();
    expect(screen.getByText('Scenario')).toBeInTheDocument();
    expect(screen.getByText('Reports')).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    render(<BusinessTabs businessId="123" activeTab="analysis" />);
    const analysisLink = screen.getByText('Analysis').closest('a');
    expect(analysisLink).toHaveClass('border-blue-600');
  });

  it('does not highlight inactive tabs', () => {
    render(<BusinessTabs businessId="123" activeTab="analysis" />);
    const overviewLink = screen.getByText('Overview').closest('a');
    expect(overviewLink).toHaveClass('border-transparent');
  });

  it('generates correct hrefs', () => {
    render(<BusinessTabs businessId="abc-123" activeTab="overview" />);
    expect(screen.getByText('Financials').closest('a')).toHaveAttribute('href', '/businesses/abc-123/financials');
    expect(screen.getByText('Analysis').closest('a')).toHaveAttribute('href', '/businesses/abc-123/analysis');
  });
});
