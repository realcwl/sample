import { Fragment } from 'react'
import {
  Appearance as AppearanceOriginal,
  ColorSchemeName as ColorSchemeNameOriginal,
} from 'react-native'

import { Appearence, ColorSchemeName } from './index.shared'

export type { ColorSchemeName }

export const AppearanceProvider = Fragment

export const Appearance: Appearence = {
  addChangeListener(listener) {
    AppearanceOriginal.addChangeListener((preferences) => {
      const _colorScheme = preferences && preferences.colorScheme
      listener({ colorScheme: normalizeColorScheme(_colorScheme) })
    })

    return {
      remove: () => {
        AppearanceOriginal.removeChangeListener(listener as any)
      },
    }
  },
  getColorScheme() {
    return normalizeColorScheme(AppearanceOriginal.getColorScheme())
  },
}

function normalizeColorScheme(
  colorSchemeOriginal: ColorSchemeNameOriginal,
): ColorSchemeName {
  if (colorSchemeOriginal === 'light' || colorSchemeOriginal === 'dark')
    return colorSchemeOriginal

  return undefined
}
