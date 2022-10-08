import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import unblockReceiptLogo from "../../images/unblockReceiptLogo.png";

export default function Navbar() {
  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar
        position="fixed"
        sx={{
          height: "4rem",
          backgroundColor: "rgba(63, 81, 181, 0.3)"
        }}
      >
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <img
              src={unblockReceiptLogo}
              alt="logo"
              style={{ paddingTop: ".5rem", height: "40px" }}
            />
          </Typography>
        </Toolbar>
      </AppBar>
    </Box>
  );
}
