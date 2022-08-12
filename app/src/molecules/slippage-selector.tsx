import type { ReactNode } from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import useTxRunner from "../contexts/transaction-runner-context";
import { muiPaperCustomVariant } from "../theme/overrides";
import i18n from "../i18n";

export default ({
  label,
  onClose,
}: {
  label: string;
  onClose?: () => void;
}) => {
  const { setSlippage, slippage, slippages } = useTxRunner();

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleChange = (event: SelectChangeEvent<unknown>, _: ReactNode) => {
    setSlippage(event.target.value as number);
    if (onClose) onClose();
  };

  const menuProps = {
    sx: {
      "& > .MuiPaper-root": muiPaperCustomVariant,
    },
  };

  return (
    <FormControl size="small">
      <InputLabel id="select-explorer-label">
        {i18n.SettingsSettingSlippageLabel}
      </InputLabel>
      <Select
        id="select-explorer"
        label={label}
        labelId="select-explorer-label"
        MenuProps={menuProps}
        onChange={handleChange}
        sx={{ width: 110 }}
        value={slippage}
      >
        {slippages.map((s) => (
          <MenuItem value={s} key={s}>
            {s}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
