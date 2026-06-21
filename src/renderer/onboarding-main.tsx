import React from 'react'
import ReactDOM from 'react-dom/client'
import { OnboardingApp } from './onboarding/OnboardingApp'
import './styles/panel.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <OnboardingApp />
  </React.StrictMode>
)
