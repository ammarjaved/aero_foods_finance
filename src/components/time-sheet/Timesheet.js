import React, { useState, useEffect } from "react";
import TimeFormComponent from "./TimeFormComponent";
import Navbar from "../../Navbar";
import Sidebar from "../../Sidebar";

function Timesheet() {
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
          className="w-100 d-flex" // Use Flexbox for the layout
          style={{
            marginLeft: sidebarOpen ? "250px" : "0",
            transition: "margin-left 0.3s ease-in-out",
            height: "100%",
            overflowY: "auto", // Ensure the content is scrollable if it overflows
          }}
        >
          {/* Table (70% width) */}
          <div
            style={{
              flex: "0 0 100%", // 70% width
              height: "100%",
              overflowY: "auto", // Ensure the content is scrollable if it overflows
            }}
          >
            <TimeFormComponent />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timesheet;
