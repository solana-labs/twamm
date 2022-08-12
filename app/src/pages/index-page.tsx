import Box from "@mui/material/Box";
import NoSsr from "@mui/material/NoSsr";
import Header from "../organisms/header";
import OfflineOverlay from "../organisms/offline-overlay";
import styles from "./index.module.css";
import Userspace from "../ecosystems/userspace";

export default () => (
  <div className={styles.root}>
    <OfflineOverlay />
    <Header />
    <Box className={styles.main} component="main">
      <NoSsr>
        <Userspace />
      </NoSsr>
    </Box>
  </div>
);
