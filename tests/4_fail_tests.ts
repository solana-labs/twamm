import * as anchor from "@project-serum/anchor";
import { TwammTester, OrderSide } from "./twamm_tester";
import { expect, assert } from "chai";
import { SystemProgram } from "@solana/web3.js";
import * as spl from "@solana/spl-token";

describe("fail_tests", () => {
  let twamm = new TwammTester();
  let tifs = [0, 300, 0, 900, 0, 0, 0, 0, 0, 0];
  let tif = 300;
  let amount = 10000;
  let side: OrderSide = "sell";
  let reverseSide: OrderSide = "buy";
  let settleAmountFull = 1e12;
  twamm.printErrors = false;

  it("init", async () => {
    await twamm.init();
  });

  it("scenario1", async () => {
    await twamm.reset(tifs, [0, 10]);

    try {
      await twamm.program.methods
        .placeOrder({
          side: side === "sell" ? { sell: {} } : { buy: {} },
          timeInForce: tif,
          amount: new anchor.BN(amount),
        })
        .accounts({
          owner: twamm.users[0].publicKey,
          userAccountTokenA: twamm.tokenAWallets[0],
          userAccountTokenB: twamm.tokenBWallets[0],
          tokenPair: twamm.tokenPairKey,
          custodyTokenA: twamm.tokenACustodyKey,
          custodyTokenB: twamm.tokenBCustodyKey,
          order: await twamm.getOrderKey(0, tif, 2),
          currentPool: await twamm.getPoolKey(tif, 0),
          targetPool: await twamm.getPoolKey(tif, 2),
          systemProgram: SystemProgram.programId,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
        })
        .signers([twamm.users[0]])
        .rpc();
      assert(false, "placeOrder to the future pool should've failed");
    } catch (err) {
      expect(err.error.errorCode.code).to.equal("InvalidPoolAddress");
    }

    let [ta_balance, tb_balance] = await twamm.getBalances(0);
    await twamm.placeOrder(0, "buy", tif, amount);

    let err = await twamm.ensureFails(
      twamm.placeOrder(0, "sell", tif, amount),
      "placeOrder order with reverse side should've failed"
    );
    expect(err.error.errorCode.code).to.equal("OrderSideMismatch");

    err = await twamm.ensureFails(
      twamm.settle("sell", 0),
      "settle with 0 amount should've failed"
    );
    expect(err.error.errorCode.code).to.equal("InvalidTokenAmount");

    err = await twamm.ensureFails(
      twamm.settle("buy", 10000),
      "settle with the same side should've failed"
    );
    expect(err.error.errorCode.code).to.equal("InvalidSettlementSide");

    await twamm.cancelOrder(0, tif, 1e15);

    let [ta_balance2, tb_balance2] = await twamm.getBalances(0);
    expect(ta_balance).to.equal(ta_balance2);
    expect(tb_balance).to.equal(tb_balance2);
  });
});
