import { useEffect, useState } from 'react';

/** Numeric input that keeps the raw text while typing; emits null for empty/invalid. */
export function NumInput({
  value,
  onChange,
  label,
  className,
  step = 'any',
  min,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  label?: string;
  className?: string;
  step?: string;
  min?: number;
}) {
  const [text, setText] = useState(value === null ? '' : String(value));
  useEffect(() => {
    const parsed = text.trim() === '' ? null : Number(text);
    if (parsed !== value) setText(value === null ? '' : String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step}
      min={min}
      aria-label={label}
      className={className}
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const t = e.target.value.trim();
        const n = t === '' ? null : Number(t);
        onChange(n === null || Number.isFinite(n) ? n : null);
      }}
    />
  );
}

export function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="field">
      <span className={required ? 'req' : undefined}>{label}</span>
      {children}
    </label>
  );
}
