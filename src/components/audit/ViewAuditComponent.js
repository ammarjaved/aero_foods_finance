import React, { useState, useEffect } from "react";

const ViewAuditComponent = ({ onEditAudit }) => {
  const [audits, setAudits] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedAudit, setSelectedAudit] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAuditData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/audit-php/GetAuditDone.php"
      );
      const fetchedData = await response.json();

      const groupedAudits = fetchedData.reduce((acc, item) => {
        const date = item.audit_date;
        if (!acc[date]) {
          acc[date] = {
            items: [],
            audit_code: item.audit_code || "",
            auditor_name: item.auditor_name || "",
          };
        }
        acc[date].items.push({
          id: item.audit_items_id,
          type: item.audit_type_code,
          name: item.audit_type_name,
          evaluation: item.audit_type_evaluation,
          item: item.audit_item,
          points: parseInt(item.audit_item_marks) || 0,
          pointsObtain: parseInt(item.marks_obtain) || 0,
          status: item.audit_status_name,
          images: [
            item.audit_image_1,
            item.audit_image_2,
            item.audit_image_3,
          ].filter((img) => img && img.trim() !== ""),
        });
        return acc;
      }, {});

      const auditArray = Object.keys(groupedAudits).map((date) => ({
        date,
        items: groupedAudits[date].items,
        audit_code: groupedAudits[date].audit_code,
        auditor_name: groupedAudits[date].auditor_name,
        id: date.replace(/-/g, ""),
      }));

      setAudits(auditArray);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching audit data:", error);
      setLoading(false);
    }
  };

  const deleteAudit = async (audit) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this audit?"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/audit-php/deleteaudit.php",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            audit_date: audit.date,
          }),
        }
      );

      const data = await response.json();
      alert(data.message);
      fetchAuditData();
    } catch (error) {
      console.log("Error :", error);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const getAuditsByDate = (date) => {
    return audits.filter((audit) => audit.date === date);
  };

  const calculateScore = (items) => {
    let totalScore = 0;
    let maxScore = 0;

    items.forEach((item) => {
      maxScore += item.points;
      totalScore += item.pointsObtain;
    });

    const firstTwoNonCompliant =
      items.length >= 2 &&
      items.slice(0, 2).every((item) => item.status === "Non-compliant");

    let status;
    if (firstTwoNonCompliant) {
      status = "FAIL";
    } else if (totalScore >= 120) {
      status = "PASS";
    } else {
      status = "FAIL";
    }

    return {
      totalScore,
      maxScore,
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      status,
      firstTwoNonCompliant,
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

  const getPassFailBadge = (status) => {
    return status === "PASS" ? (
      <span className="badge bg-success ms-2">PASS</span>
    ) : (
      <span className="badge bg-danger ms-2">FAIL</span>
    );
  };

  const groupItemsByType = (items) => {
    return items.reduce((acc, item) => {
      if (!acc[item.type]) {
        acc[item.type] = [];
      }
      acc[item.type].push(item);
      return acc;
    }, {});
  };

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
              <img src="http://121.121.232.54:88/aero-foods/${imageUrl}" class="img-fluid" />
            </div>
          </div>
        </div>
      </div>
    `;

    const modalDiv = document.createElement("div");
    modalDiv.innerHTML = modalHtml;
    document.body.appendChild(modalDiv);
  };

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
        .first-two-warning {
          background-color: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 0.25rem;
          padding: 0.5rem;
          margin-bottom: 1rem;
        }
      `}</style>

      <div>
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text">
                <i className="fas fa-calendar"></i>
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-control"
              />
              <button
                className="btn btn-danger"
                onClick={() => setSelectedAudit(null)}
              >
                <i className="fas fa-search me-1"></i>
                Search
              </button>
            </div>
          </div>
          <div className="col-md-6">
            <button
              className="btn btn-outline-danger"
              onClick={() => {
                setSelectedDate("");
                setSelectedAudit(null);
              }}
            >
              <i className="fas fa-list me-1"></i>
              View All Audits
            </button>
          </div>
        </div>

        {selectedDate && (
          <div className="mb-4">
            <h4 className="mb-3">Audits for {selectedDate}</h4>
            {getAuditsByDate(selectedDate).length === 0 ? (
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                No audits found for this date.
              </div>
            ) : (
              <div className="row g-3">
                {getAuditsByDate(selectedDate).map((audit) => {
                  const score = calculateScore(audit.items);
                  const badgeClass =
                    score.percentage >= 80
                      ? "bg-success"
                      : score.percentage >= 60
                      ? "bg-warning"
                      : "bg-danger";
                  return (
                    <div key={audit.id} className="col-md-6 col-lg-4">
                      <div className="card">
                        <div className="card-body">
                          {(audit.audit_code || audit.auditor_name) && (
                            <div className="mb-2 pb-2 border-bottom">
                              {audit.audit_code && (
                                <div className="small fw-semibold text-primary">
                                  <i className="fas fa-hashtag me-1"></i>
                                  {audit.audit_code}
                                </div>
                              )}
                              {audit.auditor_name && (
                                <div className="small text-muted">
                                  <i className="fas fa-user me-1"></i>
                                  {audit.auditor_name}
                                </div>
                              )}
                            </div>
                          )}
                          <div className="d-flex justify-content-between align-items-start mb-2">
                            <div>
                              <h6 className="card-title">
                                Audit - {audit.date}
                                {getPassFailBadge(score.status)}
                              </h6>
                              <small className="text-muted d-block">
                                {audit.items.length} items
                              </small>
                            </div>
                            <span className={`badge ${badgeClass}`}>
                              {score.percentage}%
                            </span>
                          </div>
                          <p className="small text-muted mb-3">
                            Score: {score.totalScore}/{score.maxScore}
                          </p>
                          {score.firstTwoNonCompliant && (
                            <div className="alert alert-warning alert-sm py-1 px-2 mb-2">
                              <small>
                                <i className="fas fa-exclamation-triangle me-1"></i>
                                First 2 items non-compliant
                              </small>
                            </div>
                          )}
                          <div className="d-flex gap-2">
                            <button
                              onClick={() => setSelectedAudit(audit)}
                              className="btn btn-primary btn-sm flex-fill"
                            >
                              <i className="fas fa-eye me-1"></i>
                              View
                            </button>
                            <button
                              onClick={() => onEditAudit(audit)}
                              className="btn btn-warning btn-sm flex-fill"
                            >
                              <i className="fas fa-edit me-1"></i>
                              Edit
                            </button>
                            <button
                              onClick={() => deleteAudit(audit)}
                              className="btn btn-danger btn-sm"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!selectedDate && audits.length > 0 && (
          <div>
            <h4 className="mb-3">All Audits ({audits.length})</h4>
            <div className="row g-3">
              {audits.map((audit) => {
                const score = calculateScore(audit.items);
                const badgeClass =
                  score.percentage >= 80
                    ? "bg-success"
                    : score.percentage >= 60
                    ? "bg-warning"
                    : "bg-danger";
                return (
                  <div key={audit.id} className="col-md-6 col-lg-4">
                    <div className="card">
                      <div className="card-body">
                        {(audit.audit_code || audit.auditor_name) && (
                          <div className="mb-2 pb-2 border-bottom">
                            {audit.audit_code && (
                              <div className="small fw-semibold text-primary">
                                <i className="fas fa-hashtag me-1"></i>
                                {audit.audit_code}
                              </div>
                            )}
                            {audit.auditor_name && (
                              <div className="small text-muted">
                                <i className="fas fa-user me-1"></i>
                                {audit.auditor_name}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div>
                            <h6 className="card-title">
                              Audit - {audit.date}
                              {getPassFailBadge(score.status)}
                            </h6>
                            <small className="text-muted">
                              {audit.items.length} items
                            </small>
                          </div>
                          <span className={`badge ${badgeClass}`}>
                            {score.percentage}%
                          </span>
                        </div>
                        <p className="small text-muted mb-3">
                          Score: {score.totalScore}/{score.maxScore}
                        </p>
                        {score.firstTwoNonCompliant && (
                          <div className="alert alert-warning alert-sm py-1 px-2 mb-2">
                            <small>
                              <i className="fas fa-exclamation-triangle me-1"></i>
                              First 2 items non-compliant
                            </small>
                          </div>
                        )}
                        <div className="d-flex gap-2">
                          <button
                            onClick={() => setSelectedAudit(audit)}
                            className="btn btn-primary btn-sm flex-fill"
                          >
                            <i className="fas fa-eye me-1"></i>
                            View
                          </button>
                          <button
                            onClick={() => onEditAudit(audit)}
                            className="btn btn-warning btn-sm flex-fill"
                          >
                            <i className="fas fa-edit me-1"></i>
                            Edit
                          </button>
                          <button
                            onClick={() => deleteAudit(audit)}
                            className="btn btn-danger btn-sm"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {selectedAudit && (
          <div className="mt-4 border-top pt-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                {(selectedAudit.audit_code || selectedAudit.auditor_name) && (
                  <div className="mb-2">
                    {selectedAudit.audit_code && (
                      <span className="badge bg-primary me-2">
                        <i className="fas fa-hashtag me-1"></i>
                        {selectedAudit.audit_code}
                      </span>
                    )}
                    {selectedAudit.auditor_name && (
                      <span className="badge bg-secondary">
                        <i className="fas fa-user me-1"></i>
                        {selectedAudit.auditor_name}
                      </span>
                    )}
                  </div>
                )}
                <h4>
                  Audit Details - {selectedAudit.date}
                  {getPassFailBadge(calculateScore(selectedAudit.items).status)}
                </h4>
                <p className="mb-0">
                  Score: {calculateScore(selectedAudit.items).totalScore}/
                  {calculateScore(selectedAudit.items).maxScore} (
                  {calculateScore(selectedAudit.items).percentage}%)
                </p>
                {calculateScore(selectedAudit.items).firstTwoNonCompliant && (
                  <div className="first-two-warning mt-2">
                    <small>
                      <i className="fas fa-exclamation-triangle text-warning me-1"></i>
                      <strong>Automatic Fail:</strong> First two audit items are
                      non-compliant
                    </small>
                  </div>
                )}
                {!calculateScore(selectedAudit.items).firstTwoNonCompliant &&
                  calculateScore(selectedAudit.items).totalScore < 120 && (
                    <div className="first-two-warning mt-2">
                      <small>
                        <i className="fas fa-exclamation-triangle text-warning me-1"></i>
                        <strong>Score Below Threshold:</strong> Total score is
                        below 120 points
                      </small>
                    </div>
                  )}
              </div>
              <div>
                <button
                  onClick={() => onEditAudit(selectedAudit)}
                  className="btn btn-warning me-2"
                >
                  <i className="fas fa-edit me-1"></i>
                  Edit Audit
                </button>
                <button
                  onClick={() => setSelectedAudit(null)}
                  className="btn btn-secondary"
                >
                  <i className="fas fa-arrow-left me-1"></i>
                  Back
                </button>
              </div>
            </div>

            {Object.entries(groupItemsByType(selectedAudit.items)).map(
              ([type, items]) => (
                <div key={type} className="mb-4">
                  <div className="section-header p-3 mb-3">
                    <h5 className="mb-0">
                      {items[0]?.name} - {items[0]?.evaluation} ({items.length}{" "}
                      items)
                    </h5>
                  </div>
                  <div className="row g-3">
                    {items.map((item, index) => (
                      <div key={item.id} className="col-12">
                        <div
                          className={`card ${
                            index < 2 && item.status === "Non-compliant"
                              ? "border-danger"
                              : ""
                          }`}
                        >
                          <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <h6 className="card-title">
                                  {index < 2 && (
                                    <span className="badge bg-info me-2">
                                      #{index + 1}
                                    </span>
                                  )}
                                  {item.item}
                                </h6>
                                <small className="text-muted">
                                  Points: {item.pointsObtain}/{item.points}
                                </small>
                              </div>
                              <div>{getStatusIcon(item.status)}</div>
                            </div>

                            {item.images.length > 0 && (
                              <div className="d-flex gap-1 mt-2">
                                {item.images.map((image, imgIndex) => (
                                  <img
                                    key={imgIndex}
                                    src={`http://121.121.232.54:88/aero-foods/${image}`}
                                    alt={`Audit image ${imgIndex + 1}`}
                                    className="audit-image rounded border"
                                    onClick={() => showImageModal(image)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {audits.length === 0 && !loading && (
          <div className="alert alert-info text-center">
            <i className="fas fa-info-circle me-2"></i>
            No audit data available.
          </div>
        )}
      </div>
    </>
  );
};

export default ViewAuditComponent;
