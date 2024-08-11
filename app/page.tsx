"use client";

import React, { useState, useEffect } from "react";
import SendPaymentForm from "../components/SendPaymentForm";
import * as StellarSdk from "@stellar/stellar-sdk";
import { Server } from "@stellar/stellar-sdk/rpc";
import {
  isConnected,
  setAllowed,
  getPublicKey,
  signTransaction,
} from "@stellar/freighter-api";

export default function Home() {
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const checkFreighter = async () => {
      try {
        const connected = await isConnected();
        if (connected) {
          const pubKey = await getPublicKey();
          setPublicKey(pubKey);
        }
      } catch (error) {
        console.error("Error checking Freighter connection:", error);
      }
    };

    checkFreighter();
  }, []);

  const handleConnectWallet = async () => {
    try {
      await setAllowed();
      const pubKey = await getPublicKey();
      setPublicKey(pubKey);
    } catch (error) {
      console.error("Error connecting to Freighter:", error);
    }
  };

  const handleSendPayment = async (destination: string, amount: string) => {
    if (!publicKey) {
      console.error("Wallet not connected");
      return;
    }

    try {
      const server = new Server("https://soroban-testnet.stellar.org");
      const sourceAccount = await server.getAccount(publicKey);
      const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(
          StellarSdk.Operation.payment({
            destination: destination,
            asset: StellarSdk.Asset.native(),
            amount: amount,
          })
        )
        .setTimeout(30)
        .build();

      const signedTransaction = await signTransaction(transaction.toXDR(), {
        networkPassphrase: StellarSdk.Networks.TESTNET,
      });

      const transactionResult = await server.sendTransaction(
        StellarSdk.TransactionBuilder.fromXDR(
          signedTransaction,
          StellarSdk.Networks.TESTNET
        )
      );

      console.log("Transaction successful:", transactionResult);
      alert("Payment sent successfully!");
    } catch (error) {
      console.error("Error sending payment:", error);
      alert("Error sending payment. Please check the console for details.");
    }
  };

  return (
    <div className='max-w-md mx-auto'>
      <h2 className='text-2xl font-bold mb-4'>Send Payment</h2>
      {publicKey ? (
        <>
          <p className='mb-4'>Connected: {publicKey}</p>
          <SendPaymentForm onSubmit={handleSendPayment} />
        </>
      ) : (
        <button
          onClick={handleConnectWallet}
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'>
          Connect Freighter Wallet
        </button>
      )}
    </div>
  );
}
