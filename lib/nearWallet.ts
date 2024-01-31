/* A helper file that simplifies using the wallet selector */

// near api js
import { providers } from 'near-api-js';


// wallet selector UI
import '@near-wallet-selector/modal-ui/styles.css';
import { setupModal } from '@near-wallet-selector/modal-ui';
import LedgerIconUrl from '@near-wallet-selector/ledger/assets/ledger-icon.png';
import MyNearIconUrl from '@near-wallet-selector/my-near-wallet/assets/my-near-wallet-icon.png';
// wallet selector options
import { setupWalletSelector } from '@near-wallet-selector/core';
import { setupLedger } from '@near-wallet-selector/ledger';
import { setupMyNearWallet } from '@near-wallet-selector/my-near-wallet';
import { setupNearWallet } from '@near-wallet-selector/near-wallet';
import { setupMeteorWallet } from '@near-wallet-selector/meteor-wallet';
import { setupSender } from '@near-wallet-selector/sender';
import { setupHereWallet } from '@near-wallet-selector/here-wallet';

const sender = setupSender();
const hereWallet = setupHereWallet();
const nearWallet = setupNearWallet();
const meteorWallet = setupMeteorWallet();

const THIRTY_TGAS = '30000000000000';
const NO_DEPOSIT = '0';

// Wallet that simplifies using the wallet selector
export class Wallet {
  constructor({ createAccessKeyFor = undefined, network = 'testnet' }:any) {
    (this as any).walletSelector = null;
    (this as any).wallet = null;
    (this as any).network = null;
    (this as any).createAccessKeyFor = null;
    // Login to a wallet passing a contractId will create a local
    // key, so the user skips signing non-payable transactions.
    // Omitting the accountId will result in the user being
    // asked to sign all transactions.
    (this as any).createAccessKeyFor = createAccessKeyFor;
    (this as any).network = 'mainnet';
  }

  // To be called when the website loads
  async startUp() {
    (this as any).walletSelector = await setupWalletSelector({
      network: (this as any).network,
      modules: [
        nearWallet,
        meteorWallet,
        setupMyNearWallet(),
        setupLedger(),
        sender,
        hereWallet,
      ],
    });

    const isSignedIn = (this as any).walletSelector.isSignedIn();

    if (isSignedIn) {
        (this as any).wallet = await (this as any).walletSelector.wallet();
        (this as any).accountId =
        (this as any).walletSelector.store.getState().accounts[0].accountId;
    }

    return isSignedIn;
  }

  async account() {
    const [acc] = await (this as any).wallet.getAccounts();
    return acc;
    // return this.wallet;
  }

  // Sign-in method
  signIn() {
    const description = 'Please select a wallet to sign in.';
    const modal = setupModal((this as any).walletSelector, {
      contractId: (this as any).createAccessKeyFor,
      description,
    });
    modal.show();
  }

  // Sign-out method
  signOut() {
    (this as any).wallet.signOut();
    (this as any).wallet = (this as any).accountId = (this as any).createAccessKeyFor = null;
    window.location.replace(window.location.origin + window.location.pathname);
  }

  // Make a read-only call to retrieve information from the network
  async viewMethod({ contractId, method, args = {} }:any) {
    const { network } = (this as any).walletSelector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    let res = await provider.query({
      request_type: 'call_function',
      account_id: contractId,
      method_name: method,
      args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
      finality: 'optimistic',
    });
    return JSON.parse(Buffer.from((res as any).result).toString());
  }

  // Call a method that changes the contract's state
  async callMethod({
    contractId,
    method,
    args = {},
    gas = THIRTY_TGAS,
    deposit = NO_DEPOSIT,
  }:any) {
    // Sign a transaction with the "FunctionCall" action
    return await (this as any).wallet.signAndSendTransaction({
      signerId: (this as any).accountId,
      receiverId: contractId,
      actions: [
        {
          type: 'FunctionCall',
          params: {
            methodName: method,
            args,
            gas,
            deposit,
          },
        },
      ],
    });
  }

  // Get transaction result from the network
  async getTransactionResult(txhash:string) {
    const { network } = (this as any).walletSelector.options;
    const provider = new providers.JsonRpcProvider({ url: network.nodeUrl });

    // Retrieve transaction result from the network
    const transaction = await provider.txStatus(txhash, 'unnused');
    return providers.getTransactionLastResult(transaction);
  }
}
