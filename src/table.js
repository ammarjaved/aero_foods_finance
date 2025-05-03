import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function Table({ onRowClick }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(31);
  const [filterValues, setFilterValues] = useState({});
  const [filteredData, setFilteredData] = useState([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const date = new Date();
  const monthIndex = date.getMonth();
  const monthNumber = monthIndex + 1;
  const [selectedMonth, setSelectedMonth] = useState(monthNumber);


  const handleMonthChange = (e) => {
    const monthValue = e.target.value;
    localStorage.setItem('month',monthValue);
    setSelectedMonth(monthValue);
    fetchData(monthValue); // Call your fetchData function with the selected month value
  };

  // Subscribe to a custom event for new records
  useEffect(() => {
    const monthvalue = localStorage.getItem('month');
    if(monthvalue){
      fetchData(monthvalue);
      setSelectedMonth(monthvalue)

    }else{
    fetchData(selectedMonth);
    }

    // Create event listeners for record updates
    window.addEventListener('newRecordAdded', handleNewRecord);
    window.addEventListener('recordUpdated', handleRecordUpdate);
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('newRecordAdded', handleNewRecord);
      window.removeEventListener('recordUpdated', handleRecordUpdate);
    };
  }, []);

  // Apply filters when data or filter values change
  useEffect(() => {
    applyFilters();
  }, [data, filterValues]);

  const fetchData = (month) => {
    setLoading(true);
    // Fetch data from PHP backend
    fetch('http://121.121.232.54:88/aero-foods/fetchData.php?month='+month)
      .then((response) => response.json())
      .then((fetchedData) => {
        setData(fetchedData);
        setFilteredData(fetchedData);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error fetching data:', error);
        setLoading(false);
      });
  };

  // Handler for new record event
  const handleNewRecord = (event) => {
    const newRecord = event.detail;
    setData(prevData => [newRecord, ...prevData]);
  };

  // Handler for updated record event
  const handleRecordUpdate = (event) => {
    const updatedRecord = event.detail;
    setData(prevData => prevData.map(record => 
      record.id === updatedRecord.id ? updatedRecord : record
    ));
  };

  // Apply filters to the data
  const applyFilters = () => {
    let filtered = [...data];
    
    // Apply each filter if it has a value
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        filtered = filtered.filter(record => 
          record[key] && 
          record[key].toString().toLowerCase().includes(value.toLowerCase())
        );
      }
    });
    
    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle filter input change
  const handleFilterChange = (key, value) => {
    setFilterValues(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterValues({});
  };

  // Toggle filter panel
  const toggleFilterPanel = () => {
    setIsFilterPanelOpen(!isFilterPanelOpen);
  };

  // Column definitions with friendly names and custom styling for specific columns
  const columns = [
    // { key: 'id', label: 'ID' },
    { key: 'month_date', label: 'Month Date'},
    { key: 'day', label: 'Day' },
    // { key: 'month', label: 'Month' },
    // { key: 'year', label: 'Year' },2E86C1,8E44AD,B7950B,283747,C0392B
    { 
      key: 'cash', 
      label: 'Cash',
      headerStyle: { backgroundColor: '#196F3D' },
      cellStyle: { backgroundColor: '#196F3D' }
    },
    { 
      key: 'touch_n_go', 
      label: 'Touch n Go',
      headerStyle: { backgroundColor: '#196F3D' },
      cellStyle: { backgroundColor: '#196F3D' }
    },
    { 
      key: 'duit_now', 
      label: 'DuitNow',
      headerStyle: { backgroundColor: '#196F3D' },
      cellStyle: { backgroundColor: '#196F3D' }
    },
    { 
      key: 'voucher', 
      label: 'Voucher',
      headerStyle: { backgroundColor: '#196F3D' },
      cellStyle: { backgroundColor: '#196F3D' }
    },
    { 
      key: 'visa_master', 
      label: 'Visa/Master',
      headerStyle: { backgroundColor: '#196F3D' },
      cellStyle: { backgroundColor: '#196F3D' }
    },
    { 
      key: 'sales_walk_in', 
      label: 'Walk-in Sales',
      headerStyle: { backgroundColor: '#196F3D' },
      cellStyle: { backgroundColor: '#196F3D' }
    },
    { key: 'shopee', label: 'Shopee',
      headerStyle: { backgroundColor: '#2E86C1' },
      cellStyle: { backgroundColor: '#2E86C1' }
     },
    { key: 'grab', label: 'Grab',
      headerStyle: { backgroundColor: '#2E86C1' },
      cellStyle: { backgroundColor: '#2E86C1' } 
    },
    { key: 'panda', label: 'Foodpanda',
      headerStyle: { backgroundColor: '#2E86C1' },
      cellStyle: { backgroundColor: '#2E86C1' }
     },
    { key: 'sales_delivery', label: 'Delivery Sales',
      headerStyle: { backgroundColor: '#2E86C1' },
      cellStyle: { backgroundColor: '#2E86C1' } 
    },

    { key: 'total_sales', label: 'Total Sales',
      headerStyle: { backgroundColor: '#B7950B' },
    cellStyle: { backgroundColor: '#B7950B' }  
  },
    { key: 'month_date_sales', label: 'Month To Date Sales',
      headerStyle: { backgroundColor: '#B7950B' },
    cellStyle: { backgroundColor: '#B7950B' }  
  },
    { key: 'transaction_count', label: 'Transaction Count' },
    { key: 'avg_transaction_value', label: 'Avg Transaction' },
    { key: 'labour_hours_used', label: 'Labour Hours',
      headerStyle: { backgroundColor: '#8E44AD' },
    cellStyle: { backgroundColor: '#8E44AD' }  
     },
    { key: 'sales_per_labour_hours', label: 'Sales/Labour Hour',
      headerStyle: { backgroundColor: '#8E44AD' },
    cellStyle: { backgroundColor: '#8E44AD' }  
     },
  //   { key: 'prev_day_balance', label: 'Previous Day Balance' ,
  //     headerStyle: { backgroundColor: '#C0392B' },
  //   cellStyle: { backgroundColor: '#C0392B' }  
  // },
  //   { key: 'next_day_balance', label: 'Next Day Balance',
  //     headerStyle: { backgroundColor: '#C0392B' },
  //   cellStyle: { backgroundColor: '#C0392B' }  
  //  },
    { key: 'actual_bank_amount', label: 'Actual Bank Amount',
      headerStyle: { backgroundColor: '#C0392B' },
    cellStyle: { backgroundColor: '#C0392B' }  
   },
    { key: 'cash_box_amount', label: 'Cash Box Amount',
      headerStyle: { backgroundColor: '#C0392B' },
    cellStyle: { backgroundColor: '#C0392B' }   },
    { key: 'variance', label: 'Variance' ,
      headerStyle: { backgroundColor: '#C0392B' },
    cellStyle: { backgroundColor: '#C0392B' }  
  },
    { key: 'bank_in_date', label: 'Bank-in Date' },
    { key: 'recipt_ref_no', label: 'Receipt Ref No.' },
    { key: 'remarks', label: 'Remarks' },
  ];

  // Specify which columns you want to include in the filter
  const filterableColumns = [
    // { key: 'day', label: 'Day' },
    { key: 'month_date', label: 'Month Date' },
    // { key: 'year', label: 'Year' }
  ];

  const days = [
    "Sun","Mon", "Tue", "Wed", "Thu", "Fri", "Sat"
  ];

  // Calculate pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredData.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredData.length / recordsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  // Previous and next page handlers
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filterValues).some(value => value && value.trim() !== '');

  return (
    <div className="container-fluid mt-2">
      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Filter section */}
          <div className="card mb-3">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center">
                <button 
                  className="btn btn-sm btn-link p-0 me-2" 
                  onClick={toggleFilterPanel}
                  aria-expanded={isFilterPanelOpen}
                  aria-controls="filterPanel"
                >
                  <i className={`bi ${isFilterPanelOpen ? 'bi-chevron-down' : 'bi-chevron-right'}`}></i>
                </button>
                <h5 className="mb-0">
                  Filters {hasActiveFilters && <span className="badge bg-primary ms-2">Active</span>}
                </h5>
              </div>
              <div>
                {hasActiveFilters && (
                  <button 
                    className="btn btn-sm btn-outline-secondary" 
                    onClick={clearFilters}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            {isFilterPanelOpen && (
              <div className="card-body" id="filterPanel">
                <div className="row row-cols-1 row-cols-md-3 row-cols-lg-4 g-2">
                  {filterableColumns.map((column) => (
                    <div className="col" key={`filter-${column.key}`}>
                      <div className="form-floating">
                        <input
                          type="date"
                          className="form-control"
                          id={`filter-${column.key}`}
                          placeholder={column.label}
                          value={filterValues[column.key] || ''}
                          onChange={(e) => handleFilterChange(column.key, e.target.value)}
                        />
                        <label htmlFor={`filter-${column.key}`}>{column.label}</label>
                      </div>
                    </div>
                  ))}

            <div className="col">
              <div className="form-floating">
              <select
                className="form-select"
                id="monthSelect"
                value={selectedMonth}
                onChange={handleMonthChange}
              >
                  <option value="">Select month</option>
                  <option value="1">January</option>
                  <option value="2">February</option>
                  <option value="3">March</option>
                  <option value="4">April</option>
                  <option value="5">May</option>
                  <option value="6">June</option>
                  <option value="7">July</option>
                  <option value="8">August</option>
                  <option value="9">September</option>
                  <option value="0">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
                <label htmlFor="monthSelect">Month</label>
              </div>
            </div>

                </div>
              </div>
            )}
          </div>

          {/* Pagination controls - top */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div>
              Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredData.length)} of {filteredData.length} records
            </div>
            <div className="d-flex align-items-center">
              <label className="me-2">Records per page:</label>
              <select 
                className="form-select form-select-sm" 
                value={recordsPerPage}
                onChange={(e) => setRecordsPerPage(Number(e.target.value))}
                style={{ width: 'auto' }}
              >
                <option value={31}>31</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-responsive">
            <table className="table table-striped table-hover table-bordered">
            <thead>
              <tr>
                {columns.map((column, index) => {
                  const prevColumn = columns[index - 1];

                  if (column.key === 'month_date') {
                    return (
                      <th 
                        key={column.key} 
                        style={column.headerStyle || {}}
                      >
                        {column.label}
                      </th>
                    );
                  } else {
                    return (
                      <th 
                        key={column.key} 
                        style={column.headerStyle || {}}
                      >
                        {column.label}
                      </th>
                    );
                  }
                })}
              </tr>
            </thead>
              <tbody>
                {currentRecords.length > 0 ? (
                  currentRecords.map((record) => (
                    <tr 
                      key={record.id} 
                      onClick={() => onRowClick(record)}
                      style={{ cursor: 'pointer' }}
                    >
                      {columns.map((column) => {
                        if (column.key === 'month_date') {
                          return (
                            <td
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                            >
                              {record[column.key]}
                            </td>
                          );
                        } else if (column.key === 'day') {
                          return (
                            <td 
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                            >
                              {days[(record[column.key])]}
                            </td>
                          );
                        } else {
                          return (
                            <td 
                              key={`${record.id}-${column.key}`}
                              style={column.cellStyle || {}}
                            >
                              {record[column.key]}
                            </td>
                          );
                        }
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="text-center">No records found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination controls - bottom */}
          <nav aria-label="Page navigation">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" style={{backgroundColor:'#F8D7DA'}} onClick={goToPreviousPage}>Previous</button>
              </li>
              
              {/* Display page numbers with ellipsis for large sets */}
              {Array.from({ length: totalPages }).map((_, index) => {
                const pageNumber = index + 1;
                
                // Show first page, last page, current page, and pages around current
                if (
                  pageNumber === 1 || 
                  pageNumber === totalPages || 
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <li 
                      key={pageNumber} 
                      className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}
                    >
                      <button  style={{backgroundColor:'#E80000'}}
                        className="page-link" 
                        onClick={() => paginate(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </li>
                  );
                } 
                // Show ellipsis
                else if (
                  (pageNumber === 2 && currentPage > 3) || 
                  (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                ) {
                  return <li key={pageNumber} className="page-item disabled"><span className="page-link">...</span></li>;
                }
                
                return null;
              })}
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button style={{backgroundColor:'#F8D7DA'}} className="page-link" onClick={goToNextPage}>Next</button>
              </li>
            </ul>
          </nav>
        </>
      )}
    </div>
  );
}

export default Table;