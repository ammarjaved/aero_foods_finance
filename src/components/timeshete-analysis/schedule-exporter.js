import React, { useState, useRef } from "react";
import { Download, Calendar, X } from "lucide-react";

// Modal Component for Schedule Display
const ScheduleModal = ({ show, onHide, scheduleData, startDate }) => {
  const canvasRef = useRef(null);

  const SHIFT_COLORS = {
    morning: { bg: "#90EE90", label: "Morning (ends 7 PM)" },
    afternoon: { bg: "#FFA500", label: "Afternoon (ends 11 PM)" },
    evening: { bg: "#87CEEB", label: "Evening (ends 1 AM)" },
    late: { bg: "#DDA0DD", label: "Late (ends 6 PM)" },
    off: { bg: "#696969", label: "Off Day" },
  };

  const getShiftColor = (startTime, endTime) => {
    const startHour = parseInt(startTime.split(":")[0]);
    const endHour = parseInt(endTime.split(":")[0]);

    if (startTime === "00:00" && endTime === "00:00") return SHIFT_COLORS.off;

    if (endHour >= 1 && endHour <= 7) return SHIFT_COLORS.evening;
    if (endHour >= 22 || endHour === 23) return SHIFT_COLORS.afternoon;
    if (endHour >= 18 && endHour <= 21) return SHIFT_COLORS.late;
    return SHIFT_COLORS.morning;
  };

  const formatTime = (datetime) => {
    if (!datetime) return "";
    const date = new Date(datetime);
    return date.toTimeString().slice(0, 5);
  };

  const calculateHours = (start, end) => {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    return Math.round((endDate - startDate) / (1000 * 60 * 60));
  };

  const exportToImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    const width = 1400;
    const cellWidth = 180;
    const titleHeight = 100;
    const headerHeight = 60;
    const rowHeight = 70;
    const employees = [
      ...new Set(
        scheduleData.flatMap((d) => d.records.map((r) => r.employee_name))
      ),
    ].sort();
    const height =
      titleHeight + headerHeight + employees.length * rowHeight + 150;

    canvas.width = width;
    canvas.height = height;

    // Background
    ctx.fillStyle = "#F5F5F5";
    ctx.fillRect(0, 0, width, height);

    // Title
    ctx.fillStyle = "#000000";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.fillText("EMPLOYEE WORK SCHEDULE", width / 2, 40);

    const weekStart = new Date(startDate);
    const weekEnd = new Date(startDate);
    weekEnd.setDate(weekEnd.getDate() + 6);

    ctx.font = "20px Arial";
    ctx.fillText(
      `${weekStart.getDate()} - ${weekEnd.getDate()} ${weekEnd.toLocaleDateString(
        "en-US",
        { month: "long", year: "numeric" }
      )}`,
      width / 2,
      75
    );

    // Header row
    const headerY = titleHeight;
    ctx.fillStyle = "#333333";
    ctx.fillRect(0, headerY, width, headerHeight);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("EMPLOYEES", 90, headerY + headerHeight / 2 - 10);

    scheduleData.forEach((day, idx) => {
      const x = 180 + idx * cellWidth;
      ctx.fillText(
        `${day.dayName}`,
        x + cellWidth / 2,
        headerY + headerHeight / 2 - 10
      );
      ctx.fillText(
        `${day.dayNum}/${day.monthNum}`,
        x + cellWidth / 2,
        headerY + headerHeight / 2 + 10
      );
    });

    // Employee rows
    const firstRowY = titleHeight + headerHeight;
    employees.forEach((emp, rowIdx) => {
      const y = firstRowY + rowIdx * rowHeight;

      // Employee name cell
      ctx.fillStyle = rowIdx % 2 === 0 ? "#FFFFFF" : "#F9F9F9";
      ctx.fillRect(0, y, 180, rowHeight);
      ctx.strokeStyle = "#CCCCCC";
      ctx.strokeRect(0, y, 180, rowHeight);

      ctx.fillStyle = "#000000";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.fillText(emp, 90, y + rowHeight / 2 + 5);

      // Schedule cells
      scheduleData.forEach((day, dayIdx) => {
        const x = 180 + dayIdx * cellWidth;
        const record = day.records.find((r) => r.employee_name === emp);

        if (record) {
          const startTime = formatTime(record.proposed_start_time);
          const endTime = formatTime(record.proposed_end_time);
          const hours = calculateHours(
            record.proposed_start_time,
            record.proposed_end_time
          );
          const shiftColor = getShiftColor(startTime, endTime);

          ctx.fillStyle = shiftColor.bg;
          ctx.fillRect(x, y, cellWidth, rowHeight);
          ctx.strokeStyle = "#CCCCCC";
          ctx.strokeRect(x, y, cellWidth, rowHeight);

          if (startTime !== "00:00" || endTime !== "00:00") {
            ctx.fillStyle = "#000000";
            ctx.font = "bold 13px Arial";
            ctx.textAlign = "center";
            ctx.fillText(`${startTime} -`, x + cellWidth / 2, y + 25);
            ctx.fillText(`${endTime} (${hours})`, x + cellWidth / 2, y + 45);
          } else {
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 14px Arial";
            ctx.fillText("OFF", x + cellWidth / 2, y + rowHeight / 2 + 5);
          }
        } else {
          ctx.fillStyle = "#E0E0E0";
          ctx.fillRect(x, y, cellWidth, rowHeight);
          ctx.strokeStyle = "#CCCCCC";
          ctx.strokeRect(x, y, cellWidth, rowHeight);
        }
      });
    });

    // Legend
    const legendY = firstRowY + employees.length * rowHeight + 20;
    ctx.fillStyle = "#000000";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "left";
    ctx.fillText("SHIFT LEGEND:", 20, legendY);

    let legendX = 20;
    Object.values(SHIFT_COLORS).forEach((color, idx) => {
      ctx.fillStyle = color.bg;
      ctx.fillRect(legendX, legendY + 10, 20, 20);
      ctx.strokeStyle = "#000000";
      ctx.strokeRect(legendX, legendY + 10, 20, 20);

      ctx.fillStyle = "#000000";
      ctx.font = "12px Arial";
      ctx.fillText(color.label, legendX + 25, legendY + 25);

      legendX += 270;
    });

    // Download
    const link = document.createElement("a");
    link.download = `schedule_${startDate}_to_${
      weekEnd.toISOString().split("T")[0]
    }.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  if (!show) return null;

  return (
    <>
      <div
        className="modal show d-block"
        tabIndex="-1"
        style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      >
        <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title fw-bold">Schedule Preview</h5>
              <button
                type="button"
                className="btn-close"
                onClick={onHide}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <div className="table-responsive">
                <table className="table table-bordered mb-0">
                  <thead className="table">
                    <tr>
                      <th className="text-start">Employee</th>
                      {scheduleData.map((day, idx) => (
                        <th key={idx} className="text-center">
                          {day.dayName}
                          <br />
                          {day.dayNum}/{day.monthNum}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ...new Set(
                        scheduleData.flatMap((d) =>
                          d.records.map((r) => r.employee_name)
                        )
                      ),
                    ]
                      .sort()
                      .map((emp, rowIdx) => (
                        <tr key={emp}>
                          <td className="fw-semibold">{emp}</td>
                          {scheduleData.map((day, dayIdx) => {
                            const record = day.records.find(
                              (r) => r.employee_name === emp
                            );
                            if (!record) {
                              return (
                                <td
                                  key={dayIdx}
                                  className="bg-secondary bg-opacity-25"
                                ></td>
                              );
                            }

                            const startTime = formatTime(
                              record.proposed_start_time
                            );
                            const endTime = formatTime(
                              record.proposed_end_time
                            );
                            const hours = calculateHours(
                              record.proposed_start_time,
                              record.proposed_end_time
                            );
                            const shiftColor = getShiftColor(
                              startTime,
                              endTime
                            );

                            return (
                              <td
                                key={dayIdx}
                                className="text-center"
                                style={{ backgroundColor: shiftColor.bg }}
                              >
                                {startTime !== "00:00" ||
                                endTime !== "00:00" ? (
                                  <>
                                    <div className="fw-semibold">
                                      {startTime} - {endTime}
                                    </div>
                                    <div className="small">({hours}h)</div>
                                  </>
                                ) : (
                                  <div className="fw-bold text-white">OFF</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <canvas ref={canvasRef} style={{ display: "none" }} />
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onHide}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-success d-flex align-items-center gap-2"
                onClick={exportToImage}
              >
                <Download size={20} />
                Export as Image
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// Parent Component
const ScheduleExporter = () => {
  const [startDate, setStartDate] = useState("");
  const [scheduleData, setScheduleData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const fetchScheduleData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://121.121.232.54:88/aero-foods/get_emp_timesheet.php"
      );
      const result = await response.json();

      if (result.status === "success") {
        const start = new Date(startDate);
        const filtered = [];

        for (let i = 0; i < 7; i++) {
          const currentDate = new Date(start);
          currentDate.setDate(start.getDate() + i);
          const dateStr = currentDate.toISOString().split("T")[0];

          const dayRecords = result.results.filter(
            (r) => r.month_date === dateStr
          );
          filtered.push({
            date: dateStr,
            dayName: currentDate
              .toLocaleDateString("en-US", { weekday: "short" })
              .toUpperCase(),
            dayNum: currentDate.getDate(),
            monthNum: currentDate.getMonth() + 1,
            records: dayRecords,
          });
        }

        setScheduleData(filtered);
        setShowModal(true);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      alert("Failed to fetch schedule data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-50 bg-light p-4">
      <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
        rel="stylesheet"
      />

      <div className="row g-3">
        <div className="col-md-3">
          <label className="form-label fw-medium">
            Start Date (Week Start)
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="form-control"
          />
        </div>

        <div className="col-md-3 d-flex align-items-end">
          <button
            onClick={fetchScheduleData}
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? "Loading..." : "Load Schedule"}
          </button>
        </div>
      </div>

      <ScheduleModal
        show={showModal}
        onHide={() => setShowModal(false)}
        scheduleData={scheduleData}
        startDate={startDate}
      />
    </div>
  );
};

export default ScheduleExporter;
