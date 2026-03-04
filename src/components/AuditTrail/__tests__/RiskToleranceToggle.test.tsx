// src/components/AuditTrail/__tests__/RiskToleranceToggle.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RiskToleranceToggle } from '../RiskToleranceToggle';
import { setRiskTolerance } from '@/lib/auditStore';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock the auditStore
vi.mock('@/lib/auditStore', () => ({
  setRiskTolerance: vi.fn(),
}));

describe('RiskToleranceToggle', () => {
  const mockOnChange = vi.fn();
  const defaultProps = {
    currentLevel: 'HIGH' as const,
    onChange: mockOnChange,
    applicationId: 'test-app-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (setRiskTolerance as any).mockResolvedValue(undefined);
  });

  it('renders with HIGH level', () => {
    render(<RiskToleranceToggle {...defaultProps} />);
    
    expect(screen.getByText('Risk Tolerance')).toBeInTheDocument();
    expect(screen.getByText('HIGH')).toBeInTheDocument();
    expect(screen.getByText('LOW')).toBeInTheDocument();
    expect(screen.getByText('Auto-Approve')).toBeInTheDocument();
  });

  it('renders with LOW level', () => {
    render(<RiskToleranceToggle {...defaultProps} currentLevel="LOW" />);
    
    expect(screen.getByText('Manual Review')).toBeInTheDocument();
  });

  it('toggles from HIGH to LOW when clicked', async () => {
    render(<RiskToleranceToggle {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(setRiskTolerance).toHaveBeenCalledWith('LOW', 'test-app-123');
      expect(mockOnChange).toHaveBeenCalledWith('LOW');
    });
  });

  it('toggles from LOW to HIGH when clicked', async () => {
    render(<RiskToleranceToggle {...defaultProps} currentLevel="LOW" />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(setRiskTolerance).toHaveBeenCalledWith('HIGH', 'test-app-123');
      expect(mockOnChange).toHaveBeenCalledWith('HIGH');
    });
  });

  it('shows loading state during toggle', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    (setRiskTolerance as any).mockReturnValue(promise);

    render(<RiskToleranceToggle {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    fireEvent.click(toggleButton);

    // Check for loading spinner (it's an animated element)
    await waitFor(() => {
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    // Resolve the promise to complete the loading
    resolvePromise!();
  });

  it('displays error message when toggle fails', async () => {
    const errorMessage = 'Network error occurred';
    (setRiskTolerance as any).mockRejectedValue(new Error(errorMessage));

    render(<RiskToleranceToggle {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    fireEvent.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to update risk tolerance')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });

    // Verify onChange was not called on error
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('allows retry after error', async () => {
    (setRiskTolerance as any).mockRejectedValueOnce(new Error('Network error'));

    render(<RiskToleranceToggle {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    fireEvent.click(toggleButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to update risk tolerance')).toBeInTheDocument();
    });

    // Mock successful retry
    (setRiskTolerance as any).mockResolvedValue(undefined);

    // Click retry button
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(setRiskTolerance).toHaveBeenCalledTimes(2);
      expect(mockOnChange).toHaveBeenCalledWith('LOW');
    });
  });

  it('is disabled when disabled prop is true', () => {
    render(<RiskToleranceToggle {...defaultProps} disabled={true} />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    expect(toggleButton).toBeDisabled();
    
    // Check for disabled message
    expect(screen.getByText(/cannot be changed for finalized applications/i)).toBeInTheDocument();
  });

  it('does not call setRiskTolerance when disabled', () => {
    render(<RiskToleranceToggle {...defaultProps} disabled={true} />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    fireEvent.click(toggleButton);

    expect(setRiskTolerance).not.toHaveBeenCalled();
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('shows tooltip on hover', async () => {
    render(<RiskToleranceToggle {...defaultProps} />);
    
    const infoIcon = document.querySelector('.cursor-help');
    expect(infoIcon).toBeInTheDocument();

    // Hover over info icon
    fireEvent.mouseEnter(infoIcon!);

    await waitFor(() => {
      expect(screen.getByText('HIGH: Automatic approval')).toBeInTheDocument();
      expect(screen.getByText(/Applications are automatically approved/i)).toBeInTheDocument();
      expect(screen.getByText('LOW: Manual review required')).toBeInTheDocument();
    });

    // Mouse leave should hide tooltip
    fireEvent.mouseLeave(infoIcon!);

    await waitFor(() => {
      expect(screen.queryByText('HIGH: Automatic approval')).not.toBeInTheDocument();
    });
  });

  it('prevents multiple simultaneous toggles', async () => {
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    (setRiskTolerance as any).mockReturnValue(promise);

    render(<RiskToleranceToggle {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    
    // Click multiple times rapidly
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);
    fireEvent.click(toggleButton);

    // Should only call setRiskTolerance once
    expect(setRiskTolerance).toHaveBeenCalledTimes(1);

    // Resolve the promise
    resolvePromise!();
  });

  it('has correct ARIA attributes', () => {
    render(<RiskToleranceToggle {...defaultProps} />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    expect(toggleButton).toHaveAttribute('aria-label', 'Toggle risk tolerance. Current: HIGH');
  });

  it('has correct ARIA attributes for LOW level', () => {
    render(<RiskToleranceToggle {...defaultProps} currentLevel="LOW" />);
    
    const toggleButton = screen.getByRole('button', { name: /toggle risk tolerance/i });
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    expect(toggleButton).toHaveAttribute('aria-label', 'Toggle risk tolerance. Current: LOW');
  });
});
