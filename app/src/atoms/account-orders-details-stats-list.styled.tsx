import List from "@mui/material/List";
import { styled } from "@mui/material/styles";

export const Container = styled(List)`
  width: 100%;
  height: 50vh;
  overflow-y: scroll;
`;

export const Item = styled("span")`
  ${(p) => p.theme.typography.body2};
  display: block;
  color: #65748b;
`;
