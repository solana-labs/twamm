import type { Counter } from "@twamm/types";
import { BN } from "@project-serum/anchor";
import {
  PublicKey,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { assureAccountCreated } from "@twamm/client.js/lib/assure-account-created";
import { createTransferNativeTokenInstructions } from "@twamm/client.js";
import { forit } from "a-wait-forit";
import { isNil } from "ramda";
import { Order } from "@twamm/client.js/lib/order";
import { OrderSide } from "@twamm/types/lib";
import { SplToken } from "@twamm/client.js/lib/spl-token";
import { TimeInForce } from "@twamm/client.js/lib/time-in-force";
import { Transfer } from "@twamm/client.js/lib/transfer";
import i18n from "../i18n";
import Logger from "../utils/logger";
import useProgram from "./use-program";
import useTxRunner from "../contexts/transaction-runner-context";
import { NEXT_PUBLIC_ENABLE_TX_SIMUL } from "../env";
import { OrderSideCollisionError } from "../utils/errors";

export default () => {
  const { program, provider } = useProgram();
  const { commit, setInfo } = useTxRunner();

  const logger = Logger();

  const order = new Order(program, provider);
  const transfer = new Transfer(program, provider);

  const TOKEN_PROGRAM_ID = SplToken.getProgramId();

  const run = async function execute({
    aMint,
    amount,
    bMint,
    decimals,
    nextPool,
    poolCounters,
    side,
    tif,
    tifs,
  }: {
    amount: number;
    decimals: number;
    side: OrderSide;
    aMint: string;
    bMint: string;
    tif: TIF;
    nextPool: boolean;
    poolCounters: Counter[];
    tifs: TIF[];
  }) {
    const primary = new PublicKey(aMint);
    const secondary = new PublicKey(bMint);

    await transfer.init(primary, secondary);

    const poolAuthority = transfer.authority as NonNullable<
      typeof transfer.authority
    >;

    const { current: currentCounter, target: targetCounter } =
      TimeInForce.poolTifCounters(tif, tifs, poolCounters, nextPool);

    const transferAccounts = await transfer.findTransferAccounts(
      primary,
      secondary,
      tif,
      currentCounter,
      targetCounter
    );

    /* check that there is no order' collision */
    const targetPool = await poolAuthority.getAddress(tif, targetCounter);

    const overlapingOrderAddress = await order.getAddressByPool(targetPool);
    const [, overlapingOrder] = await forit(
      order.getOrder(overlapingOrderAddress)
    );

    if (overlapingOrder) {
      const prevSideStruct = overlapingOrder.side;
      const hasOppositeSide = Boolean(prevSideStruct[side] === undefined);

      if (hasOppositeSide) {
        throw new OrderSideCollisionError(
          "Order with opposite direction already exists"
        );
      }
    }

    let preInstructions = [
      await assureAccountCreated(provider, primary, transferAccounts.aWallet),
      await assureAccountCreated(provider, secondary, transferAccounts.bWallet),
    ];

    const isSell = side === OrderSide.sell;
    const isBuy = side === OrderSide.buy;

    const orderParams = {
      side: isSell ? { sell: {} } : { buy: {} },
      timeInForce: tif,
      amount: new BN(amount * 10 ** decimals),
    };

    if (isSell)
      preInstructions = preInstructions.concat(
        await createTransferNativeTokenInstructions(
          provider,
          primary,
          transferAccounts.aWallet,
          amount
        )
      );

    if (isBuy)
      preInstructions = preInstructions.concat(
        await createTransferNativeTokenInstructions(
          provider,
          secondary,
          transferAccounts.bWallet,
          amount
        )
      );

    const pre = preInstructions.filter(
      (i): i is TransactionInstruction => !isNil(i)
    );

    const accounts = {
      owner: provider.wallet.publicKey,
      userAccountTokenA: transferAccounts.aWallet,
      userAccountTokenB: transferAccounts.bWallet,
      tokenPair: transferAccounts.tokenPair,
      custodyTokenA: transferAccounts.aCustody,
      custodyTokenB: transferAccounts.bCustody,
      order: transferAccounts.targetOrder,
      currentPool: transferAccounts.currentPool,
      targetPool: transferAccounts.targetPool,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    const tx = program.methods
      .placeOrder(orderParams)
      .accounts(accounts)
      .preInstructions(pre);

    if (NEXT_PUBLIC_ENABLE_TX_SIMUL === "1") {
      setInfo(i18n.TxRunnerSimulation);

      const simResult = await tx.simulate().catch((e) => {
        logger.error(e, i18n.TxRunnerSimulationFailure);
        if (e.simulationResponse?.logs) logger.debug(e.simulationResponse.logs);
      });

      if (simResult) {
        logger.debug(simResult.raw);
        logger.debug(simResult.events);
      }
    }

    setInfo(i18n.TxRunnerExecution);

    const result = await tx.rpc().catch((e: Error) => {
      logger.error(e);
      throw e;
    });

    return result;
  };

  return {
    async execute(
      params: Parameters<typeof run>[0],
      onErrorCb: () => Promise<void>
    ) {
      const result = await commit(run(params));

      // FEAT: in case of collision there will be two modals on screen
      // might need to improve the behaviour
      if (result instanceof OrderSideCollisionError) {
        await onErrorCb();
        // show specific flow on collision
      }
    },
  };
};
