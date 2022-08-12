// import type { MouseEvent } from "react";
import Box from "@mui/material/Box";
// import IconButton from "@mui/material/IconButton";
// import InfoIcon from "@mui/icons-material/Info";
// import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useRef } from "react";

import * as Styled from "./settings-modal.styled";
import ClusterSelector from "./cluster-selector";
import ExplorerSelector from "./explorer-selector";
import i18n from "../i18n";
import PerformanceFeeSelector from "./performance-fee-selector";
import Tooltip, { TooltipRef } from "../atoms/tooltip";
import SlippageSelector from "./slippage-selector";
import useTxRunner from "../contexts/transaction-runner-context";
// import ToggleOption from "./toggle-option";

export default ({
  id,
  onToggle,
}: {
  id: string;
  onToggle: (arg0: boolean) => void;
}) => {
  const tooltipRef = useRef<TooltipRef>();
  const { performanceFee } = useTxRunner();

  const onClose = () => onToggle(false);

  /*
   *const handleTooltipOpen = useCallback((event: MouseEvent<HTMLElement>) => {
   *  tooltipRef.current?.toggle(event.currentTarget);
   *}, []);
   */

  return (
    <Box p={2}>
      <Typography id={id} variant="h5" pb={1}>
        {i18n.Settings}
      </Typography>
      <Styled.Setting direction="row" py={1}>
        <Styled.SettingLabel variant="body2">
          {i18n.SettingsSettingExplorer}
        </Styled.SettingLabel>
        <ExplorerSelector
          label={i18n.SettingsSettingExplorer}
          onClose={onClose}
        />
      </Styled.Setting>
      <Styled.Setting direction="row" py={1}>
        <Box>
          <Styled.SettingLabel variant="body2">
            {i18n.SettingsSettingPerformaceFee}
          </Styled.SettingLabel>
          {performanceFee > 0 && (
            <Typography color="text.secondary" variant="body2">
              {i18n.SettingsSettingPerformanceFeeValuePre} {performanceFee}
              {i18n.SettingsSettingPerformanceFeeValuePost}
            </Typography>
          )}
        </Box>
        <PerformanceFeeSelector />
      </Styled.Setting>
      <Styled.Setting direction="row" py={1}>
        <Box>
          <Styled.SettingLabel variant="body2">
            {i18n.SettingsSettingSlippage}
          </Styled.SettingLabel>
          <Typography color="text.secondary" variant="body2">
            {i18n.SettingsSettingsSlippageInfo}
          </Typography>
        </Box>
        <SlippageSelector
          label={i18n.SettingsSettingSlippage}
          onClose={onClose}
        />
      </Styled.Setting>

      {/*
       *<Styled.Setting justifyContent="space-between" direction="row" py={1}>
       *  <Stack direction="row">
       *    <Styled.SettingLabel color="text.secondary" pr={1} variant="body2">
       *      {i18n.SettingsSettingVersionedTx}
       *    </Styled.SettingLabel>
       *    <IconButton
       *      sx={{ padding: 0 }}
       *      color="warning"
       *      onClick={handleTooltipOpen}
       *    >
       *      <InfoIcon fontSize="small" />
       *    </IconButton>
       *  </Stack>
       *  <ToggleOption onClose={onClose} />
       *</Styled.Setting>
       */}

      <Box py={2}>
        <Styled.Line />
      </Box>
      <Styled.ClusterSetting>
        <Typography variant="body2" pb={1}>
          {i18n.SettingsSettingClusterSelector}
        </Typography>
        <ClusterSelector onClose={onClose} />
      </Styled.ClusterSetting>
      <Tooltip ref={tooltipRef} text={i18n.SettingsSettingVersionedTxInfo} />
    </Box>
  );
};
