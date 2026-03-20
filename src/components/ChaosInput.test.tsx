import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChaosInput } from './ChaosInput';


// Verification for Code Quality, a11y, and Testing constraints
describe('ChaosInput Component Accessibility & Functionality', () => {
  it('renders correctly and has proper ARIA accessibility tags', () => {
    const mockSubmit = vi.fn();
    render(<ChaosInput onSubmit={mockSubmit} isProcessing={false} />);
    
    // Accessibility heading check
    const header = screen.getByRole('heading', { level: 2 });
    expect(header).toHaveTextContent(/Input Chaos/i);

    // The text area should have the accessibility description
    const textBox = screen.getByLabelText(/Chaos Text Input/i);
    expect(textBox).not.toBeDisabled();
    
    // Check submit button
    const submitBtn = screen.getByRole('button', { name: /Translate to Action/i });
    expect(submitBtn).toBeDisabled(); // disabled because no text/file initially
  });

  it('disables inputs when the app is actively communicating with Google Services', () => {
    const mockSubmit = vi.fn();
    // Simulate active processing state
    render(<ChaosInput onSubmit={mockSubmit} isProcessing={true} />);
    
    const textBox = screen.getByLabelText(/Chaos Text Input/i);
    expect(textBox).toBeDisabled();
    
    const uploadBtn = screen.getByRole('button', { name: /Upload an image or document/i });
    expect(uploadBtn).toBeDisabled();
  });
});
