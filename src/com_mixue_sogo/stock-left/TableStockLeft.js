import { useMemo, useState } from "react";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";

const numberFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

// Local YYYY-MM-DD for today (not toISOString, which shifts by timezone).
const pad = (n) => String(n).padStart(2, "0");
const now = new Date();
const todayString = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
  now.getDate()
)}`;

// Matches "Discontinue", "Discontinued", odd casing and stray whitespace.
const isDiscontinued = (category) =>
  String(category || "").trim().toLowerCase().startsWith("discontinu");

// Total packets remaining = boxes * packets-per-box + loose packets.
const remainingPackets = (row) =>
  (Number(row.total_box) || 0) * (Number(row.packet) || 0) +
  (Number(row.loose_packets) || 0);

function TableStockLeft({ data, materials, apiBaseUrl, onSaved }) {
  const [search, setSearch] = useState("");
  const [asOfDate, setAsOfDate] = useState("");
  const [edits, setEdits] = useState({});
  const [savingCode, setSavingCode] = useState("");

  // Keep only the most recent stock-left entry per item (code), excluding
  // discontinued materials. If asOfDate is set, only consider counts recorded
  // on or before that date, so the table shows the position as at that day.
  // Only ever show counts from the selected year - previous years are never
  // brought forward.
  const refYear = (asOfDate || todayString).slice(0, 4);

  const latest = useMemo(() => {
    const map = new Map();
    (data || [])
      .filter((row) => !isDiscontinued(row.category))
      .filter(
        (row) =>
          !asOfDate || String(row.month_date || "").slice(0, 10) <= asOfDate
      )
      .filter((row) => String(row.month_date || "").slice(0, 4) === refYear)
      .forEach((row) => {
      const key = row.code;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, row);
        return;
      }
      const a = String(row.month_date || "");
      const b = String(existing.month_date || "");
      if (a > b || (a === b && (Number(row.id) || 0) > (Number(existing.id) || 0))) {
        map.set(key, row);
      }
    });
    return Array.from(map.values());
  }, [data, asOfDate, refYear]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = latest.filter((row) => {
      if (!term) return true;
      return (
        String(row.name || "").toLowerCase().includes(term) ||
        String(row.code || "").toLowerCase().includes(term) ||
        String(row.category || "").toLowerCase().includes(term)
      );
    });
    return rows.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }, [latest, search]);

  const saveEdit = (row) => {
    const value = edits[row.code];
    if (value === undefined || value === "") return;
    setSavingCode(row.code);

    const [year, month, day] = String(row.month_date || "")
      .slice(0, 10)
      .split("-")
      .map((v) => parseInt(v));

    const payload = {
      data: {
        month_date: String(row.month_date || "").slice(0, 10),
        month,
        year,
        day,
      },
      form: [
        {
          key: row.name,
          value: 0,
          loose: parseFloat(value) || 0,
        },
      ],
      materials: materials || [],
    };

    fetch(`${apiBaseUrl}/stock_left_bulk.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((result) => {
        setSavingCode("");
        if (result.status === "success") {
          setEdits((prev) => {
            const next = { ...prev };
            delete next[row.code];
            return next;
          });
          if (onSaved) onSaved();
        } else {
          alert(result.message || "Failed to update stock left.");
        }
      })
      .catch(() => {
        setSavingCode("");
        alert("Failed to update stock left.");
      });
  };

  return (
    <div className="container-fluid mt-3">
      <Row className="mb-3 g-2">
        <Col md={5}>
          <Form.Control
            type="text"
            placeholder="Search by name, code or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={4}>
          <Form.Control
            type="date"
            value={asOfDate}
            max={todayString}
            title="Show the stock left position as at this date"
            onChange={(e) => setAsOfDate(e.target.value)}
          />
        </Col>
        <Col md={3} className="d-flex align-items-center gap-2">
          {asOfDate && (
            <Badge
              bg="light"
              text="dark"
              style={{ cursor: "pointer" }}
              onClick={() => setAsOfDate("")}
            >
              Clear ✕
            </Badge>
          )}
          <Badge bg="secondary">{filtered.length} items</Badge>
        </Col>
      </Row>

      <div style={{ overflowX: "auto" }}>
        <Table striped bordered hover responsive size="sm">
          <thead>
            <tr>
              <th>Last Count Date</th>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Unit</th>
              <th className="text-end">Remaining (Packets)</th>
              <th className="text-center">Edit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted">
                  No stock left records found.
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const isEditing = edits[row.code] !== undefined;
                return (
                  <tr key={row.id}>
                    <td>{String(row.month_date || "").slice(0, 10)}</td>
                    <td>{row.code}</td>
                    <td>{row.name}</td>
                    <td>{row.category}</td>
                    <td>{row.unit}</td>
                    <td className="text-end">
                      {isEditing ? (
                        <Form.Control
                          size="sm"
                          type="number"
                          min="0"
                          step="1"
                          className="text-end d-inline-block"
                          style={{ width: 110 }}
                          value={edits[row.code]}
                          onChange={(e) =>
                            setEdits((prev) => ({
                              ...prev,
                              [row.code]: e.target.value,
                            }))
                          }
                        />
                      ) : (
                        <span className="fw-bold">
                          {numberFmt.format(remainingPackets(row))}
                        </span>
                      )}
                    </td>
                    <td className="text-center">
                      {isEditing ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline-success"
                            disabled={savingCode === row.code}
                            onClick={() => saveEdit(row)}
                          >
                            {savingCode === row.code ? "…" : "Save"}
                          </Button>{" "}
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() =>
                              setEdits((prev) => {
                                const next = { ...prev };
                                delete next[row.code];
                                return next;
                              })
                            }
                          >
                            ✕
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() =>
                            setEdits((prev) => ({
                              ...prev,
                              [row.code]: remainingPackets(row),
                            }))
                          }
                        >
                          Edit
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default TableStockLeft;
