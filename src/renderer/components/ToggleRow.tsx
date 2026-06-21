import React from 'react'

interface ToggleRowProps {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function ToggleRow({ label, hint, checked, onChange }: ToggleRowProps): React.JSX.Element {
  return (
    <label className="toggle-row">
      <span className="toggle-row-text">
        <span className="toggle-row-label">{label}</span>
        {hint ? <span className="toggle-row-hint">{hint}</span> : null}
      </span>
      <span className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-track" aria-hidden="true">
          <span className="toggle-thumb" />
        </span>
      </span>
    </label>
  )
}
