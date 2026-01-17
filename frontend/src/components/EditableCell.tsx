import { useState, useRef, useEffect, KeyboardEvent } from 'react';

/**
 * EditableCell Component
 * 
 * Inline düzenleme yapılabilen tablo hücresi bileşeni.
 * Requirements: 3.4, 4.7, 8.2
 */

interface EditableCellProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  isInteger?: boolean;
  prefix?: string;
}

export default function EditableCell({
  value,
  onChange,
  min = 0,
  max,
  disabled = false,
  className = '',
  isInteger = false,
  prefix,
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value.toString());
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input value when prop value changes
  useEffect(() => {
    if (!isEditing) {
      setInputValue(formatDisplayValue(value));
    }
  }, [value, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Format value for display
  function formatDisplayValue(val: number): string {
    if (isInteger) {
      return Math.round(val).toString();
    }
    // Format with 2 decimal places for currency values
    return val.toLocaleString('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  }

  // Validate and parse input value
  function validateAndParse(input: string): { valid: boolean; value: number; error?: string } {
    // Remove thousand separators and replace comma with dot
    const cleanedInput = input.replace(/\./g, '').replace(',', '.');
    
    // Check if empty
    if (cleanedInput.trim() === '') {
      return { valid: false, value: 0, error: 'Değer boş olamaz' };
    }

    // Parse number
    const parsed = parseFloat(cleanedInput);

    // Check if valid number
    if (isNaN(parsed)) {
      return { valid: false, value: 0, error: 'Geçerli bir sayı giriniz' };
    }

    // Check if negative (Requirements: 4.7)
    if (parsed < 0) {
      return { valid: false, value: 0, error: 'Negatif değer girilemez' };
    }

    // Check min/max bounds
    if (min !== undefined && parsed < min) {
      return { valid: false, value: 0, error: `Minimum değer: ${min}` };
    }
    if (max !== undefined && parsed > max) {
      return { valid: false, value: 0, error: `Maksimum değer: ${max}` };
    }

    // Round to integer if needed
    const finalValue = isInteger ? Math.round(parsed) : parsed;

    return { valid: true, value: finalValue };
  }

  // Handle click to enter edit mode
  function handleClick() {
    if (!disabled) {
      setIsEditing(true);
      setInputValue(value.toString().replace('.', ','));
      setError(null);
    }
  }

  // Handle input change
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInputValue(e.target.value);
    setError(null);
  }

  // Save value and exit edit mode
  function saveValue() {
    const result = validateAndParse(inputValue);
    
    if (result.valid) {
      if (result.value !== value) {
        onChange(result.value);
      }
      setIsEditing(false);
      setError(null);
    } else {
      setError(result.error || 'Geçersiz değer');
    }
  }

  // Cancel editing and restore original value
  function cancelEdit() {
    setIsEditing(false);
    setInputValue(formatDisplayValue(value));
    setError(null);
  }

  // Handle blur event (Requirements: 3.4 - Blur ile kaydetme)
  function handleBlur() {
    // Small delay to allow click events to fire first
    setTimeout(() => {
      if (isEditing) {
        saveValue();
      }
    }, 100);
  }

  // Handle keyboard events (Requirements: 3.4 - Enter ile kaydetme)
  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    } else if (e.key === 'Tab') {
      // Allow tab to move to next cell, save current value
      saveValue();
    }
  }

  // Render edit mode
  if (isEditing) {
    return (
      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
            {prefix}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={`w-full py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            error ? 'border-red-500' : 'border-indigo-500'
          } ${prefix ? 'pl-6 pr-2' : 'px-2'} ${className}`}
          disabled={disabled}
          inputMode="decimal"
        />
        {error && (
          <div className="absolute z-10 top-full left-0 mt-1 px-2 py-1 text-xs text-white bg-red-500 rounded shadow-lg whitespace-nowrap">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Render display mode
  return (
    <div
      onClick={handleClick}
      className={`px-2 py-1 text-sm cursor-pointer hover:bg-slate-50 rounded transition-colors ${
        disabled ? 'cursor-not-allowed opacity-50' : ''
      } ${prefix ? 'inline-flex items-center gap-1' : ''} ${className}`}
      title={disabled ? 'Düzenleme devre dışı' : 'Düzenlemek için tıklayın'}
    >
      {prefix && <span className="text-gray-500">{prefix}</span>}
      {formatDisplayValue(value)}
    </div>
  );
}
