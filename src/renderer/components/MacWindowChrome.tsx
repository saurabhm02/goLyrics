import React from 'react'

interface MacWindowChromeProps {
  title: string
  onClose?: () => void
}

export function MacWindowChrome({ title, onClose }: MacWindowChromeProps): React.JSX.Element {
  return (
    <header className="mac-titlebar drag-region">
      {onClose ? (
        <button
          type="button"
          className="mac-titlebar-close no-drag"
          aria-label="Close"
          onClick={onClose}
        >
          ×
        </button>
      ) : null}
      <span className="mac-titlebar-text">{title}</span>
    </header>
  )
}
