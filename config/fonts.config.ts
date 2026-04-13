export type FontPresetName = "modern" | "editorial" | "developer";

export type FontPreset = {
  sans: string;
  heading: string;
  mono: string;
};

export const fontPresets: Record<FontPresetName, FontPreset> = {
  modern: {
    sans: 'var(--font-geist-sans), "Inter", "Segoe UI", sans-serif',
    heading: 'var(--font-geist-sans), "Inter", "Segoe UI", sans-serif',
    mono: 'var(--font-geist-mono), "JetBrains Mono", ui-monospace, monospace',
  },
  editorial: {
    sans: 'var(--font-geist-sans), "Source Sans 3", "Segoe UI", sans-serif',
    heading: '"Iowan Old Style", "Palatino Linotype", Palatino, "Times New Roman", serif',
    mono: 'var(--font-geist-mono), "IBM Plex Mono", ui-monospace, monospace',
  },
  developer: {
    sans: 'var(--font-geist-sans), "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    heading: 'var(--font-geist-sans), "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'var(--font-geist-mono), "Cascadia Code", "Fira Code", ui-monospace, monospace',
  },
};

// Change this one value to swap global project typography.
export const activeFontPreset: FontPresetName = "modern";

// Optional runtime overrides from env (.env/.env.local):
// NEXT_PUBLIC_FONT_SANS="Your Sans Font, sans-serif"
// NEXT_PUBLIC_FONT_HEADING="Your Heading Font, serif"
// NEXT_PUBLIC_FONT_MONO="Your Mono Font, monospace"
export function resolveAppFonts(): FontPreset {
  const preset = fontPresets[activeFontPreset];

  const customSans = process.env.NEXT_PUBLIC_FONT_SANS?.trim();
  const customHeading = process.env.NEXT_PUBLIC_FONT_HEADING?.trim();
  const customMono = process.env.NEXT_PUBLIC_FONT_MONO?.trim();

  return {
    sans: customSans || preset.sans,
    heading: customHeading || preset.heading,
    mono: customMono || preset.mono,
  };
}
