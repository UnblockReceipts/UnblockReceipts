import React, { useEffect, useState } from 'react';
import Navbar from "./components/Header";
import unblockReceiptLogo from "./images/unblockReceiptLogo.png";
import unblockReceiptLogoTight from "./images/unblockReceiptLogoTight.png";
import './App.css';
import { ethers } from 'ethers';

import { ConnectButton, useConnectModal } from '@web3modal/react'

interface TxRowData {
  txID: string;
  value: ethers.BigNumber;
  valueUSDCents: ethers.BigNumber;
  gasFeeETHwei: ethers.BigNumber;
  gasFeeUSDCents: ethers.BigNumber;
  timestamp: Date;
  from: string | undefined;
  to: string | undefined;
}

function App() {
  const { isOpen, open, close } = useConnectModal()
  const txIDs = checkURLForTxIDs();
  const [txData, setTxData] = useState(function generateEmptyTxData() {
    return [] as TxRowData[];
  });
  console.log('txHash:',txIDs);
  //Example txn to use: 0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2
  const getTxnData = async function(txHash: string) {
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
    const gasUsed = (typeof receipt.gasUsed === 'undefined') ? ethers.BigNumber.from(0) : receipt.gasUsed;
    const gasFeeETHwei = (typeof gasPrice === 'undefined') ? ethers.BigNumber.from(0) : gasUsed.mul(gasPrice);
    const gasFeeUSDCents = gasFeeETHwei.mul(weiPriceInUSDCents);
    const valueUSDCents = txn.value.mul(weiPriceInUSDCents);
    console.log('gasPrice', gasPrice, 'gasUsed', gasUsed, 'gasFeeETHwei', gasFeeETHwei);
    const txData = {
      txID: txHash,
      value: txn.value,
      valueUSDCents,
      gasUsed: receipt.gasUsed,
      //cumulativeGasUsed: receipt.cumulativeGasUsed, //includes txes before the current one in the same block.
      gasPriceString: (typeof gasPrice === 'undefined') ? '' : gasPrice.toString(),
      gasLimit: txn.gasLimit,
      gasFeeETHwei,
      gasFeeUSDCents,
      timestamp: new Date(block.timestamp*1000),
      to: receipt.to,
      from: receipt.from,
    };
    return txData;
  }
  const getTxnsData = async function(txHashes: string[] | undefined) {
    if(typeof txHashes === 'undefined') {
      return;
    }
    const txDataPromises : Promise<TxRowData>[] = [];
    for(let txHash of txHashes) {
      txDataPromises.push(getTxnData(txHash));
    }
    const txData = await Promise.all(txDataPromises);
    console.log('txData:',txData);
    setTxData(txData);
    return txData;
  }
  useEffect(() => { getTxnsData(txIDs); },[]); //https://stackoverflow.com/a/71434389/
  if(typeof txIDs === 'undefined') {
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
            Paste a transaction ID in this box to see a receipt (or more than one, separated by commas):<br />
            <input
              id="txHashInput"
              placeholder="e.g. 0x60286c0fee3a46697e3ea4b04bc229f5db4b65d001d93563351fb66d81bf06b2"
              onChange={(ev: React.ChangeEvent) => {
                const inputElement = ev.target;
                if(!(inputElement instanceof HTMLInputElement)) {
                  throw new Error('Input element was not of the expected type - this should never happen.');
                }
                const inputValue = inputElement.value;
                const inputValueSplit = inputValue.split(',');
                let countRightLength = 0;
                let countWrongLength = 0;
                for(let inputHash of inputValueSplit) {
                  let len = inputHash.trim().length;
                  if(len === 66) {
                    countRightLength++;
                  } else if (len > 0) {
                    countWrongLength++;
                  }
                }
                if(countRightLength > 0 && countWrongLength === 0) {
                  window.location.pathname = '/tx/' + inputValue;
                }
              }}
            />
            <br />
            In the future, you will be able to see multiple transactions for specified account(s), starting with account(s) in your wallet:
          </div>
          <ConnectButton />
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
        {/*<Navbar />*/}
        <img
            src={unblockReceiptLogoTight}
            className="App-logo"
            alt="logo"
            style={{ height: "5em", padding: "1em" }}
        />
        <span className="slogan">Spend your tokens, not your time!</span>
        <h1 style={{textAlign: "center" }}>
          Decentralized network transaction receipt
        </h1>
        <div className="receiptAndExplanationWrapper">
          <table className="txReceiptsTable">
            <thead>
              <tr>
                <td>
                  Transaction ID
                </td>
                <td>
                  From
                </td>
                <td>
                  To
                </td>
                <td title="This transaction took place on">
                  Date/Time
                </td>
                <td>
                  ETH sent (ETH)
                </td>
                <td>
                  Tx fee (ETH)
                </td>
                <td>
                  ETH sent (USD)
                </td>
                <td>
                  Tx fee (USD)
                </td>
              </tr>
            </thead>
            <tbody>
              {
                txData.map(getTxRow)
              }
            </tbody>
          </table>
          <p className="explanation">
            On this decentralized network, the "transaction fee" (abbreviated "Tx fee") incentivizes network participants to
            do the work needed to include this transaction in the ledger.
          </p>
        </div>
      </>
    );
  }
}

function getTxRow(txData: TxRowData) {
    return (
      <tr className="singleTxReceipt" key={txData.txID}>
        <td style={{maxWidth: "10em"}}><span className="txID">{txData.txID}</span></td>
        <td style={{maxWidth: "10em"}}>{txData.from}</td>
        <td style={{maxWidth: "10em"}}>{txData.to}</td>
        <td style={{maxWidth: "10em"}}>{txData.timestamp.toString()}</td>
        <td>{ethers.utils.formatUnits(txData.value, 'ether')}</td>
        <td>{ethers.utils.formatUnits(txData.gasFeeETHwei, 'ether')}</td>
        <td>${parseInt(txData.valueUSDCents.toString())/100}</td>
        <td>${parseInt(txData.gasFeeUSDCents.toString())/100}</td>
      </tr>
    );
}

function checkURLForTxIDs(): string[] | undefined {
  const pathname = window.location.pathname;
  const SINGLE_TX_START = "/tx/";
  if (pathname.startsWith(SINGLE_TX_START)) {
    let txHashEndSlash = pathname.indexOf("/", SINGLE_TX_START.length);
    let txHashEndsBefore = pathname.length;
    if (txHashEndSlash >= 0) {
      txHashEndsBefore = txHashEndSlash;
    }
    const txHash = pathname.substring(SINGLE_TX_START.length, txHashEndsBefore);
    return splitToMultipleIDs(txHash);
  } else {
    const urlSearchParams = new URLSearchParams(window.location.search);
    const urlSearchParamsTx = urlSearchParams.get("tx");
    if (urlSearchParamsTx !== null) {
      return splitToMultipleIDs(urlSearchParamsTx);
    }
  }
}

function splitToMultipleIDs(strIn: string): string[] {
  let components = strIn.split(',');
  return components.map(function(component) {return decodeURIComponent(component).trim();});
}

//TODO: May need to rethink how this works while still avoiding issues with BigNumbers only handling integer values. Maybe inverse?
async function getWeiPriceInUSDCents(blockNumber : number | undefined) : Promise<ethers.BigNumberish> {
  return 1; //temporary placeholder
}

export default App;
