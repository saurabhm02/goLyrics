import React from 'react'

export type SettingsSection = 'appearance' | 'sync' | 'sources' | 'system' | 'maintenance'

interface SettingsSidebarProps {
  active: SettingsSection
  onChange: (section: SettingsSection) => void
}

const SECTIONS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: 'appearance', label: 'Appearance', icon: '◐' },
  { id: 'sync', label: 'Sync', icon: '↻' },
  { id: 'sources', label: 'Sources', icon: '♫' },
  { id: 'system', label: 'System', icon: '⚙' },
  { id: 'maintenance', label: 'Maintenance', icon: '◇' }
]

export function SettingsSidebar({ active, onChange }: SettingsSidebarProps): React.JSX.Element {
  return (
    <nav className="mac-sidebar no-drag" aria-label="Settings sections">
      <ul className="mac-sidebar-list">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              className={`mac-sidebar-item ${active === section.id ? 'active' : ''}`}
              onClick={() => onChange(section.id)}
            >
              <span className="mac-sidebar-icon" aria-hidden="true">
                {section.icon}
              </span>
              {section.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
