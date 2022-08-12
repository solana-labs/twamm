import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import SearchIcon from "@mui/icons-material/Search";
import TextField from "@mui/material/TextField";
import type { ChangeEvent, MouseEvent } from "react";
import type { PublicKey } from "@solana/web3.js";
import Typography from "@mui/material/Typography";
import { useCallback, useMemo, useState } from "react";

import CoinSelect from "../molecules/coin-select";
import i18n from "../i18n";
import Loading from "../atoms/loading";
import TokenTags from "../atoms/token-tags";
import useJupTokensByMint from "../hooks/use-jup-tokens-by-mint";
import * as Styled from "./coin-select.styled";

const STARRED_COINS = ["usdt", "usdc", "sol"];

const populateTokenRecords = (data?: JupToken[]) => {
  if (!data) return {};

  const records: Record<string, TokenInfo> = {};

  data.forEach((token) => {
    records[token.symbol.toLowerCase()] = {
      ...token,
      image: token.logoURI,
    };
  });

  return records;
};

export default ({
  id,
  onDelete,
  onSelect,
  selected,
  tokens,
}: {
  id?: string;
  onDelete: (arg0: string) => void;
  onSelect: (arg0: TokenInfo) => void;
  selected?: PublicKey[];
  tokens?: PublicKey[];
}) => {
  const [search, setSearch] = useState<string>();

  const { data, isLoading } = useJupTokensByMint(tokens);
  const { data: selectedData } = useJupTokensByMint(selected);

  const coinRecords = useMemo(() => populateTokenRecords(data), [data]);
  const selectedRecords = useMemo(
    () => populateTokenRecords(selectedData),
    [selectedData]
  );

  const starredTokens = STARRED_COINS.map(
    (symbol) => coinRecords[symbol]
  ).filter((c) => c);

  const onCoinSelect = useCallback(
    (_: MouseEvent, symbol: string) => {
      onSelect(coinRecords[symbol.toLowerCase()]);
    },
    [coinRecords, onSelect]
  );

  const onCoinDelete = useCallback(
    (_: MouseEvent, symbol: string) => {
      onDelete(symbol);
    },
    [onDelete]
  );

  const onSearch = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;

    setSearch(value.toLowerCase());
  }, []);

  const searchIconSx = useMemo(
    () => ({ color: "action.active", mr: 1, my: 0.5 }),
    []
  );

  return (
    <Styled.Container>
      {isLoading && <Loading />}
      <Box p={2}>
        <TextField
          fullWidth
          label={i18n.CoinSelectorSearch}
          onChange={onSearch}
          variant="standard"
          InputProps={{
            endAdornment: <SearchIcon sx={searchIconSx} />,
          }}
        />
      </Box>
      <Typography id={id} px={2} py={1} variant="h6">
        {i18n.CoinSelectorStarred}
      </Typography>
      <Styled.Tags px={2} pb={1}>
        <TokenTags
          coins={Object.values(selectedRecords)}
          onClick={onCoinDelete}
          deletable
        />
        <TokenTags coins={starredTokens} onClick={onCoinSelect} />
      </Styled.Tags>
      <Divider />
      <Typography id={id} p={2} variant="h6">
        {i18n.CoinSelector}
      </Typography>
      <CoinSelect
        data={coinRecords}
        filterValue={search}
        onClick={onCoinSelect}
      />
    </Styled.Container>
  );
};
