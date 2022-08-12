import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Grid from "@mui/material/Grid";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import { styled } from "@mui/material/styles";

export const Info = styled(Box)`
  display: flex;
  justify-content: center;
`;

export const DetailsItem = styled(ListItem)`
  display: flex;
  justify-content: space-between;
  padding-left: 0;
  padding-right: 0;
`;

export const Toggle = styled(IconButton)`
  padding: 0 ${(p) => p.theme.spacing(1)};
`;

export const DetailsPair = styled(Stack)`
  align-items: center;
  justify-content: space-between;
`;

export const DetailsGridItem = styled(Grid)`
  width: 100%;
`;
