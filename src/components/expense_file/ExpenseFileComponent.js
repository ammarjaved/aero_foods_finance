import React, { useState, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
import "bootstrap/dist/css/bootstrap.min.css";
import MBBCsvUploadComponent from "./MBBCsvUploadComponent";

const API_URL = "http://121.121.232.54:88/aero-foods/expense_file.php";

const COMPANIES = [
  { value: "Mixue",       label: "Mixue",       db: "aero_foods_finance" },
  { value: "Amazon",      label: "Amazon",      db: "amazon_cafe_finance" },
  { value: "Amazon LYP",  label: "Amazon LYP",  db: "amazon_cafe_finance_lyp" },
  { value: "Abe Yus",     label: "Abe Yus",     db: "abe_yus_finance" },
  { value: "Ojim",        label: "Ojim",        db: "ojim_finance" },
  { value: "SDS HQ",      label: "SDS HQ",      db: "sds_hq" },
];

const COMPANY_LABEL    = Object.fromEntries(COMPANIES.map((c) => [c.value, c.label]));
const COMPANY_DB       = Object.fromEntries(COMPANIES.map((c) => [c.value, c.db]));
const DB_TO_LABEL      = Object.fromEntries(COMPANIES.map((c) => [c.db,    c.label]));

const EXPENSE_TYPES = ["Rental", "Utilities", "Stock", "Logistik", "Claim", "Salary", "SDS HQ", "Others"];

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, "All"];

function ExpenseFileComponent() {
  // ── Upload state ──────────────────────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [uploadMsg, setUploadMsg]       = useState(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [fromDate,       setFromDate]       = useState("");
  const [toDate,         setToDate]         = useState("");
  const [filterDebit, setFilterDebit] = useState("");
  const [descFilter,     setDescFilter]     = useState("");
  const [filterCompany,  setFilterCompany]  = useState("");
  const [filterExpType,  setFilterExpType]  = useState("");

  // ── Table state ───────────────────────────────────────────────────────────
  const [allRows,         setAllRows]        = useState([]);
  const [loading,         setLoading]        = useState(false);
  const [editingId,       setEditingId]      = useState(null);
  const [editCompany,     setEditCompany]    = useState("");
  const [editVendor,      setEditVendor]     = useState("");
  const [editExpenseType, setEditExpenseType] = useState("");
  const [savingId,        setSavingId]       = useState(null);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedIds,  setSelectedIds]  = useState(new Set());
  const [deletingRows, setDeletingRows] = useState(false);

  // ── Bulk update state ─────────────────────────────────────────────────────
  const [bulkCompany,     setBulkCompany]     = useState("");
  const [bulkVendor,      setBulkVendor]      = useState("");
  const [bulkExpenseType, setBulkExpenseType] = useState("");
  const [bulkSaving,      setBulkSaving]      = useState(false);

  // ── File filter state ─────────────────────────────────────────────────────
  const [fileList,         setFileList]         = useState([]);
  const [activeFileName,   setActiveFileName]   = useState(null);
  const [fileSearch,       setFileSearch]       = useState("");
  const [fileDropdownOpen, setFileDropdownOpen] = useState(false);
  const fileDropdownRef = useRef(null);

  // ── Pagination state ──────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize,    setPageSize]    = useState(50);

  // ── Derived: client-side filtered rows ───────────────────────────────────
  const filteredRows = allRows.filter((r) => {
    if (filterDebit === "has"   &&  !r.debit) return false;
    if (filterDebit === "empty" && !!r.debit) return false;
    if (descFilter && !r.description?.toLowerCase().includes(descFilter.toLowerCase())) return false;
    if (filterCompany === "__unassigned__" && r.company) return false;
    else if (filterCompany && filterCompany !== "__unassigned__" && (r.company || "") !== filterCompany) return false;
    if (filterExpType && (r.expense_type_name || "") !== filterExpType) return false;
    return true;
  });

  // ── Derived: paginated slice ──────────────────────────────────────────────
  const totalPages  = pageSize === Infinity ? 1 : Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage    = Math.min(currentPage, totalPages);
  const pageStart   = pageSize === Infinity ? 0 : (safePage - 1) * pageSize;
  const pageEnd     = pageSize === Infinity ? filteredRows.length : pageStart + pageSize;
  const visibleRows = filteredRows.slice(pageStart, pageEnd);

  // ── Checkbox helpers ──────────────────────────────────────────────────────
  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id));
  const someVisibleSelected = visibleRows.some((r) => selectedIds.has(r.id));

  const toggleAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleRows.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => setSelectedIds(new Set(filteredRows.map((r) => r.id)));
  const clearSelection    = () => setSelectedIds(new Set());

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (from, to, fileName = null) => {
    setLoading(true);
    setEditingId(null);
    setEditCompany("");
    setSelectedIds(new Set());
    try {
      const params = new URLSearchParams();
      if (from)     params.append("from_date",  from);
      if (to)       params.append("to_date",    to);
      if (fileName) params.append("file_name",  fileName);

      const res  = await fetch(`${API_URL}?${params}`);
      const json = await res.json();
      if (json.status === "success") {
        setAllRows(json.data);
        setCurrentPage(1);
      } else {
        console.error("Fetch error:", json);
      }
    } catch (err) {
      console.error("Fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFileList = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}?action=files`);
      const json = await res.json();
      if (json.status === "success" && json.files.length > 0) {
        setFileList(json.files);
        const latest = json.files[0].file_name;
        setActiveFileName(latest);
        fetchData("", "", latest);
      } else {
        fetchData("", "");
      }
    } catch (err) {
      console.error("Failed to fetch file list:", err);
      fetchData("", "");
    }
  }, [fetchData]);

  useEffect(() => { fetchFileList(); }, [fetchFileList]);

  // Close file dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (fileDropdownRef.current && !fileDropdownRef.current.contains(e.target)) {
        setFileDropdownOpen(false);
        setFileSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [filterDebit, descFilter, filterCompany, filterExpType]);

  const handleApplyFilter = () => fetchData(fromDate, toDate, activeFileName);
  const handleClearFilter = () => {
    setFromDate("");
    setToDate("");
    fetchData("", "", activeFileName);
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null);
    setUploadMsg(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadMsg(null);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const wb     = XLSX.read(buffer, { type: "array" });
      const ws     = wb.Sheets[wb.SheetNames[0]];
      const raw    = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

      let headerIdx = 0;
      for (let i = 0; i < Math.min(5, raw.length); i++) {
        const line = raw[i].map((c) => String(c ?? "").toLowerCase());
        if (line.some((c) => c.includes("transaction") || c === "date")) {
          headerIdx = i;
          break;
        }
      }

      const headers = raw[headerIdx].map((h) => String(h ?? "").toLowerCase().trim());
      const colIdx = {
        date:        headers.findIndex((h) => h.includes("transaction") || h === "date" || h.includes("value date") || h.includes("txn date")),
        description: headers.findIndex((h) => h.includes("description") || h.includes("desc") || h.includes("particular") || h.includes("details") || h.includes("narration")),
        debit:       headers.findIndex((h) => h.includes("debit") || h.includes("withdrawal") || h.includes("withdraw")),
        credit:      headers.findIndex((h) => h.includes("credit") || h.includes("deposit")),
      };

      // Strip currency symbols & commas — handles "RM20,000.00" → 20000
      // Cap at 999,999,999,999.99 to prevent DB numeric overflow from bad rows
      const parseNum = (v) => {
        if (v === null || v === undefined || v === "") return null;
        const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
        if (isNaN(n) || Math.abs(n) >= 1e12) return null;
        return n;
      };

      const MON = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };

      const formatDate = (v) => {
        if (v === null || v === undefined || v === "") return null;

        // ── Numeric Excel serial ───────────────────────────────────────────
        // Bank statements store datetimes in UTC. "6-Feb-26 midnight Malaysia"
        // is saved internally as "5-Feb-26 16:00 UTC" (UTC+8 = +8/24 of a day).
        // Adding 8/24 before flooring converts that UTC serial to the correct
        // Malaysia calendar date, regardless of browser timezone.
        if (typeof v === "number") {
          const serial = Math.floor(v + 8 / 24); // shift to MYT (UTC+8)
          const d = new Date((serial - 25569) * 86400 * 1000);
          const yyyy = d.getUTCFullYear();
          const mm   = String(d.getUTCMonth() + 1).padStart(2, "0");
          const dd   = String(d.getUTCDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }

        // ── Date object (some xlsx versions return these) ─────────────────
        if (v instanceof Date) {
          if (isNaN(v)) return null;
          const yyyy = v.getFullYear();
          const mm   = String(v.getMonth() + 1).padStart(2, "0");
          const dd   = String(v.getDate()).padStart(2, "0");
          return `${yyyy}-${mm}-${dd}`;
        }

        // ── String fallback ───────────────────────────────────────────────
        const s = String(v).trim();

        // "6-Feb-26" / "06-Feb-2026" / "6/Feb/26"
        const m1 = s.match(/^(\d{1,2})[\/\-\s]([A-Za-z]{3,9})[\/\-\s](\d{2,4})$/i);
        if (m1) {
          const d = parseInt(m1[1], 10);
          const mo = MON[m1[2].slice(0, 3).toLowerCase()];
          let y = parseInt(m1[3], 10);
          if (y < 100) y += 2000;
          if (d && mo && y)
            return `${y}-${String(mo).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        }

        // "06/02/2026" DD/MM/YYYY
        const m2 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
        if (m2)
          return `${m2[3]}-${m2[2].padStart(2,"0")}-${m2[1].padStart(2,"0")}`;

        // "2026-02-06" ISO
        const m3 = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m3) return `${m3[1]}-${m3[2]}-${m3[3]}`;

        return null;
      };

      const parsedRows = [];
      for (let i = headerIdx + 1; i < raw.length; i++) {
        const r    = raw[i];
        const date = formatDate(colIdx.date >= 0 ? r[colIdx.date] : null);
        if (!date) continue;
        parsedRows.push({
          transaction_date: date,
          description:      colIdx.description >= 0 ? String(r[colIdx.description] ?? "") : "",
          debit:            colIdx.debit   >= 0 ? parseNum(r[colIdx.debit])   : null,
          credit:           colIdx.credit  >= 0 ? parseNum(r[colIdx.credit])  : null,
        });
      }

      if (parsedRows.length === 0) {
        setUploadMsg({ type: "error", text: "No valid data rows found in the file." });
        setUploading(false);
        return;
      }

      // Always fetch existing rows for this file and deduplicate before uploading
      let rowsToUpload = parsedRows;
      try {
        const existingRes  = await fetch(`${API_URL}?file_name=${encodeURIComponent(selectedFile.name)}`);
        const existingJson = await existingRes.json();

        if (existingJson.status === "success" && existingJson.data.length > 0) {
          const norm = (v) =>
            v === null || v === undefined || v === "" ? "null" : parseFloat(v).toFixed(2);
          const makeKey = (r) =>
            `${r.transaction_date}|${String(r.description ?? "").trim()}|${norm(r.debit)}|${norm(r.credit)}`;

          const existingKeys = new Set(existingJson.data.map(makeKey));
          rowsToUpload = parsedRows.filter((r) => !existingKeys.has(makeKey(r)));

          if (rowsToUpload.length === 0) {
            setUploadMsg({ type: "info", text: "No new records found — all rows already exist in this file." });
            setUploading(false);
            return;
          }
        }
      } catch (_) {
        // If dedup fetch fails, proceed with all parsed rows
      }

      const res  = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "upload", file_name: selectedFile.name, rows: rowsToUpload }),
      });
      const json = await res.json();

      if (json.status === "success") {
        setUploadMsg({
          type: "success",
          text: `${rowsToUpload.length} record(s) saved to "${selectedFile.name}".`,
        });
        setSelectedFile(null);
        document.getElementById("fileInput").value = "";
        fetchFileList();
      } else {
        setUploadMsg({ type: "error", text: json.message || "Upload failed" });
      }
    } catch (err) {
      setUploadMsg({ type: "error", text: "Error: " + err.message });
    } finally {
      setUploading(false);
    }
  };

  // ── Edit / Save (single row) ──────────────────────────────────────────────
  const startEdit = (row) => {
    setEditingId(row.id);
    setEditCompany(row.company || "");
    setEditVendor(row.vendor || "");
    setEditExpenseType(row.expense_type_name || "Others");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditCompany("");
    setEditVendor("");
    setEditExpenseType("");
  };

  const saveRow = async (row) => {
    if (!editCompany && editExpenseType !== "SDS HQ") { alert("Please select a company."); return; }
    setSavingId(row.id);
    try {
      const res  = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:            "update_company",
          id:                row.id,
          company:           editCompany,
          db:                COMPANY_DB[editCompany] || "",
          vendor:            editVendor,
          expense_type_name: editExpenseType || "Others",
          username:          localStorage.getItem("user") || "system",
        }),
      });
      const json = await res.json();

      if (json.status === "success" || json.status === "partial") {
        alert(json.message);
        setEditingId(null);
        setEditCompany("");
        setEditVendor("");
        setEditExpenseType("");
        setAllRows((prev) =>
          prev.map((r) =>
            r.id === row.id
              ? { ...r, company: editCompany, vendor: editVendor, expense_type_name: editExpenseType || "Others" }
              : r
          )
        );
      } else {
        alert("Error: " + (json.message || "Unknown error"));
      }
    } catch (err) {
      alert("Network error: " + err.message);
    } finally {
      setSavingId(null);
    }
  };

  // ── Delete selected rows ──────────────────────────────────────────────────
  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected row(s)? This cannot be undone.`)) return;

    setDeletingRows(true);
    try {
      const res  = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "delete_rows", ids: [...selectedIds] }),
      });
      const json = await res.json();
      if (json.status === "success") {
        alert(json.message);
        setAllRows((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        setSelectedIds(new Set());
      } else {
        alert("Error: " + (json.message || "Unknown error"));
      }
    } catch (err) {
      alert("Network error: " + err.message);
    } finally {
      setDeletingRows(false);
    }
  };

  // ── Bulk update selected rows ─────────────────────────────────────────────
  const bulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    if (!bulkCompany && bulkExpenseType !== "SDS HQ") { alert("Please select a company for bulk update."); return; }
    if (!window.confirm(`Update ${selectedIds.size} row(s) with the selected values?`)) return;

    setBulkSaving(true);
    try {
      const res  = await fetch(API_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          action:            "bulk_update",
          ids:               [...selectedIds],
          company:           bulkCompany,
          db:                COMPANY_DB[bulkCompany] || "",
          vendor:            bulkVendor,
          expense_type_name: bulkExpenseType || "Others",
          username:          localStorage.getItem("user") || "system",
        }),
      });
      const json = await res.json();
      if (json.status === "success" || json.status === "partial") {
        alert(json.message);
        setAllRows((prev) =>
          prev.map((r) =>
            selectedIds.has(r.id)
              ? { ...r, company: bulkCompany, vendor: bulkVendor, expense_type_name: bulkExpenseType || "Others" }
              : r
          )
        );
        setSelectedIds(new Set());
        setBulkCompany("");
        setBulkVendor("");
        setBulkExpenseType("");
      } else {
        alert("Error: " + (json.message || "Unknown error"));
      }
    } catch (err) {
      alert("Network error: " + err.message);
    } finally {
      setBulkSaving(false);
    }
  };

  // ── Pagination helpers ────────────────────────────────────────────────────
  const goToPage = (p) => {
    setCurrentPage(Math.max(1, Math.min(p, totalPages)));
    setEditingId(null);
    setEditCompany("");
  };

  const pageNumbers = () => {
    const delta = 2;
    const pages = [];
    for (
      let i = Math.max(1, safePage - delta);
      i <= Math.min(totalPages, safePage + delta);
      i++
    ) pages.push(i);
    return pages;
  };

  // ── Number formatter ──────────────────────────────────────────────────────
  const fmt = (v) => {
    if (v === null || v === undefined || v === "") return "";
    return parseFloat(v).toLocaleString("en-MY", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totalDebit  = filteredRows.reduce((s, r) => s + (parseFloat(r.debit)  || 0), 0);
  const totalCredit = filteredRows.reduce((s, r) => s + (parseFloat(r.credit) || 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="container-fluid p-4">
      <h4 className="mb-4 fw-bold">
        <i className="bi bi-file-earmark-spreadsheet me-2 text-primary"></i>
        Expense File Import
      </h4>

      {/* ── Upload ──────────────────────────────────────────────────────── */}
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white fw-semibold">
          Upload Bank Statement (.xlsx / .xls)
        </div>
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-6">
              <label className="form-label small fw-semibold">Select File</label>
              <input
                id="fileInput"
                type="file"
                className="form-control"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileChange}
              />
              <small className="text-muted">
                Expected columns: Transaction Date, Description, Debit, Credit, Balance
              </small>
            </div>
            <div className="col-md-3">
              <button
                className="btn btn-success w-100"
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
              >
                {uploading ? (
                  <><span className="spinner-border spinner-border-sm me-2" />Uploading…</>
                ) : (
                  <><i className="bi bi-upload me-1"></i> Upload & Save</>
                )}
              </button>
            </div>
          </div>
          {uploadMsg && (
            <div className={`alert mt-3 mb-0 alert-${uploadMsg.type === "success" ? "success" : uploadMsg.type === "info" ? "info" : "danger"}`}>
              {uploadMsg.text}
            </div>
          )}
        </div>
      </div>

      {/* ── MBB CSV Upload ──────────────────────────────────────────────── */}
      <MBBCsvUploadComponent onUploadSuccess={fetchFileList} />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <div className="card shadow-sm mb-4">
        <div className="card-body py-3">
          {/* Row 1: File selector + Date filters + pagination */}
          <div className="row g-2 align-items-end mb-2">

            {/* ── Searchable file dropdown ── */}
            <div className="col-auto" ref={fileDropdownRef} style={{ position: "relative" }}>
              <label className="form-label small fw-semibold mb-1">File</label>
              <div
                className="form-control form-control-sm d-flex align-items-center justify-content-between"
                style={{ cursor: "pointer", minWidth: 240 }}
                onClick={() => setFileDropdownOpen((o) => !o)}
              >
                <span className="text-truncate small" style={{ maxWidth: 200 }}>
                  {activeFileName || "All files"}
                </span>
                <i className={`bi bi-chevron-${fileDropdownOpen ? "up" : "down"} ms-1`}></i>
              </div>
              {fileDropdownOpen && (
                <div
                  className="border rounded bg-white shadow"
                  style={{ position: "absolute", top: "100%", left: 0, zIndex: 1050, minWidth: 300 }}
                >
                  <div className="p-2 border-bottom">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Search file name…"
                      value={fileSearch}
                      onChange={(e) => setFileSearch(e.target.value)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div style={{ maxHeight: 240, overflowY: "auto" }}>
                    {fileList
                      .filter((f) => f.file_name.toLowerCase().includes(fileSearch.toLowerCase()))
                      .map((f) => (
                        <div
                          key={f.file_name}
                          className={`px-3 py-2 small ${activeFileName === f.file_name ? "bg-primary text-white" : ""}`}
                          style={{ cursor: "pointer" }}
                          onMouseEnter={(e) => { if (activeFileName !== f.file_name) e.currentTarget.classList.add("bg-light"); }}
                          onMouseLeave={(e) => { if (activeFileName !== f.file_name) e.currentTarget.classList.remove("bg-light"); }}
                          onClick={() => {
                            setActiveFileName(f.file_name);
                            fetchData(fromDate, toDate, f.file_name);
                            setFileDropdownOpen(false);
                            setFileSearch("");
                          }}
                        >
                          <div className="fw-semibold text-truncate">{f.file_name}</div>
                          <div className={`${activeFileName === f.file_name ? "text-white-50" : "text-muted"}`} style={{ fontSize: "0.7rem" }}>
                            {f.row_count} rows
                          </div>
                        </div>
                      ))}
                    {fileList.filter((f) => f.file_name.toLowerCase().includes(fileSearch.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-muted small">No files found</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="col-auto">
              <label className="form-label small fw-semibold mb-1">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <label className="form-label small fw-semibold mb-1">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <button
                className="btn btn-primary btn-sm"
                onClick={handleApplyFilter}
                disabled={loading}
              >
                {loading
                  ? <span className="spinner-border spinner-border-sm" />
                  : <><i className="bi bi-search me-1"></i>Apply</>
                }
              </button>
            </div>
            {(fromDate || toDate) && (
              <div className="col-auto">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleClearFilter}
                  disabled={loading}
                >
                  <i className="bi bi-x me-1"></i>Clear
                </button>
              </div>
            )}
            <div className="col-auto ms-auto d-flex align-items-center gap-2">
              <span className="text-muted small">Rows per page:</span>
              <select
                className="form-select form-select-sm"
                style={{ width: 75 }}
                value={pageSize === Infinity ? "All" : pageSize}
                onChange={(e) => { setPageSize(e.target.value === "All" ? Infinity : Number(e.target.value)); setCurrentPage(1); }}
              >
                {PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <span className="badge bg-secondary fs-6">
                {filteredRows.length}{filteredRows.length !== allRows.length ? ` / ${allRows.length}` : ""} rows
              </span>
            </div>
          </div>

          {/* Row 2: Description search + Debit filter + Company filter */}
          <div className="row g-2 align-items-center">
            <div className="col-md-4">
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search description…"
                value={descFilter}
                onChange={(e) => setDescFilter(e.target.value)}
              />
            </div>
            <div className="col-auto">
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 170 }}
                value={filterDebit}
                onChange={(e) => setFilterDebit(e.target.value)}
              >
                <option value="">All rows</option>
                <option value="has">Debit not empty</option>
                <option value="empty">Debit empty</option>
              </select>
            </div>
            <div className="col-auto">
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 150 }}
                value={filterCompany}
                onChange={(e) => { setFilterCompany(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All companies</option>
                {COMPANIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
                <option value="__unassigned__">— Unassigned —</option>
              </select>
            </div>
            <div className="col-auto">
              <select
                className="form-select form-select-sm"
                style={{ minWidth: 150 }}
                value={filterExpType}
                onChange={(e) => setFilterExpType(e.target.value)}
              >
                <option value="">All expense types</option>
                {EXPENSE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            {(descFilter || filterDebit || filterCompany || filterExpType) && (
              <div className="col-auto">
                <button
                  className="btn btn-outline-secondary btn-sm"
                  onClick={() => { setDescFilter(""); setFilterDebit(""); setFilterCompany(""); setFilterExpType(""); }}
                >
                  <i className="bi bi-x me-1"></i>Clear filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bulk Action Bar (shown when rows selected) ────────────────── */}
      {selectedIds.size > 0 && (
        <div className="card shadow-sm mb-3 border-warning">
          <div className="card-body py-2">
            <div className="row g-2 align-items-center">
              <div className="col-auto">
                <span className="badge bg-warning text-dark fs-6">
                  {selectedIds.size} selected
                </span>
                {selectedIds.size < filteredRows.length && (
                  <button
                    className="btn btn-link btn-sm py-0 ms-2"
                    onClick={selectAllFiltered}
                  >
                    Select all {filteredRows.length}
                  </button>
                )}
                <button
                  className="btn btn-link btn-sm py-0 ms-1 text-secondary"
                  onClick={clearSelection}
                >
                  Clear
                </button>
              </div>

              <div className="col-auto">
                <select
                  className="form-select form-select-sm"
                  style={{ minWidth: 140 }}
                  value={bulkCompany}
                  onChange={(e) => setBulkCompany(e.target.value)}
                >
                  <option value="">-- Company --</option>
                  {COMPANIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="col-auto">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Vendor (optional)"
                  style={{ minWidth: 140 }}
                  value={bulkVendor}
                  onChange={(e) => setBulkVendor(e.target.value)}
                />
              </div>

              <div className="col-auto">
                <select
                  className="form-select form-select-sm"
                  style={{ minWidth: 140 }}
                  value={bulkExpenseType}
                  onChange={(e) => setBulkExpenseType(e.target.value)}
                >
                  <option value="">-- Expense Type --</option>
                  {EXPENSE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="col-auto">
                <button
                  className="btn btn-primary btn-sm me-2"
                  onClick={bulkUpdate}
                  disabled={bulkSaving || (!bulkCompany && bulkExpenseType !== "SDS HQ")}
                >
                  {bulkSaving
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="bi bi-check-all me-1"></i>Update Selected</>
                  }
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={deleteSelected}
                  disabled={deletingRows}
                >
                  {deletingRows
                    ? <span className="spinner-border spinner-border-sm" />
                    : <><i className="bi bi-trash me-1"></i>Delete Selected</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div style={{ overflowX: "auto" }}>
            <table className="table table-sm table-hover table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th style={{ width: 36, textAlign: "center" }}>
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={allVisibleSelected}
                      ref={(el) => { if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected; }}
                      onChange={toggleAll}
                      title="Select / deselect all on this page"
                    />
                  </th>
                  <th style={{ width: 40 }}>#</th>
                  <th style={{ width: 115 }}>Date</th>
                  <th>Description</th>
                  <th style={{ width: 110, textAlign: "right" }}>Debit</th>
                  <th style={{ width: 110, textAlign: "right" }}>Credit</th>
                  <th style={{ width: 150 }}>Vendor</th>
                  <th style={{ width: 160 }}>Company</th>
                  <th style={{ width: 130 }}>Expense Type</th>
                  <th style={{ width: 90, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="text-center py-4">
                      <span className="spinner-border text-primary" />
                    </td>
                  </tr>
                ) : filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-4 text-muted">
                      No records found.
                    </td>
                  </tr>
                ) : (
                  visibleRows.map((row, idx) => {
                    const isEditing  = editingId === row.id;
                    const isSelected = selectedIds.has(row.id);
                    return (
                      <tr
                        key={row.id}
                        className={isEditing ? "table-warning" : isSelected ? "table-info" : ""}
                      >
                        {/* Checkbox */}
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={isSelected}
                            onChange={() => toggleRow(row.id)}
                          />
                        </td>

                        <td className="text-muted small">{pageStart + idx + 1}</td>
                        <td className="small">{row.transaction_date}</td>
                        <td
                          className="small"
                          style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={row.description}
                        >
                          {row.description}
                        </td>
                        <td className="small fw-semibold" style={{ textAlign: "right", color: row.debit ? "#c0392b" : "inherit" }}>
                          {fmt(row.debit)}
                        </td>
                        <td className="small fw-semibold" style={{ textAlign: "right", color: row.credit ? "#27ae60" : "inherit" }}>
                          {fmt(row.credit)}
                        </td>

                        {/* Vendor */}
                        <td>
                          {isEditing ? (
                            <input
                              type="text"
                              className="form-control form-control-sm"
                              value={editVendor}
                              onChange={(e) => setEditVendor(e.target.value)}
                              placeholder="Vendor"
                            />
                          ) : (
                            <span className="small">{row.vendor || ""}</span>
                          )}
                        </td>

                        {/* Company */}
                        <td>
                          {isEditing ? (
                            <select
                              className="form-select form-select-sm"
                              value={editCompany}
                              onChange={(e) => setEditCompany(e.target.value)}
                              autoFocus
                            >
                              <option value="">-- Select Company --</option>
                              {COMPANIES.map((c) => (
                                <option key={c.value} value={c.value}>{c.label}</option>
                              ))}
                            </select>
                          ) : (
                            <span
                              className={`badge ${row.company ? "bg-info text-dark" : "bg-light text-muted border"}`}
                              style={{ fontSize: "0.72rem" }}
                            >
                              {COMPANY_LABEL[row.company] || DB_TO_LABEL[row.company] || row.company || "—"}
                            </span>
                          )}
                        </td>

                        {/* Expense Type */}
                        <td>
                          {isEditing ? (
                            <select
                              className="form-select form-select-sm"
                              value={editExpenseType}
                              onChange={(e) => setEditExpenseType(e.target.value)}
                            >
                              <option value="">Select Expense Type</option>
                              {EXPENSE_TYPES.map((t) => (
                                <option key={t} value={t}>{t}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="small text-muted">{row.expense_type_name || ""}</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-success btn-sm me-1 py-0 px-2"
                                onClick={() => saveRow(row)}
                                disabled={savingId === row.id}
                                title="Save"
                              >
                                {savingId === row.id
                                  ? <span className="spinner-border spinner-border-sm" />
                                  : <i className="bi bi-check-lg"></i>
                                }
                              </button>
                              <button
                                className="btn btn-secondary btn-sm py-0 px-2"
                                onClick={cancelEdit}
                                title="Cancel"
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </>
                          ) : (
                            <button
                              className="btn btn-outline-primary btn-sm py-0 px-2"
                              onClick={() => startEdit(row)}
                              title="Edit"
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {filteredRows.length > 0 && (
                <tfoot className="table-secondary fw-bold">
                  <tr>
                    <td colSpan={4} className="text-end small">
                      Totals ({filteredRows.length} rows{filteredRows.length !== allRows.length ? ` of ${allRows.length}` : ""})
                    </td>
                    <td className="small" style={{ textAlign: "right", color: "#c0392b" }}>{fmt(totalDebit)}</td>
                    <td className="small" style={{ textAlign: "right", color: "#27ae60" }}>{fmt(totalCredit)}</td>
                    <td colSpan={4}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* ── Pagination bar ───────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="card-footer d-flex align-items-center justify-content-between flex-wrap gap-2 py-2">
            <span className="text-muted small">
              Showing {pageStart + 1}–{Math.min(pageEnd, filteredRows.length)} of {filteredRows.length}
            </span>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${safePage === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goToPage(1)}>«</button>
                </li>
                <li className={`page-item ${safePage === 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goToPage(safePage - 1)}>‹</button>
                </li>
                {pageNumbers().map((p) => (
                  <li key={p} className={`page-item ${p === safePage ? "active" : ""}`}>
                    <button className="page-link" onClick={() => goToPage(p)}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${safePage === totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goToPage(safePage + 1)}>›</button>
                </li>
                <li className={`page-item ${safePage === totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => goToPage(totalPages)}>»</button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExpenseFileComponent;
