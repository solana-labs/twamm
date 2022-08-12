import type { ReactNode } from "react";
import { forwardRef, memo, useImperativeHandle, useState } from "react";

import UniversalDrawer from "./universal-drawer";
import UniversalModal from "./universal-modal";
import useBreakpoints from "../hooks/use-breakpoints";

export interface Props {
  ariaLabelledBy?: string; // eslint-disable-line react/no-unused-prop-types
  children: ReactNode;
  onClose?: () => void;
}

export interface Ref {
  close: () => void;
  isOpened: boolean;
  open: () => void;
}

interface ModalProps extends Props {
  open: boolean;
  setOpen: (arg0: boolean) => void;
}

const Modal = memo(
  ({ ariaLabelledBy, children, onClose, open, setOpen }: ModalProps) => (
    <UniversalModal
      ariaLabelledBy={ariaLabelledBy}
      onClose={onClose}
      open={open}
      setOpen={setOpen}
    >
      {children}
    </UniversalModal>
  )
);

const Drawer = memo(({ children, onClose, open, setOpen }: ModalProps) => (
  <UniversalDrawer onClose={onClose} open={open} setOpen={setOpen}>
    {children}
  </UniversalDrawer>
));

export default forwardRef(
  ({ ariaLabelledBy, children, onClose }: Props, ref) => {
    const { isMobile } = useBreakpoints();
    const [open, setOpen] = useState(false);

    useImperativeHandle(ref, () => ({
      close() {
        setOpen(false);
      },
      isOpened: open,
      open() {
        setOpen(true);
      },
    }));

    if (isMobile) {
      return (
        <Drawer onClose={onClose} open={open} setOpen={setOpen}>
          {open ? children : null}
        </Drawer>
      );
    }

    return (
      <Modal
        ariaLabelledBy={ariaLabelledBy}
        onClose={onClose}
        open={open}
        setOpen={setOpen}
      >
        {open ? children : null}
      </Modal>
    );
  }
);
