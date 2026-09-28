import React, { useRef, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { cleanDateString } from '../utils/calculations';

interface DateInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export const DateInputField: React.FC<DateInputFieldProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'dd/mm/yyyy',
  className = '',
  ariaLabel = 'Kolom tanggal',
}) => {
  const nativePickerRef = useRef<HTMLInputElement>(null);

  // Bersihkan nilai tampilan jika mengandung ISO timestamp / time
  const displayValue = useMemo(() => {
    if (!value) return '';
    if (value.includes('T') || value.includes('Z') || value.includes(':') || /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return cleanDateString(value);
    }
    return value;
  }, [value]);

  // Konversi dd/mm/yyyy ke format yyyy-mm-dd untuk native picker
  const nativeDateVal = useMemo(() => {
    if (!displayValue) return '';
    const cleaned = cleanDateString(displayValue);
    const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    return '';
  }, [displayValue]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Jika pengguna menempel (paste) string tanggal ISO atau waktu seperti 2026-08-26T00:00:00.000Z
    if (raw.includes('T') || raw.includes('Z') || raw.includes(':') || raw.length > 10 || /^\d{4}-\d{2}-\d{2}/.test(raw)) {
      onChange(cleanDateString(raw));
    } else {
      onChange(raw);
    }
  };

  const handleBlur = () => {
    if (displayValue) {
      onChange(cleanDateString(displayValue));
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.value; // YYYY-MM-DD
    if (picked) {
      onChange(cleanDateString(picked));
    }
  };

  const openCalendar = () => {
    if (disabled || !nativePickerRef.current) return;
    try {
      const el = nativePickerRef.current as HTMLInputElement & { showPicker?: () => void };
      if (typeof el.showPicker === 'function') {
        el.showPicker();
      } else {
        el.focus();
      }
    } catch {
      nativePickerRef.current?.focus();
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        disabled={disabled}
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        className={`w-full text-xs font-mono px-3 py-2 pr-9 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 transition-colors ${className}`}
      />

      {!disabled && (
        <button
          type="button"
          onClick={openCalendar}
          title="Pilih tanggal dari kalender (dd/mm/yyyy)"
          className="absolute right-2 text-slate-400 hover:text-emerald-600 focus:text-emerald-600 transition-colors p-1 cursor-pointer rounded"
        >
          <Calendar className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Hidden native HTML5 date input untuk membuka pemilih kalender */}
      <input
        ref={nativePickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={nativeDateVal}
        onChange={handlePickerChange}
        className="sr-only absolute pointer-events-none opacity-0"
      />
    </div>
  );
};
