// manta-tokens 가 정본이다. 값은 src/tokens.generated.mjs 에만 있고 이 파일은
// 기존 팔레트 이름(paper/ink/…)을 토큰 이름에 잇는 얇은 층이다.
import {
  fontFamily as tokenFontFamily,
  mermaidTheme as generatedMermaidTheme,
  palettes as tokenPalettes,
} from './tokens.generated.mjs';

export const fontFamily = tokenFontFamily;

// paper: canvas; ink: labels; muted/soft: secondary text and connections;
// surface: ordinary nodes; border/rule: outlines and separators; depth: groups.
// accent/tint apply only to explicit focus; series1..4 distinguish chart series.
// Colors supplement labels, endpoint marks and line patterns, never replace them.
const NAMES = {
  paper: 'bg', ink: 'text', muted: 'text-muted', soft: 'text-faint',
  border: 'border', rule: 'divider', surface: 'surface', accent: 'accent',
  tint: 'out-bg', depth: 'divider',
  series1: 'series-1', series2: 'series-2', series3: 'series-3', series4: 'series-4',
};

const map = (mode) =>
  Object.fromEntries(Object.entries(NAMES).map(([name, token]) => [name, tokenPalettes[mode][token]]));

export const palettes = {light: map('light'), dark: map('dark')};

export function mermaidTheme(dark) {
  return generatedMermaidTheme[dark ? 'dark' : 'light'];
}
