// src/FormComponent.js
import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Table from './table';

function FormComponent() {
  const [formData, setFormData] = useState({
    type:'',
    ba: '',
    tahun: new Date().getFullYear(),
    sn: '',
    tarikh_csp: '',
    jenis_kerja: '',
    nama_jalan: '',
    tarikh_lulus_opa_tnb: '',
    tarikh_fail_mo: '',
    pic_dbkl: '',
    file_no: '',
    pbt:'',
    jenis_bayaran: '',
    rm: '',
    status_permit: '',
    tarikh_permit: '',
    tarikh_tamat_kerja:'',
    tarikh_hantar_cbr_test: '',
    tarikh_siap_milling: '',
    tarikh_hantar_report: '',
    status_permit_teikini: '',
    catatan: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost/permit/save_permit.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        alert('Permit data saved successfully!');
        // // Reset form
        // setFormData({
        //   ba: '',
        //   tahun: new Date().getFullYear(),
        //   sn: '',
        //   tarikh_csp: '',
        //   jenis_kerja: '',
        //   nama_jalan: '',
        //   tarikh_ulang_dpk_tsd: '',
        //   tarikh_fail_mo: '',
        //   pic_dbkl: '',
        //   file_no: '',
        //   jenis_bayaran: '',
        //   rm: '',
        //   status_permit: '',
        //   tarikh_permit_tamat: '',
        //   tarikh_hantar_ciri_teknikal: '',
        //   tarikh_siap_msg365: '',
        //   tarikh_hantar_report: '',
        //   status_permit_untuk_pembayaran: '',
        //   catatan: ''
        // });
      } else {
        throw new Error(result.message || 'Failed to save permit data');
      }
    } catch (error) {
      console.error('Error saving permit data:', error);
      alert('Error saving permit data. Please try again.');
    }
  };

  return (
    <div className='row g-2'>
    <div className='col-md-12'>
    <div className="container-fluid" style={{paddingLeft:'0px',paddingRight:'0px'}}>
      <div className="card" style={{maxWidth: '100%'}}>
        <div className="card-header bg-primary text-white">
          <h2 className="mb-0">Permit Records</h2>
        </div>
        <div className="card-body" style={{overflow: 'scroll'}}>
    <Table />
    </div>
    </div>
    </div>
    </div>  
    <div className='col-md-6'>
    <div className="container-fluid" style={{paddingLeft:'0px',paddingRight:'0px',overflow: 'hidden'}}>
      <div className="card" style={{maxWidth: '100%'}}>
        <div className="card-header bg-primary text-white">
          <h2 className="mb-0">Permit Records Entry Form</h2>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="row g-1">
              {/* BA */}

              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <input
                    type="text"
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">BA</label>
                  <input
                    type="text"
                    name="ba"
                    value={formData.ba}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Tahun */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Tahun</label>
                  <input
                    type="number"
                    name="tahun"
                    value={formData.tahun}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* SN */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">SN</label>
                  <input
                    type="text"
                    name="sn"
                    value={formData.sn}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Tarikh CSP */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Tarikh CSP</label>
                  <input
                    type="date"
                    name="tarikh_csp"
                    value={formData.tarikh_csp}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Jenis Kerja */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Jenis Kerja</label>
                  <input
                    type="text"
                    name="jenis_kerja"
                    value={formData.jenis_kerja}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Nama Jalan */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Nama Jalan</label>
                  <input
                    type="text"
                    name="nama_jalan"
                    value={formData.nama_jalan}
                    onChange={handleChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              {/* Tarikh Ulang DPK TSD */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Tarikh Lulus OPA TNB</label>
                  <input
                    type="date"
                    name="tarikh_lulus_opa_tnb"
                    value={formData.tarikh_lulus_opa_tnb}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* PIC DBKL */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">PIC DBKL</label>
                  <input
                    type="text"
                    name="pic_dbkl"
                    value={formData.pic_dbkl}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* File No */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">File No</label>
                  <input
                    type="text"
                    name="file_no"
                    value={formData.file_no}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Jenis Bayaran */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Jenis Bayaran</label>
                  <input
                    type="text"
                    name="jenis_bayaran"
                    value={formData.jenis_bayaran}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* RM */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">RM</label>
                  <input
                    type="number"
                    step="0.01"
                    name="rm"
                    value={formData.rm}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Status Permit */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Status Permit</label>
                  <input
                    type="text"
                    name="status_permit"
                    value={formData.status_permit}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Tarikh Permit Tamat */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Tarikh Permit</label>
                  <input
                    type="date"
                    name="tarikh_permit"
                    value={formData.tarikh_permit}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">tarikh_tamat_kerja</label>
                  <input
                    type="date"
                    name="tarikh_tamat_kerja"
                    value={formData.tarikh_tamat_kerja}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Tarikh Hantar Ciri Teknikal */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Tarikh Hantar Cbr Test</label>
                  <input
                    type="date"
                    name="tarikh_hantar_cbr_test"
                    value={formData.tarikh_hantar_cbr_test}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Tarikh Siap MSG365 */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Tarikh Siap Milling</label>
                  <input
                    type="date"
                    name="tarikh_siap_milling"
                    value={formData.tarikh_siap_milling}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Tarikh Hantar Report</label>
                  <input
                    type="date"
                    name="tarikh_hantar_report"
                    value={formData.tarikh_hantar_report}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Status Permit Untuk Pembayaran */}
              <div className="col-md-4">
                <div className="form-group">
                  <label className="form-label">Status Permit Teikini</label>
                  <input
                    type="text"
                    name="status_permit_teikini"
                    value={formData.status_permit_teikini}
                    onChange={handleChange}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Catatan */}
              <div className="col-4">
                <div className="form-group">
                  <label className="form-label">Catatan</label>
                  <textarea
                    name="catatan"
                    value={formData.catatan}
                    onChange={handleChange}
                    className="form-control"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 text-end">
              <button type="submit" className="btn btn-primary">
                Save Permit Data
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}

export default FormComponent;