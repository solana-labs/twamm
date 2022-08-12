import * as Styled from "./sort-control.styled";

export interface Props {
  sort: "asc" | "desc" | null | undefined;
  field: string;
  onChange: (arg0: { field: string; sort: "asc" | "desc" | undefined }) => void;
}

export default (props: Props) => {
  const toggleAsc = () => {
    props.onChange({
      field: props.field,
      sort: props.sort === "asc" ? undefined : "asc",
    });
  };

  const toggleDesc = () => {
    props.onChange({
      field: props.field,
      sort: props.sort === "desc" ? undefined : "desc",
    });
  };

  return (
    <Styled.Control direction="column">
      <Styled.Top onClick={toggleAsc}>
        {props.sort === "asc" ? <Styled.ActiveUpIcon /> : <Styled.UpIcon />}
      </Styled.Top>
      <Styled.Bottom onClick={toggleDesc}>
        {props.sort === "desc" ? (
          <Styled.ActiveDownIcon />
        ) : (
          <Styled.DownIcon />
        )}
      </Styled.Bottom>
    </Styled.Control>
  );
};
