import Alert from "@mui/material/Alert";

export default ({ error }: { error: Error }) => (
  <Alert severity="error">{error.message ?? "Unknown Error"}</Alert>
);
