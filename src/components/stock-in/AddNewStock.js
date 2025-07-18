import { useEffect, useState } from "react";
import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import BootstrapChip from "../core/BootstrapChip";
// import { FiUser } from "react-icons/fi";

function AddNewStock({ data, materials }) {
  console.log("DATA", data);
  console.log("MATERIALS", materials);

  const [subForm, setSubForm] = useState([]);
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
    } else {
      setSelectedNames((prev) =>
        prev.includes(chip)
          ? prev.filter((item) => item !== chip)
          : [...prev, chip]
      );
      handleSubFormChange(chip, "");
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

    // Return as array of objects with category and count
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
        {/* <div className="col-3" style={{ padding: 5 }}>
          <Form.Group controlId="selectInput" className="mb-3">
            <Form.Label>Select Category</Form.Label>
            <Form.Select
              name="select"
              value={selectedCategory}
              onChange={(e) => handleChange(e, "category")}
            >
              <option value="">Choose...</option>
              {categories &&
                categories.map((item, index) => (
                  <option key={index} value={item.category}>
                    {item.category}
                  </option>
                ))}
            </Form.Select>
          </Form.Group>
        </div> 

        <div className="col-3" style={{ padding: 5 }}>
          <Form.Group controlId="selectInput" className="mb-3">
            <Form.Label>Select Category</Form.Label>
            <Form.Select
              name="select"
              value={selectedCategory}
              onChange={(e) => handleChange(e, "name")}
            >
              <option value="">Choose...</option>
              {names &&
                names.map((item, index) => (
                  <option key={index} value={item.name}>
                    {item.name}
                  </option>
                ))}
            </Form.Select>
          </Form.Group>
        </div> */}

        {/* <InputGroup className="mb-3">
          <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
          <Form.Control
            placeholder="Username"
            aria-label="Username"
            aria-describedby="basic-addon1"
          />
        </InputGroup>

        <InputGroup className="mb-3">
          <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
          <Form.Control
            placeholder="Username"
            aria-label="Username"
            aria-describedby="basic-addon1"
            type="date"
          />
        </InputGroup>

        <InputGroup className="mb-3">
          <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
          <Form.Control
            placeholder="Username"
            aria-label="Username"
            aria-describedby="basic-addon1"
            type="number"
          />
        </InputGroup>

        <InputGroup className="mb-3">
          <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
          <Form.Control
            placeholder="Username"
            aria-label="Username"
            aria-describedby="basic-addon1"
            type="email"
          />
        </InputGroup>

        <InputGroup className="mb-3">
          <InputGroup.Text id="basic-addon1">@</InputGroup.Text>
          <Form.Control
            placeholder="Username"
            aria-label="Username"
            aria-describedby="basic-addon1"
            type="password"
          />
        </InputGroup> */}
      </div>
    </div>
  );
}
export default AddNewStock;
