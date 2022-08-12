import Grid from "@mui/material/Grid";

import * as Styled from "./account-orders-details-stats-cards.styled";
import DetailsCard from "./details-card";

export interface Props {
  fields: { name: string; data: string }[];
  sizes: { xs: number; sm: number; md: number };
}

export default ({ fields, sizes }: Props) => (
  <Grid container py={2} spacing={2}>
    {fields.map((field) => (
      <Styled.Column
        key={field.name}
        item
        md={sizes.md}
        sm={sizes.sm}
        xs={sizes.xs}
      >
        <DetailsCard data={field.data} name={field.name} />
      </Styled.Column>
    ))}
  </Grid>
);
