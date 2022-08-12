import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import R, { useImperativeHandle, useState } from "react";

import * as Styled from "./tooltip.styled";

export interface TooltipRef {
  close: () => void;
  open: (el: HTMLElement) => void;
  toggle: (el: HTMLElement) => void;
}

export default R.forwardRef((props: { text: string }, ref) => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  useImperativeHandle(ref, () => ({
    close() {
      setAnchorEl(null);
    },
    open(el: HTMLElement) {
      setAnchorEl(el);
    },
    toggle(el: HTMLElement) {
      if (anchorEl) setAnchorEl(null);
      else setAnchorEl(el);
    },
  }));

  return (
    <Styled.Tooltip
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      anchorOrigin={{
        vertical: "top",
        horizontal: "right",
      }}
      transformOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      sx={{
        pointerEvents: "none",
      }}
      onClose={handlePopoverClose}
      disableRestoreFocus
    >
      <Box>
        <Typography
          sx={{ padding: 2, maxWidth: 300 }}
          variant="body2"
          onClick={handlePopoverClose}
        >
          {props.text}
        </Typography>
      </Box>
    </Styled.Tooltip>
  );
});
