import { useCallback, useEffect, useMemo, useState } from "react";
import Table from "react-bootstrap/Table";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Alert from "react-bootstrap/Alert";
import Spinner from "react-bootstrap/Spinner";

const API_BASE_URL = "http://121.121.232.54:88/abe-yus";

const EMPTY_FORM = {
  id: null,
  item_code: "",
  item_name: "",
  unit_price: "",
  pcs: "",
  supply: "",
};

const fmtMoney = (v) =>
  v === null || v === undefined || v === ""
    ? ""
    : Number(v).toLocaleString("en-MY", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const fmtNumber = (v) =>
  v === null || v === undefined || v === "" ? "" : String(Number(v));

function VgItemsComponent() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const isEditing = form.id !== null;

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vg_items.php`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Failed to load items");
      // Guard the shape: an error response is an object, and storing one would
      // break every .filter/.map below.
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e) {
      setError(e.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const handleChange = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const resetForm = () => setForm(EMPTY_FORM);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_code.trim()) {
      setError("Item Code is required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/vg_items.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          operation: isEditing ? "update" : "insert",
          user: localStorage.getItem("user") || "",
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Save failed");

      setNotice(json.message);
      resetForm();
      await loadItems();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setForm({
      id: item.id,
      item_code: item.item_code ?? "",
      item_name: item.item_name ?? "",
      unit_price: item.unit_price ?? "",
      pcs: item.pcs ?? "",
      supply: item.supply ?? "",
    });
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (item) => {
    if (
      !window.confirm(
        `Delete item ${item.item_code} — ${item.item_name || ""}?\n\n` +
          "Sales rows keep their history, but they will show blank Pcs, " +
          "Supply and Pcs Sold until this code exists again."
      )
    ) {
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/vg_items.php?id=${item.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "Delete failed");
      setNotice(json.message);
      if (form.id === item.id) resetForm();
      await loadItems();
    } catch (e) {
      setError(e.message);
    }
  };

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) =>
      ["item_code", "item_name", "supply"].some((k) =>
        String(i[k] ?? "").toLowerCase().includes(q)
      )
    );
  }, [items, search]);

  return (
    <div className="container-fluid py-3">
      <h3 className="text-danger mb-3">Menu Items</h3>
      <p className="text-muted">
        Pcs and Supply on the Sales screen are read from this list, and Pcs
        Sold is calculated as <strong>Qty Sold × Pcs</strong>. Editing an item
        here updates every sales row that uses its code.
      </p>

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
          <Card.Title className="mb-3">
            {isEditing ? `Edit item ${form.item_code}` : "Add new item"}
          </Card.Title>
          <Form onSubmit={handleSubmit}>
            <Row>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Item Code *</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.item_code}
                    onChange={(e) => handleChange("item_code", e.target.value)}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label>Item Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.item_name}
                    onChange={(e) => handleChange("item_name", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Unit Price (RM)</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    value={form.unit_price}
                    onChange={(e) => handleChange("unit_price", e.target.value)}
                  />
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Pcs</Form.Label>
                  <Form.Control
                    type="number"
                    step="1"
                    value={form.pcs}
                    onChange={(e) => handleChange("pcs", e.target.value)}
                  />
                  <Form.Text className="text-muted">Pieces per unit</Form.Text>
                </Form.Group>
              </Col>
              <Col md={2}>
                <Form.Group className="mb-3">
                  <Form.Label>Supply</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.supply}
                    onChange={(e) => handleChange("supply", e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            <div className="d-flex gap-2">
              <Button type="submit" variant="success" disabled={saving}>
                {saving ? "Saving…" : isEditing ? "Update item" : "Add item"}
              </Button>
              {isEditing && (
                <Button variant="outline-secondary" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <Row className="mb-3">
            <Col md={4}>
              <Form.Control
                type="text"
                placeholder="Search code, name or supply…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </Col>
            <Col className="text-end text-muted small d-flex align-items-center justify-content-end">
              {filteredItems.length} of {items.length} item(s)
            </Col>
          </Row>

          {loading ? (
            <div className="text-center py-4">
              <Spinner animation="border" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-muted py-3">
              No items yet. Add one above, or upload a sheet on the Sales
              screen — unknown codes are seeded here automatically.
            </div>
          ) : (
            <div style={{ overflowX: "auto", maxHeight: "60vh" }}>
              <Table striped bordered hover size="sm" className="mb-0">
                <thead
                  className="table-danger"
                  style={{ position: "sticky", top: 0, zIndex: 1 }}
                >
                  <tr>
                    <th>Item Code</th>
                    <th>Item Name</th>
                    <th className="text-end">Unit Price</th>
                    <th className="text-end">Pcs</th>
                    <th>Supply</th>
                    <th style={{ width: "150px" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item) => (
                    <tr key={item.id}>
                      <td className="text-nowrap">{item.item_code}</td>
                      <td>{item.item_name}</td>
                      <td className="text-end">{fmtMoney(item.unit_price)}</td>
                      <td className="text-end">{fmtNumber(item.pcs)}</td>
                      <td>{item.supply}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          className="me-2"
                          onClick={() => handleEdit(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-danger"
                          onClick={() => handleDelete(item)}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
}

export default VgItemsComponent;
