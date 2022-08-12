import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { TextField } from "mui-rff";
import { styled } from "@mui/material/styles";

export const FormInner = styled(Box)`
  align-items: flex-start;
  display: flex;
`;

export const FormField = styled(TextField)`
  color: #fff;
`;

export const FormButton = styled(Button)`
  margin-left: 12px;
`;
