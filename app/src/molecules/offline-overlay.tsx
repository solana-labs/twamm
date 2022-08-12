import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import i18n from "../i18n";

const OfflineOverlay = ({ open }: { open: boolean }) =>
  !open ? null : (
    <Backdrop
      sx={{
        color: "yellow",
        flexDirection: "column",
        zIndex: (theme) => theme.zIndex.tooltip + 1,
      }}
      open={open}
    >
      <Box mb="16px" role="dialog" aria-label={i18n.AriaLabelOffline}>
        <CircularProgress color="inherit" />
      </Box>
      <Box>{i18n.Offline}</Box>
    </Backdrop>
  );

export default OfflineOverlay;
