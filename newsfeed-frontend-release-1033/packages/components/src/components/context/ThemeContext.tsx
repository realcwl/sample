import React, { useCallback, useContext, useEffect } from 'react'
import { useDispatch } from 'react-redux'

import {
  defaultTheme,
  Theme,
  ThemeTransformer,
  transformTheme,
} from '@devhub/core'
import { useReduxState } from '../../hooks/use-redux-state'
import { useReduxStateCallback } from '../../hooks/use-redux-state-callback'
import { Appearance } from '../../libs/appearence'
import { Browser } from '../../libs/browser'
import * as actions from '../../redux/actions'
import * as selectors from '../../redux/selectors'
import { getColumnHeaderThemeColors } from '../columns/ColumnHeader'

export interface ThemeProviderProps {
  children: React.ReactNode
}

export type ThemeProviderState = Theme

export const ThemeContext =
  React.createContext<ThemeProviderState>(defaultTheme)
ThemeContext.displayName = 'ThemeContext'

let _theme: Theme = defaultTheme
export function ThemeProvider(props: ThemeProviderProps) {
  const theme = useReduxState(selectors.themeSelector)
  _theme = theme

  useEffect(() => {
    const headerThemeColors = getColumnHeaderThemeColors()
    Browser.setBackgroundColor(theme[headerThemeColors.normal])
    Browser.setForegroundColor(theme.foregroundColor)
  }, [theme])

  return (
    <ThemeContext.Provider value={theme}>
      {props.children}
    </ThemeContext.Provider>
  )
}

export const ThemeConsumer = ThemeContext.Consumer

export function useTheme({
  themeTransformer,
}: { themeTransformer?: ThemeTransformer } = {}) {
  let theme = useContext(ThemeContext)
  if (themeTransformer) theme = transformTheme(theme, themeTransformer)

  return theme
}

export function useThemeCallback(
  {
    skipFirstCallback,
    themeTransformer,
  }: { skipFirstCallback?: boolean; themeTransformer?: ThemeTransformer } = {},
  callback: (theme: Theme) => void,
) {
  let initialTheme = useReduxStateCallback(
    selectors.themeSelector,
    useCallback(
      (t) => {
        const theme = themeTransformer ? transformTheme(t, themeTransformer) : t
        callback(theme)
      },
      [callback, skipFirstCallback, themeTransformer],
    ),
    { skipFirstCallback },
  )

  if (themeTransformer)
    initialTheme = transformTheme(initialTheme, themeTransformer)

  const headerThemeColors = getColumnHeaderThemeColors()
  Browser.setBackgroundColor(initialTheme[headerThemeColors.normal])
  Browser.setForegroundColor(initialTheme.foregroundColor)

  return initialTheme
}

export function getTheme() {
  return _theme
}
