import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import type { ListChildComponentProps } from "react-window";
import type { MouseEvent } from "react";
import { FixedSizeList } from "react-window";
import { useMemo } from "react";

import styles from "./coin-select.module.css";
import useBreakpoints from "../hooks/use-breakpoints";

export default ({
  data,
  filterValue,
  onClick = () => {},
}: {
  data: Record<string, { symbol: string; image: string; name: string }>;
  filterValue?: string;
  onClick: (arg0: MouseEvent, arg1: string) => void;
}) => {
  const { isMobile } = useBreakpoints();

  const coins = useMemo(() => data, [data]);

  const coinRecords = useMemo(() => {
    const values = Object.values(coins);

    if (!filterValue) return values;

    return values.filter((coin) => {
      const name = coin.name.toLowerCase();
      const symbol = coin.symbol.toLowerCase();
      return (
        name.startsWith(filterValue) ||
        name.includes(filterValue) ||
        symbol.startsWith(filterValue)
      );
    });
  }, [coins, filterValue]);

  return (
    <List className={styles.coins} dense={isMobile}>
      {coinRecords.length === 0 && (
        <ListItem className={styles.noCoinItem} component="div" disablePadding>
          <Alert severity="info">No results</Alert>
        </ListItem>
      )}
      <FixedSizeList
        height={200}
        width="100%"
        itemSize={56}
        itemCount={coinRecords.length}
        overscanCount={5}
      >
        {({ index, style }: ListChildComponentProps) => (
          <ListItem
            className={styles.coinItem}
            component="div"
            disablePadding
            key={index}
            onClick={(e: MouseEvent) => onClick(e, coinRecords[index].symbol)}
            style={style}
          >
            <ListItemIcon>
              <Avatar
                alt={coinRecords[index].symbol}
                src={coinRecords[index].image}
              >
                T
              </Avatar>
            </ListItemIcon>
            <ListItemText
              classes={{
                primary: styles.coinItemTextPrimary,
                secondary: styles.coinItemTextSecondary,
              }}
              primary={coinRecords[index].symbol.toUpperCase()}
              secondary={coinRecords[index].name}
            />
          </ListItem>
        )}
      </FixedSizeList>
    </List>
  );
};
