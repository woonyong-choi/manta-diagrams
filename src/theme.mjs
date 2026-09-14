// Shared by the document renderer, Manta layouts and portable exports.
// paper: canvas; ink: labels; muted/soft: secondary text and connections;
// surface: ordinary nodes; border/rule: outlines and separators; depth: groups.
// accent/tint apply only to explicit focus; series1..4 distinguish chart series.
// Colors supplement labels, endpoint marks and line patterns, never replace them.
export const fontFamily = '"Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif';
export const palettes = {
  light: {paper:'#ffffff', ink:'#1f2328', muted:'#59636e', soft:'#59636e', border:'#818b98', rule:'#d1d9e0', surface:'#f6f8fa', accent:'#a04729', tint:'#fff3eb', series1:'#42764c', series2:'#356eaa', series3:'#896a28', series4:'#81558d', depth:'#d1d9e0'},
  dark: {paper:'#0d1117', ink:'#e6edf3', muted:'#a4afbc', soft:'#a4afbc', border:'#738091', rule:'#3d4754', surface:'#161b22', accent:'#edaf86', tint:'#2b2420', series1:'#9dc9a4', series2:'#9cbfdf', series3:'#dfc38a', series4:'#c9a5d0', depth:'#303944'},
};

export function mermaidTheme(dark) {
  const p = palettes[dark ? 'dark' : 'light'];
  return {
    darkMode: dark, background:p.paper, fontFamily, fontSize:'15px',
    primaryColor:p.surface, primaryTextColor:p.ink, primaryBorderColor:p.border,
    secondaryColor:p.tint, secondaryTextColor:p.ink, secondaryBorderColor:p.border,
    tertiaryColor:p.paper, tertiaryTextColor:p.ink, tertiaryBorderColor:p.rule,
    lineColor:p.muted, textColor:p.ink, mainBkg:p.surface, nodeBorder:p.border,
    clusterBkg:p.paper, clusterBorder:p.rule, edgeLabelBackground:p.paper,
    archEdgeColor:p.muted, archEdgeArrowColor:p.muted, archGroupBorderColor:p.border,
    actorBkg:p.surface, actorBorder:p.border, actorTextColor:p.ink, actorLineColor:p.border,
    signalColor:p.muted, signalTextColor:p.ink, labelTextColor:p.ink,
    noteBkgColor:p.tint, noteBorderColor:p.border, noteTextColor:p.ink,
    activationBkgColor:p.surface, activationBorderColor:p.border,
    attributeBackgroundColorOdd:p.paper, attributeBackgroundColorEven:p.surface,
    emUiFill:p.surface, emUiStroke:p.border, emProcessorFill:p.tint, emProcessorStroke:p.series4,
    emReadModelFill:p.surface, emReadModelStroke:p.series1, emCommandFill:p.surface, emCommandStroke:p.series2,
    emEventFill:p.tint, emEventStroke:p.accent, emSwimlaneBackgroundOdd:p.paper, emSwimlaneBackgroundStroke:p.rule,
    emRelationStroke:p.muted, emArrowhead:p.muted,
  };
}
