import {BrowserRouter,Routes, Route } from 'react-router-dom';
import LoginForm from './LoginForm';
import  Dashboard  from './Dashboard';
import Landing from './Landing';
import Timesheet from './Timesheet';

function App() {
  return (
    <BrowserRouter basename="/aero_foods_finance">
      <Routes>
        <Route path="/login" element={<LoginForm />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/timesheet" element={<Timesheet />} />
        <Route path="/" element={<LoginForm />} />
      </Routes>
     </BrowserRouter>
  );
}

export default App;