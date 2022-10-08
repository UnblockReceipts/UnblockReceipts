import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const txID = checkURLForTxID();
  console.log('txHash:',txID);
  if(typeof txID === 'undefined') {
  return (
    <div className="App">
        <img src={logo} className="App-logo" alt="logo" />
      <div className="homepageContent">
          Welcome to UnblockReceipts!
          <br />
          To see a receipt for a transaction, add "/tx/" to the URL
          followed by the transaction hash you wish to view a receipt for.
      </div>
    </div>
  );
  } else {
    //Example txn to use: 0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2
    const getTxnData = async function(txHash: string) {
      const { ethers } = require('ethers');
      const provider = new ethers.providers.JsonRpcProvider({
        url: 'https://mainnet.ethereum.coinbasecloud.net',
        user: 'WR5CGFRJSKSID364W4CW',
        password: '5MQCC4HB5X7RXNPDODB6SBWREAEK2LLKKDBVUIHI',
      });
      const receipt = await provider.getTransactionReceipt(txHash);
      const txn = await provider.getTransaction(txHash);
      const txData =  {
        value: txn.value,
        gasUsed: receipt.gasUsed,
        //cumulativeGasUsed: receipt.cumulativeGasUsed, //includes txes before the current one in the same block.
        effectiveGasPrice: receipt.effectiveGasPrice,
        gasPrice: txn.gasPrice,
        gasLimit: txn.gasLimit,
      };
      console.log(txData);
      return txData;
    }
    getTxnData(txID);
    return (
      <div className="singleTxReceipt">
        You are viewing a receipt for tx <span className="txID">{txID}</span>
      </div>
    );
  }
}

function checkURLForTxID() : string | undefined {
  const pathname = window.location.pathname;
  const SINGLE_TX_START = '/tx/';
  if(pathname.startsWith(SINGLE_TX_START)) {
    let txHashEndSlash = pathname.indexOf('/', SINGLE_TX_START.length);
    let txHashEndsBefore = pathname.length;
    if(txHashEndSlash >= 0) {
      txHashEndsBefore = txHashEndSlash;
    }
    const txHash = pathname.substring(SINGLE_TX_START.length, txHashEndsBefore);
    return txHash;
  } else {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const urlSearchParamsTx = urlSearchParams.get('tx');
    if(urlSearchParamsTx !== null) {
      return urlSearchParamsTx;
    }
    console.log('pathname is ',pathname);
  }
}

export default App;
