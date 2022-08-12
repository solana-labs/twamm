import Popover from "@mui/material/Popover";
import { styled } from "@mui/material/styles";

import { muiPaperCustomVariant } from "../theme/overrides";

export const Tooltip = styled(Popover)`
  & > .MuiPaper-root {
    background-color: ${(p) => p.theme.palette.background.paper};
    border-radius: ${muiPaperCustomVariant.borderRadius};
    box-shadow: ${muiPaperCustomVariant.boxShadow};
  }
`;
