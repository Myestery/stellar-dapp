"use client";

import {
  BASE_FEE,
  Contract,
  Networks,
  SorobanRpc,
  Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import React, { useEffect, useState } from "react";
import {
  getPublicKey,
  isConnected,
  signTransaction,
} from "@stellar/freighter-api";

import { ConnectButton } from "@/components/ConnectButton";

// Replace with your actual contract ID and network details
const CONTRACT_ID = "CC6MWZMG2JPQEENRL7XVICAY5RNMHJ2OORMUHXKRDID6MNGXSSOJZLLF";
const NETWORK_PASSPHRASE = Networks.TESTNET;
const SOROBAN_URL = "https://soroban-testnet.stellar.org:443";

export default function CounterPage() {
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const server = new SorobanRpc.Server(SOROBAN_URL);

  useEffect(() => {
    const checkWallet = async () => {
      const connected = await isConnected();
      if (connected) {
        const pubKey = await getPublicKey();
        setPublicKey(pubKey);
      }
    };
    checkWallet();
    getInitialCount();
  }, []);

  const handleIncrement = async () => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    setLoading(true);
    try {
      const account = await server.getAccount(publicKey);

      const contract = new Contract(CONTRACT_ID);
      // const instance = contract.getFootprint();

      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: NETWORK_PASSPHRASE,
      })
        .addOperation(contract.call("increment"))
        .setTimeout(30)
        .build();

      const preparedTx = await server.prepareTransaction(tx);

      const signedXdr = await signTransaction(preparedTx.toEnvelope().toXDR("base64"), {
        networkPassphrase: NETWORK_PASSPHRASE,
      });

      const signedTx = TransactionBuilder.fromXDR(
        signedXdr,
        NETWORK_PASSPHRASE
      ) as Transaction;

      const txResult = await server.sendTransaction(signedTx);

      if (txResult.status !== "PENDING") {
        throw new Error("Something went Wrong");
      }
      const hash = txResult.hash;
      let getResponse = await server.getTransaction(hash);
      // Poll `getTransaction` until the status is not "NOT_FOUND"

      while (getResponse.status === "NOT_FOUND") {
        console.log("Waiting for transaction confirmation...");
        getResponse = await server.getTransaction(hash);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (getResponse.status === "SUCCESS") {
        // Make sure the transaction's resultMetaXDR is not empty
        if (!getResponse.resultMetaXdr) {
          throw "Empty resultMetaXDR in getTransaction response";
        }
      } else {
        throw `Transaction failed: ${getResponse.resultXdr}`;
      }

      // Extract the new count from the transaction result
      const returnValue = getResponse.resultMetaXdr
        .v3()
        .sorobanMeta()
        ?.returnValue();
      if (returnValue) {
        const newCount = returnValue.u32();
        setCount(newCount);
      }
    } catch (error) {
      console.error("Error incrementing counter:", error);
      alert(
        "Error incrementing counter. Please check the console for details."
      );
    } finally {
      setLoading(false);
    }
  };

  const getInitialCount = async () => {
    try {
      const topic1 = xdr.ScVal.scvSymbol("COUNTER").toXDR("base64");
      const topic2 = xdr.ScVal.scvSymbol("increment").toXDR("base64");
      const latestLedger = await server.getLatestLedger();
      const events = await server.getEvents({
        startLedger: latestLedger.sequence - 2000,
        filters: [
          {
            type: "contract",
            contractIds: [
              CONTRACT_ID,
            ],
            topics: [[topic1, topic2]],
          },
        ],
        limit: 20,
      });
      setCount(events.events.map((e) => e.value.u32()).pop() || null)
    } catch (error) {
      console.error(error);
    }
  }
  
  return (
    <div className='max-w-md mx-auto mt-10'>
      <h1 className='text-2xl font-bold mb-4'>
        Stellar Smart Contract Counter
      </h1>
      {publicKey ? (
        <div>
          <p className='mb-4'>Connected: {publicKey}</p>
          <p className='mb-4'>
            Current Count: {count === null ? "Unknown" : count}
          </p>
          <button
            onClick={handleIncrement}
            disabled={loading}
            className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50'>
            {loading ? (
              <span className='flex items-center'>
                <svg
                  className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'>
                  <circle
                    className='opacity-25'
                    cx='12'
                    cy='12'
                    r='10'
                    stroke='currentColor'
                    strokeWidth='4'></circle>
                  <path
                    className='opacity-75'
                    fill='currentColor'
                    d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Increment Counter"
            )}
          </button>
        </div>
      ) : (
        <>
          <p>Please connect your Freighter wallet to use this app.</p>
          <ConnectButton label='Connect Wallet' />
        </>
      )}
    </div>
  );
}