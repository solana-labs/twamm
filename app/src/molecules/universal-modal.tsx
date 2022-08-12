import type { ReactNode } from "react";
import CloseIcon from "@mui/icons-material/Close";
import Backdrop from "@mui/material/Backdrop";
import Fade from "@mui/material/Fade";
import { useCallback, useMemo } from "react";

import * as Styled from "./universal-modal.styled";
import i18n from "../i18n";

export interface Props {
  ariaLabelledBy?: string;
  children: ReactNode;
  onClose?: () => void;
  open: boolean;
  setOpen: (arg0: boolean) => void;
}

export default ({
  ariaLabelledBy,
  children,
  onClose,
  open,
  setOpen,
}: Props) => {
  const handleClose = useCallback(() => {
    setOpen(false);
    if (onClose) onClose();
  }, [onClose, setOpen]);

  const backdropProps = useMemo(() => ({ timeout: 500 }), []);

  return (
    <Styled.Popover
      aria-labelledby={ariaLabelledBy}
      BackdropComponent={Backdrop}
      BackdropProps={backdropProps}
      closeAfterTransition
      onClose={handleClose}
      open={open}
      variant="custom"
    >
      <Fade in={open}>
        <Styled.Inner>
          <Styled.Close aria-label={i18n.AriaLabelClose} onClick={handleClose}>
            <CloseIcon />
          </Styled.Close>
          {children}
        </Styled.Inner>
      </Fade>
    </Styled.Popover>
  );
};
