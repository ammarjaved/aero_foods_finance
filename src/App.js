import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginForm from "./LoginForm";
import Dashboard from "./components/daily-sheet/Dashboard";
import DashboardYus from "./com_abe/daily-sheet/Dashboard";
import DashboardAmz from "./com_amz/daily-sheet/Dashboard";
import DashboardOjim from "./ojim/daily-sheet/Dashboard";

import Landing from "./Landing";
import LandingYus from "./com_abe/Landing";
import LandingAmz from "./com_amz/Landing";

import Timesheet from "./components/time-sheet/Timesheet";
import TimesheetABE from "./com_abe/time-sheet-abe/TimesheetABE";
import TimesheetAmazon from "./com_amz/time-sheet-amz/TimesheetAmazon";
import TimesheetOjim from "./ojim/time-sheet-ojim/TimesheetOjim";

import DailyWastage from "./components/wastage/DailyWastage";
import DailyWastageYus from "./com_abe/wastage/DailyWastage";
import DailyWastageAmz from "./com_amz/wastage/DailyWastage";
import DailyWastageOjim from "./ojim/wastage/DailyWastage";

import DailyBankReconciliation from "./components/bank-reconciliation/DailyBankReconciliation";
import DailyBankReconciliationYus from "./com_abe/bank-reconciliation/DailyBankReconciliation";
import DailyBankReconciliationAmz from "./com_amz/bank-reconciliation/DailyBankReconciliation";
import DailyBankReconciliationOjim from "./ojim/bank-reconciliation/DailyBankReconciliation";

import MonthlyMaterials from "./components/materials/MonthlyMaterials";
import MonthlyMaterialsYus from "./com_abe/materials/MonthlyMaterials";
import MonthlyMaterialsAmz from "./com_amz/materials/MonthlyMaterials";
import MonthlyMaterialsOjim from "./ojim/materials/MonthlyMaterials";

import StockIn from "./components/stock-in/StockIn";
import StockInYus from "./com_abe/stock-in/StockIn";
import StockInAmz from "./com_amz/stock-in/StockIn";
import StockInOjim from "./ojim/stock-in/StockIn";

import Summary from "./components/summary/Summary";
import ReCalculate from "./components/summary/ReCalculate";
import Expenses from "./components/expense/Expense";
import ExpensesYus from "./com_abe/expense/Expense";
import ExpensesAmz from "./com_amz/expense/Expense";
import ExpensesOjim from "./ojim/expense/Expense";
import ExpensesSDS from "./components/expense_sds/Expense";
import Salary from "./components/salary/Salary";
import User from "./components/user/User";
import Audit from "./components/audit/Audit";
import LandingOjim from "./ojim/Landing";
import TimeAnalysis from "./components/timeshete-analysis/TimeAnalysis";
import Payable from "./components/payable/Payable";
function App() {
  return (
    <BrowserRouter basename="/aero_foods_finance">
      <Routes>
        <Route path="/login" element={<LoginForm />} />

        <Route path="/landing" element={<Landing />} />
        <Route path="/landing-yus" element={<LandingYus />} />
        <Route path="/landing-amz" element={<LandingAmz />} />
        <Route path="/landing-ojim" element={<LandingOjim />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-yus" element={<DashboardYus />} />
        <Route path="/dashboard-amz" element={<DashboardAmz />} />
        <Route path="/dashboard-ojim" element={<DashboardOjim />} />

        <Route path="/timesheet" element={<Timesheet />} />
        <Route path="/wastage" element={<DailyWastage />} />
        <Route path="/wastage-yus" element={<DailyWastageYus />} />
        <Route path="/wastage-amz" element={<DailyWastageAmz />} />
        <Route path="/wastage-ojim" element={<DailyWastageOjim />} />

        <Route path="/reconciliation" element={<DailyBankReconciliation />} />
        <Route
          path="/reconciliation-yus"
          element={<DailyBankReconciliationYus />}
        />
        <Route
          path="/reconciliation-amz"
          element={<DailyBankReconciliationAmz />}
        />

        <Route
          path="/reconciliation-ojim"
          element={<DailyBankReconciliationOjim />}
        />

        <Route path="/materials" element={<MonthlyMaterials />} />
        <Route path="/materials-yus" element={<MonthlyMaterialsYus />} />
        <Route path="/materials-amz" element={<MonthlyMaterialsAmz />} />
        <Route path="/materials-ojim" element={<MonthlyMaterialsOjim />} />

        <Route path="/stockin" element={<StockIn />} />
        <Route path="/stockin-yus" element={<StockInYus />} />
        <Route path="/stockin-amz" element={<StockInAmz />} />
        <Route path="/stockin-ojim" element={<StockInOjim />} />

        <Route path="/summary" element={<Summary />} />
        <Route path="/recalculate" element={<ReCalculate />} />
        <Route path="/payable" element={<Payable />} />
        <Route path="/TimesheetABE" element={<TimesheetABE />} />
        <Route path="/TimesheetAmazon" element={<TimesheetAmazon />} />
        <Route path="/TimesheetOjim" element={<TimesheetOjim />} />
        <Route path="/EmpTimeSheet" element={<TimeAnalysis />} />
        <Route path="/Expenses" element={<Expenses />} />
        <Route path="/Expenses-yus" element={<ExpensesYus />} />
        <Route path="/Expenses-amz" element={<ExpensesAmz />} />
        <Route path="/Expenses-ojim" element={<ExpensesOjim />} />

        <Route path="/ExpensesSDS" element={<ExpensesSDS />} />
        <Route path="/Salary" element={<Salary />} />
        <Route path="/User" element={<User />} />

        <Route path="/Audit" element={<Audit />} />

        <Route path="/" element={<LoginForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
