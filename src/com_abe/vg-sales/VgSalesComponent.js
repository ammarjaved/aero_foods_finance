import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";

const API_BASE_URL = "http://121.121.232.54:88/abe-yus";

// The workbook these uploads come from carries several sheets; only this one
// holds the sales-order lines.
const SHEET_NAME = "Master VG";

// Sheet header -> payload key. Keys are the sheet's own header text normalised
// to lowercase alphanumerics, so "Gross Value (RM)" and "Net Value Incl Tax
// (MYR)" match without depending on spacing or punctuation.
const HEADER_MAP = {
  salesdate: "salesDate",
  storecode: "storeCode",
  storename: "storeName",
  partnercode: "partnerCode",
  partnername: "partnerName",
  itemfamilycode: "itemFamilyCode",
  divisioncode: "divisionCode",
  itemcode: "itemCode",
  itemname: "itemName",
  unitprice: "unitPrice",
  qtysold: "qtySold",
  grossvaluerm: "grossValue",
  discvaluerm: "discValue",
  netvalueincltaxmyr: "netValue",
  pcs: "pcs",
  pcssold: "pcsSold",
  supply: "supply",
};

// Column order shown in the table — the sheet's own order.
const COLUMNS = [
  { key: "sales_date", label: "Sales Date", type: "date" },
  { key: "store_code", label: "Store Code" },
  { key: "store_name", label: "Store Name" },
  { key: "partner_code", label: "Partner Code" },
  { key: "partner_name", label: "Partner Name" },
  { key: "item_family_code", label: "Item Family Code" },
  { key: "division_code", label: "Division Code" },
  { key: "item_code", label: "Item Code" },
  { key: "item_name", label: "Item Name" },
  { key: "unit_price", label: "Unit Price", type: "money" },
  { key: "qty_sold", label: "Qty Sold", type: "number" },
  { key: "gross_value", label: "Gross Value (RM)", type: "money" },
  { key: "disc_value", label: "Disc Value (RM)", type: "money" },
  { key: "net_value", label: "Net Value Incl Tax (MYR)", type: "money" },
  { key: "pcs", label: "Pcs", type: "number" },
  { key: "pcs_sold", label: "Pcs Sold", type: "number" },
  { key: "supply", label: "Supply" },
];

const PAGE_SIZE = 100;

const normaliseHeader = (h) =>
  String(h ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const pad = (n) => String(n).padStart(2, "0");

// "Sales Date" is read as a raw Excel serial and decoded with SSF, NOT with
// xlsx's cellDates option. cellDates converts the serial through a Date and
// lands off by a timezone (and a stray ~1 min of Excel epoch drift): the 1 May
// 2026 cell came back as 2026-04-30T18:59:48Z, which reads as 30 Apr on both
// local and UTC getters. SSF.parse_date_code returns the calendar parts the
// sheet actually holds, with no timezone in the path at all.
const toYmd = (value) => {
  if (typeof value === "number" && isFinite(value)) {
    const d = XLSX.SSF.parse_date_code(value);
    if (d && d.y) return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
    return null;
  }
  // Fallbacks for sheets that store the date as real text or a Date object.
  if (value instanceof Date && !isNaN(value)) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  const s = String(value ?? "").trim();
  return s === "" ? null : s;
};

const fmtDate = (v) => (v ? String(v).slice(0, 10) : "");
const fmtMoney = (v) =>
  v === null || v === undefined || v === ""
    ? ""
    : Number(v).toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const fmtNumber = (v) =>
  v === null || v === undefined || v === "" ? "" : String(Number(v));

function VgSalesComponent() {
  const [files, setFiles] = useState([]);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [rows, setRows] = useState([]);
  const [loadingRows, setLoadingRows] = useState(false);

  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const loadFiles = useCallback(async (selectId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/vg_sales.php`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load files");
      setFiles(json.data || []);
      if (selectId) {
        setSelectedFileId(String(selectId));
      } else if (json.data && json.data.length > 0) {
        // Default to the newest upload so the screen is never empty.
        setSelectedFileId((prev) => prev || String(json.data[0].id));
      }
    } catch (e) {
      setError(e.message);
    }
  }, []);

  const loadRows = useCallback(async (fileId) => {
    if (!fileId) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vg_sales.php?file_id=${fileId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load rows");
      setRows(json.data || []);
      setPage(1);
    } catch (e) {
      setError(e.message);
      setRows([]);
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    loadRows(selectedFileId);
  }, [selectedFileId, loadRows]);

  const handleFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    setError("");
    setNotice("");
    setParsedRows([]);
    setFileName("");
    if (!file) return;

    setFileName(file.name);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        // No cellDates here on purpose — dates stay as Excel serials and are
        // decoded by toYmd (see the note there).
        const wb = XLSX.read(new Uint8Array(evt.target.result), {
          type: "array",
        });

        const sheet = wb.Sheets[SHEET_NAME];
        if (!sheet) {
          throw new Error(
            `Sheet "${SHEET_NAME}" not found. Sheets in this file: ${wb.SheetNames.join(", ")}`
          );
        }

        // header:1 gives array-of-arrays so the header row can be mapped by
        // name rather than trusting the sheet's column positions.
        const aoa = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          raw: true,
          blankrows: false,
          defval: null,
        });
        if (aoa.length < 2) throw new Error(`Sheet "${SHEET_NAME}" has no data rows.`);

        const headerKeys = aoa[0].map((h) => HEADER_MAP[normaliseHeader(h)] || null);
        if (!headerKeys.includes("salesDate") || !headerKeys.includes("itemCode")) {
          throw new Error(
            "Unexpected header row — 'Sales Date' and 'Item Code' columns were not found."
          );
        }

        const out = [];
        for (let i = 1; i < aoa.length; i++) {
          const raw = aoa[i];
          if (!raw || raw.every((c) => c === null || c === "")) continue;

          const row = { rowNo: out.length + 1 };
          headerKeys.forEach((key, idx) => {
            if (!key) return;
            const cell = raw[idx];
            row[key] = key === "salesDate" ? toYmd(cell) : cell;
          });
          // A line with neither a date nor an item is sheet padding, not data.
          if (!row.salesDate && !row.itemCode) continue;
          out.push(row);
        }

        if (out.length === 0) throw new Error("No usable data rows found in the sheet.");
        setParsedRows(out);
        setNotice(`Parsed ${out.length} row(s) from "${SHEET_NAME}". Review, then upload.`);
      } catch (err) {
        setError(err.message);
        setParsedRows([]);
      } finally {
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setError("Could not read the file.");
      setParsing(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (parsedRows.length === 0) return;
    setUploading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/vg_sales.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName,
          sheetName: SHEET_NAME,
          user: localStorage.getItem("user") || "",
          rows: parsedRows,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Upload failed");

      setNotice(json.message);
      setParsedRows([]);
      setFileName("");
      await loadFiles(json.file_id);
      await loadRows(json.file_id);
    } catch (e) {
      setError(e.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedFileId) return;
    const file = files.find((f) => String(f.id) === String(selectedFileId));
    if (!window.confirm(`Delete "${file?.file_name}" and all of its rows?`)) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/vg_sales.php?file_id=${selectedFileId}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      setNotice(json.message);
      setSelectedFileId("");
      setRows([]);
      await loadFiles();
    } catch (e) {
      setError(e.message);
    }
  };

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      COLUMNS.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q))
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    const sum = (key) =>
      filteredRows.reduce((acc, r) => acc + (parseFloat(r[key]) || 0), 0);
    return {
      qty_sold: sum("qty_sold"),
      gross_value: sum("gross_value"),
      disc_value: sum("disc_value"),
      net_value: sum("net_value"),
      pcs_sold: sum("pcs_sold"),
    };
  }, [filteredRows]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const selectedFile = files.find((f) => String(f.id) === String(selectedFileId));

  const renderCell = (row, col) => {
    const v = row[col.key];
    if (col.type === "date") return fmtDate(v);
    if (col.type === "money") return fmtMoney(v);
    if (col.type === "number") return fmtNumber(v);
    return v ?? "";
  };

  return (
    <div className="container-fluid py-3">
      <h3 className="text-danger mb-3">VG Sales Orders</h3>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert variant="success" dismissible onClose={() => setNotice("")}>
          {notice}
        </Alert>
      )}

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title className="mb-3">Upload Excel File</Card.Title>
          <Row className="align-items-end">
            <Col md={7}>
              <Form.Group>
                <Form.Label>
                  Excel file (reads the <strong>{SHEET_NAME}</strong> sheet)
                </Form.Label>
                <Form.Control
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  disabled={parsing || uploading}
                />
              </Form.Group>
            </Col>
            <Col md={5} className="mt-3 mt-md-0">
              <Button
                variant="success"
                onClick={handleUpload}
                disabled={parsedRows.length === 0 || uploading || parsing}
              >
                {uploading ? "Uploading…" : `Upload${parsedRows.length ? ` ${parsedRows.length} row(s)` : ""}`}
              </Button>
              {parsing && (
                <span className="ms-3 text-muted">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Parsing…
                </span>
              )}
            </Col>
          </Row>
          {fileName && (
            <div className="mt-3">
              <Badge bg="secondary">{fileName}</Badge>{" "}
              {parsedRows.length > 0 && (
                <Badge bg="info">{parsedRows.length} row(s) ready</Badge>
              )}
            </div>
          )}
          <Form.Text className="text-muted d-block mt-2">
            Uploading a file with a name that already exists replaces that
            file's rows instead of adding them twice.
          </Form.Text>
        </Card.Body>
      </Card>

      <Card className="mb-3 shadow-sm">
        <Card.Body>
          <Row className="align-items-end">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Uploaded files</Form.Label>
                <Form.Select
                  value={selectedFileId}
                  onChange={(e) => setSelectedFileId(e.target.value)}
                >
                  <option value="">-- Select a file --</option>
                  {files.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.file_name} ({f.row_count} rows
                      {f.period_start
                        ? `, ${fmtDate(f.period_start)} → ${fmtDate(f.period_end)}`
                        : ""}
                      )
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4} className="mt-3 mt-md-0">
              <Form.Group>
                <Form.Label>Search</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Filter rows…"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </Form.Group>
            </Col>
            <Col md={2} className="mt-3 mt-md-0">
              <Button
                variant="outline-danger"
                onClick={handleDelete}
                disabled={!selectedFileId}
              >
                Delete file
              </Button>
            </Col>
          </Row>
          {selectedFile && (
            <div className="mt-3 text-muted small">
              Uploaded {fmtDate(selectedFile.uploaded_at)}
              {selectedFile.uploaded_by ? ` by ${selectedFile.uploaded_by}` : ""} ·
              sheet {selectedFile.sheet_name} · showing {filteredRows.length} of{" "}
              {rows.length} row(s)
            </div>
          )}
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          {loadingRows ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-muted py-3">
              {selectedFileId
                ? "This file has no rows."
                : "Select an uploaded file to view its rows."}
            </div>
          ) : (
            <>
              <div style={{ overflowX: "auto", maxHeight: "60vh" }}>
                <Table striped bordered hover size="sm" className="mb-0">
                  <thead
                    className="table-danger"
                    style={{ position: "sticky", top: 0, zIndex: 1 }}
                  >
                    <tr>
                      <th>#</th>
                      {COLUMNS.map((c) => (
                        <th key={c.key} className="text-nowrap">
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => (
                      <tr key={r.id}>
                        <td>{r.row_no}</td>
                        {COLUMNS.map((c) => (
                          <td
                            key={c.key}
                            className={
                              c.type === "money" || c.type === "number"
                                ? "text-end text-nowrap"
                                : "text-nowrap"
                            }
                          >
                            {renderCell(r, c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="table-light fw-bold">
                    <tr>
                      {/* colSpan 11 = the "#" cell plus Sales Date … Unit Price;
                          the seven cells after it line up with the remaining
                          columns, Qty Sold … Supply. */}
                      <td colSpan={11} className="text-end">
                        Totals ({filteredRows.length} row(s))
                      </td>
                      <td className="text-end">{fmtNumber(totals.qty_sold)}</td>
                      <td className="text-end">{fmtMoney(totals.gross_value)}</td>
                      <td className="text-end">{fmtMoney(totals.disc_value)}</td>
                      <td className="text-end">{fmtMoney(totals.net_value)}</td>
                      <td />
                      <td className="text-end">{fmtNumber(totals.pcs_sold)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </Table>
              </div>

              {pageCount > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    ← Previous
                  </Button>
                  <span className="text-muted small">
                    Page {currentPage} of {pageCount}
                  </span>
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    disabled={currentPage >= pageCount}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    Next →
                  </Button>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default VgSalesComponent;
