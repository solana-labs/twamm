import type { ChangeEvent } from "react";
import * as yup from "yup";
import Box from "@mui/material/Box";
import FormControl from "@mui/material/FormControl";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import { Form } from "react-final-form";
import { useCallback, useState } from "react";

import * as Styled from "./cluster-selector.styled";
import ClusterUtils from "../domain/cluster";
import type * as TCluster from "../domain/cluster.d";
import useBlockchain from "../contexts/solana-connection-context";
import { clusterValidator } from "../utils/validators";
import { useSnackbar } from "../contexts/notification-context";

const clusterChangeAlert = (isError: boolean | undefined, moniker: string) => {
  const msg = !isError
    ? `Cluster changed to "${moniker}"`
    : "Address should be a proper URL";
  const variant: any = !isError
    ? { variant: "success", autoHideDuration: 1e3 }
    : { variant: "error", autoHideDuration: 2e3 };

  return { msg, variant };
};

export default function ClusterSelector({ onClose }: { onClose?: () => void }) {
  const { enqueueSnackbar } = useSnackbar();

  const { cluster, clusters, presets, setCluster } = useBlockchain();
  const [clusterMoniker, setClusterMoniker] = useState(cluster.moniker);

  const clusterUtils = ClusterUtils(presets.solana);

  const isCustomSelected = clusterMoniker === presets.custom.moniker;

  const onSaveCustomEndpoint = useCallback(
    async ({ endpoint }: { endpoint: string }) => {
      const customCluster = {
        endpoint,
        name: presets.custom.name,
        moniker: presets.custom.moniker,
      };
      const isError = setCluster(customCluster);

      const { msg, variant } = clusterChangeAlert(
        isError,
        customCluster.moniker
      );
      enqueueSnackbar(msg, variant);

      if (!isError && onClose) onClose();
    },
    [enqueueSnackbar, onClose, presets, setCluster]
  );

  const onSavePresetEndpoint = useCallback(
    ({ endpoint }: { endpoint: TCluster.Moniker }) => {
      const isError = setCluster(endpoint);

      const { msg, variant } = clusterChangeAlert(isError, endpoint);
      enqueueSnackbar(msg, variant);

      if (!isError && onClose) onClose();
    },
    [enqueueSnackbar, onClose, setCluster]
  );

  const onClusterChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const { value } = event.target as { value: TCluster.Moniker };

      setClusterMoniker(value);

      if (!clusterUtils.isCustomMoniker(value)) {
        onSavePresetEndpoint({ endpoint: value });
      }
    },
    [clusterUtils, onSavePresetEndpoint]
  );

  return (
    <Box>
      <FormControl>
        <RadioGroup
          name="clusters"
          value={clusterMoniker}
          onChange={onClusterChange}
        >
          {clusters.map((c) => (
            <FormControlLabel
              key={c.name}
              label={c.name}
              control={<Radio />}
              value={c.moniker}
            />
          ))}
        </RadioGroup>
        {isCustomSelected && (
          <Form
            initialValues={{
              endpoint:
                presets.solana.endpoint === cluster.endpoint
                  ? undefined
                  : cluster.endpoint,
            }}
            onSubmit={onSaveCustomEndpoint}
            validate={clusterValidator(
              yup.object().shape({
                endpoint: yup.string().required().url(),
              })
            )}
          >
            {({ handleSubmit }) => (
              <form onSubmit={handleSubmit}>
                <Styled.FormInner pt={2}>
                  <Styled.FormField
                    label="RPC endpoint"
                    name="endpoint"
                    size="small"
                    variant="outlined"
                  />
                  <Styled.FormButton type="submit" variant="contained">
                    Switch
                  </Styled.FormButton>
                </Styled.FormInner>
              </form>
            )}
          </Form>
        )}
      </FormControl>
    </Box>
  );
}
