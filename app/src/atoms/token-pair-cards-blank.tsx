import { Blank } from "./pair-card";
import * as Styled from "./token-pair-cards-blank.styled";

export default () => (
  <Styled.BlankCardList>
    {new Array(3).fill(null).map((_, i) => (
      // eslint-disable-next-line react/no-array-index-key
      <li key={`blank-${i}`}>
        <Blank />
      </li>
    ))}
  </Styled.BlankCardList>
);
