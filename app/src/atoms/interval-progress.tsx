import { useEffect, useMemo, useState } from "react";
import * as Styled from "./interval-progress.styled";

const INTERVAL = 1500;

const calcValue = (a: number, b: number) =>
  b ? Math.round((a / b) * 100) : -1;

export default ({
  interval,
  refresh = false,
}: {
  interval: number;
  refresh?: boolean;
}) => {
  const [counter, setCounter] = useState(0);

  const isActive = useMemo(() => interval > 0, [interval]);

  useEffect(() => {
    const updateInterval = () => {
      if (counter < interval) {
        setCounter(counter + INTERVAL);
      } else {
        setCounter(0);
      }
    };
    const i = setTimeout(updateInterval, INTERVAL);

    if (refresh) setCounter(0);

    return () => {
      if (i) clearTimeout(i);
    };
  }, [counter, interval, refresh]);

  return (
    <Styled.Progress>
      {isActive ? (
        <Styled.ProgressBackground
          size={18}
          value={100}
          variant="determinate"
        />
      ) : null}
      {isActive ? (
        <Styled.ProgressCustom
          size={18}
          value={calcValue(counter, interval)}
          variant="determinate"
        />
      ) : (
        <Styled.ProgressCounter
          size={18}
          value={calcValue(counter, interval)}
          variant="determinate"
        />
      )}
    </Styled.Progress>
  );
};
