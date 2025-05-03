import React, { useState,useEffect } from 'react';
 import Navbar from './Navbar';
 import Sidebar from './Sidebar';

 const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', { 
      minimumFractionDigits: 2,
      maximumFractionDigits: 2 
    }).format(num);
  };
  
  // Helper function to get month name
  const getMonthName = (month) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 
      'May', 'Jun', 'Jul', 'Aug', 
      'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return months[month - 1];
  };

 function Landing(){
      const [sidebarOpen, setSidebarOpen] = useState(true);

      const [reportData, setReportData] = useState(null);
      const [isLoading, setIsLoading] = useState(true);
      const [error, setError] = useState(null);
      const [isEditing, setIsEditing] = useState(false);
      const [formData, setFormData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        sales_target: 0,
        growth_target: 0,
        labor_target: 0,
        cogs_target: 0,
        atv_target: 0,
        mtd:0
      });
      
      // Fetch data on component mount
      useEffect(() => {
        fetchReportData();
      }, []);
      
      const fetchReportData = async () => {
        try {
          setIsLoading(true);
          const response = await fetch('http://121.121.232.54:88/aero-foods/target.php');
          const result = await response.json();
          
          if (result.data) {
            setReportData(result.data);
            setFormData({
              month: result.data.month,
              year: result.data.year,
              sales_target: result.data.sales_target,
              growth_target: result.data.growth_target,
              labor_target: result.data.labor_target,
              cogs_target: result.data.cogs_target,
              atv_target: result.data.atv_target,
              mtd: result.data.mtd

            });
          }
          setIsLoading(false);
        } catch (err) {
          setError('Failed to fetch data');
          setIsLoading(false);
        }
      };
      
      const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
          ...formData,
          [name]: name === 'month' || name === 'year' ? parseInt(value) : parseFloat(value)
        });
      };
      
      const handleSubmit = async (e) => {
        e.preventDefault();
        try {
          const response = await fetch('http://121.121.232.54:88/aero-foods/target.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...formData,
              user: 'web_user' // You might want to get this from auth context
            }),
          });
          
          const result = await response.json();
          
          if (result.success) {
            setIsEditing(false);
            fetchReportData(); // Refresh data
          } else {
            setError(result.error || 'Failed to save data');
          }
        } catch (err) {
          setError('Network error');
        }
      };
    
      if (isLoading) return <div className="text-center p-4">Loading...</div>;
      if (error) return <div className="text-center p-4 text-red-500">{error}</div>;
    
    return(
        <div style={{ height: '100vh', overflow: 'hidden' }}>

        <Navbar sidebarOpen={() => setSidebarOpen(!sidebarOpen)}/>
         <div className="d-flex" style={{ marginTop: '56px', height: 'calc(100vh - 56px)' }}>
         <Sidebar sidebarOpen={sidebarOpen} />
          
   
   <div
     className="w-100 d-flex" // Use Flexbox for the layout
     style={{
       marginLeft: sidebarOpen ? '250px' : '0',
       transition: 'margin-left 0.3s ease-in-out',
       height: '100%',
       overflowY: 'auto', // Ensure the content is scrollable if it overflows
     }}
   >
     {/* Table (70% width) */}
     <div
       style={{
         flex: '0 0 100%', // 70% width
         height: '100%',
         overflowY: 'auto', // Ensure the content is scrollable if it overflows
       }}
     >

<div style={{backgroundColor:'#f8d7da'}} className="max-w-4xl mx-auto p-4">
      <div className="border border-gray-300">
        {/* Header */}
        <div className="text-center p-2 border-b border-gray-300 bg-gray-100">
          <h1 className="text-xl font-bold">Monthly Reporting Book (MRB)</h1>
          <h2 className="text-lg">Mixue Jakel</h2>
        </div>
        
        {/* Main Table */}
        <div className='row'>
        <div className='col'>       
      
          <table style={{marginLeft:'20%'}} className="w-full border-collapse">
          <tbody>
            {/* Month/Year Row */}
            <tr>
              <td className="border border-gray-300 p-2 w-48">Month/Year</td>
              <td className="border border-gray-300 p-2 bg-yellow-200 text-center">
                {isEditing ? (
                  <div className="flex space-x-2">
                    <select 
                      name="month" 
                      value={formData.month} 
                      onChange={handleInputChange}
                      className="w-20 border p-1"
                    >
                      {Array.from({ length: 12 }, (_, i) => (
                        <option key={i+1} value={i+1}>{getMonthName(i+1)}</option>
                      ))}
                    </select>
                    <input 
                      type="number" 
                      name="year" 
                      value={formData.year} 
                      onChange={handleInputChange}
                      className="w-20 border p-1"
                    />
                  </div>
                ) : (
                  `${getMonthName(reportData?.month)}-${String(reportData?.year).slice(2)}`
                )}
              </td>
            </tr>
            
            {/* Sales Target Row */}
            <tr>
              <td className="border border-gray-300 p-2">Monthly Sales Target</td>
              <td className="border border-gray-300 p-2 bg-yellow-200 text-right">
                {isEditing ? (
                  <input 
                    type="number" 
                    name="sales_target" 
                    value={formData.sales_target} 
                    onChange={handleInputChange}
                    className="w-full border p-1 text-right"
                    step="0.01"
                  />
                ) : (
                  formatNumber(reportData?.sales_target || 0)
                )}
              </td>
            </tr>
            
            {/* Growth Target Row */}
            <tr>
              <td className="border border-gray-300 p-2">Growth % Target</td>
              <td className="border border-gray-300 p-2 bg-yellow-200 text-right">
                {isEditing ? (
                  <input 
                    type="number" 
                    name="growth_target" 
                    value={formData.growth_target} 
                    onChange={handleInputChange}
                    className="w-full border p-1 text-right"
                    step="0.01"
                  />
                ) : (
                  reportData?.growth_target || 0
                )}
              </td>
            </tr>
            
            {/* Month to Date Sales Row */}
           
            
            {/* KPI Header */}
            {/* <tr>
              <td colSpan={2} className="border border-gray-300 p-2 bg-yellow-300">
                KPI's
              </td>
            </tr> */}
            
            {/* Labor Target Row */}
            <tr>
              <td className="border border-gray-300 p-2">Labor Target (%)</td>
              <td className="border border-gray-300 p-2 bg-yellow-200 text-right">
                {isEditing ? (
                  <input 
                    type="number" 
                    name="labor_target" 
                    value={formData.labor_target} 
                    onChange={handleInputChange}
                    className="w-full border p-1 text-right"
                    step="0.01"
                  />
                ) : (
                  reportData?.labor_target || 0
                )}
              </td>
            </tr>
            
            {/* COGS Target Row */}
            <tr>
              <td className="border border-gray-300 p-2">COGS Target (%)</td>
              <td className="border border-gray-300 p-2 bg-yellow-200 text-right">
                {isEditing ? (
                  <input 
                    type="number" 
                    name="cogs_target" 
                    value={formData.cogs_target} 
                    onChange={handleInputChange}
                    className="w-full border p-1 text-right"
                    step="0.01"
                  />
                ) : (
                  reportData?.cogs_target || 0
                )}
              </td>
            </tr>
            
            {/* ATV Target Row */}
            <tr>
              <td className="border border-gray-300 p-2">Average Transaction Value (ATV) Target</td>
              <td className="border border-gray-300 p-2 bg-yellow-200 text-right">
                {isEditing ? (
                  <input 
                    type="number" 
                    name="atv_target" 
                    value={formData.atv_target} 
                    onChange={handleInputChange}
                    className="w-full border p-1 text-right"
                    step="0.01"
                  />
                ) : (
                  reportData?.atv_target || 0
                )}
              </td>
            </tr>
          </tbody>
        </table>
        </div>
        <div className='col'>
        <table  className="w-full border-collapse">
        <tr>
              <td className="border border-gray-300 p-2"><b>Month to Date Sales (RW) [MTD]</b></td>
              <td className="border border-gray-300 p-2 text-right">
              {
              // isEditing ? (
              //     <input 
              //       type="number" 
              //       name="mtd" 
              //       value={formData.mtd} 
              //       onChange={handleInputChange}
              //       className="w-full border p-1 text-right"
              //       step="0.01"
              //     />
              //   ) :
                 (
                  reportData?.mtd || 0
                )}
              {/* <td className="border border-gray-300 p-2">Growth Percentage</td>
              <td className="border border-gray-300 p-2 text-right"><span className="ml-4">{(reportData?.growth_target||0)/(reportData?.mtd ||0) }%</span></td> */}
              </td>
            </tr>
            <tr>
              <td className="border border-gray-300 p-2"><b>Total Labour Hours Used</b></td>
              <td className="border border-gray-300 p-2 text-right">
              {
              // isEditing ? (
              //     <input 
              //       type="number" 
              //       name="mtd" 
              //       value={formData.mtd} 
              //       onChange={handleInputChange}
              //       className="w-full border p-1 text-right"
              //       step="0.01"
              //     />
              //   ) :
                 (
                  reportData?.tlh || 0
                )}
              {/* <td className="border border-gray-300 p-2">Growth Percentage</td>
              <td className="border border-gray-300 p-2 text-right"><span className="ml-4">{(reportData?.growth_target||0)/(reportData?.mtd ||0) }%</span></td> */}
              </td>
            </tr>
        </table>
        </div>
        </div>
        {/* Edit/Save Buttons */}
        <div style={{float:'right'}} className="flex justify-end p-2 mt-4">
          {isEditing ? (
            <>
              <button 
                onClick={handleSubmit}
                className="bg-green-500 text-black px-4 py-2 rounded-md mr-2"
              >
                Save
              </button>
              <button 
                onClick={() => setIsEditing(false)}
                className="bg-gray-500 text-black px-4 py-2 rounded-md"
              >
                Cancel
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-blue-500 text-black px-4 py-2 rounded-md"
            >
              Edit
            </button>
          )}
        </div>
      </div>
    </div>



     </div>
   </div>
   
         </div>
       </div>
    )
 }

 export default Landing;