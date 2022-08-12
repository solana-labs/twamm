import { assureAccountCreated } from "@twamm/client.js/lib/assure-account-created";
import { BN } from "@project-serum/anchor";
import { createCloseNativeTokenAccountInstruction } from "@twamm/client.js/lib/create-close-native-token-account-instruction"; // eslint-disable-line max-len
import { isNil } from "ramda";
import { Order } from "@twamm/client.js/lib/order";
import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { SplToken } from "@twamm/client.js/lib/spl-token";
import { TimeInForce } from "@twamm/client.js/lib/time-in-force";
import { Transfer } from "@twamm/client.js/lib/transfer";

import i18n from "../i18n";
import Logger from "../utils/logger";
import useProgram from "./use-program";
import useTxRunner from "../contexts/transaction-runner-context";
import { NEXT_PUBLIC_ENABLE_TX_SIMUL } from "../env";

export default () => {
  const { provider, program } = useProgram();
  const { commit, setInfo } = useTxRunner();

  const logger = Logger();

  const order = new Order(program, provider);
  const transfer = new Transfer(program, provider);

  const TOKEN_PROGRAM_ID = SplToken.getProgramId();

  const run = async function execute({
    a: primary,
    amount: lpAmount,
    b: secondary,
    orderAddress,
    poolAddress,
  }: {
    a: PublicKey;
    amount: number;
    b: PublicKey;
    orderAddress: PublicKey;
    poolAddress: PublicKey;
  }) {
    const transferAccounts = await transfer.findTransferAccounts(
      primary,
      secondary
    );

    const preInstructions = [
      await assureAccountCreated(provider, primary, transferAccounts.aWallet),
      await assureAccountCreated(provider, secondary, transferAccounts.bWallet),
    ];

    const pre = preInstructions.filter(
      (i): i is TransactionInstruction => !isNil(i)
    );

    const postInstructions = [
      await createCloseNativeTokenAccountInstruction(
        primary,
        transferAccounts.aWallet,
        provider.wallet.publicKey,
        undefined
      ),
      await createCloseNativeTokenAccountInstruction(
        secondary,
        transferAccounts.bWallet,
        provider.wallet.publicKey,
        undefined
      ),
    ];

    const post = postInstructions.filter(
      (i): i is TransactionInstruction => !isNil(i)
    );

    const accounts = {
      payer: provider.wallet.publicKey,
      owner: provider.wallet.publicKey,
      userAccountTokenA: transferAccounts.aWallet,
      userAccountTokenB: transferAccounts.bWallet,
      tokenPair: transferAccounts.tokenPair,
      transferAuthority: transferAccounts.transferAuthority,
      custodyTokenA: transferAccounts.aCustody,
      custodyTokenB: transferAccounts.bCustody,
      order: orderAddress,
      pool: poolAddress,
      tokenProgram: TOKEN_PROGRAM_ID,
    };

    const tx = program.methods
      .cancelOrder({
        lpAmount: new BN(lpAmount),
      })
      .accounts(accounts)
      .preInstructions(pre)
      .postInstructions(post);

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

  const runWithMultipleParams =
    async function executeWithMultipleParams(params: {
      a: PublicKey;
      amount: number;
      b: PublicKey;
      orderAddress?: PublicKey;
      poolAddress?: PublicKey;
      counters?: {
        tif: TIF;
        tifs: TIF[];
        poolCounters: BN[];
        nextPool: boolean;
      };
    }) {
      const primary = params.a;
      const secondary = params.b;

      if (params.poolAddress && params.orderAddress) {
        return run({
          a: primary,
          amount: params.amount,
          b: secondary,
          orderAddress: params.orderAddress,
          poolAddress: params.poolAddress,
        });
      }

      if (params.counters) {
        const { tif, tifs, poolCounters, nextPool } = params.counters;
        const { target } = TimeInForce.poolTifCounters(
          tif,
          tifs,
          poolCounters,
          nextPool
        );

        const poolAuthority = transfer.authority as NonNullable<
          typeof transfer.authority
        >;

        const poolAddress = await poolAuthority.getAddress(tif, target);
        const orderAddress = await order.getAddressByPool(poolAddress);

        return run({
          a: primary,
          amount: params.amount,
          b: secondary,
          orderAddress,
          poolAddress,
        });
      }

      throw new Error(i18n.Error);
    };

  return {
    async execute(params: Parameters<typeof runWithMultipleParams>[0]) {
      const primary = params.a;
      const secondary = params.b;

      await transfer.init(primary, secondary);
      // initialize the authority to execute the operation

      await commit(runWithMultipleParams(params));
    },
  };
};
