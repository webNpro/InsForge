import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { SearchInput } from './SearchInput';

describe('SearchInput', () => {
  const mockOnChange = vi.fn();
  const mockOnImmediateChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnImmediateChange.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with default props', () => {
    render(<SearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('placeholder', 'Search...');
  });

  it('renders with custom placeholder', () => {
    render(<SearchInput value="" onChange={mockOnChange} placeholder="Custom search..." />);

    const input = screen.getByPlaceholderText('Custom search...');
    expect(input).toBeInTheDocument();
  });

  it('shows clear button when value is not empty', () => {
    render(<SearchInput value="test" onChange={mockOnChange} />);

    const clearButton = screen.getByRole('button');
    expect(clearButton).toBeInTheDocument();
  });

  it('hides clear button when value is empty', () => {
    render(<SearchInput value="" onChange={mockOnChange} />);

    const clearButton = screen.queryByRole('button');
    expect(clearButton).not.toBeInTheDocument();
  });

  it('calls onChange after debounce delay (default 500ms)', async () => {
    render(<SearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should not call onChange immediately
    expect(mockOnChange).not.toHaveBeenCalled();

    // Should call onChange after 500ms
    vi.advanceTimersByTime(500);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('test');
    });
  });

  it('calls onChange after custom debounce delay', async () => {
    render(<SearchInput value="" onChange={mockOnChange} debounceMs={300} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should not call onChange before delay
    vi.advanceTimersByTime(299);
    expect(mockOnChange).not.toHaveBeenCalled();

    // Should call onChange after custom delay
    vi.advanceTimersByTime(1);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('test');
    });
  });

  it('calls onChange immediately when debounceMs is 0', () => {
    render(<SearchInput value="" onChange={mockOnChange} debounceMs={0} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should call onChange immediately
    expect(mockOnChange).toHaveBeenCalledWith('test');
  });

  it('calls onImmediateChange callback immediately', () => {
    render(
      <SearchInput value="" onChange={mockOnChange} onImmediateChange={mockOnImmediateChange} />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });

    // Should call onImmediateChange immediately
    expect(mockOnImmediateChange).toHaveBeenCalledWith('test');

    // Should not call onChange yet
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it('clears input when clear button is clicked', () => {
    render(<SearchInput value="test" onChange={mockOnChange} />);

    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);

    // Should call onImmediateChange if provided
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('resets debounce timer on rapid typing', async () => {
    render(<SearchInput value="" onChange={mockOnChange} />);

    const input = screen.getByRole('textbox');

    // Type first character
    fireEvent.change(input, { target: { value: 't' } });
    vi.advanceTimersByTime(400);

    // Type second character before first debounce completes
    fireEvent.change(input, { target: { value: 'te' } });
    vi.advanceTimersByTime(400);

    // Should not have called onChange yet
    expect(mockOnChange).not.toHaveBeenCalled();

    // Complete the debounce delay
    vi.advanceTimersByTime(100);
    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalledWith('te');
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });
  });

  it('syncs internal value with external value prop', () => {
    const { rerender } = render(<SearchInput value="initial" onChange={mockOnChange} />);

    const input = screen.getByDisplayValue('initial');
    expect(input).toBeInTheDocument();

    // Update external value
    rerender(<SearchInput value="updated" onChange={mockOnChange} />);

    const updatedInput = screen.getByDisplayValue('updated');
    expect(updatedInput).toBeInTheDocument();
  });
});
