import "./App.css";
import { Button } from "@material-ui/core";
import Navbar from "./components/Header";
import unblockReceiptLogo from "./images/unblockReceiptLogo.png";

function App() {
  const txID = checkURLForTxID();
  console.log("txHash:", txID);
  if (typeof txID === "undefined") {
    return (
      <>
        <Navbar />
        <div className="App">
          <header className="App-header">
            {true ? (
              <>
                <img
                  src={unblockReceiptLogo}
                  alt="logo"
                  style={{ height: "180px", paddingBottom: "1rem" }}
                />
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
      <div className="singleTxReceipt">
        You are viewing a receipt for tx <span className="txID">{txID}</span>
      </div>
    );
  }
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

export default App;
