import React, { useEffect, useState } from 'react';
import Navbar from "./components/Header";
import unblockReceiptLogo from "./images/unblockReceiptLogo.png";
import unblockReceiptLogoTight from "./images/unblockReceiptLogoTight.png";
import './App.css';
import { ethers } from 'ethers';
import EthDater from 'ethereum-block-by-date';

import { ConnectButton, useConnectModal } from '@web3modal/react'

type MODE = 'tx' | 'acct';

interface DataForDisplay {
  mode: MODE;
  TxRows: TxRowData[];
}

interface ReceiptQuery {
  addresses: string[];
  txHashes: string[];
  blockStart?: string;
  blockEnd?: string;
  msStart?: Date;
  msEnd?: Date;
}

interface TokenTransfer {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#tokentransfer
  tokenAddress: string;
  tokenType: "erc20" | "erc721";
  from: string;
  to: string;
  value: string; // For ERC-20, gives quantity of tokens transferred. For ERC-721, gives list of token IDs of the token transferred
  transactionHash: string;
  transactionIndex: string;
}

interface InternalTransaction {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#internaltransaction
  traceType: string; //Type of internal transaction, e.g. CREATE, CALL, CALLCODE, DELEGATECALL, SUICIDE
  from: string;
  to: string;
  value: string; //The value in native blockchain currency.
  gasLimit?: string
}
interface Transaction {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#transaction
  transactionHash:	string;
  transactionIndex:	string;
  from:	string; //The origin address.
  to:	string; //The destination address.
  value:	string; //The value in native blockchain currency.
  gasLimit:	string; //The maximum gas limit of a transaction.
  gasPrice:	string; //Transaction's cost per unit of gas in native blockchain currency.
  gasUsed:	string; //Amount of gas actually used in transaction.
  cumulativeGasUsed:	string;	//Total amount of gas used in the block of the transaction.
  status:	string; //"1": Success, "0": Fail, Other return codes: Unknown.
  input:	string;
  nonce:	string;
  blockHash:	string;
  blockNumber:	string;
  blockTimestamp:	string;
  internalTransactions?:	InternalTransaction[];
  tokenTransfers?:	TokenTransfer[];
}
interface BlockTransaction {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#blocktransaction
  blockHash: string;
  blockNumber: string;
  blockTimestamp: string;
  transactions:	Transaction[];
}
interface TransactionsByAddress {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#transactionsbyaddress
  blockStart: string;
  blockEnd: string;
  blocks: BlockTransaction[];
}

interface TransactionsByAddressResult {
  id: number;
  jsonrpc: string;
  result: TransactionsByAddress;
}
interface paramsForTxByAddress {
  //https://docs.cloud.coinbase.com/node/reference/advanced-api-reference#coinbasecloud_gettransactionsbyaddress
  "address": string; //"0x3cd751e6b0078be393132286c442345e5dc49699",
  "blockStart": string; //e.g. "0xdc3500",
  "blockEnd"?: string; //e.g. "0xdc3501", //see pagination
  "addressFilter"?: "SENDER_ONLY" | "SENDER_OR_RECEIVER" | "RECEIVER_ONLY";
  "blockchain"?: "Ethereum"; //currently the only option; "Polygon" and "Optimism" and "Arbitrum" to be added.
  "network"?: "Mainnet" | "Goerli";
}

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

const dater = new EthDater(new ethers.providers.CloudflareProvider());

function App() {
  const { isOpen, open, close } = useConnectModal()
  const receiptQuery = getReceiptQueryFromURL();
  const [txData, setTxData] = useState(function generateEmptyTxData() {
    return [] as TxRowData[];
  });
  const getTxnData = async function(txHash: string) : Promise<TxRowData> {
    const provider = getCoinbaseNodeProvider();
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
  const getTxnsData = async function(receiptQuery: ReceiptQuery) : Promise<TxRowData[]> {
    const txHashes = receiptQuery.txHashes;
    if(txHashes.length > 0){
      const txDataPromises : Promise<TxRowData>[] = [];
      for(let txHash of txHashes) {
        txDataPromises.push(getTxnData(txHash));
      }
      return await Promise.all(txDataPromises);
    } else {
      if(typeof receiptQuery.blockStart === 'undefined' && typeof receiptQuery.msStart !== 'undefined') {
        receiptQuery.blockStart = await getHexBlockNumberJustBeforeTimestamp(receiptQuery.msStart);
      }
      if(typeof receiptQuery.blockEnd === 'undefined' && typeof receiptQuery.msEnd !== 'undefined') {
        receiptQuery.blockEnd = await getHexBlockNumberJustBeforeTimestamp(receiptQuery.msEnd);
      }
      //get address data; TODO make these not mutually exclusive.
      return getTxDataForAddresses(receiptQuery.addresses, receiptQuery.blockStart, receiptQuery.blockEnd);
    }
  }
  const getAndDisplayTxnsData = async function(receiptQuery: ReceiptQuery | undefined) {
    if(typeof receiptQuery === 'undefined') {
      return;
    }
    const txData = await getTxnsData(receiptQuery);
    console.log('txData:',txData);
    setTxData(txData);
    return txData;
  }
  useEffect(() => { getAndDisplayTxnsData(receiptQuery); },[]); //https://stackoverflow.com/a/71434389/
  if(typeof receiptQuery === 'undefined') {
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
              />
            <button
              onClick={(ev: React.MouseEvent) => {
                const inputElement = document.getElementById("txHashInput");
                if(!(inputElement instanceof HTMLInputElement)) {
                  throw new Error('txHashInput element was not of the expected type - this should never happen.');
                }
                const inputValue = inputElement.value;
                if(membersMatchExpectedLength(inputValue, 66)) {
                  window.location.pathname = '/tx/' + inputValue;
                }
              }}
            >Get receipt!</button>
            <br />
            Alternatively, you can use this box to get a receipt for all the transactions on an account (or more than one, separated by commas):
            <br />
            <input
              id="acctInput"
              placeholder="e.g. 0x0dc58008C371b240bAEE63Cb9D514C99d5e96c9A"
              />
            <button
              onClick={(ev: React.MouseEvent) => {
                const inputElement = document.getElementById("acctInput");
                if(!(inputElement instanceof HTMLInputElement)) {
                  throw new Error('acctInput element was not of the expected type - this should never happen.');
                }
                const inputValue = inputElement.value;
                if(membersMatchExpectedLength(inputValue, 42)) {
                  window.location.pathname = '/acct/' + inputValue;
                }
              }}
            >Get receipt!</button> <em>Date-based filtering coming in the future!</em>
            <br />
            Even more conveniently, if you control the accounts, you can click here to connect accounts of your choosing:
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
        <a href='/'>
        <img
            src={unblockReceiptLogoTight}
            className="App-logo"
            alt="logo"
            style={{ height: "5em", padding: "1em" }}
        />
        </a>
        <span className="slogan">Spend your tokens, not your time!</span>
        <h1 style={{textAlign: "center" }}>
          Transaction receipt
        </h1>
        <p className="mode">
          This is a receipt for
          {receiptQuery.txHashes.length > 0 ?
          (receiptQuery.txHashes.length === 1 ? ' a specified transaction' : ' specified transactions') :
          (' the entire history of ' + (receiptQuery.addresses.length === 1 ? ' a specified account' : ' specified accounts'))}.
        </p>
        {txData.length > 0 ? '' :
          <p className="mode">Data has not yet finished loading.</p>
        }
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
                  ETH sent<br />(ETH)
                </td>
                <td>
                  Tx fee<br />(ETH)
                </td>
                <td>
                  ETH sent<br />(USD)
                </td>
                <td>
                  Tx fee<br />(USD)
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
            At the moment, this tool only generates receipts for transactions on the main Ethereum network.
          </p>
          <p className="explanation">
            On this decentralized network, the "transaction fee" (abbreviated "Tx fee") incentivizes network participants to
            do the work needed to include this transaction in the ledger.
          </p>
          <p className="explanation">
            The time zone displayed above is based on viewer system settings, and does not necessarily reflect the time zone the
            person who initiated this transaction may have been in.
          </p>
        </div>
      </>
    );
  }
}

function getCoinbaseNodeProvider() {
  return new ethers.providers.JsonRpcProvider({
    url: 'https://mainnet.ethereum.coinbasecloud.net',
    user: process.env.REACT_APP_COINBASE_CLOUD_USER,
    password: process.env.REACT_APP_COINBASE_CLOUD_PASS,
  });
}

function getTxRow(txData: TxRowData) {
    return (
      <tr className="singleTxReceipt" key={txData.txID}>
        <td style={{maxWidth: "10em"}}><a className="txID"
        href={'https://etherscan.io/tx/' + txData.txID} target='_blank'>{txData.txID}</a></td>
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

function getReceiptQueryFromURL(): ReceiptQuery | undefined {
  //TODO: This currently ignores addresses if any transactions are defined;
  //they could technically coexist.
  const pathname = window.location.pathname;
  const SINGLE_TX_START = "/tx/";
  const ADDRESS_START = "/acct/";
  const urlSearchParams = new URLSearchParams(window.location.search);
  const urlSearchParamsTx = urlSearchParams.get("tx");
  const urlSearchParamsAddr = urlSearchParams.get("acct");
  const urlSearchParamsBlockStart = urlSearchParams.get("blockStart");
  const urlSearchParamsBlockEnd = urlSearchParams.get("blockEnd");
  const urlSearchParamsMsStart = urlSearchParams.get("start");
  const urlSearchParamsMsEnd = urlSearchParams.get("end");
  let partialResult: Partial<ReceiptQuery> = {};
  if(urlSearchParamsBlockStart !== null) {
    partialResult.blockStart = urlSearchParamsBlockStart.startsWith('0x') ? urlSearchParamsBlockStart : convertToHex(urlSearchParamsBlockStart);
  }
  if(urlSearchParamsBlockEnd !== null) {
    partialResult.blockEnd = urlSearchParamsBlockEnd.startsWith('0x') ? urlSearchParamsBlockEnd : convertToHex(urlSearchParamsBlockEnd);
  }
  if(urlSearchParamsMsStart !== null) {
    partialResult.msStart = new Date(parseInt(urlSearchParamsMsStart));
  }
  if(urlSearchParamsMsEnd !== null) {
    partialResult.msEnd = new Date(parseInt(urlSearchParamsMsEnd));
  }
  if (pathname.startsWith(SINGLE_TX_START)) {
    return Object.assign({
      txHashes: splitToMultipleIDs(getPathPortionEndingAtOptionalSlash(pathname, SINGLE_TX_START.length)),
      addresses: [],
    }, partialResult);
  } else {
    if (urlSearchParamsTx !== null) {
      return Object.assign({
        txHashes: splitToMultipleIDs(urlSearchParamsTx),
        addresses: [],
      }, partialResult);
    } else if(pathname.startsWith(ADDRESS_START)) {
      const addresses = splitToMultipleIDs(getPathPortionEndingAtOptionalSlash(pathname, ADDRESS_START.length));
      return Object.assign({addresses, txHashes: []}, partialResult);
    } else if(urlSearchParamsAddr !== null) {
      const addresses = splitToMultipleIDs(urlSearchParamsAddr);
      return Object.assign({addresses, txHashes: []}, partialResult);
    }
  }
}

async function getTxDataForAddresses(
  addresses: string[],
  blockStart: string = 'genesis',
  blockEnd: string = 'latest'
) : Promise<TxRowData[]> {
  const blockTransactions = await convertAddressesToTxList(addresses, blockStart, blockEnd);
  let result: TxRowData[] = [];
  for(let blockTransaction of blockTransactions) {
    const timestamp = new Date(parseInt(blockTransaction.blockTimestamp, 16)*1000);
    const blockNumber = parseInt(blockTransaction.blockNumber);
    for(let txn of blockTransaction.transactions) {
      const weiPriceInUSDCents = await getWeiPriceInUSDCents(blockNumber);
      const value = ethers.BigNumber.from(txn.value);
      const gasFeeETHwei = ethers.BigNumber.from(txn.gasUsed).mul(txn.gasPrice);
      const gasFeeUSDCents = gasFeeETHwei.mul(weiPriceInUSDCents);
      const valueUSDCents = ethers.BigNumber.from(txn.value).mul(weiPriceInUSDCents);
      result.push({
        txID: txn.transactionHash,
        value,
        valueUSDCents,
        gasFeeETHwei,
        gasFeeUSDCents,
        timestamp,
        from: txn.from,
        to: txn.to,
      });
    }
  }
  return result;
}

async function convertAddressesToTxList(
  addresses: string[],
  blockStart: string = 'genesis',
  blockEnd: string = 'latest'
) : Promise<BlockTransaction[]> {
  let result = [];
  for(let address of addresses) {
    result.push(...(await getAllTxDataAboutAddress(address, blockStart, blockEnd)));
  }
  return result;
}

async function getAllTxDataAboutAddress(
  address: string,
  blockStart: string = 'genesis',
  blockEnd: string = 'latest',
  resultBlockSet: BlockTransaction[] = []
) : Promise<BlockTransaction[]> {
  if(blockStart === 'genesis') {
    blockStart = '0x0'; //'genesis' is not accepted.
  }
  const singleCallResult = await makeHTTPRequestToCoinbaseCloud({
    address,
    blockStart,
    blockEnd, //see pagination
    "addressFilter": "SENDER_ONLY", //can also be "SENDER_OR_RECEIVER" or "RECEIVER_ONLY"
    "blockchain": "Ethereum", //currently the only option; "Polygon" and "Optimism" and "Arbitrum" to be added.
    "network": "Mainnet" //"Goerli" also supported
  }) as TransactionsByAddressResult;
  console.log('Coinbase call result: ',singleCallResult);
  resultBlockSet.push(...singleCallResult.result.blocks);
  //Pagination handling:
  let requestedBlockStart = ethers.BigNumber.from(blockStart);
  let actualBlockStartHex = singleCallResult?.result?.blockStart;
  if(typeof actualBlockStartHex === 'undefined') {
    console.warn('Could not determine if additional pagination queries are needed; not making them.');
  } else {
    let actualBlockStart = ethers.BigNumber.from(actualBlockStartHex);
    if(actualBlockStart.gt(requestedBlockStart)) {
      return getAllTxDataAboutAddress(address, blockStart, actualBlockStart.sub(1).toHexString(), resultBlockSet)
    }
  }
  return resultBlockSet;
}

function makeHTTPRequestToCoinbaseCloud(
  params: paramsForTxByAddress,
) {
  return new Promise(function(resolve, reject) {
    if(params.blockEnd === 'latest') {
      delete params.blockEnd; //it's the latest by default, but 'latest' isn't accepted
    }
    const reqBodyJSON = {
      "id": 1,
      "jsonrpc": "2.0",
      "method": "coinbaseCloud_getTransactionsByAddress",
      "params": params
    };
    const req = new XMLHttpRequest();
    req.onload = function () {
      console.log('In onload handler from request to coinbase.');
      const response = req.response;
      console.log('XHR Response from coinbase: ' + typeof response, response);
      if(response?.error) {
        console.error('Error response from XMLHttpRequest to Coinbase Cloud:', response); //might still be an HTTP 200!
      }
      resolve(response);
    }
    req.responseType = 'json';
    //req.addEventListener("load", reqListener);
    req.open("POST", "https://mainnet.ethereum.coinbasecloud.net");
    req.setRequestHeader('Authorization','Basic ' + window.btoa(process.env.REACT_APP_COINBASE_CLOUD_USER + ':' + process.env.REACT_APP_COINBASE_CLOUD_PASS));
    req.setRequestHeader('Content-Type','application/json');
    let parsed = JSON.stringify(reqBodyJSON, null, 2);
    req.send(parsed);
  });
}

function getPathPortionEndingAtOptionalSlash(strIn: string, startPos: number) {
  let txHashEndSlash = strIn.indexOf("/", startPos);
  let txHashEndsBefore = strIn.length;
  if (txHashEndSlash >= 0) {
    txHashEndsBefore = txHashEndSlash;
  }
  return strIn.substring(startPos, txHashEndsBefore);
}

function splitToMultipleIDs(strIn: string): string[] {
  let components = strIn.split(',');
  return components.map(function(component) {return decodeURIComponent(component).trim();});
}

function membersMatchExpectedLength(possiblyCommaSeparatedList: string, expectedMemberLength: number) {
  const inputValueSplit = possiblyCommaSeparatedList.split(',');
  let countRightLength = 0;
  let countWrongLength = 0;
  for(let inputHash of inputValueSplit) {
    let len = inputHash.trim().length;
    if(len === expectedMemberLength) {
      countRightLength++;
    } else if (len > 0) {
      countWrongLength++;
    }
  }
  return (countRightLength > 0 && countWrongLength === 0);
}

async function getPriceOfETHInUSD(onDate: number = 1601596800) {

  var myHeaders = new Headers();
  myHeaders.append("Content-Type", "application/json");

  var graphql = JSON.stringify({
    query: "query oneQuery($pricedate: Int!){\n  tokens(where: { id: \"0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2\"}){\n    id\n    name\n    tokenDayData(where:{ date: $pricedate }){\n      priceUSD\n    }\n  }\n}",
    variables: {"pricedate":onDate}
  })
  var requestOptions = {
    method: 'POST',
    headers: myHeaders,
    body: graphql,
    redirect: 'follow'
  };

  return fetch("https://gateway.thegraph.com/api/33a2a1eab893fdcc1b8b1cd38dcf7d0a/subgraphs/id/2szAn45skWZFLPUbxFEtjiEzT1FMW8Ff5ReUPbZbQxtt?pricedate=priceDate", {
    method: 'POST',
    headers: myHeaders,
    body: graphql,
    redirect: 'follow'
  })
    .then(response => response.text())
    .then(result => {
      console.log(JSON.parse(result).data.tokens[0].tokenDayData[0].priceUSD);
      return JSON.parse(result).data.tokens[0].tokenDayData[0].priceUSD;
    })
    .catch(error => console.log('error', error));
}

//TODO: May need to rethink how this works while still avoiding issues with BigNumbers only handling integer values. Maybe inverse?
async function getWeiPriceInUSDCents(blockNumber : number | undefined) : Promise<ethers.BigNumberish> {
  return 1; //temporary placeholder
}

async function getHexBlockNumberJustBeforeTimestamp(
  timestamp: Date
) : Promise<string> {
  return ethers.BigNumber.from((await getBlockInfoJustBeforeTimestamp(timestamp)).block).toHexString();
}

async function getBlockInfoJustBeforeTimestamp(
  timestamp: Date
) : Promise<EthDater.BlockResult> {
  return dater.getDate(timestamp, false, false);
}

function convertToHex(stringNumIn: ethers.BigNumberish) {
  return ethers.BigNumber.from(stringNumIn).toHexString();
}

export default App;
