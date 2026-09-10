# ToKoMart Icons Package

Finalized ToKoMart shopping-bag + orange T brand icon.

## Included
- PNG assets for mobile, web, and iOS
- SVG vector master (with and without background)
- Multi-resolution favicon ICO files
- Android adaptive icon foreground/background + XML
- Web/PWA manifest snippet

## Brand colors
- Primary Blue: #3B5BFF
- Accent Orange: #FF7A00
- White: #FFFFFF

## Android
Copy the `android/res` contents into:
`android/app/src/main/res/`

Then use:
`android:icon="@mipmap/ic_launcher"`

The foreground is intentionally kept well inside the adaptive safe zone to reduce
cropping across Android launchers.

## Web
Use `svg/tokomart-icon.svg` for scalable UI and `ico/favicon.ico` for the browser favicon.
Use the 192x192 and 512x512 PNGs for PWA icons.

## iOS
Use `png/ios/AppIcon-1024x1024.png` as the master for Xcode/AppIcon generation,
or import the provided sizes into the appropriate AppIcon set.
