import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { enforceAuthVersion } from "./session";
import LoginForm from "./LoginForm";
import Dashboard from "./components/daily-sheet/Dashboard";
import DashboardYus from "./com_abe/daily-sheet/Dashboard";
import DashboardAmz from "./com_amz/daily-sheet/Dashboard";
import DashboardAmzLyp from "./com_amz_lyp/daily-sheet/Dashboard";
import DashboardOjim from "./ojim/daily-sheet/Dashboard";
import DashboardMixueSogo from "./com_mixue_sogo/daily-sheet/Dashboard";

import Landing from "./Landing";
import LandingYus from "./com_abe/Landing";
import LandingAmz from "./com_amz/Landing";
import LandingAmzLyp from "./com_amz_lyp/Landing";

import Timesheet from "./components/time-sheet/Timesheet";
import TimesheetABE from "./com_abe/time-sheet-abe/TimesheetABE";
import TimesheetAmazon from "./com_amz/time-sheet-amz/TimesheetAmazon";
import TimesheetAmazonLyp from "./com_amz_lyp/time-sheet-amz/TimesheetAmazon";

import TimesheetOjim from "./ojim/time-sheet-ojim/TimesheetOjim";
import TimesheetMixueSogo from "./com_mixue_sogo/time-sheet-mixue-sogo/TimesheetMixueSogo";

import DailyWastage from "./components/wastage/DailyWastage";
import DailyWastageYus from "./com_abe/wastage/DailyWastage";
import DailyWastageAmz from "./com_amz/wastage/DailyWastage";
import DailyWastageAmzLyp from "./com_amz_lyp/wastage/DailyWastage";

import DailyWastageOjim from "./ojim/wastage/DailyWastage";
import DailyWastageMixueSogo from "./com_mixue_sogo/wastage/DailyWastage";

import DailyBankReconciliation from "./components/bank-reconciliation/DailyBankReconciliation";
import DailyBankReconciliationYus from "./com_abe/bank-reconciliation/DailyBankReconciliation";
import DailyBankReconciliationAmz from "./com_amz/bank-reconciliation/DailyBankReconciliation";
import DailyBankReconciliationAmzLyp from "./com_amz_lyp/bank-reconciliation/DailyBankReconciliation";

import DailyBankReconciliationOjim from "./ojim/bank-reconciliation/DailyBankReconciliation";
import DailyBankReconciliationMixueSogo from "./com_mixue_sogo/bank-reconciliation/DailyBankReconciliation";

import MonthlyMaterials from "./components/materials/MonthlyMaterials";
import MonthlyMaterialsYus from "./com_abe/materials/MonthlyMaterials";
import MonthlyMaterialsAmz from "./com_amz/materials/MonthlyMaterials";
import MonthlyMaterialsAmzLyp from "./com_amz_lyp/materials/MonthlyMaterials";

import MonthlyMaterialsOjim from "./ojim/materials/MonthlyMaterials";
import MonthlyMaterialsMixueSogo from "./com_mixue_sogo/materials/MonthlyMaterials";

import VgSalesYus from "./com_abe/vg-sales/VgSales";
import VgItemsYus from "./com_abe/vg-sales/VgItems";

import StockIn from "./components/stock-in/StockIn";
import StockInYus from "./com_abe/stock-in/StockIn";
import StockInAmz from "./com_amz/stock-in/StockIn";
import StockInAmzLyp from "./com_amz_lyp/stock-in/StockIn";

import StockInOjim from "./ojim/stock-in/StockIn";
import StockInMixueSogo from "./com_mixue_sogo/stock-in/StockIn";
import StockLeft from "./components/stock-left/StockLeft";
import StockLeftMixueSogo from "./com_mixue_sogo/stock-left/StockLeft";
import Reorder from "./components/reorder/Reorder";
import ReorderMixueSogo from "./com_mixue_sogo/reorder/Reorder";

import Summary from "./components/summary/Summary";
import ChatApp from "./components/summary/ChatApp";

import ReCalculate from "./components/summary/ReCalculate";
import AllTNG from "./components/all-tng/AllTNG";
import AllBankCard from "./components/all-bank-card/AllBankCard";
import Expenses from "./components/expense/Expense";
import ExpensesYus from "./com_abe/expense/Expense";
import ExpensesAmz from "./com_amz/expense/Expense";
import ExpensesAmzLyp from "./com_amz_lyp/expense/Expense";
import ExpensesOjim from "./ojim/expense/Expense";
import ExpensesMixueSogo from "./com_mixue_sogo/expense/Expense";
import ExpensesSDS from "./components/expense_sds/Expense";
import ExpenseFile from "./components/expense_file/ExpenseFile";
import Salary from "./components/salary/Salary";
import User from "./components/user/User";
import Payroll from "./components/payroll/Payroll";
import Audit from "./components/audit/Audit";
import LandingOjim from "./ojim/Landing";
import LandingMixueSogo from "./com_mixue_sogo/Landing";
import TimeAnalysis from "./components/timeshete-analysis/TimeAnalysis";
import Payable from "./components/payable/Payable";
// Kicks the user back to the login screen whenever the server's session
// version no longer matches the one this browser logged in with.
function SessionGate() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    enforceAuthVersion().then((expired) => {
      if (expired && !cancelled) {
        navigate("/login", { replace: true });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  return null;
}

function App() {
  return (
    <BrowserRouter basename="/aero_foods_finance">
      <SessionGate />
      <Routes>
        <Route path="/login" element={<LoginForm />} />

        <Route path="/landing" element={<Landing />} />
        <Route path="/landing-yus" element={<LandingYus />} />
        <Route path="/landing-amz" element={<LandingAmz />} />
        <Route path="/landing-amz-lyp" element={<LandingAmzLyp />} />
        <Route path="/landing-ojim" element={<LandingOjim />} />
        <Route path="/landing-mixue-sogo" element={<LandingMixueSogo />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-yus" element={<DashboardYus />} />
        <Route path="/dashboard-amz" element={<DashboardAmz />} />
        <Route path="/dashboard-amz-lyp" element={<DashboardAmzLyp />} />
        <Route path="/dashboard-ojim" element={<DashboardOjim />} />
        <Route path="/dashboard-mixue-sogo" element={<DashboardMixueSogo />} />

        <Route path="/timesheet" element={<Timesheet />} />
        <Route path="/wastage" element={<DailyWastage />} />
        <Route path="/wastage-yus" element={<DailyWastageYus />} />
        <Route path="/wastage-amz" element={<DailyWastageAmz />} />
        <Route path="/wastage-amz-lyp" element={<DailyWastageAmzLyp />} />
        <Route path="/wastage-ojim" element={<DailyWastageOjim />} />
        <Route path="/wastage-mixue-sogo" element={<DailyWastageMixueSogo />} />

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
          path="/reconciliation-amz-lyp"
          element={<DailyBankReconciliationAmzLyp />}
        />

        <Route
          path="/reconciliation-ojim"
          element={<DailyBankReconciliationOjim />}
        />
        <Route
          path="/reconciliation-mixue-sogo"
          element={<DailyBankReconciliationMixueSogo />}
        />

        <Route path="/materials" element={<MonthlyMaterials />} />
        <Route path="/materials-yus" element={<MonthlyMaterialsYus />} />
        <Route path="/materials-amz" element={<MonthlyMaterialsAmz />} />
        <Route path="/materials-amz-lyp" element={<MonthlyMaterialsAmzLyp />} />
        <Route path="/materials-ojim" element={<MonthlyMaterialsOjim />} />
        <Route path="/materials-mixue-sogo" element={<MonthlyMaterialsMixueSogo />} />

        <Route path="/vg-sales-yus" element={<VgSalesYus />} />
        <Route path="/vg-items-yus" element={<VgItemsYus />} />

        <Route path="/stockin" element={<StockIn />} />
        <Route path="/stockin-yus" element={<StockInYus />} />
        <Route path="/stockin-amz" element={<StockInAmz />} />
        <Route path="/stockin-amz-lyp" element={<StockInAmzLyp />} />
        <Route path="/stockin-ojim" element={<StockInOjim />} />
        <Route path="/stockin-mixue-sogo" element={<StockInMixueSogo />} />
        <Route path="/stock-left" element={<StockLeft />} />
        <Route
          path="/stock-left-mixue-sogo"
          element={<StockLeftMixueSogo />}
        />
        <Route path="/reorder" element={<Reorder />} />
        <Route path="/reorder-mixue-sogo" element={<ReorderMixueSogo />} />

        <Route path="/summary" element={<Summary />} />
        <Route path="/chatapp" element={<ChatApp />} />
        <Route path="/recalculate" element={<ReCalculate />} />
        <Route path="/all-tng" element={<AllTNG />} />
        <Route path="/all-bank-card" element={<AllBankCard />} />
        <Route path="/payable" element={<Payable />} />
        <Route path="/TimesheetABE" element={<TimesheetABE />} />
        <Route path="/TimesheetAmazon" element={<TimesheetAmazon />} />
        <Route path="/TimesheetAmazonLyp" element={<TimesheetAmazonLyp />} />
        <Route path="/TimesheetOjim" element={<TimesheetOjim />} />
        <Route path="/TimesheetMixueSogo" element={<TimesheetMixueSogo />} />
        <Route path="/EmpTimeSheet" element={<TimeAnalysis />} />
        <Route path="/Expenses" element={<Expenses />} />
        <Route path="/Expenses-yus" element={<ExpensesYus />} />
        <Route path="/Expenses-amz" element={<ExpensesAmz />} />
        <Route path="/Expenses-amz-lyp" element={<ExpensesAmzLyp />} />

        <Route path="/Expenses-ojim" element={<ExpensesOjim />} />
        <Route path="/Expenses-mixue-sogo" element={<ExpensesMixueSogo />} />

        <Route path="/ExpensesSDS" element={<ExpensesSDS />} />
        <Route path="/expense-file" element={<ExpenseFile />} />
        <Route path="/Salary" element={<Salary />} />
        <Route path="/User" element={<User />} />
        <Route path="/payroll" element={<Payroll />} />

        <Route path="/Audit" element={<Audit />} />

        <Route path="/" element={<LoginForm />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
