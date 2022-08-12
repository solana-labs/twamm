import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { grey } from "@mui/material/colors";
import { styled } from "@mui/material/styles";
import { useCallback, useMemo } from "react";

import * as Styled from "./universal-drawer.styled";

export interface Props {
  children: ReactNode;
  onClose?: () => void;
  open: boolean;
  setOpen: (arg0: boolean) => void;
}

const drawerBleeding = 56;

const Puller = styled(Box)(({ theme }) => ({
  width: 30,
  height: 6,
  backgroundColor:
    theme.palette.mode === "light" ? grey[300] : theme.palette.primary.main,
  borderRadius: 3,
  cursor: "pointer",
  position: "absolute",
  top: 8,
  left: "calc(50% - 15px)",
}));

export default ({ children, onClose, open, setOpen }: Props) => {
  const openDrawer = useCallback(() => {
    setOpen(true);
  }, [setOpen]);

  const closeDrawer = useCallback(() => {
    setOpen(false);

    if (onClose) onClose();
  }, [onClose, setOpen]);

  const modalProps = useMemo(() => ({ keepMounted: true }), []);

  const drawerSx = useMemo(() => ({ top: -drawerBleeding }), []);

  return (
    <Styled.Drawer
      anchor="bottom"
      disableSwipeToOpen={false}
      ModalProps={modalProps}
      onClose={closeDrawer}
      onOpen={openDrawer}
      open={open}
      swipeAreaWidth={drawerBleeding}
    >
      <Box sx={drawerSx}>
        <Puller onClick={closeDrawer} />
      </Box>
      <Styled.Inner>{children}</Styled.Inner>
    </Styled.Drawer>
  );
};
