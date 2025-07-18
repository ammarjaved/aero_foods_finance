import React, { useEffect, useState } from "react";
import TableStockIn from "./TableStockIn";

function StockInDetails({ data, materials }) {
  return (
    <div className="container-fluid">
  <TableStockIn />
    </div>
  );
}
export default StockInDetails;
