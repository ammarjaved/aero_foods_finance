import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { clearSession } from "./session";
import { canViewAdmin, isViewOnly } from "./roles";

function Sidebar({ sidebarOpen, setSidebarOpen }) {
  const [activeSection, setActiveSection] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  // Administrators and view-only managers get the same menu; only the ability
  // to change anything differs.
  const [isAdmin, setIsAdmin] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  // Admin tools group. Deliberately not persisted - it always starts collapsed.
  const [adminOpen, setAdminOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
    } else {
      setIsAdmin(canViewAdmin());
      setViewOnly(isViewOnly());
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
    { href: "/vg-sales-yus", label: "Sales" },
    { href: "/vg-items-yus", label: "Menu Items" },
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

  // The admin-only items that used to sit flat under HQ Expenses.
  const adminMenuItems = [
    { href: "/recalculate", label: "Re-Calculate" },
    { href: "/all-tng", label: "All-TNG" },
    { href: "/all-bank-card", label: "All-Bank-Card" },
    { href: "/payable", label: "Payable" },
    { href: "/summary", label: "📊 Summary" },
    { href: "/expense-file", label: "Expense File" },
    { href: "/chatapp", label: "Predict Stock Ai" },
    { href: "/Salary", label: "Salary" },
    { href: "/User", label: "User Management" },
    { href: "/payroll", label: "Payroll Management" },
  ];

  // Function to check if current page matches the menu item
  const isCurrentPage = (href) => {
    return location.pathname === href;
  };

  const adminHasActivePage = adminMenuItems.some((item) =>
    isCurrentPage(item.href)
  );

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
        {/* View-only accounts see the full admin menu, so say so up front */}
        {viewOnly && (
          <div
            style={{
              marginBottom: "10px",
              padding: "8px 12px",
              backgroundColor: "rgba(0,0,0,0.25)",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: "bold",
              color: "#fff",
              textAlign: "center",
            }}
          >
            👁 VIEW ONLY
          </div>
        )}

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

        {/* Admin tools - collapsed by default, Logout stays outside */}
        <div
          className="nav flex-column"
          style={{
            borderTop: "2px white solid",
            paddingTop: "15px",
            marginTop: "20px",
          }}
        >
          {isAdmin && (
            <div className="mb-2">
              <button
                onClick={() => setAdminOpen(!adminOpen)}
                style={{
                  width: "100%",
                  backgroundColor: adminHasActivePage
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
                  fontWeight: "bold",
                }}
                className="text-start"
              >
                <span>
                  {adminHasActivePage && "● "}
                  Admin Tools
                </span>
                <span
                  style={{
                    transform: adminOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease",
                  }}
                >
                  ▶
                </span>
              </button>

              <div
                style={{
                  maxHeight: adminOpen ? "1000px" : "0",
                  overflow: "hidden",
                  transition: "max-height 0.3s ease-in-out",
                  backgroundColor: "rgba(0,0,0,0.1)",
                  borderRadius: "0 0 4px 4px",
                }}
              >
                <div className="nav flex-column" style={{ padding: "5px 0" }}>
                  {renderMenuItems(adminMenuItems)}
                </div>
              </div>
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
