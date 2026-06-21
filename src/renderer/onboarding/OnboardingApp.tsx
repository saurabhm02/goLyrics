import React, { useState } from 'react'
import { MacWindowChrome } from '../components/MacWindowChrome'

const STEPS = [
  {
    icon: '♪',
    title: 'Welcome to goLyrics',
    body: 'Synchronized lyrics appear in a transparent overlay while music plays from YouTube, Spotify, or Apple Music.',
    permission: null
  },
  {
    icon: '⚙',
    title: 'Automation permission',
    body: 'Allow goLyrics to control Google Chrome, Arc, Edge, Safari, Spotify, and Music so it can detect the current song and playback position.',
    permission: {
      title: 'Privacy & Security → Automation',
      detail: 'Enable goLyrics for Chrome, Arc, Edge, Safari, Spotify, and Music.',
      action: 'automation' as const
    }
  },
  {
    icon: '⌘',
    title: 'Chrome JavaScript setting',
    body: 'For precise YouTube sync, Chrome needs one extra setting.',
    permission: {
      title: 'Chrome → View → Developer',
      detail: 'Turn on “Allow JavaScript from Apple Events”.',
      action: null
    }
  },
  {
    icon: '✓',
    title: 'You are ready',
    body: 'Play a song and press Option+L to toggle the overlay. Open Settings from the menu bar anytime.',
    permission: null
  }
]

export function OnboardingApp(): React.JSX.Element {
  const [step, setStep] = useState(0)
  const current = STEPS[step]

  const finish = (): void => {
    void window.goLyrics.completeOnboarding()
  }

  return (
    <div className="mac-app mac-onboarding-app">
      <MacWindowChrome title="goLyrics Setup" />
      <div className="mac-onboarding-content no-drag">
        <div className="mac-step-dots" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((_, index) => (
            <span key={index} className={`mac-dot ${index === step ? 'active' : ''}`} />
          ))}
        </div>

        <div className="mac-onboarding-icon-well" aria-hidden="true">
          {current.icon}
        </div>

        <h1 className="mac-onboarding-title">{current.title}</h1>
        <p className="mac-onboarding-body">{current.body}</p>

        {current.permission ? (
          <div className="mac-callout">
            <strong>{current.permission.title}</strong>
            <p>{current.permission.detail}</p>
            {current.permission.action ? (
              <button
                className="mac-btn mac-btn-secondary mac-btn-inline"
                type="button"
                onClick={() => void window.goLyrics.openSystemSettings(current.permission!.action!)}
              >
                Open System Settings
              </button>
            ) : null}
          </div>
        ) : null}

        <nav className="mac-onboarding-nav">
          {step > 0 ? (
            <button className="mac-btn mac-btn-secondary" type="button" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <button className="mac-btn mac-btn-primary" type="button" onClick={() => setStep((s) => s + 1)}>
              Continue
            </button>
          ) : (
            <button className="mac-btn mac-btn-primary" type="button" onClick={finish}>
              Get Started
            </button>
          )}
        </nav>
      </div>
    </div>
  )
}
