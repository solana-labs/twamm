import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowDropUpIcon from "@mui/icons-material/ArrowDropUp";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";

export const Control = styled(Stack)`
  margin-left: ${(p) => p.theme.spacing(0.25)};

  & button {
    position: relative;
    padding: 0;
  }

  & svg {
    width: 16px;
    height: 16px;
  }
`;

export const UpIcon = styled(ArrowDropUpIcon)`
  color: ${(p) => p.theme.palette.text.secondary};
`;

export const DownIcon = styled(ArrowDropDownIcon)`
  color: ${(p) => p.theme.palette.text.secondary};
`;

export const ActiveUpIcon = styled(ArrowDropUpIcon)`
  color: #fff;
`;

export const ActiveDownIcon = styled(ArrowDropDownIcon)`
  color: #fff;
`;

export const Top = styled(IconButton)`
  top: -3px;
`;

export const Bottom = styled(IconButton)`
  top: -6px;
`;
