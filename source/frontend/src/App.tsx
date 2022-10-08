import React from 'react';
import logo from './logo.svg';
import './App.css';

function App() {
  const txID = checkURLForTxID();
  console.log('txHash:',txID);
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
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
