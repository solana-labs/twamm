import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import { useCallback } from "react";
import useTxRunner from "../contexts/transaction-runner-context";

export default ({ onClose }: { onClose?: () => void }) => {
  const { setVersionedAPI, versionedAPI } = useTxRunner();

  const handleChange = useCallback(() => {
    if (versionedAPI) {
      setVersionedAPI(false);
    } else {
      setVersionedAPI(true);
    }
    if (onClose) onClose();
  }, [onClose, setVersionedAPI, versionedAPI]);

  /**
   *  Temporary uncheck the Versioned API control
   */
  return (
    <FormControlLabel
      control={
        <Switch
          disabled
          checked={false /* versionedAPI */}
          onChange={handleChange}
        />
      }
      label=""
    />
  );
};
