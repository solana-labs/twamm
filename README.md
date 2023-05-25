# Solana TWAMM

## Introduction

Permissionless TWAMM (time-weighted average price market maker) service helps traders on Solana efficiently execute large orders. It pools large orders together, breaks them down into small pieces, and executes them over a specified time interval. Orders with opposite sides are internally matched using the oracle price, and net outstanding liquidity is settled via the best possible execution route available with Jupiter. Additionally, market makers (or literally anyone) have the opportunity to settle the outstanding net balance at the oracle price (i.e. perform a swap against TWAMM pools), saving on swap fees for themselves and the protocol.

Project goals:

1. Reduce the price impact of large orders.
2. Fill orders close to the average price over the specified time window.
3. Reduce complexity and lower execution fees compared to the manual approach.
4. Let users retain full custody of their tokens while orders are executed.
5. Reduce adverse selection by providing full transparency.

The original idea belongs to [Paradigm](https://www.paradigm.xyz/2021/07/twamm). But instead of relying on internal pools that may lack liquidity, this project leverages Jupiter to settle the net outstanding balance as well as opens the opportunity to any liquidity providers to settle trades at the oracle price.

Service consists of three main pieces: web UI, backend, and the on-chain program.

**Web UI** is an example user interface that displays active user orders, trade progress, min/max/avg fill price and allows to submit order instructions to the on-chain program.

**Backend** is a Typescript program that triggers on-chain cranks. The backend program doesn't store any state and serves as an example of how permissionless cranks can be executed.

**On-chain program** handles order instructions, stores user and token pairs related info, and holds tokens to be swapped and fees in custodies.

### Design considerations:

1. Orders can be canceled in full or partially at any given time. In this case, the result of the partially executed trade will be returned. It is also possible to top-up existing order.
2. When the order is complete, the exchanged liquidity needs to be withdrawn explicitly. But this operation is permissionless, so it can be executed by the user or a crank job. Recovered rent SOL can be used as an incentive.
3. To reduce fees, the number of swaps, and price impact, all orders for all time intervals are pooled together. Matching buy/sell amounts are exchanged based on the oracle price. The swap amount is based on the net (buy-sell) difference.
4. Cranks are permissionless by default but can optionally require authority. Crank authority is set per token pair to reduce the number of accounts passed to the on-chain program.
5. To minimize cumulative network fees and loss due to rounding, cranks frequency is based on the amount swapped in each iteration. It ranges from once per second to several times per target time interval. Minimum swap size is enforced and depends on time in force (TIF) period.
6. Admin authority can initialize or modify token pair configurations or withdraw fees. There is a built-in multisig functionality.
7. Allowed time in force (TIF) periods for new orders are configured per token pair and limited to ten different options (e.g. 5m, 15m, 1h, 4h, 12h, 24h, 1w, etc.). Available TIFs can be modified (added/deleted/modified) as long as there are no active pools for the TIF in question. Order expiration times that are displayed to the end user upon order placement are uneven and based on how long ago this particular period started on the chain. The user has the option to join the existing virtual pool (i.e., TIF period that has already started) or place a scheduled order that will start to trade upon the beginning of the next interval.
8. One user order is tracked per TIF period per token pair. In other words, users can modify the existing order quantity or place multiple orders for the same token pair if they have different TIF.

## Quick start

### Setup Environment

1. Clone the repository from <https://github.com/askibin/twamm.git>.
2. Install the latest Solana tools from <https://docs.solana.com/cli/install-solana-cli-tools>. If you already have Solana tools, run `solana-install update` to get the latest compatible version.
3. Install the latest Rust stable from <https://rustup.rs/>. If you already have Rust, run `rustup update` to get the latest version.
4. Install the latest Anchor framework from <https://www.anchor-lang.com/docs/installation>. If you already have Anchor, run `avm update` to get the latest version.

### Build

First, generate a new key for the program address with `solana-keygen new -o <PROG_ID_JSON>`. Then replace the existing program ID with the newly generated address in `Anchor.toml` and `programs/twamm/src/lib.rs`.

Also, ensure the path to your wallet in `Anchor.toml` is correct. Alternatively, when running Anchor deploy or test commands, you can specify your wallet with `--provider.wallet` argument. The wallet's pubkey will be set as an upgrade authority upon initial deployment of the program. It is strongly recommended to make upgrade authority a multisig when deploying to the mainnet.

To build the program run `anchor build` command from the `twamm` directory:

```sh
cd twamm
anchor build
```

### Test

Unit tests are executed with the `cargo test` command:

```sh
cargo test -- --nocapture
```

Integration tests can be started as follows:

```sh
npm install
anchor test -- --features test
```

By default, integration tests are executed on a local validator, so it won't cost you any SOL.

### Deploy

To deploy the program to the devnet and upload the IDL use the following commands:

```sh
anchor deploy --provider.cluster devnet --program-keypair <PROG_ID_JSON>
anchor idl init --provider.cluster devnet --filepath ./target/idl/twamm.json <PROGRAM ID>
```

### Initialize

To initialize the program, you need to execute `init` instruction and then `initTokenPair` for each supported token pair. See `tests/1_basics.ts` for examples.

### UI

UI is built using NextJS, and its deployment is the same as for any similar app: [NextJS Deployment](https://nextjs.org/docs/deployment).

To launch a local instance for development purposes, you can use yarn:

```sh
cd app
yarn install
yarn dev
```

Note: UI won't work unless the program is properly deployed and initialized!

### Vercel Deployment

- Fork `twamm` repository into your Github account.
- Login to Vercel.
- Click `Create a New Project`.
- Click `Import` next to twamm.
- Click `Edit` for `Root Directory` and choose `app`.
- Choose `Next.js` for `Framework Preset`.

- Set `Environment Variables`:

      NEXT_PUBLIC_PROGRAM_ADDRESS - address of the deployed twamm program
      NEXT_PUBLIC_CLUSTER_API_URL - link to your RPC node (api.mainnet-beta.com won't work due to restrictions)
      NEXT_PUBLIC_ENABLE_TX_SIMUL - set to 0
      NEXT_PUBLIC_MAIN_TRADE_PAIR - insert a comma-separated list of token pair' mints to exchange by default and an exchange direction after (no spaces)


For example:

    NEXT_PUBLIC_PROGRAM_ADDRESS: TWAMdUxafgDN2BJNFaC6pND63tjdLz4AmEKBzuxtbe9
    NEXT_PUBLIC_CLUSTER_API_URL: https://rpc.ankr.com/solana
    NEXT_PUBLIC_ENABLE_TX_SIMUL: 0
    NEXT_PUBLIC_MAIN_TRADE_PAIR: So11111111111111111111111111111111111111112,EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v,buy

Click `Deploy`.

Make sure NodeJS version in `Settings`->`General` matches the one stored in `twamm/app/.nvmrc`.

### Cranks

In order for program to properly function, periodic permissionless "crank" transactions must be executed. An example crank script is located in `app/src/crank.ts` and can be executed as following:

```
export ANCHOR_WALLET=<ANY FUNDED WALLET>
npx ts-node -P tsconfig.json app/src/crank.ts https://rpc.ankr.com/solana <TOKEN_MINT1> <TOKEN_MINT2>
```

Where `TOKEN_MINT1` and `TOKEN_MINT2` are corresponding mints of the token pair to crank.

## Support

If you are experiencing technical difficulties while working with the Twamm codebase, ask your question on [StackExchange](https://solana.stackexchange.com) (tag your question with `twamm`).

If you find a bug in the code, you can raise an issue on [Github](https://github.com/askibin/twamm). But if this is a security issue, please don't disclose it on Github or in public channels. Send information to solana.farms@protonmail.com instead.

## Contributing

Contributions are very welcome. Please refer to the [Contributing](https://github.com/solana-labs/solana/blob/master/CONTRIBUTING.md) guidelines for more information.

## License

Solana TWAMM codebase is released under [Apache License 2.0](LICENSE).

## Disclaimer

By accessing or using Solana TWAMM or any of its components, you accept and agree with the [Disclaimer](DISCLAIMER.md).
