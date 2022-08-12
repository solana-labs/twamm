import type { Theme } from "@mui/material/styles";
import { lensPath, view } from "ramda";

export const lensMode = lensPath(["palette", "mode"]);

export const muiPaperCustomVariant = {
  background:
    "linear-gradient(110.5deg, rgba(26, 31, 46) 3.75%, rgba(36, 41, 57) 117.62%)",
  border: "0.5px solid rgba(255, 255, 255, 0.16)",
  boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.08)",
  borderRadius: "8px",
};

const palette = {
  neutral: {
    100: "#F3F4F6",
    200: "#E5E7EB",
    300: "#D1D5DB",
    400: "#9CA3AF",
    500: "#6B7280",
    600: "#4B5563",
    700: "#374151",
    800: "#1F2937",
    900: "#111827",
  },
  action: {
    active: "#6B7280",
    focus: "rgba(55, 65, 81, 0.12)",
    hover: "rgba(55, 65, 81, 0.04)",
    selected: "rgba(55, 65, 81, 0.08)",
    disabledBackground: "rgba(55, 65, 81, 0.12)",
    disabled: "rgba(55, 65, 81, 0.26)",
  },
  background: {
    default: "#F9FAFC",
    paper: "#FFFFFF",
  },
  divider: "#E6E8F0",
  primary: {
    main: "#5048E5",
    light: "#828DF8",
    dark: "#3832A0",
    contrastText: "#FFFFFF",
  },
  secondary: {
    main: "#10B981",
    light: "#3FC79A",
    dark: "#0B815A",
    contrastText: "#FFFFFF",
  },
  success: {
    main: "#14B8A6",
    light: "#43C6B7",
    dark: "#0E8074",
    contrastText: "#FFFFFF",
  },
  info: {
    main: "#2196F3",
    light: "#64B6F7",
    dark: "#0B79D0",
    contrastText: "#FFFFFF",
  },
  warning: {
    main: "#FFB020",
    light: "#FFBF4C",
    dark: "#B27B16",
    contrastText: "#FFFFFF",
  },
  error: {
    main: "#D14343",
    light: "#DA6868",
    dark: "#922E2E",
    contrastText: "#FFFFFF",
  },
  text: {
    primary: "#121828",
    secondary: "#65748B",
    disabled: "rgba(55, 65, 81, 0.48)",
  },
};

const lightPalette = {
  ...palette,
  text: {
    primary: "#121828",
    secondary: "#fff",
    disabled: "#c6c6c6",
  },
};

const darkPalette = {
  ...palette,
  text: {
    ...palette.text,
    primary: "#fff",
  },
  background: {
    default: "#121623",
    paper: "#181f2b",
  },
};

export const light = {
  palette: lightPalette,
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          padding: "4px",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {},
      },
    },
  },
};

export const dark = {
  palette: darkPalette,
  components: {
    MuiBackdrop: {
      styleOverrides: {
        root: {
          "& > .MuiPaper-root": muiPaperCustomVariant,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          color: "#fff",
        },
        overlay: {
          color: "#fff",
          position: "relative",
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          color: "#fff",
        },
      },
    },
    MuiModal: {
      variants: [
        {
          props: { variant: "custom" },
          style: {
            "& > .MuiPaper-root": {
              background: darkPalette.background.paper,
              border: muiPaperCustomVariant.border,
              boxShadow: muiPaperCustomVariant.boxShadow,
              borderRadius: muiPaperCustomVariant.borderRadius,
            },
            "& .MuiCard-root": {
              background: "transparent",
              border: 0,
              boxShadow: "none",
            },
          },
        },
      ],
    },
    MuiOutlinedInput: {
      styleOverrides: {
        notchedOutline: {
          borderColor: "#E6E8F0",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          color: "rgba(255, 255, 255, 0.6)",
          background:
            "linear-gradient(110.5deg, rgba(26, 31, 46, 0.4) 3.75%, rgba(36, 41, 57, 0.4) 117.62%)",
        },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: {
          backgroundColor: "rgba(255, 255, 255, 0.04)",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        root: {
          color: darkPalette.text.primary,
        },
      },
    },
  },
};

export default (theme: Theme) =>
  view(lensMode, theme) === "light"
    ? { ...theme, ...dark }
    : { ...theme, ...dark };
