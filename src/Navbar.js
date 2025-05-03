import React, { useState,useEffect } from 'react';

function Navbar({sidebarOpen}){
    
    return(
        <nav className="navbar navbar-dark fixed-top" style={{ borderBottom: "1px white solid",backgroundColor:'#e80000'}}>
        <div className="container-fluid">
          <div className="d-flex align-items-center">
            <button
              className="btn btn-link text-white me-3 p-0"
              onClick={sidebarOpen}
            >
              <span className="navbar-toggler-icon"></span>
            </button>
            <a className="navbar-brand fw-bold" href="#">MRB Mixue Jakel Mall</a>
          </div>
        </div>
      </nav>
    )
}

export default Navbar;