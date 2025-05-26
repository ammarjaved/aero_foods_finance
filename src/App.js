import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./LoginForm";
import Dashboard from "./components/daily-sheet/Dashboard";
import Landing from "./Landing";
import Timesheet from "./components/time-sheet/Timesheet";
import DailyWastage from "./components/wastage/DailyWastage";
import DailyBankReconciliation from "./components/bank-reconciliation/DailyBankReconciliation";
import MonthlyMaterials from "./components/materials/MonthlyMaterials";

function App() {
  return (
    <BrowserRouter basename="/aero_foods_finance">
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/timesheet" element={<Timesheet />} />
        <Route path="/wastage" element={<DailyWastage />} />
        <Route path="/reconciliation" element={<DailyBankReconciliation />} />
        <Route path="/materials" element={<MonthlyMaterials />} />
        <Route path="/" element={<LoginForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
