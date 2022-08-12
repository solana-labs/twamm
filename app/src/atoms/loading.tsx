import CircularProgress from "@mui/material/CircularProgress";

import * as Styled from "./loading.styled";

export default (props: { size?: number }) => (
  <Styled.Container>
    <CircularProgress size={props.size} />
  </Styled.Container>
);
