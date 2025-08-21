import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const [activeSection, setActiveSection] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("message");
    localStorage.removeItem("activeSidebarSection");
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      const user = localStorage.getItem("user");
      setIsAdmin(user === "admin");
    }
  }, [navigate]);

  // Load saved active section or determine from current URL
  useEffect(() => {
    const savedSection = localStorage.getItem("activeSidebarSection");
    if (savedSection) {
      setActiveSection(savedSection);
    } else {
      // Determine section based on current URL
      const currentPath = location.pathname;
      if (currentPath.includes("TimesheetABE")) {
        setActiveSection("abeYus");
      } else if (currentPath.includes("TimesheetAmazon")) {
        setActiveSection("amazon");
      } else if (currentPath.includes("aero_foods_finance")) {
        setActiveSection("mixiue");
      }
    }
  }, []); // Only run on mount

  // Save active section to localStorage whenever it changes
  useEffect(() => {
    if (activeSection) {
      localStorage.setItem("activeSidebarSection", activeSection);
    }
  }, [activeSection]);

  const toggleSection = (section) => {
    const newSection = activeSection === section ? "" : section;
    setActiveSection(newSection);
  };

  const handleNavigation = (href) => {
    navigate(href);
    // Close sidebar on mobile/small screens (optional)
    if (setSidebarOpen) {
      setSidebarOpen(false);
    }
  };

  const menuItems_mixe = [
    { href: "/landing", label: "Home" },
    { href: "/timesheet", label: "Time Sheet" },
    { href: "/dashboard", label: "Daily Sheet" },
    { href: "/wastage", label: "Daily Wastage" },
    { href: "/reconciliation", label: "Bank Reconciliation" },
    { href: "/materials", label: "Materials" },
    { href: "/stockin", label: "Stock In" },
    { href: "/Expenses", label: "Expenditure" },
  ];

  const menuItems_abe = [
    { href: "/landing-yus", label: "Home" },
    { href: "/TimesheetABE", label: "Time Sheet" },
    { href: "/dashboard-yus", label: "Daily Sheet" },
    { href: "/wastage-yus", label: "Daily Wastage" },
    { href: "/reconciliation-yus", label: "Bank Reconciliation" },
    { href: "/materials-yus", label: "Materials" },
    { href: "/stockin-yus", label: "Stock In" },
    { href: "/Expenses-yus", label: "Expenditure" },
  ];

  const menuItems_amz = [
    { href: "/landing-amz", label: "Home" },
    { href: "/TimesheetAmazon", label: "Time Sheet" },
    { href: "/dashboard-amz", label: "Daily Sheet" },
    { href: "/wastage-amz", label: "Daily Wastage" },
    { href: "/reconciliation-amz", label: "Bank Reconciliation" },
    { href: "/materials-amz", label: "Materials" },
    { href: "/stockin-amz", label: "Stock In" },
    { href: "/Expenses-amz", label: "Expenditure" },
  ];

  // Function to check if current page matches the menu item
  const isCurrentPage = (href) => {
    return location.pathname === href;
  };

  const renderMenuItems = (items) =>
    items.map((item, index) => (
      <div
        key={index}
        onClick={() => handleNavigation(item.href)}
        style={{
          borderBottom: "1px rgba(255,255,255,0.3) solid",
          cursor: "pointer",
          paddingLeft: "25px",
          fontSize: "14px",
          backgroundColor: isCurrentPage(item.href)
            ? "rgba(255,255,255,0.2)"
            : "transparent",
          fontWeight: isCurrentPage(item.href) ? "bold" : "normal",
          transition: "background-color 0.2s ease",
        }}
        className="nav-link text-white py-2"
        onMouseEnter={(e) => {
          if (!isCurrentPage(item.href)) {
            e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isCurrentPage(item.href)) {
            e.target.style.backgroundColor = "transparent";
          }
        }}
      >
        {isCurrentPage(item.href) && "► "}
        {item.label}
      </div>
    ));

  const renderCollapsibleSection = (sectionKey, title) => {
    // Check if any item in this section is currently active
    let items = [];
    if (sectionKey === "mixiue") items = menuItems_mixe;
    if (sectionKey === "abeYus") items = menuItems_abe;
    if (sectionKey === "amazon") items = menuItems_amz;

    const hasActivePage = items.some((item) => isCurrentPage(item.href));

    return (
      <div key={sectionKey} className="mb-2">
        <button
          onClick={() => toggleSection(sectionKey)}
          style={{
            width: "100%",
            backgroundColor: hasActivePage
              ? "rgba(255,255,255,0.15)"
              : "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "4px",
            padding: "10px 15px",
            color: "white",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "16px",
            fontWeight: hasActivePage ? "bold" : "bold",
          }}
          className="text-start"
        >
          <span>
            {hasActivePage && "● "}
            {title}
          </span>
          <span
            style={{
              transform:
                activeSection === sectionKey ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          >
            ▶
          </span>
        </button>

        <div
          style={{
            maxHeight: activeSection === sectionKey ? "400px" : "0px",
            overflow: "hidden",
            transition: "max-height 0.3s ease-in-out",
            backgroundColor: "rgba(0,0,0,0.1)",
            borderRadius: "0 0 4px 4px",
          }}
        >
          {sectionKey === "mixiue" && (
            <div className="nav flex-column" style={{ padding: "5px 0" }}>
              {renderMenuItems(menuItems_mixe)}
            </div>
          )}
          {sectionKey === "abeYus" && (
            <div className="nav flex-column" style={{ padding: "5px 0" }}>
              {renderMenuItems(menuItems_abe)}
            </div>
          )}
          {sectionKey === "amazon" && (
            <div className="nav flex-column" style={{ padding: "5px 0" }}>
              {renderMenuItems(menuItems_amz)}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}
      style={{
        width: sidebarOpen ? "250px" : "0",
        transition: "width 0.3s ease-in-out",
        overflowX: "hidden",
        overflowY: "auto",
        height: "100%",
        position: "fixed",
        backgroundColor: "#e80000",
        zIndex: 1000,
      }}
    >
      <div className="p-3">
        {/* Current Page Indicator */}
        {location.pathname !== "/" && (
          <div
            style={{
              marginBottom: "15px",
              padding: "8px 12px",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "4px",
              fontSize: "12px",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            Current: {location.pathname.split("/").pop() || "Home"}
          </div>
        )}

        {/* Collapsible Sections */}
        <div className="mb-4">
          {renderCollapsibleSection("mixiue", "Mixiue")}
          {renderCollapsibleSection("abeYus", "Abe Yus")}
          {renderCollapsibleSection("amazon", "Amazon")}
        </div>

        {/* Common Items - Always Visible */}

        <div
          onClick={() => handleNavigation("/ExpensesSDS")}
          style={{
            borderBottom: "1px white solid",
            cursor: "pointer",
            backgroundColor: isCurrentPage("/ExpensesSDS")
              ? "rgba(255,255,255,0.2)"
              : "rgba(255,255,255,0.1)",
            borderRadius: "4px",
            margin: "2px 0",
            fontWeight: isCurrentPage("/ExpensesSDS") ? "bold" : "normal",
            transition: "background-color 0.2s ease",
          }}
          className="nav-link text-white py-2"
          onMouseEnter={(e) => {
            if (!isCurrentPage("/ExpensesSDS")) {
              e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
            }
          }}
          onMouseLeave={(e) => {
            if (!isCurrentPage("/ExpensesSDS")) {
              e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
            }
          }}
        >
          {isCurrentPage("/ExpensesSDS") && "► "} HQ Expenses
        </div>

        <div
          className="nav flex-column"
          style={{
            borderTop: "2px white solid",
            paddingTop: "15px",
            marginTop: "20px",
          }}
        >
          {isAdmin && (
            <div
              onClick={() => handleNavigation("/summary")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/summary")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/summary") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/summary")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/summary")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/summary") && "► "}📊 Summary
            </div>
          )}

          <div
            onClick={handleLogout}
            style={{
              borderBottom: "1px white solid",
              cursor: "pointer",
              backgroundColor: "rgba(255,255,255,0.1)",
              borderRadius: "4px",
              margin: "2px 0",
              transition: "background-color 0.2s ease",
            }}
            className="nav-link text-white py-2"
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
            }}
          >
            🚪 Logout
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
