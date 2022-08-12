import type { ReactElement } from "react";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import {
  createTheme,
  experimental_extendTheme as extendTheme,
  Experimental_CssVarsProvider as CssVarsProvider,
  ThemeProvider as Provider,
} from "@mui/material/styles";
import { memo, useMemo } from "react";

import { enhanceTheme, kitTheme } from "../theme";

const BaselineMemo = memo(() => <CssBaseline enableColorScheme />);

export interface Props {
  children: ReactElement;
}

export const ThemeProvider = ({ children }: Props) => {
  const preferredMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = useMemo(() => {
    const t = createTheme(
      enhanceTheme({
        ...kitTheme,
        palette: {
          ...kitTheme.palette,
          mode: preferredMode ? "dark" : "light",
        },
      })
    );

    return t;
  }, [preferredMode]);

  const cssVarTheme = useMemo(() => extendTheme(theme), [theme]);

  return (
    <>
      <CssVarsProvider theme={cssVarTheme} />
      <Provider theme={theme}>
        <BaselineMemo />
        {children}
      </Provider>
    </>
  );
};
