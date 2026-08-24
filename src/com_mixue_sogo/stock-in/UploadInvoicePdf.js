import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Alert from "react-bootstrap/Alert";

// Worker is copied into /public at build time (see public/pdf.worker.min.js).
pdfjsLib.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL}/pdf.worker.min.js`;

const CATEGORY_OPTIONS = [
  "Food",
  "Packaging",
  "Operation",
  "Equipment",
];

const UNIT_OPTIONS = [
  "can",
  "bottle",
  "pcs",
  "roll",
  "box",
  "pack",
  "set",
  "kg",
];

const parseNum = (s) => parseFloat(String(s).replace(/,/g, "")) || 0;

// Rebuild visual rows from positioned text items (group by y, order by x).
async function extractLines(pdf) {
  const lines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items = content.items.filter((it) => it.str && it.str.trim() !== "");
    const buckets = [];
    items.forEach((it) => {
      const y = it.transform[5];
      let bucket = buckets.find((b) => Math.abs(b.y - y) <= 3);
      if (!bucket) {
        bucket = { y, items: [] };
        buckets.push(bucket);
      }
      bucket.items.push(it);
    });
    buckets
      .sort((a, b) => b.y - a.y)
      .forEach((b) => {
        const text = b.items
          .sort((i1, i2) => i1.transform[4] - i2.transform[4])
          .map((i) => i.str)
          .join(" ")
          .replace(/\s+/g, " ")
          .trim();
        if (text) lines.push(text);
      });
  }
  return lines;
}

// Item codes are 7 digits, optionally carrying an uppercase origin prefix —
// e.g. plain 1020030 alongside MY1020001, which is a DISTINCT material in its
// own right (13 MY-prefixed codes exist in the catalog). Matching bare \d{7}
// silently dropped every prefixed line: \b needs a word boundary before the
// digits, and "Y1" offers none. The prefix stays in the captured code because
// it is part of the key.
const CODE_PATTERN = /\b([A-Z]{0,3}\d{7})\b/;

// An item row always opens with its table row number followed by the code:
// "7 MY1020001 ...". Requiring that shape keeps stray 7-digit runs elsewhere
// on the page from being mistaken for unreadable items — the company line
// "MIXUE MALAYSIA SDN. BHD. (1460375-V)" is not a dropped line item.
const ITEM_LINE_PATTERN = /^\d{1,3}\s+[A-Z]{0,3}\d{7}\b/;

// A line item is: <row#> <code> <description...> <qty> <unitPrice> <amount>
function parseItemRow(line) {
  const codeMatch = line.match(CODE_PATTERN);
  if (!codeMatch) return null;
  const code = codeMatch[1];
  const tokens = line.split(" ");
  const codeIdx = tokens.findIndex((t) => t === code);
  if (codeIdx === -1) return null;

  const isNum = (t) => /^[\d,]+(\.\d+)?$/.test(t);
  const nums = [];
  let i = tokens.length - 1;
  while (i > codeIdx && isNum(tokens[i]) && nums.length < 3) {
    nums.unshift(tokens[i]);
    i--;
  }
  if (nums.length < 3) return null;

  const qty = parseNum(nums[0]);
  const unitPrice = parseNum(nums[1]);
  const amount = parseNum(nums[2]);
  // Confidence check: on these invoices amount === qty * unitPrice.
  if (Math.abs(qty * unitPrice - amount) > 1) return null;

  const description = tokens.slice(codeIdx + 1, i + 1).join(" ").trim();
  return { code, qty, unitPrice, amount, description };
}

function parseHeader(lines) {
  const joined = lines.join(" \n ");
  let orderNumber = "";
  const invMatch = joined.match(/Inv\s*No\s*:?\s*([A-Za-z0-9]+)/i);
  if (invMatch) orderNumber = invMatch[1];

  let date = "";
  const dateMatch = joined.match(
    /(?:Issue|Delivery)\s*Date\s*:?\s*(\d{2})[.\-/](\d{2})[.\-/](\d{4})/i
  );
  if (dateMatch) {
    date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`; // YYYY-MM-DD
  }
  return { orderNumber, date };
}

function UploadInvoicePdf({ materials, apiBaseUrl, onImported }) {
  const [fileName, setFileName] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState("");
  const [unreadableLines, setUnreadableLines] = useState([]);
  const [rows, setRows] = useState([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [alsoJakel, setAlsoJakel] = useState(false);

  const matchMaterial = (code) =>
    materials.find((m) => String(m.code) === String(code));

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setResult(null);
    setRows([]);
    setUnreadableLines([]);
    setParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      const lines = await extractLines(pdf);
      const header = parseHeader(lines);

      const seen = new Set();
      const parsed = [];
      // A line shaped like an item row that will not parse is a real drop —
      // surface it, because a short import used to be invisible.
      const unreadable = [];
      lines.forEach((line) => {
        const item = parseItemRow(line);
        if (!item) {
          if (ITEM_LINE_PATTERN.test(line)) unreadable.push(line.trim());
          return;
        }
        if (seen.has(item.code)) return;
        seen.add(item.code);
        const mat = matchMaterial(item.code);
        parsed.push({
          code: item.code,
          quantity: item.qty,
          matched: !!mat,
          name: mat ? mat.name : item.description,
          // Description column: prefer catalog text, fall back to the invoice text.
          description: mat ? mat.description || item.description : item.description,
          category: mat ? mat.category : "",
          unit: mat ? mat.unit : "",
          packet: mat ? mat.packet : "",
          // Invoice price is final; if it differs from the catalog, material is updated on import.
          unit_price: item.unitPrice,
          catalogPrice: mat ? Number(mat.unit_price) : null,
        });
      });

      setRows(parsed);
      setUnreadableLines(unreadable);
      setOrderNumber(header.orderNumber);
      setDate(header.date || new Date().toISOString().split("T")[0]);
      if (parsed.length === 0) {
        setParseError(
          "No invoice line items could be read from this PDF. Check that it is a text-based Mixue invoice."
        );
      }
    } catch (err) {
      console.error(err);
      setParseError("Failed to read the PDF: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (index, field, value) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, [field]: value } : r))
    );
  };

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const newItems = rows.filter((r) => !r.matched);
  const newItemsIncomplete = newItems.some(
    (r) => !r.category || !r.unit || !(parseNum(r.packet) > 0)
  );
  const priceChanges = rows.filter(
    (r) => r.matched && r.catalogPrice != null && parseNum(r.unit_price) !== r.catalogPrice
  );
  const totalAmount = rows.reduce(
    (sum, r) => sum + parseNum(r.quantity) * parseNum(r.unit_price),
    0
  );

  const canImport =
    rows.length > 0 &&
    orderNumber.trim() !== "" &&
    date !== "" &&
    !newItemsIncomplete &&
    !importing;

  const handleImport = () => {
    const payload = {
      globalInfo: { date, orderNumber: orderNumber.trim() },
      user: localStorage.getItem("user") || "pdf_import",
      also_jakel: alsoJakel,
      newMaterials: newItems.map((r) => ({
        code: r.code,
        name: r.name,
        description: r.description,
        category: r.category,
        unit_price: parseNum(r.unit_price),
        packet: parseNum(r.packet),
        unit: r.unit,
      })),
      items: rows.map((r) => ({
        code: r.code,
        name: r.name,
        description: r.description,
        category: r.category,
        unit_price: parseNum(r.unit_price),
        packet: parseNum(r.packet),
        unit: r.unit,
        quantity: parseNum(r.quantity),
      })),
    };

    setImporting(true);
    fetch(`${apiBaseUrl}/stock_in_pdf_import.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((data) => {
        setImporting(false);
        setResult(data);
        if (data.status === "success") {
          setRows([]);
          setFileName("");
          setOrderNumber("");
          if (onImported) onImported();
        }
      })
      .catch((err) => {
        setImporting(false);
        setResult({ status: "error", message: err.message });
      });
  };

  return (
    <div className="container-fluid mt-3">
      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <Card.Title>Upload Invoice PDF</Card.Title>
          <Card.Text className="text-muted">
            Upload a Mixue invoice PDF. Its line items are read automatically;
            review and confirm before they are added to stock in. Items whose
            code is not yet in the materials catalog are marked{" "}
            <Badge bg="warning" text="dark">
              NEW
            </Badge>{" "}
            — fill their category, unit and packet before importing.
          </Card.Text>
          <Form.Group controlId="invoicePdf">
            <Form.Control
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleFile}
            />
          </Form.Group>
          {parsing && <div className="mt-2 text-primary">Reading PDF…</div>}
          {fileName && !parsing && (
            <div className="mt-2 text-muted">Loaded: {fileName}</div>
          )}
        </Card.Body>
      </Card>

      {parseError && <Alert variant="danger">{parseError}</Alert>}

      {unreadableLines.length > 0 && (
        <Alert variant="warning">
          <strong>
            {unreadableLines.length} invoice line(s) could not be read and are
            NOT included below:
          </strong>
          <ul className="mb-0 mt-2">
            {unreadableLines.map((l, i) => (
              <li key={i}>
                <code>{l}</code>
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {result && (
        <Alert variant={result.status === "success" ? "success" : "danger"}>
          {result.message}
          {result.status === "success" && (
            <div className="small mt-1">
              Inserted: {result.inserted} · Duplicates skipped:{" "}
              {result.skipped_duplicates} · New materials added:{" "}
              {result.materials_added} · Prices updated:{" "}
              {result.prices_updated ?? 0}
            </div>
          )}
        </Alert>
      )}

      {rows.length > 0 && (
        <>
          <Card className="mb-3 shadow-sm border-primary">
            <Card.Body>
              <Card.Title className="text-primary mb-3">
                Invoice Details
              </Card.Title>
              <Row>
                <Col md={5}>
                  <Form.Group className="mb-3">
                    <Form.Label>Invoice / Order Number</Form.Label>
                    <Form.Control
                      type="text"
                      value={orderNumber}
                      onChange={(e) => setOrderNumber(e.target.value)}
                      placeholder="e.g. OGMY2026072000670"
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label>Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={3} className="d-flex align-items-end pb-3">
                  <Form.Check
                    type="checkbox"
                    id="also-jakel-import"
                    label="Also add new materials to Mixue Jakel DB"
                    checked={alsoJakel}
                    onChange={(e) => setAlsoJakel(e.target.checked)}
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <div style={{ overflowX: "auto" }}>
            <Table bordered hover size="sm" className="align-middle">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Unit</th>
                  <th className="text-end">Packet</th>
                  <th className="text-end">Unit Price</th>
                  <th className="text-end">Qty</th>
                  <th className="text-end">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, index) => {
                  const amount = parseNum(r.quantity) * parseNum(r.unit_price);
                  const priceDiffers =
                    r.matched &&
                    r.catalogPrice != null &&
                    parseNum(r.unit_price) !== r.catalogPrice;
                  return (
                    <tr
                      key={r.code}
                      className={
                        !r.matched
                          ? "table-warning"
                          : priceDiffers
                          ? "table-info"
                          : undefined
                      }
                    >
                      <td>
                        {r.code}
                        {!r.matched && (
                          <Badge bg="warning" text="dark" className="ms-1">
                            NEW
                          </Badge>
                        )}
                      </td>
                      <td style={{ minWidth: 170 }}>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={r.name}
                          readOnly={r.matched}
                          className={r.matched ? "bg-light" : undefined}
                          onChange={(e) =>
                            updateRow(index, "name", e.target.value)
                          }
                        />
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <Form.Control
                          size="sm"
                          type="text"
                          value={r.description}
                          onChange={(e) =>
                            updateRow(index, "description", e.target.value)
                          }
                        />
                      </td>
                      <td style={{ minWidth: 130 }}>
                        {r.matched ? (
                          <Form.Control
                            size="sm"
                            value={r.category}
                            readOnly
                            className="bg-light"
                          />
                        ) : (
                          <Form.Select
                            size="sm"
                            value={r.category}
                            onChange={(e) =>
                              updateRow(index, "category", e.target.value)
                            }
                          >
                            <option value="">— select —</option>
                            {CATEGORY_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Form.Select>
                        )}
                      </td>
                      <td style={{ minWidth: 100 }}>
                        <Form.Select
                          size="sm"
                          value={r.unit}
                          disabled={r.matched}
                          className={r.matched ? "bg-light" : undefined}
                          onChange={(e) =>
                            updateRow(index, "unit", e.target.value)
                          }
                        >
                          <option value="">— select —</option>
                          {UNIT_OPTIONS.map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </Form.Select>
                      </td>
                      <td style={{ minWidth: 80 }}>
                        <Form.Control
                          size="sm"
                          type="number"
                          min="0"
                          value={r.packet}
                          readOnly={r.matched}
                          className={r.matched ? "bg-light text-end" : "text-end"}
                          onChange={(e) =>
                            updateRow(index, "packet", e.target.value)
                          }
                        />
                      </td>
                      <td style={{ minWidth: 110 }}>
                        <Form.Control
                          size="sm"
                          type="number"
                          min="0"
                          step="0.01"
                          className="text-end"
                          value={r.unit_price}
                          onChange={(e) =>
                            updateRow(index, "unit_price", e.target.value)
                          }
                        />
                        {priceDiffers && (
                          <div
                            className="text-warning small text-end"
                            title="Differs from catalog — material price will be updated"
                          >
                            was {r.catalogPrice} · updates ↑
                          </div>
                        )}
                      </td>
                      <td style={{ minWidth: 80 }}>
                        <Form.Control
                          size="sm"
                          type="number"
                          min="0"
                          className="text-end"
                          value={r.quantity}
                          onChange={(e) =>
                            updateRow(index, "quantity", e.target.value)
                          }
                        />
                      </td>
                      <td className="text-end fw-semibold">
                        {amount.toFixed(2)}
                      </td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => removeRow(index)}
                        >
                          ✕
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="table-secondary">
                  <td colSpan={8} className="text-end fw-bold">
                    Total
                  </td>
                  <td className="text-end fw-bold">{totalAmount.toFixed(2)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </Table>
          </div>

          {priceChanges.length > 0 && (
            <Alert variant="info" className="py-2">
              {priceChanges.length} item(s) have a price different from the
              catalog. The invoice price will be used and the material price
              will be updated.
            </Alert>
          )}

          {newItemsIncomplete && (
            <Alert variant="warning" className="py-2">
              Some NEW items are missing category, unit or packet. Fill them in
              to enable import.
            </Alert>
          )}

          <div className="d-flex justify-content-between align-items-center my-3">
            <div className="text-muted">
              {rows.length} item(s) · {newItems.length} new material(s)
            </div>
            <Button
              variant="success"
              size="lg"
              disabled={!canImport}
              onClick={handleImport}
            >
              {importing ? "Importing…" : "Confirm & Add Stock In"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default UploadInvoicePdf;
