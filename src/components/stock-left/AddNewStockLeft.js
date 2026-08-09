import { useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import BootstrapChip from "../core/BootstrapChip";

function AddNewStockLeft({ data, materials, apiBaseUrl, onSaved }) {
  const [itemForms, setItemForms] = useState({}); // { [name]: { packets } }
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [names, setNames] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const [saving, setSaving] = useState(false);

  const resetFormStates = () => {
    setItemForms({});
    setSelectedCategory([]);
    setSelectedNames([]);
    setNames([]);
    setSelectedDate(new Date().toISOString().split("T")[0]);
  };

  const getMaterialInfo = (itemName) => {
    const material = materials.find((item) => item.name === itemName);
    return {
      unit_price: material?.unit_price ?? "",
      unit: material?.unit ?? "",
      packet: material?.packet ?? "0",
      code: material?.code ?? "",
      description: material?.description ?? "",
      category: material?.category ?? "",
    };
  };

  const getDistinctCategories = (list) => {
    const categoryCounts = new Map();
    list.forEach((item) => {
      const category = item.category;
      if (category) {
        categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
      }
    });
    return Array.from(categoryCounts, ([category, count]) => ({
      category,
      count,
    }));
  };

  const filterItems = (filterArr) => {
    try {
      const itemNames = materials
        .filter((item) => filterArr.includes(item.category))
        .map((item) => item.name)
        .sort();
      setNames(itemNames);
    } catch (error) {
      setNames([]);
    }
  };

  const toggleCategory = (chip) => {
    setSelectedCategory((prev) =>
      prev.includes(chip)
        ? prev.filter((item) => item !== chip)
        : [...prev, chip]
    );
  };

  const initializeItemForm = (itemName) => {
    setItemForms((prev) =>
      prev[itemName] ? prev : { ...prev, [itemName]: { packets: "" } }
    );
  };

  const toggleNames = (chip) => {
    if (selectedNames.includes(chip)) {
      setSelectedNames((prev) => prev.filter((item) => item !== chip));
      setItemForms((prev) => {
        const next = { ...prev };
        delete next[chip];
        return next;
      });
    } else {
      setSelectedNames((prev) => [...prev, chip]);
      initializeItemForm(chip);
    }
  };

  const handleItemFieldChange = (itemName, field, value) => {
    if (value !== "" && Number(value) < 0) return;
    setItemForms((prev) => ({
      ...prev,
      [itemName]: {
        ...prev[itemName],
        [field]: value,
      },
    }));
  };

  const organizeMaterials = () => {
    setCategories(
      getDistinctCategories(materials).filter((c) => c.category !== "Discontinue")
    );
  };

  useEffect(() => {
    organizeMaterials();
  }, [materials]);

  useEffect(() => {
    if (selectedCategory.length > 0) {
      filterItems(selectedCategory);
    } else {
      setNames([]);
    }
  }, [selectedCategory]);

  // Drop any selected items that are no longer visible under the chosen categories.
  useEffect(() => {
    setSelectedNames((prev) => prev.filter((n) => names.includes(n)));
  }, [names]);

  const handleSave = () => {
    const [year, month, day] = selectedDate.split("-").map((v) => parseInt(v));
    const payload = {
      data: {
        month_date: selectedDate,
        month,
        year,
        day,
      },
      // Stock is tracked in packets only: boxes (value) = 0, packets = loose.
      form: selectedNames.map((name) => ({
        key: name,
        value: 0,
        loose: parseFloat(itemForms[name]?.packets) || 0,
      })),
      materials: materials,
    };

    setSaving(true);
    fetch(`${apiBaseUrl}/stock_left_bulk.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((res) => res.json())
      .then((result) => {
        setSaving(false);
        alert(result.message || "Stock left saved.");
        if (result.status === "success") {
          resetFormStates();
          if (onSaved) onSaved();
        }
      })
      .catch((err) => {
        setSaving(false);
        console.error("Error sending stock left data:", err);
        alert("Error sending stock left data.");
      });
  };

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <label>
            <strong>Categories</strong>
          </label>
          <div>
            {categories &&
              categories.map((item, index) => (
                <BootstrapChip
                  key={index}
                  label={item.category}
                  onPress={() => toggleCategory(item.category)}
                  selectedVariant="danger"
                  unselectedVariant="outline-danger"
                />
              ))}
          </div>
        </div>

        <div className="col-12">
          <label>
            <strong>Items</strong>
          </label>
          <div>
            {names &&
              names.map((item, index) => (
                <BootstrapChip
                  key={index}
                  label={item}
                  onPress={() => toggleNames(item)}
                  selectedVariant="danger"
                  unselectedVariant="outline-danger"
                />
              ))}
          </div>
        </div>

        {selectedNames.length > 0 && (
          <div className="col-12 mt-4">
            <h4 className="text-danger mb-3">Stock Left Details</h4>
            <Card className="mb-4 shadow-sm border-primary">
              <Card.Body>
                <Card.Title className="text-primary mb-3">
                  General Information
                </Card.Title>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Stock Count Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
        )}

        <div className="col-12">
          {selectedNames.map((itemName, index) => {
            const materialInfo = getMaterialInfo(itemName);
            const form = itemForms[itemName] || {};
            return (
              <Card key={index} className="mb-4 shadow-sm">
                <Card.Body>
                  <Card.Title className="mb-3">{itemName}</Card.Title>

                  <Row>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Price (RM)</Form.Label>
                        <InputGroup>
                          <InputGroup.Text>RM</InputGroup.Text>
                          <Form.Control
                            type="number"
                            value={materialInfo.unit_price}
                            readOnly
                            className="bg-light"
                          />
                        </InputGroup>
                        <Form.Text className="text-muted">
                          From materials database
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Unit</Form.Label>
                        <Form.Control
                          type="text"
                          value={materialInfo.unit}
                          readOnly
                          className="bg-light"
                        />
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>Packets Left</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          value={form.packets ?? ""}
                          onChange={(e) =>
                            handleItemFieldChange(
                              itemName,
                              "packets",
                              e.target.value
                            )
                          }
                        />
                        <Form.Text className="text-muted">
                          Packets remaining
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            );
          })}
        </div>

        {selectedNames.length > 0 && (
          <div className="col-12 mt-3 mb-4">
            <div className="d-flex justify-content-center">
              <Button
                variant="success"
                size="lg"
                disabled={saving}
                onClick={handleSave}
              >
                {saving
                  ? "Saving..."
                  : `Save Stock Left (${selectedNames.length} items)`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddNewStockLeft;
