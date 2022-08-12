import CardContent from "@mui/material/CardContent";
import Skeleton from "@mui/material/Skeleton";
import { styled } from "@mui/material/styles";

const div = styled("div");

const HEIGHT = 210;
const WIDTH = 338;

const styledSkeleton = styled(Skeleton);
const styledCard = styled(CardContent);

export const FundSkeleton = styledSkeleton`
  border-radius: 20px;
  width: ${WIDTH}px;
  height: ${HEIGHT}px;
  background: linear-gradient(110.5deg, rgba(26, 31, 46, 0.4) 3.75%, rgba(36, 41, 57, 0.4) 117.62%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.08);
`;

export const Root = div`
  width: ${WIDTH}px;
  height: ${HEIGHT}px;
  border-radius: 20px;
  color: #fff;
  background: linear-gradient(110.5deg, rgba(26, 31, 46, 0.4) 3.75%, rgba(36, 41, 57, 0.4) 117.62%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.08);
`;

export const Card = styledCard`
  overflow: hidden;
  padding: 8px 16px;
`;

export const Fund = div`
  margin: 0;
  padding-bottom: 8px;
`;

export const FundName = div`
  font-size: 20px;
  font-weight: 500;
  line-height: 1.35em;
`;

export const FundMetrics = div`
  display: flex;
  flex-direction: row;
  gap: 32px;
`;
