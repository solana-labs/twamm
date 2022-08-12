import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import { styled } from "@mui/material/styles";

declare module "@mui/material/Modal" {
  interface ModalUnstyledOwnProps {
    variant?: string;
  }
}

export const Popover = styled(Modal)`
  @media (min-width: ${(p) => p.theme.breakpoints.values.tablet}px) {
    & > .MuiPaper-root {
      min-width: ${(p) => p.theme.breakpoints.values.tablet}px;
    }

    &[aria-labelledby="tx-runner-modal-title"] > .MuiPaper-root {
      min-width: var(--min-width);
    }
  }
`;

export const Inner = styled(Paper)`
  left: 50%;
  overflow: hidden;
  padding: ${(p) => p.theme.spacing(2)};
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
`;

export const Close = styled(IconButton)`
  position: absolute;
  right: 0;
  top: 0;
`;
