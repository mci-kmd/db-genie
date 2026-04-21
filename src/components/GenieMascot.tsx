import { keyframes } from '@emotion/react'
import { Box } from '@mui/material'
import type { ReactElement } from 'react'

import { palette } from '../theme'

type PixelRect = readonly [x: number, y: number, width: number, height: number, color: string]

const pixelSize = 2

const idleBob = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-1px); }
`

const activeBob = keyframes`
  0%, 100% { transform: translate(0px, 0px); }
  25% { transform: translate(0px, -1px); }
  50% { transform: translate(1px, 0px); }
  75% { transform: translate(0px, 1px); }
`

const blink = keyframes`
  0%, 80%, 100% { opacity: 1; }
  83%, 88% { opacity: 0; }
`

const frameA = keyframes`
  0%, 49% { opacity: 1; }
  50%, 100% { opacity: 0; }
`

const frameB = keyframes`
  0%, 49% { opacity: 0; }
  50%, 100% { opacity: 1; }
`

const sparklePulse = keyframes`
  0%, 100% {
    opacity: 0.2;
    transform: translate(0px, 1px);
  }
  50% {
    opacity: 1;
    transform: translate(0px, -1px);
  }
`

const colors = {
  face: palette.peach,
  body: palette.blue,
  tail: palette.teal,
  turban: palette.purple,
  trim: palette.pink,
  jewel: palette.teal,
  eye: palette.bg,
  sparkle: palette.text,
} as const

const basePixels: readonly PixelRect[] = [
  [5, 1, 4, 1, colors.turban],
  [4, 2, 2, 1, colors.turban],
  [6, 2, 1, 1, colors.jewel],
  [7, 2, 1, 1, colors.trim],
  [8, 2, 2, 1, colors.turban],
  [4, 3, 1, 2, colors.turban],
  [5, 3, 4, 1, colors.face],
  [9, 3, 1, 2, colors.turban],
  [5, 4, 1, 1, colors.face],
  [8, 4, 1, 1, colors.face],
  [5, 5, 4, 1, colors.face],
  [6, 6, 2, 1, colors.trim],
  [4, 6, 2, 1, colors.turban],
  [8, 6, 2, 1, colors.turban],
  [5, 7, 4, 1, colors.body],
  [5, 8, 4, 1, colors.body],
  [6, 9, 2, 1, colors.tail],
]

const eyePixels: readonly PixelRect[] = [
  [5, 4, 1, 1, colors.eye],
  [8, 4, 1, 1, colors.eye],
  [6, 5, 1, 1, colors.eye],
]

const leftArmPixels: readonly PixelRect[] = [
  [3, 7, 2, 1, colors.trim],
  [2, 8, 2, 1, colors.trim],
]

const rightIdleArmPixels: readonly PixelRect[] = [
  [9, 7, 2, 1, colors.trim],
  [10, 8, 2, 1, colors.trim],
]

const rightCastArmAPixels: readonly PixelRect[] = [
  [9, 6, 2, 1, colors.trim],
  [10, 5, 2, 1, colors.trim],
]

const rightCastArmBPixels: readonly PixelRect[] = [
  [9, 5, 2, 1, colors.trim],
  [10, 4, 2, 1, colors.trim],
]

const idleTailAPixels: readonly PixelRect[] = [
  [5, 10, 5, 1, colors.turban],
  [6, 11, 5, 1, colors.body],
  [7, 12, 4, 1, colors.tail],
  [8, 13, 2, 1, colors.tail],
]

const idleTailBPixels: readonly PixelRect[] = [
  [4, 10, 5, 1, colors.turban],
  [5, 11, 5, 1, colors.body],
  [6, 12, 4, 1, colors.tail],
  [7, 13, 2, 1, colors.tail],
]

const activeTailAPixels: readonly PixelRect[] = [
  [4, 10, 6, 1, colors.trim],
  [5, 11, 6, 1, colors.turban],
  [6, 12, 5, 1, colors.body],
  [7, 13, 3, 1, colors.tail],
]

const activeTailBPixels: readonly PixelRect[] = [
  [5, 10, 6, 1, colors.trim],
  [4, 11, 6, 1, colors.turban],
  [5, 12, 5, 1, colors.body],
  [7, 13, 2, 1, colors.tail],
]

const magicSparkleAPixels: readonly PixelRect[] = [
  [11, 3, 1, 1, colors.sparkle],
  [10, 4, 1, 1, colors.sparkle],
  [11, 4, 1, 1, colors.jewel],
  [12, 4, 1, 1, colors.sparkle],
  [11, 5, 1, 1, colors.sparkle],
  [12, 2, 1, 1, colors.jewel],
]

const magicSparkleBPixels: readonly PixelRect[] = [
  [11, 6, 1, 1, colors.sparkle],
  [10, 7, 1, 1, colors.sparkle],
  [11, 7, 2, 1, colors.trim],
  [12, 6, 1, 1, colors.sparkle],
  [12, 8, 1, 1, colors.sparkle],
]

function renderPixels(pixels: readonly PixelRect[]): ReactElement[] {
  return pixels.map(([x, y, width, height, color], index) => (
    <rect
      key={`${x}-${y}-${width}-${height}-${index}`}
      x={x * pixelSize}
      y={y * pixelSize}
      width={width * pixelSize}
      height={height * pixelSize}
      fill={color}
    />
  ))
}

type GenieMascotProps = {
  casting?: boolean
}

export function GenieMascot({ casting = false }: GenieMascotProps) {
  return (
    <Box
      component="span"
      sx={{
        width: 28,
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        '& .genie-body': {
          animation: `${casting ? activeBob : idleBob} ${casting ? '720ms' : '1600ms'} steps(2, end) infinite`,
          transformBox: 'fill-box',
          transformOrigin: 'center',
        },
        '& .genie-eyes': {
          animation: `${blink} 3.4s steps(1, end) infinite`,
        },
        '& .genie-frame-a': {
          animation: `${frameA} ${casting ? '500ms' : '1600ms'} steps(1, end) infinite`,
        },
        '& .genie-frame-b': {
          animation: `${frameB} ${casting ? '500ms' : '1600ms'} steps(1, end) infinite`,
        },
        '& .genie-magic-a': {
          animation: `${sparklePulse} 560ms steps(2, end) infinite`,
          transformBox: 'fill-box',
          transformOrigin: 'center',
        },
        '& .genie-magic-b': {
          animation: `${sparklePulse} 560ms steps(2, end) infinite reverse`,
          transformBox: 'fill-box',
          transformOrigin: 'center',
        },
        '@media (prefers-reduced-motion: reduce)': {
          animation: 'none',
          '& .genie-body, & .genie-eyes, & .genie-frame-a, & .genie-frame-b, & .genie-magic-a, & .genie-magic-b': {
            animation: 'none',
          },
        },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 28 28"
        aria-hidden="true"
        sx={{
          width: 28,
          height: 28,
          display: 'block',
          shapeRendering: 'crispEdges',
          imageRendering: 'pixelated',
          overflow: 'visible',
        }}
      >
        <g className="genie-body">
          {renderPixels(basePixels)}
          {renderPixels(leftArmPixels)}
          {casting ? null : renderPixels(rightIdleArmPixels)}
          <g className="genie-eyes">{renderPixels(eyePixels)}</g>
        </g>

        {casting ? (
          <>
            <g className="genie-frame-a">{renderPixels(activeTailAPixels)}</g>
            <g className="genie-frame-b">{renderPixels(activeTailBPixels)}</g>
            <g className="genie-frame-a">{renderPixels(rightCastArmAPixels)}</g>
            <g className="genie-frame-b">{renderPixels(rightCastArmBPixels)}</g>
            <g className="genie-magic-a">{renderPixels(magicSparkleAPixels)}</g>
            <g className="genie-magic-b">{renderPixels(magicSparkleBPixels)}</g>
          </>
        ) : (
          <>
            <g className="genie-frame-a">{renderPixels(idleTailAPixels)}</g>
            <g className="genie-frame-b">{renderPixels(idleTailBPixels)}</g>
          </>
        )}
      </Box>
    </Box>
  )
}
