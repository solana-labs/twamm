import type { ReactElement } from "react";
import Fade from "@mui/material/Fade";
import { useMemo } from "react";
import { SnackbarProvider, useSnackbar } from "notistack";
import useBreakpoints from "../hooks/use-breakpoints";

export interface Props {
  maxSnack?: number;
  children: ReactElement;
}

export { useSnackbar };

export const NotificationProvider = ({ maxSnack = 1, children }: Props) => {
  const { isMobile } = useBreakpoints();

  const anchorOrigin: { vertical: "top" | "bottom"; horizontal: "right" } =
    useMemo(
      () =>
        isMobile
          ? { vertical: "top", horizontal: "right" }
          : { vertical: "bottom", horizontal: "right" },
      [isMobile]
    );

  return (
    <SnackbarProvider
      anchorOrigin={anchorOrigin}
      autoHideDuration={3000}
      maxSnack={maxSnack}
      TransitionComponent={Fade}
    >
      {children}
    </SnackbarProvider>
  );
};
