import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Offcanvas from "react-bootstrap/Offcanvas";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import StockInDash from "./StickInDash";
import StockInDetails from "./StockInDetails";
import AddNewStock from "./AddNewStock";

function StockInComponent() {
  const [stockInData, setStockInData] = useState([]);
  const [materials, setMaterials] = useState([]);

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  const fetchData = async () => {
    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/fetch_stock_in.php",
        {
          method: "POST",
        }
      );

      const result = await response.json();
      setStockInData(result);
    } catch (error) {
      setStockInData([]);
    }
  };

  const fetchMaterials = async () => {
    try {
      let month = parseInt(new Date().getMonth()) + 1;

      const response = await fetch(
        `http://121.121.232.54:88/aero-foods/fetch_materials.php?month=${month}`,
        {
          method: "GET",
        }
      );

      const result = await response.json();
      setMaterials(result);
    } catch (error) {
      setMaterials([]);
    }
  };

  useEffect(() => {
    fetchData();
    fetchMaterials();
  }, []);

  return (
    <>
      <div className="container-fluid">
        <h2 className="mb-0">Stock In Materials</h2>

        <Tabs
          defaultActiveKey="home"
          id="uncontrolled-tab-example"
          className="mb-3"
          justify
        >
          <Tab eventKey="home" title="Stock Availablility">
            <StockInDash data={stockInData} materials={materials} />
          </Tab>
          <Tab eventKey="stockin" title="Stock In">
            <StockInDetails data={stockInData} materials={materials} />
          </Tab>
          <Tab eventKey="new" title="Add New Stock">
            <AddNewStock data={stockInData} materials={materials} />
          </Tab>
        </Tabs>

        {/* <Button variant="primary" onClick={handleShow}>
          Launch
        </Button> */}

        <Offcanvas
          show={show}
          onHide={handleClose}
          placement="end"
          backdrop="static"
        >
          <Offcanvas.Header closeButton>
            <Offcanvas.Title>Offcanvas</Offcanvas.Title>
          </Offcanvas.Header>
          <Offcanvas.Body>
            Some text as placeholder. In real life you can have the elements you
            have chosen. Like, text, images, lists, etc.
          </Offcanvas.Body>
        </Offcanvas>
      </div>
    </>
  );
}

export default StockInComponent;
