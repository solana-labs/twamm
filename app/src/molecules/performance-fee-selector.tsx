import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import type { ReactNode } from "react";
import useTxRunner from "../contexts/transaction-runner-context";
import { muiPaperCustomVariant } from "../theme/overrides";
import i18n from "../i18n";

export default ({ onClose }: { onClose?: () => void }) => {
  const { performanceFee, performanceFees, setPerformanceFee } = useTxRunner();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleChange = (event: SelectChangeEvent<unknown>, _: ReactNode) => {
    setPerformanceFee(event.target.value as number);

    if (onClose) onClose();
  };

  const menuProps = {
    sx: {
      "& > .MuiPaper-root": muiPaperCustomVariant,
    },
  };

  return (
    <FormControl size="small">
      <InputLabel id="select-performanceFee-label">
        {i18n.SettingsSettingPerformaceFeeLabel}
      </InputLabel>
      <Select
        id="select-performanceFee"
        label={i18n.SettingsSettingPerformaceFeeLabel}
        labelId="select-performanceFee-label"
        MenuProps={menuProps}
        onChange={handleChange}
        sx={{ width: 110 }}
        value={performanceFee}
      >
        <MenuItem value={performanceFees[0]}>None</MenuItem>
        <MenuItem value={performanceFees[1]}>High</MenuItem>
        <MenuItem value={performanceFees[2]}>Turbo</MenuItem>
      </Select>
    </FormControl>
  );
};
