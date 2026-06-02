export type StylePresetServer = {
  id: string;
  getPrompt: (opts?: { animeWithStars?: boolean }) => string;
};

export const stylePresetsServer: StylePresetServer[] = [
  {
    id: "anime-force",
    getPrompt: (opts) =>
      opts?.animeWithStars
        ? process.env.STYLE_PROMPT_1_1 ??
          "Anime style with stars and moon glow, preserve identity."
        : process.env.STYLE_PROMPT_1_2 ??
          "Anime style without stars, preserve identity.",
  },
  {
    id: "dreamworks-command",
    getPrompt: () =>
      process.env.STYLE_PROMPT_2 ??
      "Stylize the person in DreamWorks-like 3D cartoon look, heroic military framing, polished skin shading, depth of field.",
  },
  {
    id: "field-glam",
    getPrompt: () =>
      process.env.STYLE_PROMPT_3 ??
      "Stylize the person into premium cartoon military portrait, olive and khaki palette, clean linework, cinematic contrast.",
  },
];

export const stylePresetMap = new Map(
  stylePresetsServer.map((item) => [item.id, item]),
);
