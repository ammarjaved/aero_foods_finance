import { useEffect, useState } from "react";
import Button from "react-bootstrap/Button";
import Offcanvas from "react-bootstrap/Offcanvas";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import TableMonthSummary from "./TableMonthSummary";
import TableMonthSummary2 from "./TableMonthSummary2";
import TableMonthSummary3 from "./TableMonthSummary3";
import TableMonthSummary4 from "./TableMonthSummary4";

import TableSDS from "./TableSDS";
import MTDSummary from "./MTDSummary";

function DailySummryComponent() {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  return (
    <>
      <div className="container-fluid">
        <h2 className="mb-0">Summary</h2>

        <Tabs
          defaultActiveKey="stockin"
          id="uncontrolled-tab-example"
          className="mb-3"
          justify
        >
          <Tab eventKey="stockin" title="Mixue">
            <TableMonthSummary />
          </Tab>
          <Tab eventKey="abe" title="ABE YUS">
            <TableMonthSummary2 />
          </Tab>
          <Tab eventKey="amz" title="Amazon">
            <TableMonthSummary3 />
          </Tab>
          <Tab eventKey="sds" title="SDS">
            <TableSDS />
          </Tab>

          <Tab eventKey="new" title="Total Summary">
            <MTDSummary />
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

export default DailySummryComponent;
