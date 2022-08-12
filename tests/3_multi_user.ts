import * as anchor from "@project-serum/anchor";
import { TwammTester, OrderSide } from "./twamm_tester";
import { expect, assert } from "chai";

describe("multi_user", () => {
  let twamm = new TwammTester();
  let tifs = [0, 300, 0, 900, 0, 0, 0, 0, 0, 0];
  let tif = 300;
  let side: OrderSide = "sell";
  let reverseSide: OrderSide = "buy";
  let settleAmountFull = 1e12;

  it("init", async () => {
    await twamm.init();
  });

  it("scenario1", async () => {
    await twamm.deleteTestPool(0, tif);
    await twamm.reset(tifs, [0, 10]);

    let ta_balances = [];
    let tb_balances = [];

    // place first order
    await twamm.setOraclePrice(60, 1);
    await twamm.placeOrder(0, side, tif, 1e9);
    [ta_balances[0], tb_balances[0]] = await twamm.getBalances(0);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(1000000000),
        targetBalance: new anchor.BN(0),
        lpSupply: new anchor.BN(1000000000),
        tokenDebtTotal: new anchor.BN(0),
        fillsVolume: new anchor.BN(0),
        weightedFillsSum: 0,
        minFillPrice: 0,
        maxFillPrice: 0,
        numTraders: new anchor.BN(1),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(0),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // settle
    await twamm.setTime(27);
    await twamm.setOraclePrice(30, 1);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(900000000),
        targetBalance: new anchor.BN(3000000),
        lpSupply: new anchor.BN(1000000000),
        tokenDebtTotal: new anchor.BN(0),
        fillsVolume: new anchor.BN(100000000),
        weightedFillsSum: 3000000000,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(1),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(27),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // place second order
    await twamm.setOraclePrice(15, 1);
    await twamm.placeOrder(1, side, tif, 1e9);
    [ta_balances[1], tb_balances[1]] = await twamm.getBalances(1);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(1900000000),
        targetBalance: new anchor.BN(3000000),
        lpSupply: new anchor.BN(2111111111),
        tokenDebtTotal: new anchor.BN(3333334),
        fillsVolume: new anchor.BN(100000000),
        weightedFillsSum: 3000000000,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(27),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // settle
    await twamm.setTime(27 * 2);
    await twamm.setOraclePrice(35, 1);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(1688888889),
        targetBalance: new anchor.BN(10388889),
        lpSupply: new anchor.BN(2111111111),
        tokenDebtTotal: new anchor.BN(3333334),
        fillsVolume: new anchor.BN(311111111),
        weightedFillsSum: 10388888885,
        minFillPrice: 30,
        maxFillPrice: 35,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(54),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    await twamm.setTime(27 * 3);
    await twamm.setOraclePrice(20, 1);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(1477777778),
        targetBalance: new anchor.BN(14611112),
        lpSupply: new anchor.BN(2111111111),
        tokenDebtTotal: new anchor.BN(3333334),
        fillsVolume: new anchor.BN(522222222),
        weightedFillsSum: 14611111105,
        minFillPrice: 20,
        maxFillPrice: 35,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(81),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // place third order
    await twamm.setOraclePrice(30, 1);
    await twamm.placeOrder(2, side, tif, 1e9);
    [ta_balances[2], tb_balances[2]] = await twamm.getBalances(2);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(2477777778),
        targetBalance: new anchor.BN(14611112),
        lpSupply: new anchor.BN(3539682539),
        tokenDebtTotal: new anchor.BN(15476193),
        fillsVolume: new anchor.BN(522222222),
        weightedFillsSum: 14611111105,
        minFillPrice: 20,
        maxFillPrice: 35,
        numTraders: new anchor.BN(3),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(81),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // settle
    await twamm.setTime(27 * 4);
    await twamm.setOraclePrice(35, 1);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(2123809524),
        targetBalance: new anchor.BN(27000001),
        lpSupply: new anchor.BN(3539682539),
        tokenDebtTotal: new anchor.BN(15476193),
        fillsVolume: new anchor.BN(876190476),
        weightedFillsSum: 26999999995,
        minFillPrice: 20,
        maxFillPrice: 35,
        numTraders: new anchor.BN(3),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(108),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // cancel all orders
    await twamm.setOraclePrice(30, 1);
    let ta_balances2 = [];
    let tb_balances2 = [];
    for (let i = 0; i < 3; ++i) {
      await twamm.cancelOrder(i, tif, 1e15);
      [ta_balances2[i], tb_balances2[i]] = await twamm.getBalances(i);
    }

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(0),
        targetBalance: new anchor.BN(0),
        lpSupply: new anchor.BN(0),
        tokenDebtTotal: new anchor.BN(0),
        fillsVolume: new anchor.BN(876190476),
        weightedFillsSum: 26999999995,
        minFillPrice: 20,
        maxFillPrice: 35,
        numTraders: new anchor.BN(0),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(108),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // check received amount
    expect(ta_balances2[0] - ta_balances[0]).to.equal(600000000);
    expect(tb_balances2[0] - tb_balances[0]).to.equal(12000000);

    expect(ta_balances2[1] - ta_balances[1]).to.equal(666666666);
    expect(tb_balances2[1] - tb_balances[1]).to.equal(10000000);

    expect(ta_balances2[2] - ta_balances[2]).to.equal(857142858);
    expect(tb_balances2[2] - tb_balances[2]).to.equal(5000001);
  });

  it("scenario2", async () => {
    await twamm.deleteTestPool(0, tif);
    await twamm.reset(tifs, [0, 10]);

    let ta_balances = [];
    let tb_balances = [];
    [ta_balances[0], tb_balances[0]] = await twamm.getBalances(0);
    [ta_balances[1], tb_balances[1]] = await twamm.getBalances(1);

    // place first order
    await twamm.placeOrder(0, side, tif, 1e9);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(1000000000),
        targetBalance: new anchor.BN(0),
        lpSupply: new anchor.BN(1000000000),
        tokenDebtTotal: new anchor.BN(0),
        fillsVolume: new anchor.BN(0),
        weightedFillsSum: 0,
        minFillPrice: 0,
        maxFillPrice: 0,
        numTraders: new anchor.BN(1),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(0),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // settle
    await twamm.setTime(27);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(900000000),
        targetBalance: new anchor.BN(3000000),
        lpSupply: new anchor.BN(1000000000),
        tokenDebtTotal: new anchor.BN(0),
        fillsVolume: new anchor.BN(100000000),
        weightedFillsSum: 3000000000,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(1),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(27),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // replace first and place second order
    await twamm.placeOrder(0, side, tif, 1e9);
    await twamm.placeOrder(1, side, tif, 20e9);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(21900000000),
        targetBalance: new anchor.BN(3000000),
        lpSupply: new anchor.BN(24333333332),
        tokenDebtTotal: new anchor.BN(70000008),
        fillsVolume: new anchor.BN(100000000),
        weightedFillsSum: 3000000000,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(27),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // settle
    await twamm.setTime(27 * 2);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(19466666667),
        targetBalance: new anchor.BN(76000000),
        lpSupply: new anchor.BN(24333333332),
        tokenDebtTotal: new anchor.BN(70000008),
        fillsVolume: new anchor.BN(2533333333),
        weightedFillsSum: 75999999990,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(54),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // cancel most of the second order
    let order = await twamm.getOrder(1, tif);
    expect(
      JSON.stringify({
        owner: twamm.users[1].publicKey,
        time: new anchor.BN(27),
        side: { sell: {} },
        pool: await twamm.getPoolKey(tif, 0),
        lpBalance: new anchor.BN(22222222221),
        tokenDebt: new anchor.BN(66666674),
        unsettledBalance: new anchor.BN(20000000000),
        settlementDebt: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(27),
        bump: order.bump,
      })
    ).to.equal(JSON.stringify(order));
    await twamm.cancelOrder(1, tif, order.lpBalance.toNumber() * 0.9);

    expect(
      JSON.stringify({
        owner: twamm.users[1].publicKey,
        time: new anchor.BN(27),
        side: { sell: {} },
        pool: await twamm.getPoolKey(tif, 0),
        lpBalance: new anchor.BN(2222222223),
        tokenDebt: new anchor.BN(6666667),
        unsettledBalance: new anchor.BN(4000000001),
        settlementDebt: new anchor.BN(222222223),
        lastBalanceChangeTime: new anchor.BN(54),
        bump: order.bump,
      })
    ).to.equal(JSON.stringify(await twamm.getOrder(1, tif)));

    let [ta_balance2, tb_balance2] = await twamm.getBalances(1);
    expect(ta_balance2 - ta_balances[1]).to.equal(-4000000001);
    expect(tb_balance2 - tb_balances[1]).to.equal(59999999);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(3466666668),
        targetBalance: new anchor.BN(16000001),
        lpSupply: new anchor.BN(4333333334),
        tokenDebtTotal: new anchor.BN(10000001),
        fillsVolume: new anchor.BN(2533333333),
        weightedFillsSum: 75999999990,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(54),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    await twamm.setTime(27 * 3);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(3033333335),
        targetBalance: new anchor.BN(29000001),
        lpSupply: new anchor.BN(4333333334),
        tokenDebtTotal: new anchor.BN(10000001),
        fillsVolume: new anchor.BN(2966666666),
        weightedFillsSum: 88999999980,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(81),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // settle
    await twamm.setTime(300);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(0),
        targetBalance: new anchor.BN(120000002),
        lpSupply: new anchor.BN(4333333334),
        tokenDebtTotal: new anchor.BN(10000001),
        fillsVolume: new anchor.BN(6000000001),
        weightedFillsSum: 180000000030,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(300),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // cancel all orders
    let ta_balances2 = [];
    let tb_balances2 = [];
    for (let i = 0; i < 2; ++i) {
      await twamm.cancelOrder(i, tif, 1e15);
      [ta_balances2[i], tb_balances2[i]] = await twamm.getBalances(i);
    }

    try {
      await twamm.getPool(tif, 0);
      assert(false);
    } catch (err) {}

    // check received amount
    expect(ta_balances2[0] - ta_balances[0]).to.equal(-2000000000);
    expect(tb_balances2[0] - tb_balances[0]).to.equal(60000000);

    expect(ta_balances2[1] - ta_balances[1]).to.equal(-4000000001);
    expect(tb_balances2[1] - tb_balances[1]).to.equal(120000001);

    let sol_fees = await twamm.getExtraSolBalance(twamm.authorityKey);
    expect(sol_fees).to.greaterThan(0);
    const initial_sol_balance = await twamm.getSolBalance(
      twamm.users[3].publicKey
    );
    await twamm.withdrawFees(0, 0, sol_fees);
    const sol_balance = await twamm.getSolBalance(twamm.users[3].publicKey);
    expect(sol_balance).to.equal(initial_sol_balance + sol_fees);
  });

  it("scenario3", async () => {
    await twamm.reset(tifs, [0, 10]);

    let ta_balances = [];
    let tb_balances = [];
    [ta_balances[0], tb_balances[0]] = await twamm.getBalances(0);
    [ta_balances[1], tb_balances[1]] = await twamm.getBalances(1);

    // place first order
    await twamm.placeOrder(0, side, tif, 1e9);

    // settle
    await twamm.setTime(27);
    await twamm.settle(reverseSide, settleAmountFull);

    // replace first and place second order
    await twamm.placeOrder(0, side, tif, 1e9);
    await twamm.placeOrder(1, side, tif, 1e9);

    // settle
    await twamm.setTime(27 * 2);
    await twamm.settle(reverseSide, settleAmountFull);

    // replace second order
    await twamm.placeOrder(1, side, tif, 20e9);

    let order = await twamm.getOrder(1, tif);
    expect(
      JSON.stringify({
        owner: twamm.users[1].publicKey,
        time: new anchor.BN(27),
        side: { sell: {} },
        pool: await twamm.getPoolKey(tif, 0),
        lpBalance: new anchor.BN(26111111107),
        tokenDebt: new anchor.BN(153333347),
        unsettledBalance: new anchor.BN(21000000000),
        settlementDebt: new anchor.BN(111111111),
        lastBalanceChangeTime: new anchor.BN(54),
        bump: order.bump,
      })
    ).to.equal(JSON.stringify(order));

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(22577777778),
        targetBalance: new anchor.BN(12666667),
        lpSupply: new anchor.BN(28222222218),
        tokenDebtTotal: new anchor.BN(156666681),
        fillsVolume: new anchor.BN(422222222),
        weightedFillsSum: 12666666660,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(54),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    await twamm.setTime(27 * 3);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(19755555556),
        targetBalance: new anchor.BN(97333334),
        lpSupply: new anchor.BN(28222222218),
        tokenDebtTotal: new anchor.BN(156666681),
        fillsVolume: new anchor.BN(3244444444),
        weightedFillsSum: 97333333320,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(81),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // settle
    await twamm.setTime(260);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(1045267490),
        targetBalance: new anchor.BN(658641976),
        lpSupply: new anchor.BN(28222222218),
        tokenDebtTotal: new anchor.BN(156666681),
        fillsVolume: new anchor.BN(21954732510),
        weightedFillsSum: 658641975300,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(260),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // cancel most of the second order
    await twamm.cancelOrder(1, tif, order.lpBalance.toNumber() * 0.9);
    let [ta_balance2, tb_balance2] = await twamm.getBalances(1);
    expect(ta_balance2 - ta_balances[1]).to.equal(-20129629630);
    expect(tb_balance2 - tb_balances[1]).to.equal(540888888);

    // settle
    await twamm.setTime(300);
    await twamm.settle(reverseSide, settleAmountFull);

    expect(
      JSON.stringify({
        sourceBalance: new anchor.BN(0),
        targetBalance: new anchor.BN(123000002),
        lpSupply: new anchor.BN(4722222222),
        tokenDebtTotal: new anchor.BN(18666668),
        fillsVolume: new anchor.BN(22129629630),
        weightedFillsSum: 663888888900,
        minFillPrice: 30,
        maxFillPrice: 30,
        numTraders: new anchor.BN(2),
        settlementDebtTotal: new anchor.BN(0),
        lastBalanceChangeTime: new anchor.BN(300),
      })
    ).to.equal(JSON.stringify((await twamm.getPool(tif, 0)).sellSide));

    // cancel all orders
    let ta_balances2 = [];
    let tb_balances2 = [];
    for (let i = 0; i < 2; ++i) {
      await twamm.cancelOrder(i, tif, 1e15);
      [ta_balances2[i], tb_balances2[i]] = await twamm.getBalances(i);
    }
    await twamm.ensureFails(twamm.getPool(tif, 0));

    // check received amount
    expect(ta_balances2[0] - ta_balances[0]).to.equal(-2000000000);
    expect(tb_balances2[0] - tb_balances[0]).to.equal(60000000);

    expect(ta_balances2[1] - ta_balances[1]).to.equal(-20129629630);
    expect(tb_balances2[1] - tb_balances[1]).to.equal(603888890);
  });
});
