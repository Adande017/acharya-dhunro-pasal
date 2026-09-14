import {
  splitTypographyProps,
  usePageTypography,
  type PageTypographyProps,
} from '@threeui-lp/pageTypography.js'
import { COMPLETE_SHELF_TYPOGRAPHY } from '@threeui-lp/pageRecipes.js'

import {
  LandingPageFrame,
  type LandingPageProps,
} from './threeui/LandingPageFrame'

export const COMPLETE_SHELF_DEFAULTS = {
  headingFont: 'iowan-old-style',
  bodyFont: 'inter',
  headingWeight: '400',
  bodyWeight: '400',
  primaryColor: '#c87046',
  headingSize: 60,
  bodySize: 12,
  headingLetterSpacing: -0.055,
} as const satisfies PageTypographyProps

export type CompleteShelfAcharyaProps = LandingPageProps &
  PageTypographyProps & {
    applyScene?: (frame: HTMLIFrameElement) => void
    backgroundCanvasSelector?: string
    backgroundVisualSelector?: string
  }

/**
 * Thin local wrapper mirroring CompleteShelfLandingPage typography,
 * with sourceUrl rooted at Vite BASE_URL so GitHub project Pages resolve.
 */
export function CompleteShelfAcharya({
  applyScene,
  backgroundCanvasSelector,
  backgroundVisualSelector,
  ...props
}: CompleteShelfAcharyaProps) {
  const [type, frame] = splitTypographyProps(props)
  const customization = usePageTypography(COMPLETE_SHELF_TYPOGRAPHY, {
    headingFont: type.headingFont ?? COMPLETE_SHELF_DEFAULTS.headingFont,
    bodyFont: type.bodyFont ?? COMPLETE_SHELF_DEFAULTS.bodyFont,
    headingWeight: type.headingWeight ?? COMPLETE_SHELF_DEFAULTS.headingWeight,
    bodyWeight: type.bodyWeight ?? COMPLETE_SHELF_DEFAULTS.bodyWeight,
    primaryColor: type.primaryColor ?? COMPLETE_SHELF_DEFAULTS.primaryColor,
    headingSize: type.headingSize ?? COMPLETE_SHELF_DEFAULTS.headingSize,
    bodySize: type.bodySize ?? COMPLETE_SHELF_DEFAULTS.bodySize,
    headingLetterSpacing:
      type.headingLetterSpacing ?? COMPLETE_SHELF_DEFAULTS.headingLetterSpacing,
  })

  const sourceUrl = `${import.meta.env.BASE_URL}landing-pages/complete-shelf-v2.html`

  return (
    <LandingPageFrame
      {...frame}
      applyScene={applyScene}
      backgroundCanvasSelector={backgroundCanvasSelector}
      backgroundVisualSelector={backgroundVisualSelector}
      customization={customization}
      title="Acharya Dhunro Pasal — Corn Puff Pipes"
      sourceUrl={sourceUrl}
    />
  )
}
