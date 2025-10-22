import React, { useState, useEffect } from "react";
import ViewAuditComponent from "./ViewAuditComponent";

const AuditComponent = () => {
  const [audits, setAudits] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState("create");
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [currentAuditData, setCurrentAuditData] = useState({});
  const [auditItems, setAuditItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editingAuditDate, setEditingAuditDate] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/GetAuditData.php"
      );
      const fetchedData = await response.json();
      setAuditItems(fetchedData);

      // Initialize current audit data after fetching
      const initData = {};
      fetchedData.forEach((item) => {
        initData[item.id] = {
          ...item,
          status: "Compliant",
          images: [],
        };
      });
      setCurrentAuditData(initData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditAudit = (audit) => {
    setEditMode(true);
    setEditingAuditDate(audit.date);
    setViewMode("create");

    // Convert audit items to currentAuditData format
    const editData = {};
    audit.items.forEach((item) => {
      editData[item.id] = {
        id: item.id,
        id_type: item.type,
        type: item.type,
        name: item.name,
        item: item.item,
        evalulation: item.evaluation,
        point: item.points.toString(),
        status: item.status,
        images: item.images.map((imgPath, index) => ({
          id: Date.now() + index,
          url: `http://121.121.232.54:88/aero-foods/${imgPath}`,
          name: imgPath,
          isExisting: true,
          serverPath: imgPath,
        })),
      };
    });
    setCurrentAuditData(editData);
  };

  const handleImageUpload = (itemId, event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    const currentImages = currentAuditData[itemId]?.images?.length || 0;
    if (currentImages >= 3) {
      alert("Maximum 3 images allowed per item");
      return;
    }

    files.forEach((file, index) => {
      if (currentImages + index >= 3) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentAuditData((prev) => ({
          ...prev,
          [itemId]: {
            ...prev[itemId],
            images: [
              ...(prev[itemId]?.images || []),
              {
                id: Date.now() + Math.random(),
                url: e.target.result,
                name: file.name,
                isExisting: false,
              },
            ],
          },
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (itemId, imageId) => {
    setCurrentAuditData((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        images: prev[itemId].images.filter((img) => img.id !== imageId),
      },
    }));
  };

  const updateItemStatus = (itemId, status) => {
    setCurrentAuditData((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        status: status,
      },
    }));
  };

  const saveAudit = async () => {
    const auditDate = editMode
      ? editingAuditDate
      : new Date().toISOString().split("T")[0];

    // Prepare audit data with correct points based on compliance status
    const auditDataToSave = {};
    Object.keys(currentAuditData).forEach((itemId) => {
      const itemData = currentAuditData[itemId];

      // Handle images - keep existing server paths and new base64
      const processedImages =
        itemData.images?.map((img) => {
          if (img.isExisting) {
            return { url: img.serverPath, isExisting: true };
          }
          return { url: img.url, isExisting: false };
        }) || [];

      auditDataToSave[itemId] = {
        ...itemData,
        point: itemData.status === "Non-compliant" ? "0" : itemData.point,
        images: processedImages,
      };
    });

    const endpoint = editMode
      ? "http://121.121.232.54:88/aero-foods/update_audit.php"
      : "http://121.121.232.54:88/aero-foods/save_audit.php";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audit_date: auditDate,
          audit_data: auditDataToSave,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Server response:", result);
      alert(
        editMode ? "Audit updated successfully!" : "Audit saved successfully!"
      );

      // Reset form after successful save
      setEditMode(false);
      setEditingAuditDate(null);
      const initData = {};
      auditItems.forEach((item) => {
        initData[item.id] = {
          ...item,
          status: "Compliant",
          images: [],
        };
      });
      setCurrentAuditData(initData);
    } catch (error) {
      console.error("Error saving audit:", error);
      alert(
        `Failed to ${editMode ? "update" : "save"} audit. Please try again.`
      );
    }
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditingAuditDate(null);
    const initData = {};
    auditItems.forEach((item) => {
      initData[item.id] = {
        ...item,
        status: "Compliant",
        images: [],
      };
    });
    setCurrentAuditData(initData);
  };

  const calculateScore = (auditData) => {
    let totalScore = 0;
    let maxScore = 0;

    auditItems.forEach((item) => {
      maxScore += parseInt(item.point) || 0;
      const itemData = auditData[item.id];
      if (itemData) {
        if (itemData.status === "Compliant") {
          totalScore += parseInt(item.point) || 0;
        }
      }
    });

    return {
      totalScore,
      maxScore,
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
    };
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Compliant":
        return <i className="fas fa-check text-success fs-5"></i>;
      case "Non-compliant":
        return <i className="fas fa-times text-danger fs-5"></i>;
      default:
        return null;
    }
  };

  const groupedItems = auditItems.reduce((acc, item) => {
    if (!acc[item.type]) {
      acc[item.type] = [];
    }
    acc[item.type].push(item);
    return acc;
  }, {});

  const showImageModal = (imageUrl) => {
    const modalHtml = `
      <div class="modal fade show d-block" style="background-color: rgba(0,0,0,0.5)">
        <div class="modal-dialog modal-lg">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Image Preview</h5>
              <button type="button" class="btn-close" onclick="this.closest('.modal').remove()"></button>
            </div>
            <div class="modal-body text-center">
              <img src="${imageUrl}" class="img-fluid" />
            </div>
          </div>
        </div>
      </div>
    `;

    const modalDiv = document.createElement("div");
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);
  };

  const currentScore = calculateScore(currentAuditData);

  if (loading) {
    return (
      <>
        <link
          href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css"
          rel="stylesheet"
        />
        <div className="container-fluid py-4 bg-light min-vh-100 d-flex justify-content-center align-items-center">
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading audit data...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <link
        href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.0/css/bootstrap.min.css"
        rel="stylesheet"
      />
      <link
        href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"
        rel="stylesheet"
      />

      <style>{`
        .audit-image {
          width: 60px;
          height: 60px;
          object-fit: cover;
          cursor: pointer;
        }
        .section-header {
          background-color: #f8f9fa;
          border-left: 4px solid #dc3545;
        }
        .score-display {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 10px;
          color: white;
          padding: 1rem;
          margin-bottom: 1rem;
        }
        .edit-mode-badge {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
      `}</style>

      <div className="container-fluid py-4 bg-light min-vh-100">
        <div className="row justify-content-center">
          <div className="col-12">
            <div className="card shadow">
              <div className="card-header bg-danger text-white">
                <div className="d-flex justify-content-between align-items-center">
                  <h1 className="h3 mb-0">
                    <i className="fas fa-clipboard-check me-2"></i>
                    Audit
                    {editMode && (
                      <span className="badge edit-mode-badge ms-2">
                        <i className="fas fa-edit me-1"></i>
                        Edit Mode
                      </span>
                    )}
                  </h1>
                  <div className="btn-group" role="group">
                    <button
                      type="button"
                      className={`btn ${
                        viewMode === "create"
                          ? "btn-light"
                          : "btn-outline-light"
                      }`}
                      onClick={() => {
                        setViewMode("create");
                        if (!editMode) cancelEdit();
                      }}
                    >
                      <i className="fas fa-camera me-1"></i>
                      {editMode ? "Edit Audit" : "Create Audit"}
                    </button>
                    <button
                      type="button"
                      className={`btn ${
                        viewMode === "view" ? "btn-light" : "btn-outline-light"
                      }`}
                      onClick={() => {
                        setViewMode("view");
                        if (editMode) {
                          const confirm = window.confirm(
                            "You have unsaved changes. Do you want to discard them?"
                          );
                          if (confirm) {
                            cancelEdit();
                          } else {
                            setViewMode("create");
                          }
                        }
                      }}
                    >
                      <i className="fas fa-eye me-1"></i>
                      View Audits
                    </button>
                  </div>
                </div>
              </div>

              <div className="card-body">
                {viewMode === "create" && (
                  <div>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h2 className="h4 mb-0">
                        {editMode
                          ? `Edit Audit - ${editingAuditDate}`
                          : `New Audit - ${new Date().toLocaleDateString()}`}
                      </h2>
                      <div>
                        {editMode && (
                          <button
                            onClick={cancelEdit}
                            className="btn btn-secondary me-2"
                          >
                            <i className="fas fa-times me-1"></i>
                            Cancel
                          </button>
                        )}
                        <button onClick={saveAudit} className="btn btn-success">
                          <i className="fas fa-save me-1"></i>
                          {editMode ? "Update Audit" : "Save Audit"}
                        </button>
                      </div>
                    </div>

                    <div className="score-display text-center">
                      <h4 className="mb-1">Current Audit Score</h4>
                      <div className="row">
                        <div className="col-md-4">
                          <div className="h5 mb-0">
                            {currentScore.totalScore}
                          </div>
                          <small>Points Earned</small>
                        </div>
                        <div className="col-md-4">
                          <div className="h5 mb-0">{currentScore.maxScore}</div>
                          <small>Total Points</small>
                        </div>
                        <div className="col-md-4">
                          <div className="h5 mb-0">
                            {currentScore.percentage}%
                          </div>
                          <small>Percentage</small>
                        </div>
                      </div>
                    </div>

                    {Object.entries(groupedItems).map(([type, items]) => (
                      <div key={type} className="mb-4">
                        <div className="section-header p-3 mb-3">
                          <h3 className="h5 mb-0">
                            {items[0]?.name} ({items.length} items)
                          </h3>
                        </div>

                        <div className="row g-3">
                          {items.map((item) => (
                            <div key={item.id} className="col-12">
                              <div className="card">
                                <div className="card-body">
                                  <div className="row">
                                    <div className="col-lg-8">
                                      <div className="d-flex justify-content-between align-items-start mb-3">
                                        <div>
                                          <h6 className="card-title">
                                            {item.item}
                                          </h6>
                                          <small className="text-muted">
                                            {item.evalulation} | Points:{" "}
                                            {item.point}
                                          </small>
                                        </div>
                                        <div>
                                          {getStatusIcon(
                                            currentAuditData[item.id]?.status
                                          )}
                                        </div>
                                      </div>

                                      <div
                                        className="btn-group mb-3"
                                        role="group"
                                      >
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateItemStatus(
                                              item.id,
                                              "Compliant"
                                            )
                                          }
                                          className={`btn btn-sm ${
                                            currentAuditData[item.id]
                                              ?.status === "Compliant"
                                              ? "btn-success"
                                              : "btn-outline-success"
                                          }`}
                                        >
                                          <i className="fas fa-check me-1"></i>
                                          Compliant
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            updateItemStatus(
                                              item.id,
                                              "Non-compliant"
                                            )
                                          }
                                          className={`btn btn-sm ${
                                            currentAuditData[item.id]
                                              ?.status === "Non-compliant"
                                              ? "btn-danger"
                                              : "btn-outline-danger"
                                          }`}
                                        >
                                          <i className="fas fa-times me-1"></i>
                                          Non-Compliant
                                        </button>
                                      </div>
                                    </div>

                                    <div className="col-lg-4">
                                      <div className="mb-2">
                                        <small className="text-muted">
                                          <i className="fas fa-images me-1"></i>
                                          Images (
                                          {currentAuditData[item.id]?.images
                                            ?.length || 0}
                                          /3)
                                        </small>
                                      </div>

                                      <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) =>
                                          handleImageUpload(item.id, e)
                                        }
                                        className="form-control form-control-sm mb-2"
                                        disabled={
                                          currentAuditData[item.id]?.images
                                            ?.length >= 3
                                        }
                                      />

                                      <div className="d-flex flex-wrap gap-1">
                                        {currentAuditData[item.id]?.images?.map(
                                          (image) => (
                                            <div
                                              key={image.id}
                                              className="position-relative"
                                            >
                                              <img
                                                src={image.url}
                                                alt={image.name}
                                                className="audit-image rounded border"
                                                onClick={() =>
                                                  showImageModal(image.url)
                                                }
                                              />
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  removeImage(item.id, image.id)
                                                }
                                                className="btn btn-danger btn-sm position-absolute top-0 end-0 p-1"
                                                style={{ fontSize: "0.7rem" }}
                                              >
                                                <i className="fas fa-times"></i>
                                              </button>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {viewMode === "view" && (
                  <ViewAuditComponent onEditAudit={handleEditAudit} />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuditComponent;
