import React, { useState } from "react";
import ExpenseFileComponent from "./ExpenseFileComponent";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";

function ExpenseFile() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{ height: "100vh", overflow: "hidden" }}>
      <Navbar sidebarOpen={() => setSidebarOpen(!sidebarOpen)} />
      <div
        className="d-flex"
        style={{ marginTop: "56px", height: "calc(100vh - 56px)" }}
      >
        <Sidebar sidebarOpen={sidebarOpen} />
        <div
          className="w-100"
          style={{
            marginLeft: sidebarOpen ? "250px" : "0",
            transition: "margin-left 0.3s ease-in-out",
            height: "100%",
            overflowY: "auto",
          }}
        >
          <ExpenseFileComponent />
        </div>
      </div>
    </div>
  );
}

export default ExpenseFile;
