import * as Styled from "./account-orders-details-control.styled";
import i18n from "../i18n";

export interface Props {
  expired: boolean;
  inactive: boolean;
  onClick: () => void;
}

export default ({ expired, inactive, onClick }: Props) => {
  const actionName =
    expired || inactive
      ? i18n.OrderControlsWithdrawOrder
      : i18n.OrderControlsCancelOrder;

  return (
    <Styled.ControlButton variant="outlined" onClick={onClick}>
      {actionName}
    </Styled.ControlButton>
  );
};
