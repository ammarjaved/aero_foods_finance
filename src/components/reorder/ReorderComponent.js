import { useCallback, useEffect, useState } from "react";
import TableReorder from "./TableReorder";

const API_BASE_URL = "http://121.121.232.54:88/aero-foods";

function ReorderComponent() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/reorder_data.php`, {
        method: "GET",
      });
      const result = await response.json();
      setData(Array.isArray(result) ? result : []);
    } catch (error) {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="container-fluid">
      <h2 className="mb-0">Reorder Alerts</h2>
      <TableReorder
        data={data}
        loading={loading}
        apiBaseUrl={API_BASE_URL}
        onChanged={fetchData}
      />
    </div>
  );
}

export default ReorderComponent;
