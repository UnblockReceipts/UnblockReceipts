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
