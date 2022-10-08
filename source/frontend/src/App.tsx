import React, { useEffect, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { ethers } from 'ethers';

function App() {
  const txID = checkURLForTxID();
  const [txData, setTxData] = useState(function generateEmptyTxData() {
    return {
      gasFeeETHwei: new ethers.utils.BigNumber(0),
      gasFeeUSDCents: new ethers.utils.BigNumber(0),
    }
  });
  console.log('txHash:',txID);
  //Example txn to use: 0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2
  const getTxnData = async function(txHash: string | undefined) {
    if(typeof txHash === 'undefined') {
      return;
    }
    const provider = new ethers.providers.JsonRpcProvider({
      url: 'https://mainnet.ethereum.coinbasecloud.net',
      user: process.env.REACT_APP_COINBASE_CLOUD_USER,
      password: process.env.REACT_APP_COINBASE_CLOUD_PASS,
    });
    const receipt = await provider.getTransactionReceipt(txHash);
    const txn = await provider.getTransaction(txHash);
    const weiPriceInUSDCents = await getWeiPriceInUSDCents(receipt.blockNumber);
    //@ts-ignore that effectiveGasPrice might be undefined - it's undocumented but sometimes there.
    const gasPrice = (typeof receipt.effectiveGasPrice === 'undefined') ? txn.gasPrice : receipt.effectiveGasPrice;
    const gasUsed = (typeof receipt.gasUsed === 'undefined') ? new ethers.utils.BigNumber(0) : receipt.gasUsed;
    const gasFeeETHwei = gasUsed.mul(gasPrice);
    const gasFeeUSDCents = gasFeeETHwei.mul(weiPriceInUSDCents);
    console.log('gasPrice', gasPrice, 'gasUsed', gasUsed, 'gasFeeETHwei', gasFeeETHwei);
    const txData =  {
      value: txn.value,
      gasUsed: receipt.gasUsed,
      //cumulativeGasUsed: receipt.cumulativeGasUsed, //includes txes before the current one in the same block.
      gasPriceString: txn.gasPrice.toString(),
      gasLimit: txn.gasLimit,
      gasFeeETHwei,
      gasFeeUSDCents,
    };
    console.log('txData:',txData);
    setTxData(txData);
    return txData;
  }
  useEffect(() => { getTxnData(txID); },[]); //https://stackoverflow.com/a/71434389/
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
        You are viewing a receipt for tx <span className="txID">{txID}</span>.
        <p> Gas fee: {ethers.utils.formatUnits(txData.gasFeeETHwei, 'ether')} ETH </p>
        <p> Gas fee: {parseInt(txData.gasFeeUSDCents.toString())/100} USD </p>
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

async function getWeiPriceInUSDCents(blockNumber : number | undefined) : Promise<ethers.utils.BigNumberish> {
  return 1; //temporary placeholder
}

export default App;
