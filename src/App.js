import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./LoginForm";
import Dashboard from "./components/daily-sheet/Dashboard";
import DashboardYus from "./com_abe/daily-sheet/Dashboard";
import DashboardAmz from "./com_amz/daily-sheet/Dashboard";


import Landing from "./Landing"
import LandingYus from "./com_abe/Landing";
import LandingAmz from "./com_amz/Landing";
import Timesheet from "./components/time-sheet/Timesheet";
import TimesheetABE from "./com_abe/time-sheet-abe/TimesheetABE";
import TimesheetAmazon from "./com_amz/time-sheet-amz/TimesheetAmazon";
import DailyWastage from "./components/wastage/DailyWastage";
import DailyBankReconciliation from "./components/bank-reconciliation/DailyBankReconciliation";
import MonthlyMaterials from "./components/materials/MonthlyMaterials";
import StockIn from "./components/stock-in/StockIn";
import Summary from "./components/summary/Summary";
import Expenses from "./components/expense/Expense";

function App() {
  return (
    <BrowserRouter basename="/aero_foods_finance">
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/landing-yus" element={<LandingYus />} />
        <Route path="/landing-amz" element={<LandingAmz />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-yus" element={<DashboardYus />} />
                <Route path="/dashboard-amz" element={<DashboardAmz />} />

        <Route path="/timesheet" element={<Timesheet />} />
        <Route path="/wastage" element={<DailyWastage />} />
        <Route path="/reconciliation" element={<DailyBankReconciliation />} />
        <Route path="/materials" element={<MonthlyMaterials />} />
        <Route path="/stockin" element={<StockIn />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/TimesheetABE" element={<TimesheetABE />} />
        <Route path="/TimesheetAmazon" element={<TimesheetAmazon />} />
        <Route path="/Expenses" element={<Expenses />} />




        <Route path="/" element={<LoginForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
