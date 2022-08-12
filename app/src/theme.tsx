import type { PaletteMode } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import darkScrollbar from "@mui/material/darkScrollbar";
import { grey } from "@mui/material/colors";
import { lensPath, pipe, set } from "ramda";

import { theme as kitTheme } from "./theme/external-theme";
import { components, palette } from "./theme/index";

const lensScrollbar = lensPath([
  "components",
  "MuiCssBaseline",
  "styleOverrides",
  "html",
]);
const getOverrides = (theme: Theme, mode: PaletteMode) => {
  const scrollbar = darkScrollbar(
    mode === "light"
      ? {
          track: grey[200],
          thumb: grey[400],
          active: grey[400],
        }
      : undefined
  );

  const setScrollbar = set(lensScrollbar, {
    ...scrollbar,
    scrollbarWidth: "thin", // 4 FF
  });

  return setScrollbar(theme);
};

export const enhanceTheme = (theme: Theme) =>
  pipe(
    palette("background"),
    components,
    palette("text")
  )(getOverrides(theme, "dark"));

export { kitTheme };

export const darkTheme = enhanceTheme(kitTheme);
