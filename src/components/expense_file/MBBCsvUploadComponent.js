import React, { useState, useRef } from "react";

const API_URL = "http://121.121.232.54:88/aero-foods/expense_file.php";

const MON = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

/**
 * Parse MBB (Maybank) CSV statement format.
 * Columns: Transaction Date | Desc 1 | Desc 2 | Beneficiary/Biller Name |
 *          MBB Receiving/Paying Account | Cash-in (RM) | Cash-out (RM)
 */
function parseMBBCsv(text) {
  // Split into lines, handling \r\n and \n
  const lines = text.split(/\r?\n/);

  // Find the header row (contains "Transaction Date")
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes("transaction date")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return { error: "Could not find header row with 'Transaction Date'." };

  // Parse a CSV line respecting quoted fields
  const parseCsvLine = (line) => {
    const fields = [];
    let cur = "";
    let inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuote = !inQuote;
      } else if (ch === "," && !inQuote) {
        fields.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  // Parse header to find column indices
  const headers = parseCsvLine(lines[headerIdx]).map((h) => h.toLowerCase().trim());

  const idxDate    = headers.findIndex((h) => h.includes("transaction date"));
  const idxDesc1   = headers.findIndex((h) => h.includes("description 1"));
  const idxDesc2   = headers.findIndex((h) => h.includes("description 2"));
  const idxBenef   = headers.findIndex((h) => h.includes("beneficiary") || h.includes("biller name"));
  const idxAcct    = headers.findIndex((h) => h.includes("mbb receiving") || h.includes("paying account"));
  const idxCashIn  = headers.findIndex((h) => h.includes("cash-in"));
  const idxCashOut = headers.findIndex((h) => h.includes("cash-out"));

  if (idxDate === -1 || idxCashIn === -1 || idxCashOut === -1) {
    return { error: "Missing required columns (Transaction Date, Cash-in, Cash-out)." };
  }

  // Remove "RM" prefix and commas, return null if empty
  const parseRM = (v) => {
    if (!v || v.trim() === "") return null;
    const n = parseFloat(v.replace(/[^0-9.-]/g, ""));
    return isNaN(n) || Math.abs(n) >= 1e12 ? null : n;
  };

  // Parse "31 Mar 2026" → "2026-03-31"
  const parseDateStr = (s) => {
    if (!s || s.trim() === "") return null;
    const clean = s.trim();
    // "31 Mar 2026" or "6-Feb-2026" or similar
    const m = clean.match(/^(\d{1,2})[\s\/\-]([A-Za-z]{3,9})[\s\/\-](\d{2,4})$/i);
    if (m) {
      const d  = parseInt(m[1], 10);
      const mo = MON[m[2].slice(0, 3).toLowerCase()];
      let   y  = parseInt(m[3], 10);
      if (y < 100) y += 2000;
      if (d && mo && y)
        return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
    // ISO fallback
    const iso = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    return null;
  };

  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCsvLine(lines[i]);

    const date = parseDateStr(cols[idxDate] ?? "");
    if (!date) continue;

    // Concatenate description parts, filtering blanks
    const descParts = [
      idxDesc1 >= 0 ? (cols[idxDesc1] ?? "").trim() : "",
      idxDesc2 >= 0 ? (cols[idxDesc2] ?? "").trim() : "",
      idxBenef >= 0 ? (cols[idxBenef] ?? "").trim() : "",
      idxAcct  >= 0 ? (cols[idxAcct]  ?? "").trim() : "",
    ].filter(Boolean);
    const description = descParts.join(" | ");

    const credit = parseRM(cols[idxCashIn]  ?? "");
    const debit  = parseRM(cols[idxCashOut] ?? "");

    rows.push({ transaction_date: date, description, credit, debit });
  }

  if (rows.length === 0) return { error: "No valid data rows found in the file." };
  return { rows };
}

export default function MBBCsvUploadComponent({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview,      setPreview]      = useState(null);   // { rows } or { error }
  const [uploading,    setUploading]    = useState(false);
  const [uploadMsg,    setUploadMsg]    = useState(null);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0] || null;
    setSelectedFile(file);
    setUploadMsg(null);
    setPreview(null);
    if (!file) return;

    try {
      const text   = await file.text();
      const result = parseMBBCsv(text);
      setPreview(result);
    } catch (err) {
      setPreview({ error: "Failed to read file: " + err.message });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !preview || preview.error) return;

    setUploading(true);
    setUploadMsg(null);

    try {
      // Deduplicate against existing rows for this file
      let rowsToUpload = preview.rows;
      try {
        const existingRes  = await fetch(`${API_URL}?file_name=${encodeURIComponent(selectedFile.name)}`);
        const existingJson = await existingRes.json();
        if (existingJson.status === "success" && existingJson.data.length > 0) {
          const norm    = (v) => (v === null || v === undefined || v === "" ? "null" : parseFloat(v).toFixed(2));
          const makeKey = (r) =>
            `${r.transaction_date}|${String(r.description ?? "").trim()}|${norm(r.debit)}|${norm(r.credit)}`;
          const existingKeys = new Set(existingJson.data.map(makeKey));
          rowsToUpload = preview.rows.filter((r) => !existingKeys.has(makeKey(r)));
          if (rowsToUpload.length === 0) {
            setUploadMsg({ type: "info", text: "No new records — all rows already exist in this file." });
            setUploading(false);
            return;
          }
        }
      } catch (_) { /* proceed with all rows on dedup failure */ }

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
        setPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setUploadMsg({ type: "error", text: json.message || "Upload failed." });
      }
    } catch (err) {
      setUploadMsg({ type: "error", text: "Error: " + err.message });
    } finally {
      setUploading(false);
    }
  };

  const fmt = (v) => {
    if (v === null || v === undefined || v === "") return "";
    return parseFloat(v).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-success text-white fw-semibold">
        <i className="bi bi-bank me-2"></i>
        Upload Bank CSV Statement
      </div>
      <div className="card-body">
        <div className="row g-3 align-items-end">
          <div className="col-md-6">
            <label className="form-label small fw-semibold">Select MBB CSV File</label>
            <input
              ref={fileInputRef}
              type="file"
              className="form-control"
              accept=".csv"
              onChange={handleFileChange}
            />
            <small className="text-muted">
              Format: Transaction Date | Description 1 | Description 2 | Beneficiary | Account | Cash-in | Cash-out
            </small>
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-success w-100"
              onClick={handleUpload}
              disabled={!selectedFile || uploading || !preview || !!preview.error}
            >
              {uploading ? (
                <><span className="spinner-border spinner-border-sm me-2" />Uploading…</>
              ) : (
                <><i className="bi bi-upload me-1"></i>Upload & Save</>
              )}
            </button>
          </div>
        </div>

        {/* Parse error */}
        {preview?.error && (
          <div className="alert alert-danger mt-3 mb-0">{preview.error}</div>
        )}

        {/* Upload result */}
        {uploadMsg && (
          <div
            className={`alert mt-3 mb-0 alert-${
              uploadMsg.type === "success" ? "success" : uploadMsg.type === "info" ? "info" : "danger"
            }`}
          >
            {uploadMsg.text}
          </div>
        )}

        {/* Preview table */}
        {preview?.rows && !uploadMsg && (
          <div className="mt-3">
            <div className="d-flex align-items-center mb-2 gap-2">
              <span className="badge bg-success fs-6">{preview.rows.length} rows parsed</span>
              <span className="text-muted small">Preview (first 5 rows)</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table table-sm table-bordered table-hover mb-0" style={{ fontSize: "0.78rem" }}>
                <thead className="table-light">
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th style={{ textAlign: "right" }}>Debit</th>
                    <th style={{ textAlign: "right" }}>Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.slice(0, 5).map((r, i) => (
                    <tr key={i}>
                      <td>{r.transaction_date}</td>
                      <td
                        style={{ maxWidth: 340, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        title={r.description}
                      >
                        {r.description}
                      </td>
                      <td style={{ textAlign: "right", color: r.debit  ? "#c0392b" : "inherit" }}>{fmt(r.debit)}</td>
                      <td style={{ textAlign: "right", color: r.credit ? "#27ae60" : "inherit" }}>{fmt(r.credit)}</td>
                    </tr>
                  ))}
                  {preview.rows.length > 5 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted fst-italic">
                        … and {preview.rows.length - 5} more rows
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
