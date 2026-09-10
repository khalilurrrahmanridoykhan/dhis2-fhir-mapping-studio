import { NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React, { Component, type ErrorInfo, type ReactNode } from 'react'
import classes from './ErrorBoundary.module.css'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches any render/lifecycle error from the app's own component tree and
 * shows it as a NoticeBox instead of a blank white screen -- the same
 * pattern the sibling dhis2-fhir-sync-console app uses. A crash here is
 * never silent: the message is shown to the user and logged for whoever
 * is debugging the instance.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('FHIR Mapping Studio crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className={classes.wrap}>
          <NoticeBox error title={i18n.t('FHIR Mapping Studio hit an unexpected error')}>
            {this.state.error.message}
          </NoticeBox>
        </div>
      )
    }
    return this.props.children
  }
}
