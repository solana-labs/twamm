import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import * as Styled from "./details-card.styled";

export interface Props {
  name: string;
  data: string;
}

export default ({ data, name }: Props) => {
  const dataArr = data?.split("|") ?? [];

  return (
    <Styled.Container>
      <Styled.Content>
        <Styled.Title color="text.secondary" gutterBottom>
          {name}
        </Styled.Title>
        {dataArr.length <= 1 && (
          <Typography variant="body2">{data ?? "-"}</Typography>
        )}
        {dataArr.length > 1 && (
          <Box>
            {dataArr.map((d, i) => {
              const key = `${d}-${i}`;

              return (
                <Typography variant="body2" key={key}>
                  {d}
                </Typography>
              );
            })}
          </Box>
        )}
      </Styled.Content>
    </Styled.Container>
  );
};
