export type AnimationVariant = "circle-blur" | "none";
export type AnimationStart =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

export type ThemeAnimationResult = {
  name: string;
  css: string;
};

const ORIGIN_MAP: Record<AnimationStart, string> = {
  "top-left": "0% 0%",
  "top-right": "100% 0%",
  "bottom-left": "0% 100%",
  "bottom-right": "100% 100%",
  center: "50% 50%",
};

export function createAnimation(
  variant: AnimationVariant,
  start: AnimationStart,
  url = ""
): ThemeAnimationResult {
  void url;
  if (variant === "none") {
    return { name: "theme-none", css: "" };
  }

  const origin = ORIGIN_MAP[start];

  return {
    name: `theme-${variant}`,
    css: `
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
  transform-origin: ${origin};
}
::view-transition-new(root) {
  animation-name: theme-fade-in;
}
@keyframes theme-fade-in {
  from { opacity: 0.85; filter: blur(6px); }
  to { opacity: 1; filter: blur(0); }
}
`,
  };
}
