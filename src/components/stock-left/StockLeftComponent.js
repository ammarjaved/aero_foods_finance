import { useEffect, useState } from "react";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import TableStockLeft from "./TableStockLeft";
import AddNewStockLeft from "./AddNewStockLeft";

const API_BASE_URL = "http://121.121.232.54:88/aero-foods";

function StockLeftComponent() {
  const [stockLeftData, setStockLeftData] = useState([]);
  const [materials, setMaterials] = useState([]);

  const fetchData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/fetch_stock_left.php`, {
        method: "POST",
      });
      const result = await response.json();
      setStockLeftData(Array.isArray(result) ? result : []);
    } catch (error) {
      setStockLeftData([]);
    }
  };

  const fetchMaterials = async () => {
    try {
      const date = new Date();
      const year = date.getFullYear();
      let month = parseInt(new Date().getMonth()) + 1;

      const response = await fetch(
        `${API_BASE_URL}/fetch_materials.php?month=${month}&year=${year}`,
        {
          method: "GET",
        }
      );
      const result = await response.json();
      setMaterials(Array.isArray(result) ? result : []);
    } catch (error) {
      setMaterials([]);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMaterials();
  }, []);

  return (
    <div className="container-fluid">
      <h2 className="mb-0">Stock Left Materials</h2>

      <Tabs
        defaultActiveKey="home"
        id="stock-left-tab"
        className="mb-3"
        justify
      >
        <Tab eventKey="home" title="Stock Left">
          <TableStockLeft
            data={stockLeftData}
            materials={materials}
            apiBaseUrl={API_BASE_URL}
            onSaved={fetchData}
          />
        </Tab>
        <Tab eventKey="new" title="Add Stock Left">
          <AddNewStockLeft
            data={stockLeftData}
            materials={materials}
            apiBaseUrl={API_BASE_URL}
            onSaved={fetchData}
          />
        </Tab>
      </Tabs>
    </div>
  );
}

export default StockLeftComponent;
