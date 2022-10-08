import React, { useEffect, useState } from 'react';
import { Button } from "@material-ui/core";
import Navbar from "./components/Header";
import unblockReceiptLogo from "./images/unblockReceiptLogo.png";
import './App.css';
import { ethers } from 'ethers';

interface TxRowData {
  txID: string;
  gasFeeETHwei: ethers.utils.BigNumber;
  gasFeeUSDCents: ethers.utils.BigNumber;
  timestamp: Date;
  from: string | undefined;
  to: string | undefined;
}

function App() {
  const txID = checkURLForTxID();
  const [txData, setTxData] = useState(function generateEmptyTxData() {
    return [] as TxRowData[];
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
    if(typeof receipt.blockNumber === 'undefined') {
      throw new Error ('Got undefined block number in receipt for tx '+txHash);
    }
    const block = await provider.getBlock(receipt.blockNumber);
    const weiPriceInUSDCents = await getWeiPriceInUSDCents(receipt.blockNumber);
    //@ts-ignore that effectiveGasPrice might be undefined - it's undocumented but sometimes there.
    const gasPrice = (typeof receipt.effectiveGasPrice === 'undefined') ? txn.gasPrice : receipt.effectiveGasPrice;
    const gasUsed = (typeof receipt.gasUsed === 'undefined') ? new ethers.utils.BigNumber(0) : receipt.gasUsed;
    const gasFeeETHwei = gasUsed.mul(gasPrice);
    const gasFeeUSDCents = gasFeeETHwei.mul(weiPriceInUSDCents);
    console.log('gasPrice', gasPrice, 'gasUsed', gasUsed, 'gasFeeETHwei', gasFeeETHwei);
    const txData = [{
      txID: txHash,
      value: txn.value,
      gasUsed: receipt.gasUsed,
      //cumulativeGasUsed: receipt.cumulativeGasUsed, //includes txes before the current one in the same block.
      gasPriceString: txn.gasPrice.toString(),
      gasLimit: txn.gasLimit,
      gasFeeETHwei,
      gasFeeUSDCents,
      timestamp: new Date(block.timestamp*1000),
      to: receipt.to,
      from: receipt.from,
    }];
    console.log('txData:',txData);
    setTxData(txData);
    return txData;
  }
  useEffect(() => { getTxnData(txID); },[]); //https://stackoverflow.com/a/71434389/
  if(typeof txID === 'undefined') {
    return (
      <>
      <Navbar />
      <div className="App">
        <header className="App-header">
        {true ? (
          <>
          <img
            src={unblockReceiptLogo}
            className="App-logo"
            alt="logo"
            style={{ height: "180px", paddingBottom: "1rem" }}
          />
          <div className="homepageContent">
            Welcome to UnblockReceipts!
            <br />
            To see a receipt for a transaction, add "/tx/" to the URL
            followed by the transaction hash you wish to view a receipt for.
            <br />
            In the future, you will be able to see multiple transactions for specified account(s), starting with account(s) in your wallet:
          </div>
          <Button
            style={{
              borderRadius: 35,
              backgroundColor: "#50b5b0",
              border: "1px solid black",
              padding: "8px 28px",
              fontSize: "15px",
              color: "white",
              textTransform: "none"
            }}
            variant="contained"
          >
            {true ? "Connect Wallet" : "Disconnect"}
          </Button>
          </>
          ) : (
              <h1>he</h1>
          )}
        </header>
      </div>
      </>
    );
  } else {
    return (
      <>
        <h1>
          Decentralized network transaction receipt
        </h1>
        <div>
          {
            txData.map(getTxRow)
          }
        </div>
        <p>
          On this decentralized network, the "gas fee" incentivizes network participants to
          do the work needed to include this transaction in the ledger.
        </p>
      </>
    );
  }
}

function getTxRow(txData: TxRowData) {
    return (
      <div className="singleTxReceipt" key={txData.txID}>
        You are viewing a receipt for tx <span className="txID">{txData.txID}</span>.
        <p> This transaction took place on {txData.timestamp.toString()}.</p>
        <p> From: {txData.from}</p>
        <p> To: {txData.to}</p>
        <p> Gas fee: {ethers.utils.formatUnits(txData.gasFeeETHwei, 'ether')} ETH </p>
        <p> Gas fee: {parseInt(txData.gasFeeUSDCents.toString())/100} USD </p>
      </div>
    );
}

function checkURLForTxID(): string | undefined {
  const pathname = window.location.pathname;
  const SINGLE_TX_START = "/tx/";
  if (pathname.startsWith(SINGLE_TX_START)) {
    let txHashEndSlash = pathname.indexOf("/", SINGLE_TX_START.length);
    let txHashEndsBefore = pathname.length;
    if (txHashEndSlash >= 0) {
      txHashEndsBefore = txHashEndSlash;
    }
    const txHash = pathname.substring(SINGLE_TX_START.length, txHashEndsBefore);
    return txHash;
  } else {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const urlSearchParamsTx = urlSearchParams.get("tx");
    if (urlSearchParamsTx !== null) {
      return urlSearchParamsTx;
    }
    console.log("pathname is ", pathname);
  }
}

//TODO: May need to rethink how this works while still avoiding issues with BigNumbers only handling integer values. Maybe inverse?
async function getWeiPriceInUSDCents(blockNumber : number | undefined) : Promise<ethers.utils.BigNumberish> {
  return 1; //temporary placeholder
}

export default App;
