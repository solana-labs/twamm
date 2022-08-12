import TextField from "@mui/material/TextField";

export interface Props {
  onClick: () => void;
}

export default ({ onClick, ...props }: Props) => (
  // eslint-disable-next-line react/jsx-props-no-spreading
  <TextField fullWidth onClick={onClick} {...props} />
);
