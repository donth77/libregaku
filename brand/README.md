# Libregaku logo

学 (*gaku*, learning) sitting on the coral underline Libregaku draws beneath a
word you haven't learned yet. The logo is the first word you learn.

## Which file

| Use | File |
|---|---|
| Most places, light background | `libregaku-logo-horizontal-color.svg` |
| Dark background | `libregaku-logo-horizontal-color-on-dark.svg` |
| Square spaces: avatars, slides | `libregaku-logo-stacked-color.svg`, `…-color-on-dark.svg` |
| The mark alone, 32 px and up | `libregaku-symbol-color.svg`, `…-color-on-dark.svg` |
| One colour only: print, engraving | `…-black.svg`, `…-white.svg` |
| App-style icon | `libregaku-icon.svg` (navy tile) |
| Extension icons | `../src/icons/icon-{16,32,48,128}.png` |
| Where SVG isn't accepted | `png/` |

The 16 and 32 px icons are drawn pixel by pixel for those sizes
(`libregaku-icon-16.svg`, `libregaku-icon-32.svg`). Don't scale them up; the
48 and 128 px icons come from `libregaku-icon.svg`.

The `white` and `on-dark` files are drawn 3% thinner. A light mark on a dark
ground looks heavier than the same mark dark on light.

## Colour

| | HEX | RGB | CMYK |
|---|---|---|---|
| Navy — 学, icon tile | `#0D111C` | 13 17 28 | 54 39 0 89 |
| Coral — the underline | `#E5806C` | 229 128 108 | 0 44 53 10 |
| Paper — 学 on dark | `#F2F5FC` | 242 245 252 | 4 3 0 1 |

These are the extension's own colours: the player UI's background, the
unknown-word underline, and the subtitle text. The CMYK values are a straight
conversion, not a proof; check a printed sample first. No Pantone has been
chosen.

Coral on white is 2.75:1 — enough for the underline, not for text.

## Space and size

Leave clear space on every side at least as tall as the three short strokes
at the top of 学.

| | Smallest on screen | Smallest in print |
|---|---|---|
| Horizontal | 100 px wide | 25 mm wide |
| Stacked | 64 px tall | 16 mm tall |
| Symbol | 32 px tall; below that, the icon PNGs | 8 mm tall |

## The underline

It is coral in the logo. Where the logo sits inside the product it may take
the overlay's other status colours — amber `#D9A64A` for learning, violet
`#A78BFA` for tracking — and no others.

## Don't

- Recolour 学 or the underline outside these colours.
- Stretch, rotate, outline, shadow or add effects.
- Move the underline, change its length, or split it from 学.
- Retype the wordmark; it is drawn, not set in a font.
- Scale the 16 or 32 px icons up.
- Put the colour version on photos or mid-tone backgrounds; use the icon tile
  or a one-colour version.

## Type

The wordmark is custom geometry, so there is no font to license. Next to the
logo, use the system UI font the extension already uses.
