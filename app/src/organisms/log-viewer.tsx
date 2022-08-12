import Box from "@mui/material/Box";
import ListItem from "@mui/material/ListItem";
import useBreakpoints from "../hooks/use-breakpoints";
import * as Styled from "./log-viewer.styled";

const LogItems = (props: { logs: string[] }) => (
  <>
    {props.logs.map((message: string, i) => (
      /* eslint-disable-next-line react/no-array-index-key */
      <ListItem key={`log-${i}-${message}`}>
        <Styled.LogRecord primary={message} />
      </ListItem>
    ))}
  </>
);

export default ({ logs }: { logs: string[] | undefined }) => {
  const { isMobile } = useBreakpoints();

  if (!logs) return null;

  return (
    <Box pt={1}>
      {isMobile ? (
        <Styled.MobileLogs dense>
          <LogItems logs={logs} />
        </Styled.MobileLogs>
      ) : (
        <Styled.Logs dense>
          <LogItems logs={logs} />
        </Styled.Logs>
      )}
    </Box>
  );
};
