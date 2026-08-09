import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearSession } from "./session";

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const [activeSection, setActiveSection] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogout = () => {
    clearSession();
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
      } else if (currentPath.includes("ojim")) {
        setActiveSection("ojim");
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
    { href: "/stock-left", label: "Stock Left" },
    { href: "/reorder", label: "Reorder Alerts" },
    { href: "/Expenses", label: "Expenditure" },
    { href: "/EmpTimeSheet", label: "Emp-TimeSheet" },
    { href: "/Audit", label: "Audit" },
  ];

  const menuItems_abe = [
    { href: "/landing-yus", label: "Home" },
    { href: "/TimesheetABE", label: "Time Sheet" },
    { href: "/dashboard-yus", label: "Daily Sheet" },
    { href: "/wastage-yus", label: "Daily Wastage" },
    { href: "/reconciliation-yus", label: "Bank Reconciliation" },
    { href: "/materials-yus", label: "Materials" },
    { href: "/stockin-yus", label: "Stock In" },
    { href: "/vg-sales-yus", label: "VG Sales" },
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

  const menuItems_amz_lyp = [
    { href: "/landing-amz-lyp", label: "Home" },
    { href: "/TimesheetAmazonLyp", label: "Time Sheet" },
    { href: "/dashboard-amz-lyp", label: "Daily Sheet" },
    { href: "/wastage-amz-lyp", label: "Daily Wastage" },
    { href: "/reconciliation-amz-lyp", label: "Bank Reconciliation" },
    { href: "/materials-amz-lyp", label: "Materials" },
    { href: "/stockin-amz-lyp", label: "Stock In" },
    { href: "/Expenses-amz-lyp", label: "Expenditure" },
  ];

  const menuItems_ojim = [
    { href: "/landing-ojim", label: "Home" },
    { href: "/TimesheetOjim", label: "Time Sheet" },
    { href: "/dashboard-ojim", label: "Daily Sheet" },
    { href: "/wastage-ojim", label: "Daily Wastage" },
    { href: "/reconciliation-ojim", label: "Bank Reconciliation" },
    { href: "/materials-ojim", label: "Materials" },
    { href: "/stockin-ojim", label: "Stock In" },
    { href: "/Expenses-ojim", label: "Expenditure" },
    { href: "https://ws.sogo.com.my/TenantSales.asp", label: "SOGO Link" },
  ];

  const menuItems_mixue_sogo = [
    { href: "/landing-mixue-sogo", label: "Home" },
    { href: "/TimesheetMixueSogo", label: "Time Sheet" },
    { href: "/dashboard-mixue-sogo", label: "Daily Sheet" },
    { href: "/wastage-mixue-sogo", label: "Daily Wastage" },
    { href: "/reconciliation-mixue-sogo", label: "Bank Reconciliation" },
    { href: "/materials-mixue-sogo", label: "Materials" },
    { href: "/stockin-mixue-sogo", label: "Stock In" },
    { href: "/stock-left-mixue-sogo", label: "Stock Left" },
    { href: "/reorder-mixue-sogo", label: "Reorder Alerts" },
    { href: "/Expenses-mixue-sogo", label: "Expenditure" },
    {
      href: "https://ws.sogo.com.my/Login.asp?Msg1=Invalid+user+name+or+pass+code%21",
      label: "SOGO Login",
    },
  ];

  // Function to check if current page matches the menu item
  const isCurrentPage = (href) => {
    return location.pathname === href;
  };

  const renderMenuItems = (items) =>
    items.map((item, index) => {
      const isExternalLink =
        item.href.startsWith("http://") || item.href.startsWith("https://");

      return (
        <div
          key={index}
          onClick={() => {
            if (isExternalLink) {
              window.open(item.href, "_blank", "noopener,noreferrer");
            } else {
              handleNavigation(item.href);
            }
          }}
          style={{
            borderBottom: "1px rgba(255,255,255,0.3) solid",
            cursor: "pointer",
            paddingLeft: "25px",
            fontSize: "14px",
            backgroundColor:
              !isExternalLink && isCurrentPage(item.href)
                ? "rgba(255,255,255,0.2)"
                : "transparent",
            fontWeight:
              !isExternalLink && isCurrentPage(item.href) ? "bold" : "normal",
            transition: "background-color 0.2s ease",
          }}
          className="nav-link text-white py-2"
          onMouseEnter={(e) => {
            if (isExternalLink || !isCurrentPage(item.href)) {
              e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
            }
          }}
          onMouseLeave={(e) => {
            if (isExternalLink || !isCurrentPage(item.href)) {
              e.target.style.backgroundColor = "transparent";
            }
          }}
        >
          {!isExternalLink && isCurrentPage(item.href) && "► "}
          {item.label}
        </div>
      );
    });

  const renderCollapsibleSection = (sectionKey, title) => {
    // Check if any item in this section is currently active menuItems_amz_lyp
    let items = [];
    if (sectionKey === "mixiue") items = menuItems_mixe;
    if (sectionKey === "abeYus") items = menuItems_abe;
    if (sectionKey === "amazon") items = menuItems_amz;
    if (sectionKey === "amazon-lyp") items = menuItems_amz_lyp;
    if (sectionKey === "ojim") items = menuItems_ojim;
    if (sectionKey === "mixue-sogo") items = menuItems_mixue_sogo;

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
            maxHeight: activeSection === sectionKey ? "800px" : "0px",
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
          {sectionKey === "amazon-lyp" && (
            <div className="nav flex-column" style={{ padding: "5px 0" }}>
              {renderMenuItems(menuItems_amz_lyp)}
            </div>
          )}
          {sectionKey === "ojim" && (
            <div className="nav flex-column" style={{ padding: "5px 0" }}>
              {renderMenuItems(menuItems_ojim)}
            </div>
          )}
          {sectionKey === "mixue-sogo" && (
            <div className="nav flex-column" style={{ padding: "5px 0" }}>
              {renderMenuItems(menuItems_mixue_sogo)}
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
          {renderCollapsibleSection("amazon-lyp", "Amazon LYP")}
          {renderCollapsibleSection("ojim", "Ojim")}
          {renderCollapsibleSection("mixue-sogo", "Mixue Sogo")}
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
              onClick={() => handleNavigation("/recalculate")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/recalculate")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/recalculate") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/recalculate")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/recalculate")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/recalculate") && "► "} Re-Calculate
            </div>
          )}

          {isAdmin && (
            <div
              onClick={() => handleNavigation("/all-tng")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/all-tng")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/all-tng") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/all-tng")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/all-tng")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/all-tng") && "► "} All-TNG
            </div>
          )}

          {isAdmin && (
            <div
              onClick={() => handleNavigation("/all-bank-card")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/all-bank-card")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/all-bank-card") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/all-bank-card")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/all-bank-card")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/all-bank-card") && "► "} All-Bank-Card
            </div>
          )}

          {isAdmin && (
            <div
              onClick={() => handleNavigation("/payable")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/payable")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/payable") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/payable")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/payable")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/payable") && "► "} Payable
            </div>
          )}

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

          {isAdmin && (
            <div
              onClick={() => handleNavigation("/expense-file")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/expense-file")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/expense-file") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/expense-file")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/expense-file")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/expense-file") && "► "} Expense File
            </div>
          )}

          {isAdmin && (
            <div
              onClick={() => handleNavigation("/chatapp")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/chatapp")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/chatapp") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/chatapp")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/chatapp")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/chatapp") && "► "} Predict Stock Ai
            </div>
          )}

          {isAdmin && (
            <div
              onClick={() => handleNavigation("/Salary")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/Salary")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/Salary") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/Salary")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/Salary")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/Salary") && "► "} Salary
            </div>
          )}

          {isAdmin && (
            <div
              onClick={() => handleNavigation("/User")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/User")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/User") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/User")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/User")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/User") && "► "} User Management
            </div>
          )}

          {isAdmin && (
            <div
              onClick={() => handleNavigation("/payroll")}
              style={{
                borderBottom: "1px white solid",
                cursor: "pointer",
                backgroundColor: isCurrentPage("/payroll")
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(255,255,255,0.1)",
                borderRadius: "4px",
                margin: "2px 0",
                fontWeight: isCurrentPage("/payroll") ? "bold" : "normal",
                transition: "background-color 0.2s ease",
              }}
              className="nav-link text-white py-2"
              onMouseEnter={(e) => {
                if (!isCurrentPage("/payroll")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.15)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrentPage("/payroll")) {
                  e.target.style.backgroundColor = "rgba(255,255,255,0.1)";
                }
              }}
            >
              {isCurrentPage("/payroll") && "► "} Payroll Management
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
