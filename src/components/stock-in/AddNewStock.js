import { useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import BootstrapChip from "../core/BootstrapChip";

function AddNewStock({ data, materials }) {
  console.log("DATA", data);
  console.log("MATERIALS", materials);

  const [subForm, setSubForm] = useState([]);
  const [itemForms, setItemForms] = useState({}); // Store form data for each selected item
  const [globalFormData, setGlobalFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    orderNumber: ''
  }); // Shared data for all items

  // Function to reset all form states
  const resetFormStates = () => {
    setSubForm([]);
    setItemForms({});
    setGlobalFormData({
      date: new Date().toISOString().split('T')[0],
      orderNumber: ''
    });
    setSelectedCategory([]);
    setSelectedNames([]);
    setNames([]);
    setSelectAll(false);
    setForm({});
    setSortRelevance(false);
  };

  const handleSubFormChange = (key, value) => {
    let tempForm = subForm;
    let item = { key: key, value: value };
    const index = tempForm.findIndex((_item) => _item.key === item.key);

    if (index !== -1) {
      tempForm[index] = item;
    } else {
      tempForm.push(item);
    }

    setSubForm(tempForm);
  };

  const handleGlobalFormChange = (field, value) => {
    setGlobalFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleQuantityChange = (itemName, change) => {
    const currentQuantity = itemForms[itemName]?.quantity || 0;
    const newQuantity = Math.max(0, currentQuantity + change);
    setItemForms(prev => ({
      ...prev,
      [itemName]: {
        ...prev[itemName],
        quantity: newQuantity
      }
    }));
  };

  const getMaterialInfo = (itemName) => {
    const material = materials.find(item => item.name === itemName);
    return {
      unit_price: material?.unit_price || '',
      unit: material?.unit || 'Boxes',
      packet: material?.packet || '0',
      code: material?.code || '',
      description: material?.description || '',
      category: material?.category || '',
      user: localStorage.getItem('user') || ''
    };
  };

  const initializeItemForm = (itemName) => {
    if (!itemForms[itemName]) {
      setItemForms(prev => ({
        ...prev,
        [itemName]: {
          quantity: 0
        }
      }));
    }
  };

  const handleMathsChange = (key, newValue) => {
    if (newValue >= 0) {
      setSubForm((prev) =>
        prev.map((item) =>
          item.key === key ? { ...item, value: newValue } : item
        )
      );
    }
  };

  const [enableSort, setEnableSort] = useState(true);
  const [sortRelevance, setSortRelevance] = useState(false);
  const toggleRelevance = () => {
    setSortRelevance((prev) => !prev);
  };
  const sortR = () => {
    const itemNames = materials
      .filter((item) => selectedCategory.includes(item.category))
      .sort((a, b) => parseInt(a.sort_key) - parseInt(b.sort_key))
      .map((item) => item.name);
    setNames(itemNames);
  };

  const [selectAll, setSelectAll] = useState(false);
  const toggleSelectAll = () => {
    setSelectAll((prev) => !prev);
  };

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const toggleCategory = (chip) => {
    setSelectedCategory((prev) =>
      prev.includes(chip)
        ? prev.filter((item) => item !== chip)
        : [...prev, chip]
    );
    setSelectAll(false);
  };

  const [names, setNames] = useState([]);
  const [selectedNames, setSelectedNames] = useState([]);
  const toggleNames = (chip) => {
    if (selectedNames.includes(chip)) {
      setSelectedNames((prev) =>
        prev.includes(chip)
          ? prev.filter((item) => item !== chip)
          : [...prev, chip]
      );
      handleSubFormChange(chip, "");
      // Remove form data for deselected item
      setItemForms(prev => {
        const newForms = { ...prev };
        delete newForms[chip];
        return newForms;
      });
    } else {
      setSelectedNames((prev) =>
        prev.includes(chip)
          ? prev.filter((item) => item !== chip)
          : [...prev, chip]
      );
      handleSubFormChange(chip, "");
      // Initialize form for newly selected item
      initializeItemForm(chip);
    }
  };

  const [form, setForm] = useState({});

  const getDistinctCategories = (data) => {
    const categoryCounts = new Map();

    data.forEach((item) => {
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
      setSelectedNames([]);
      setSubForm([]);
      setSelectAll(false);
    }
  };

  const handleCardClick = (item) => {
    console.log(item);
  };

  const handleChange = (e, key) => {
    let tempForm = form;
    if (e.target.value && e.target.value.length > 0) {
      if (key === "category") {
        setSelectedCategory(e.target.value);
        tempForm[key] = e.target.value;
      } else if (key === "name") {
        setSelectedNames(e.target.value);
        tempForm[key] = e.target.value;
      }
      setForm(tempForm);
    }
  };

  const organizeMaterials = () => {
    const categoriesWithCounts = getDistinctCategories(materials);
    setCategories(categoriesWithCounts);

    const distinctCategories = [
      ...new Set(materials.map((item) => item.category).filter(Boolean)),
    ];
  };

  useEffect(() => {
    if (materials) {
    }
    organizeMaterials();
  }, [materials]);

  useEffect(() => {
    console.log(form);
    console.log(form.category, materials);
    console.log(materials.filter((item) => item.category === form.category));
    setNames(materials.filter((item) => item.category === form.category));
    setForm((existing) => ({
      existing,
      name: "",
    }));
  }, [form.category]);

  useEffect(() => {
    if (sortRelevance) {
      sortR();
    } else {
      filterItems(selectedCategory);
    }
  }, [sortRelevance]);

  useEffect(() => {
    if (selectedCategory.includes("Food")) {
      setEnableSort(true);
    } else {
      setEnableSort(false);
      setSortRelevance(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (selectedCategory) {
      if (selectedCategory.length > 0) {
        filterItems(selectedCategory);
      } else {
        setNames([]);
        setSelectedNames([]);
        setSubForm([]);
        setSelectAll(false);
      }
    } else {
      setNames([]);
      setSelectedNames([]);
      setSubForm([]);
      setSelectAll(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    let tempForm = subForm;
    setSubForm(tempForm.filter((_item) => selectedNames.includes(_item.key)));
  }, [selectedNames]);

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
        
        {/* Global Stock In Details */}
        {selectedNames.length > 0 && (
          <div className="col-12 mt-4">
            <h4 className="text-danger mb-3">Stock In Details</h4>
            <Card className="mb-4 shadow-sm border-primary">
              <Card.Body>
                <Card.Title className="text-primary mb-3">General Information</Card.Title>
                <Row>
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Select Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={globalFormData.date}
                        onChange={(e) => handleGlobalFormChange('date', e.target.value)}
                      />
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <Form.Group className="mb-3">
                      <Form.Label>Order Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={globalFormData.orderNumber}
                        onChange={(e) => handleGlobalFormChange('orderNumber', e.target.value)}
                        placeholder="Enter order number"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </div>
        )}
        
        {/* Individual Item Forms */}
        <div className="col-12">
          {selectedNames.map((itemName, index) => {

            const materialInfo = getMaterialInfo(itemName);
            console.log(materialInfo);
            return (
              <Card key={index} className="mb-4 shadow-sm">
                <Card.Body>
                  <Card.Title className="mb-3">{itemName}</Card.Title>
                  
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Price (RM)</Form.Label>
                        <InputGroup>
                          <InputGroup.Text>RM</InputGroup.Text>
                          <Form.Control
                            type="number"
                            value={materialInfo.unit_price}
                            placeholder="0.00"
                            step="0.01"
                            readOnly
                            className="bg-light"
                          />
                        </InputGroup>
                        <Form.Text className="text-muted">
                          Price from materials database
                        </Form.Text>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Unit Type</Form.Label>
                        <Form.Control
                          type="text"
                          value={materialInfo.unit}
                          readOnly
                          className="bg-light"
                        />
                        <Form.Text className="text-muted">
                          Unit from materials database
                        </Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Row>
                    <Col md={12}>
                      <Form.Group className="mb-3">
                        <Form.Label>Quantity</Form.Label>
                        <div className="d-flex align-items-center">
                          <Button
                            variant="outline-danger"
                            size="lg"
                            className="rounded-circle me-3"
                            style={{ width: '50px', height: '50px' }}
                            onClick={() => handleQuantityChange(itemName, -1)}
                            disabled={(itemForms[itemName]?.quantity || 0) <= 0}
                          >
                            −
                          </Button>
                          
                          <div className="flex-grow-1 text-center">
                            <div 
                              className="border rounded p-3 bg-light"
                              style={{ minWidth: '200px', fontSize: '18px', fontWeight: 'bold' }}
                            >
                              {materialInfo.unit}
                            </div>
                            <div className="mt-2 text-muted">
                              Quantity: {itemForms[itemName]?.quantity || 0}
                            </div>
                          </div>
                          
                          <Button
                            variant="outline-danger"
                            size="lg"
                            className="rounded-circle ms-3"
                            style={{ width: '50px', height: '50px' }}
                            onClick={() => handleQuantityChange(itemName, 1)}
                          >
                            +
                          </Button>
                        </div>
                      </Form.Group>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            );
          })}
        </div>
        
        {/* Save All Button */}
        {selectedNames.length > 0 && (
          <div className="col-12 mt-3 mb-4">
            <div className="d-flex justify-content-center">
              <Button 
                variant="success"
                size="lg"
                onClick={() => {
                  const stockData = {
                    globalInfo: globalFormData,
                    items: selectedNames.map(itemName => ({
                      name: itemName,
                      quantity: itemForms[itemName]?.quantity || 0,
                      ...getMaterialInfo(itemName)
                    }))
                  };
                  console.log('Saving all stock data:', stockData);

                  fetch("http://121.121.232.54:88/aero-foods/stockin_trans.php", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json"
                        },
                        body: JSON.stringify(stockData)
                      })
                        .then((res) => res.json())
                        .then((data) => {
                          alert(data.message);
                          // Reset all form states after successful save
                          if (data.message && data.message.toLowerCase().includes('success')) {
                            resetFormStates();
                          }
                        })
                        .catch((err) => {
                          console.error("Error sending stock data:", err);
                          alert("Error sending stock data.");
                        });
                }}
              >
                Save All Stock Entries ({selectedNames.length} items)
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddNewStock;