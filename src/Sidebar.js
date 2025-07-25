import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function Sidebar({ sidebarOpen }) {
  const [activeTab, setActiveTab] = useState("tab1");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("message");
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div
      className={`sidebar  ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      style={{
        width: sidebarOpen ? "250px" : "0",
        transition: "width 0.3s ease-in-out",
        overflowX: "hidden",
        height: "100%",
        position: "fixed",
        backgroundColor: "#e80000",
        zIndex: 1000,
      }}
    >
      <div className="p-3">
        <ul className="nav nav-tabs mb-3" role="tablist">
          <li className="nav-item" role="presentation">
            <button
              className={`nav-link ${
                activeTab === "tab1" ? "active" : "text-secondary"
              }`}
              onClick={() => setActiveTab("tab1")}
            >
              Navigation
            </button>
          </li>
        </ul>
        <div className="tab-content">
          {activeTab === "tab1" && (
            <div className="nav flex-column">
              <a
                href="/aero_foods_finance/landing"
                style={{ borderBottom: "1px white solid", cursor: "pointer" }}
                className="nav-link text-white py-2"
              >
                Home
              </a>
              <a
                href="/aero_foods_finance/timesheet"
                style={{ borderBottom: "1px white solid", cursor: "pointer" }}
                className="nav-link text-white py-2"
              >
                Time Sheet
              </a>
              <a
                href="/aero_foods_finance/dashboard"
                style={{ borderBottom: "1px white solid", cursor: "pointer" }}
                className="nav-link text-white py-2"
              >
                Daily Sheet
              </a>
              <a
                href="/aero_foods_finance/wastage"
                style={{ borderBottom: "1px white solid", cursor: "pointer" }}
                className="nav-link text-white py-2"
              >
                Daily Wastage
              </a>
              <a
                href="/aero_foods_finance/reconciliation"
                style={{ borderBottom: "1px white solid", cursor: "pointer" }}
                className="nav-link text-white py-2"
              >
                Bank Reconciliation
              </a>
              <a
                href="/aero_foods_finance/materials"
                style={{ borderBottom: "1px white solid", cursor: "pointer" }}
                className="nav-link text-white py-2"
              >
                Materials
              </a>
              <a
                href="/aero_foods_finance/stockin"
                style={{ borderBottom: "1px white solid", cursor: "pointer" }}
                className="nav-link text-white py-2"
              >
                Stock In
              </a>
              <a
                onClick={handleLogout}
                style={{ borderBottom: "1px white solid", cursor: "pointer" }}
                className="nav-link text-white py-2"
              >
                Logout
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default Sidebar;
