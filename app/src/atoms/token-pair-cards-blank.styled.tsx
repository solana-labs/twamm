import List from "@mui/material/List";
import { styled } from "@mui/material/styles";

export const BlankCardList = styled(List)`
  display: flex;
  flex-wrap: wrap;
  & > * {
    margin: 8px 16px;
  }
`;
