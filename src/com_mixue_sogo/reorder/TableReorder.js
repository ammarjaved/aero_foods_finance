import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import Alert from "react-bootstrap/Alert";

const numberFmt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const JAKEL_API_URL = "http://121.121.232.54:88/aero-foods";

function TableReorder({ data, loading, apiBaseUrl, onChanged }) {
  const [search, setSearch] = useState("");
  const [onlyReorder, setOnlyReorder] = useState(true);
  const [edits, setEdits] = useState({}); // { code: value } while editing
  const [savingCode, setSavingCode] = useState("");
  const [alsoJakel, setAlsoJakel] = useState(false);

  const reorderCount = useMemo(
    () =>
      (data || []).filter(
        (r) =>
          r.need_reorder &&
          String(r.category || "").trim().toLowerCase() !== "discontinue"
      ).length,
    [data]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data || []).filter((r) => {
      if (onlyReorder && !r.need_reorder) return false;
      if (String(r.category || "").trim().toLowerCase() === "discontinue")
        return false;
      if (!term) return true;
      return (
        String(r.name || "").toLowerCase().includes(term) ||
        String(r.code || "").toLowerCase().includes(term)
      );
    });
  }, [data, search, onlyReorder]);

  const downloadExcel = () => {
    const items = (data || []).filter(
      (r) =>
        r.need_reorder &&
        String(r.category || "").trim().toLowerCase() !== "discontinue"
    );
    if (items.length === 0) return;
    const rows = items.map((r) => ({
      Code: r.code,
      Name: r.name,
      Category: r.category || "",
      Unit: r.unit,
      "Current (Packets)": Number(r.current_packets) || 0,
      "Min (Packets)": Number(r.min_stock_packets) || 0,
      "Min (Boxes)": Number(r.min_stock_box) || 0,
      "Last Count": String(r.last_count_date || "").slice(0, 10),
      Status: "Reorder",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reorder");
    const stamp = new Date().toISOString().split("T")[0];
    XLSX.writeFile(wb, `reorder_items_${stamp}.xlsx`);
  };

  const saveMin = (code, name) => {
    const value = edits[code];
    if (value === undefined || value === "") return;
    setSavingCode(code);
    const body = { code, name, min_stock_packets: parseFloat(value) };
    const mainReq = fetch(`${apiBaseUrl}/min_stock_update.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((res) => res.json());

    const promises = [mainReq];
    if (alsoJakel) {
      promises.push(
        fetch(`${JAKEL_API_URL}/min_stock_update.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }).then((res) => res.json())
      );
    }

    Promise.all(promises)
      .then(([result, jakelResult]) => {
        setSavingCode("");
        if (result.status === "success") {
          setEdits((prev) => {
            const next = { ...prev };
            delete next[code];
            return next;
          });
          if (onChanged) onChanged();
        } else {
          alert(result.message || "Failed to update minimum stock.");
        }
      })
      .catch(() => {
        setSavingCode("");
        alert("Failed to update minimum stock.");
      });
  };

  return (
    <div className="container-fluid mt-3">
      {reorderCount > 0 ? (
        <Alert variant="danger" className="d-flex align-items-center">
          <span className="fs-4 me-2">⚠️</span>
          <div>
            <strong>{reorderCount} item(s) need to be reordered.</strong> Current
            stock is at or below the minimum level.
          </div>
        </Alert>
      ) : (
        <Alert variant="success">
          All items are above their minimum stock level.
        </Alert>
      )}

      <Row className="mb-3 g-2">
        <Col md={5}>
          <Form.Control
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Col>
        <Col md={5} className="d-flex align-items-center gap-3">
          <Form.Check
            type="switch"
            id="only-reorder"
            label="Only items to reorder"
            checked={onlyReorder}
            onChange={(e) => setOnlyReorder(e.target.checked)}
          />
          <Form.Check
            type="checkbox"
            id="also-jakel"
            label="Also update Mixue Jakel DB"
            checked={alsoJakel}
            onChange={(e) => setAlsoJakel(e.target.checked)}
          />
        </Col>
        <Col md={4} className="d-flex align-items-center justify-content-end gap-2">
          <Badge bg="secondary">{filtered.length} items</Badge>
          <Button
            variant="success"
            size="sm"
            disabled={reorderCount === 0}
            onClick={downloadExcel}
          >
            ⬇ Download Excel ({reorderCount})
          </Button>
        </Col>
      </Row>

      <div style={{ overflowX: "auto" }}>
        <Table bordered hover responsive size="sm" className="align-middle">
          <thead>
            <tr>
              <th>Status</th>
              <th>Name</th>
              <th>Code</th>
              <th>Unit</th>
              <th>Category</th>
              <th className="text-end">Current (Packets)</th>
              <th className="text-end">Min (Packets)</th>
              <th className="text-end">Min (Boxes)</th>
              <th>Last Count</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="text-center text-muted">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-muted">
                  No items found.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.code}
                  className={r.need_reorder ? "table-danger" : undefined}
                >
                  <td>
                    {r.need_reorder ? (
                      <Badge bg="danger">Reorder</Badge>
                    ) : (
                      <Badge bg="success">OK</Badge>
                    )}
                  </td>
                  <td>{r.name}</td>
                  <td>{r.code}</td>
                  <td>{r.unit}</td>
                  <td>{r.category || "—"}</td>
                  <td className="text-end fw-bold">
                    {numberFmt.format(r.current_packets || 0)}
                  </td>
                  <td className="text-end" style={{ minWidth: 110 }}>
                    <Form.Control
                      size="sm"
                      type="number"
                      min="0"
                      step="1"
                      className="text-end"
                      value={
                        edits[r.code] !== undefined
                          ? edits[r.code]
                          : r.min_stock_packets
                      }
                      onChange={(e) =>
                        setEdits((prev) => ({
                          ...prev,
                          [r.code]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td className="text-end">
                    {numberFmt.format(r.min_stock_box || 0)}
                  </td>
                  <td>{String(r.last_count_date || "—").slice(0, 10)}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="outline-primary"
                      disabled={
                        savingCode === r.code || edits[r.code] === undefined
                      }
                      onClick={() => saveMin(r.code, r.name)}
                    >
                      {savingCode === r.code ? "…" : "Save"}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

export default TableReorder;
