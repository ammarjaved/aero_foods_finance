// src/FormComponent.js
import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Table from './table';

function FormComponent() {
    const [formData, setFormData] = useState({
      month_date: new Date().toISOString().split('T')[0],
      // month: new Date().getMonth() + 1,
      // year: new Date().getFullYear(),
      day: new Date().getDate(),
      cash: '',
      touch_n_go: '',
      duit_now: '',
      voucher: '',
      visa_master: '',
      sales_walk_in: 0,
      shopee: '',
      grab: '',
      panda: '',
      sales_delivery: 0,
      total_sales: 0,
      month_date_sales: 0,
      transaction_count: 0,
      avg_transaction_value: 0,
      labour_hours_used: 0,
      sales_per_labour_hours: 0,
      image_pos: '',
      prev_day_balance: 0,
      next_day_balance: 0,
      //cash_in_hand: 0,
      actual_bank_amount: 0,
      cash_box_amount:0,
      variance: 0,
      bank_in_date: new Date().toISOString().split('T')[0],
      recipt_ref_no: '',
      remarks: '',
      image_recipt: ''
      });


     
      const [imagePreviews, setImagePreviews] = useState({
        image_pos: '',
        image_recipt: ''
      });
    
      const [isFormOpen, setIsFormOpen] = useState(false);
      const [isEditing, setIsEditing] = useState(false);
      const [mapKey, setMapKey] = useState(Date.now());

      const API_BASE_URL = 'http://121.121.232.54:88/aero-foods';


      const handleFileChange = (e) => {
        const { name, files } = e.target;
        
        if (files && files[0]) {
          // For file inputs, we need to handle them differently
          const file = files[0];
          
          // Create a preview URL for the image
          const previewUrl = URL.createObjectURL(file);
          
          // Update the image previews state
          setImagePreviews(prevState => ({
            ...prevState,
            [name]: previewUrl
          }));
          
          // Store the file object in formData
          setFormData(prevState => ({
            ...prevState,
            [name]: file
          }));
        }
      };

     
    
      const handleChange = async (e) => {
        const { name, value, type } = e.target;
        
        // Only process non-file inputs here
        // if (type !== 'file') {
        //   setFormData(prevState => ({
        //     ...prevState,
        //     [name]: value
        //   }));
        // }

        if (type !== 'file') {
          // Create updated form data
          const updatedFormData = {
            ...formData,
            [name]: value
          };

        if (['cash', 'touch_n_go', 'duit_now', 'voucher', 'visa_master'].includes(name)) {
          // Calculate the sum for sales_walk_in
          const sum = parseFloat(updatedFormData.cash || 0) +
                      parseFloat(updatedFormData.touch_n_go || 0) +
                      parseFloat(updatedFormData.duit_now || 0) +
                      parseFloat(updatedFormData.voucher || 0) +
                      parseFloat(updatedFormData.visa_master || 0);
          
          // Update sales_walk_in with the calculated sum
          updatedFormData.sales_walk_in = sum;
        }

        if (['shopee', 'grab', 'panda'].includes(name)) {
          // Calculate the sum for sales_walk_in
          const sum = parseFloat(updatedFormData.shopee || 0) +
                      parseFloat(updatedFormData.grab || 0) +
                      parseFloat(updatedFormData.panda || 0) ;
                     
          
          // Update sales_walk_in with the calculated sum
          updatedFormData.sales_delivery = sum;
        }


        const totalSales = parseFloat(updatedFormData.sales_walk_in || 0) +
        parseFloat(updatedFormData.sales_delivery || 0);

        updatedFormData.total_sales = totalSales;
       // updatedFormData.month_date_sales = totalSales;

        // if (['labour_hours_used'].includes(name)) {
        //   // Calculate the sum for sales_walk_in
        //   const sum = (parseFloat(updatedFormData.total_sales)/updatedFormData.labour_hours_used || 0).toFixed(2);
        //   // Update sales_walk_in with the calculated sum
        //   updatedFormData.sales_per_labour_hours = sum;
        // }

        if (['actual_bank_amount'].includes(name)) {
          // Calculate the sum for sales_walk_in
          const remaing = (parseFloat(updatedFormData.cash || 0)+parseFloat(updatedFormData.prev_day_balance || 0))-updatedFormData.actual_bank_amount;
          // Update sales_walk_in with the calculated sum
          updatedFormData.next_day_balance = remaing;
        }


      
      if (['cash_box_amount'].includes(name)) {
        // Calculate the sum for sales_walk_in
        const remaing = parseFloat(updatedFormData.cash_box_amount || 0)-updatedFormData.cash;
        // Update sales_walk_in with the calculated sum
        updatedFormData.variance = remaing;
      }

      let c_month=0;
      if(localStorage.getItem('month')){
         c_month=localStorage.getItem('month')
      }else{
        c_month=parseInt(new Date().getMonth())+1;

      }

      const response = await fetch('http://121.121.232.54:88/aero-foods/mtd_ts.php?date='+updatedFormData.month_date+'&month='+c_month+'&id='+updatedFormData.id, {
        method: 'GET'
      });
      
      const results = await response.json();
      
      if (response.ok) {
        //updatedFormData.month_date_sales=results.data.
        // if(results.data.tlh==="0"){
        // alert("please enter timesheet first");
        // }
        updatedFormData.labour_hours_used=results.data.tlh
        const sum = (parseFloat(updatedFormData.total_sales)/updatedFormData.labour_hours_used || 0).toFixed(2);
        updatedFormData.sales_per_labour_hours = sum;
        updatedFormData.month_date_sales = updatedFormData.total_sales+parseFloat(results.data.mtd);
        updatedFormData.prev_day_balance=parseFloat(results.data.pre)

      } 
        

        setFormData(updatedFormData);
        }


      };
    
      const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
          // Create a FormData object for handling file uploads
          const submitData = new FormData();
          
          // Append all form fields to the FormData
          Object.keys(formData).forEach(key => {
            if (key === 'image_pos' || key === 'image_recipt') {
              // Only append file if it exists and is a File object
              if (formData[key] instanceof File) {
                submitData.append(key, formData[key]);
              }
            } else {
              submitData.append(key, formData[key]);
            }
          });
          
          // Make the API call with FormData
          const response = await fetch('http://121.121.232.54:88/aero-foods/daily_sheet.php', {
            method: 'POST',
            body: submitData, // No need to set Content-Type header; browser will set it properly with boundary
          });
          
          const result = await response.json();
          
          if (response.ok) {
           // alert(result.message);
            
            // Create a complete record with the returned ID
            const updatedRecord = {
              ...formData,
              id: result.id
            };
            
            // Dispatch appropriate event based on operation type
            if (isEditing) {
              window.dispatchEvent(new CustomEvent('recordUpdated', { 
                detail: updatedRecord
              }));
            } else {
              window.dispatchEvent(new CustomEvent('newRecordAdded', { 
                detail: updatedRecord
              }));
            }
            
            resetForm();
            setIsFormOpen(false);
            window.location.reload();

          } else {
            throw new Error(result.error || 'Failed to save data');
          }
        } catch (error) {
          console.error('Error saving data:', error);
          alert('Error saving data. Please try again.');
        }
      };
      
      // Clean up object URLs when component unmounts or when previews change
      useEffect(() => {
        return () => {
          // Revoke any object URLs to avoid memory leaks
          Object.values(imagePreviews).forEach(preview => {
            if (preview) URL.revokeObjectURL(preview);
          });
        };
      }, [imagePreviews]);
    
      const resetForm = () => {
        // Clean up existing preview URLs
        Object.values(imagePreviews).forEach(preview => {
          if (preview) URL.revokeObjectURL(preview);
        });

        
        
        // Reset form data
        setFormData({
          month_date: new Date().toISOString().split('T')[0],
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
          day: new Date().getDate(),
          cash: 0,
          touch_n_go: 0,
          duit_now: 0,
          voucher: 0,
          visa_master: 0,
          sales_walk_in: 0,
          shopee: 0,
          grab: 0,
          panda: 0,
          sales_delivery: 0,
          total_sales: 0,
          month_date_sales: 0,
          transaction_count: 0,
          avg_transaction_value: 0,
          labour_hours_used: 0,
          sales_per_labour_hours: 0,
          image_pos: '',
          prev_day_balance: 0,
          next_day_balance: 0,
          //cash_in_hand: 0,
          actual_bank_amount: 0,
          cash_box_amount: 0,
          variance: 0,
          bank_in_date: new Date().toISOString().split('T')[0],
          recipt_ref_no: '',
          remarks: '',
          image_recipt: ''
        });
        
        // Reset image previews
        setImagePreviews({
          image_pos: '',
          image_recipt: ''
        });
        
        setMapKey(Date.now());
        setIsEditing(false);
      };
    
      const openNewForm = () => {
        resetForm();
        setIsFormOpen(true);
      };

      // const handleMonthTodate=async (date)=>{
      
      // }
    
      const handleRowClick =async (record) => {
        // First completely reset the form to clear any previous values
        resetForm();
        
        // Create a new object with all form fields explicitly set
        const updatedRecord = {
          ...formData, // Start with the default empty values
          ...record,    // Override with record values
        };

        let c_month=0;
        if(localStorage.getItem('month')){
           c_month=localStorage.getItem('month')
        }else{
          c_month=parseInt(new Date().getMonth())+1;
  
        }

        const response = await fetch('http://121.121.232.54:88/aero-foods/mtd_ts.php?date='+record.month_date+'&month='+c_month+'&id='+record.id, {
          method: 'GET'
        });
        
        const results = await response.json();
        
        if (response.ok) {
          //updatedFormData.month_date_sales=results.data.
          // if(results.data.tlh==="0"){
          // alert("please enter timesheet first");
          // }
          formData.labour_hours_used=results.data.tlh
          const sum = (parseFloat(formData.total_sales)/formData.labour_hours_used || 0).toFixed(2);
          formData.sales_per_labour_hours = sum;
          formData.month_date_sales = formData.total_sales+parseFloat(results.data.mtd);
          formData.prev_day_balance=parseFloat(results.data.pre)
  
        } 
       

        setFormData(updatedRecord);
        
        // If there are existing image URLs in the record, set them as previews
        if (record.image_pos) {
          setImagePreviews(prev => ({
            ...prev,
            image_pos: `${API_BASE_URL}/${record.image_pos}`
          }));
        }
        
        if (record.image_recipt) {
          setImagePreviews(prev => ({
            ...prev,
            image_recipt: `${API_BASE_URL}/${record.image_recipt}`
          }));
        }
        
        setMapKey(Date.now());
        setIsEditing(true);
        setIsFormOpen(true);
      };
      
      const closeForm = () => {
        setIsFormOpen(false);
      };

      const deleteRecord = async () => {
        if (!window.confirm(`Are you sure you want to delete`)) {
          return;
        }
        
        try {
          const response = await fetch('http://121.121.232.54:88/aero-foods/del.php', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({id: formData.id}),
          });
          
          const result = await response.json();
          
          if (result.success) {
            // Remove the deleted target from the list
            alert('Target deleted successfully');
            resetForm();
            setIsFormOpen(false);
            window.location.reload();

          } else {
            alert(result.error || 'Failed to delete target');
          }
        } catch (err) {
          console.error(err);
          alert('Network error');
        }
      }
      
      // Function to handle removing an image
      const handleRemoveImage = (fieldName) => {
        // Revoke the object URL if it exists
        if (imagePreviews[fieldName]) {
          URL.revokeObjectURL(imagePreviews[fieldName]);
        }
        
        // Clear the image preview
        setImagePreviews(prev => ({
          ...prev,
          [fieldName]: ''
        }));
        
        // Clear the file from formData
        setFormData(prev => ({
          ...prev,
          [fieldName]: ''
        }));
      };
    
      
  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div style={{backgroundColor:'#e80000'}} className="card-header  text-white d-flex justify-content-between align-items-center">
              <h2 className="mb-0">Daily Sheet</h2>
              {/* <button 
                className="btn btn-light" 
                onClick={openNewForm}
              >
                Add New Record
              </button> */}
            </div>
            </div>
            <div className="card-body">
              <Table  onRowClick={handleRowClick} />
            </div>
          
        </div>
      </div>

      {/* Sliding Form */}
      <div 
        className="position-fixed top-0 end-0 h-100 bg-white shadow-lg" 
        style={{
          width: '500px',
          transform: isFormOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          zIndex: 1050,
          overflowY: 'auto'
        }}
      >
        <div className="p-3">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>{isEditing ? 'Edit Record' : 'New Record'}</h3>
            <button className="btn btn-sm btn-outline-secondary" onClick={closeForm}>
              &times;
            </button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="row g-2">

                <div className="col-md-6" style={{backgroundColor:'#196F3D'}}>
                <div className="form-group">
                  <label className="form-label">Month Date</label>
                  <input
                    type="date"
                    name="month_date"
                    value={formData.month_date}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Month</label>
                  <input
                    type="number"
                    name="month"
                    value={formData.month}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div> */}

              {/* <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <input
                    type="number"
                    name="year"
                    value={formData.year}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div> */}

              <div style={{display:'none'}} className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Day</label>
                  <input
                    type="number"
                    name="day"
                    value={formData.day}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="col-md-6" style={{backgroundColor:'#196F3D'}}>
                <div className="form-group">
                  <label className="form-label">cash</label>
                  <input
                    type="number"
                    name="cash"
                    value={formData.cash}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>


              <div className="col-md-6" style={{backgroundColor:'#196F3D'}}>
                <div className="form-group">
                  <label className="form-label">Touch N GO</label>
                  <input
                    type="number"
                    name="touch_n_go"
                    value={formData.touch_n_go}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="col-md-6" style={{backgroundColor:'#196F3D'}}>
                <div className="form-group">
                  <label className="form-label">Duit Now</label>
                  <input
                    type="number"
                    name="duit_now"
                    value={formData.duit_now}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>


              <div className="col-md-6" style={{backgroundColor:'#196F3D'}}>
                <div className="form-group">
                  <label className="form-label">Voucher</label>
                  <input
                    type="number"
                    name="voucher"
                    value={formData.voucher}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>
              

              <div className="col-md-6" style={{backgroundColor:'#196F3D'}}>
                <div className="form-group">
                  <label className="form-label">visa_master</label>
                  <input
                    type="number"
                    name="visa_master"
                    value={formData.visa_master}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="col-md-6" style={{backgroundColor:'#196F3D'}}>
                <div className="form-group">
                  <label className="form-label">Sales Walk In</label>
                  <input
                    type="number"
                    name="sales_walk_in"
                    value={formData.sales_walk_in}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>


              <div className="col-md-6" style={{backgroundColor:'#2E86C1'}}>
                <div className="form-group">
                  <label className="form-label">Shopee</label>
                  <input
                    type="number"
                    name="shopee"
                    value={formData.shopee}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

           

              <div className="col-md-6" style={{backgroundColor:'#2E86C1'}}>
                <div className="form-group">
                  <label className="form-label">Grab</label>
                  <input
                    type="number"
                    name="grab"
                    value={formData.grab}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>


              <div className="col-md-6" style={{backgroundColor:'#2E86C1'}}>
                <div className="form-group">
                  <label className="form-label">Panda</label>
                  <input
                    type="number"
                    name="panda"
                    value={formData.panda}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="col-md-6" style={{backgroundColor:'#2E86C1'}}>
                <div className="form-group">
                  <label className="form-label">Sales Delivery</label>
                  <input
                    type="number"
                    name="sales_delivery"
                    value={formData.sales_delivery}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>


              <div className="col-md-6" style={{backgroundColor:'pink'}}>
                <div className="form-group">
                  <label className="form-label">Total Sales</label>
                  <input
                    type="number"
                    name="total_sales"
                    value={formData.total_sales}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>
            
         

             

              <div className="col-md-6" style={{backgroundColor:'yellow'}}>
                <div className="form-group">
                  <label className="form-label">Month Date Sales</label>
                  <input
                    type="number"
                    name="month_date_sales"
                    value={formData.month_date_sales}
                    onChange={handleChange}
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Transaction Count</label>
                  <input
                    type="number"
                    name="transaction_count"
                    value={formData.transaction_count}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

             

              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Avg Transaction Value</label>
                  <input
                    type="number"
                    name="avg_transaction_value"
                    value={formData.avg_transaction_value}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>


              
         

              <div className="col-md-6" style={{backgroundColor:'#8E44AD'}}>
                <div className="form-group">
                  <label className="form-label">Labour Hours Used</label>
                  <input
                    type="number"
                    name="labour_hours_used"
                    value={formData.labour_hours_used}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-md-6" style={{backgroundColor:'#8E44AD'}}>
                <div className="form-group">
                  <label className="form-label">Sales Per Labour Hours</label>
                  <input
                    type="number"
                    name="sales_per_labour_hours"
                    value={formData.sales_per_labour_hours}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

             

              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">POS Image</label>
                  <div className="mb-2">
                    <input
                      type="file"
                      name="image_pos"
                      onChange={handleFileChange}
                      className="form-control"
                      accept="image/*"
                    />
                  </div>
                  
                  {imagePreviews.image_pos && (
                    <div className="position-relative mt-2">
                      <img 
                        src={imagePreviews.image_pos} 
                        alt="POS Preview" 
                        className="img-thumbnail" 
                        style={{ maxHeight: '150px' }} 
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0"
                        onClick={() => handleRemoveImage('image_pos')}
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>
              

             

              <div className="col-md-6" style={{backgroundColor:'#C0392B',display:'none'}}>
                <div className="form-group">
                  <label className="form-label">Prev Day Balance</label>
                  <input
                    type="number"
                    name="prev_day_balance"
                    value={formData.prev_day_balance}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-md-6" style={{backgroundColor:'#C0392B'}}>
                <div className="form-group">
                  <label className="form-label">Actual Bank Amount</label>
                  <input
                    type="number"
                    name="actual_bank_amount"
                    value={formData.actual_bank_amount}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

           
              <div className="col-md-6" style={{backgroundColor:'#C0392B',display:'none'}}>
                <div className="form-group">
                  <label className="form-label">Next Day Balance</label>
                  <input
                    type="number"
                    name="next_day_balance"
                    value={formData.next_day_balance}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-md-6" style={{backgroundColor:'#C0392B'}}>
                <div className="form-group">
                  <label className="form-label">Cash Box Amount</label>
                  <input
                    type="number"
                    name="cash_box_amount"
                    value={formData.cash_box_amount}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Cash In Hand</label>
                  <input
                    type="number"
                    name="cash_in_hand"
                    value={formData.cash_in_hand}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div> */}

              <div className="col-md-6" style={{backgroundColor:'#C0392B'}}>
                <div className="form-group">
                  <label className="form-label">Variance</label>
                  <input
                    type="number"
                    name="variance"
                    value={formData.variance}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>



              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Bank in Date</label>
                  <input
                    type="date"
                    name="bank_in_date"
                    value={formData.bank_in_date}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Recipt Ref No</label>
                  <input
                    type="text"
                    name="recipt_ref_no"
                    value={formData.recipt_ref_no}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>


              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Remarks</label>
                  <input
                    type="text"
                    name="remarks"
                    value={formData.remarks}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>


              <div className="col-md-6">
                <div className="form-group">
                  <label className="form-label">Receipt Image</label>
                  <div className="mb-2">
                    <input
                      type="file"
                      name="image_recipt"
                      onChange={handleFileChange}
                      className="form-control"
                      accept="image/*"
                    />
                  </div>
                  
                  {imagePreviews.image_recipt && (
                    <div className="position-relative mt-2">
                      <img 
                        src={imagePreviews.image_recipt} 
                        alt="Receipt Preview" 
                        className="img-thumbnail" 
                        style={{ maxHeight: '150px' }} 
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0"
                        onClick={() => handleRemoveImage('image_recipt')}
                      >
                        &times;
                      </button>
                    </div>
                  )}
                </div>
              </div>



  
            </div>

            <div className="mt-4 d-flex justify-content-between">
              {/* <button type="button" className="btn btn-danger" onClick={deleteRecord}>
                Delete
              </button> */}
              <button type="submit" className="btn btn-primary">
                {isEditing ? 'Update' : 'Save'} 
              </button>
            </div>
          </form>



        </div>
      </div>

      {/* Overlay when form is open */}
      {isFormOpen && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 bg-dark"
          style={{ opacity: 0.5, zIndex: 1040 }}
          onClick={closeForm}
        ></div>
      )}
    </div>
  );
}

export default FormComponent;