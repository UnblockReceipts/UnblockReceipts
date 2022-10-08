import "./App.css";
import { Button } from "@material-ui/core";
import Navbar from "./components/Header";
import unblockReceiptLogo from "./images/unblockReceiptLogo.png";

function App() {
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
}

export default App;
