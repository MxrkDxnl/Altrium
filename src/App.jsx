import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import { useAuth } from './context/useAuth';
import Login from './components/Login';

// Lazy-loaded Pages for Route Code-Splitting
const Home = lazy(() => import('./pages/Home'));
const HRReports = lazy(() => import('./pages/HRReports'));
const DepartmentReports = lazy(() => import('./pages/DepartmentReports'));
const ReviewRecords = lazy(() => import('./pages/ReviewRecords'));
const EvidenceSubmissions = lazy(() => import('./pages/EvidenceSubmissions'));
const AssignedPlans = lazy(() => import('./pages/AssignedPlans'));
const AssignReview = lazy(() => import('./pages/AssignReview'));
const AssignPlan = lazy(() => import('./pages/AssignPlan'));
const MyTasks = lazy(() => import('./pages/MyTasks'));
const ReviewForm = lazy(() => import('./pages/ReviewForm'));
const History = lazy(() => import('./pages/History'));
const Profile = lazy(() => import('./pages/Profile'));
const Members = lazy(() => import('./pages/Members'));
const EmployeePasswords = lazy(() => import('./pages/EmployeePasswords'));

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-500">
      <div className="inline-flex items-center gap-2">
        <svg className="animate-spin h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span className="text-sm font-medium">Loading page...</span>
      </div>
    </div>
  );
}

export default function App() {
  const { currentUser } = useAuth();

  // If no user is logged in, show login page
  if (!currentUser) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          {/* All roles land on Home */}
          <Route index element={<Home />} />
        
        {/* Universal History Route */}
        <Route path="history" element={<History />} />

        {/* Legacy Placeholder Redirects to History */}
        <Route path="past-records" element={<Navigate to="/history" replace />} />
        <Route path="company-archive" element={<Navigate to="/history" replace />} />
        <Route path="my-development" element={<Navigate to="/history" replace />} />
        
        {/* Administrator Routes */}
        {currentUser.role === 'admin' && (
          <>
            <Route path="members" element={<Members />} />
            <Route path="employee-passwords" element={<EmployeePasswords />} />
            <Route path="employee-access" element={<Navigate to="/employee-passwords" replace />} />
            <Route path="profile" element={<Profile />} />
          </>
        )}

        {/* Operational Manager Routes */}
        {(currentUser.role === 'operational_manager' || currentUser.role === 'company_manager') && (
          <>
            <Route path="assign-tasks" element={<AssignReview />} />
            <Route path="assign-reviews" element={<AssignReview />} />
            <Route path="assign-plan" element={<AssignPlan />} />
            <Route path="assign-pip-pdp" element={<AssignPlan />} />
            <Route path="assigned-plans" element={<AssignedPlans />} />
            <Route path="pip-pdp-table" element={<AssignedPlans />} />
            <Route path="review-table" element={<ReviewRecords />} />
            <Route path="department-reports" element={<DepartmentReports />} />
            <Route path="reports" element={<DepartmentReports />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="review-form/:id" element={<ReviewForm />} />
            <Route path="profile" element={<Profile />} />
          </>
        )}
        
        {/* HR Manager Routes */}
        {currentUser.role === 'hr_manager' && (
          <>
            <Route path="assign-tasks" element={<AssignReview />} />
            <Route path="assign-reviews" element={<AssignReview />} />
            <Route path="assign-plan" element={<AssignPlan />} />
            <Route path="assign-pip-pdp" element={<AssignPlan />} />
            <Route path="assigned-plans" element={<AssignedPlans />} />
            <Route path="pip-pdp-table" element={<AssignedPlans />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="review-form/:id" element={<ReviewForm />} />
            <Route path="hr-reports" element={<HRReports />} />
            <Route path="profile" element={<Profile />} />
          </>
        )}
        
        {/* Manager Routes (Team & Department) */}
        {(currentUser.role === 'team_manager' || currentUser.role === 'department_manager') && (
          <>
            <Route path="assign-tasks" element={<AssignReview />} />
            <Route path="assign-reviews" element={<AssignReview />} />
            <Route path="assign-plan" element={<AssignPlan />} />
            <Route path="assign-pip-pdp" element={<AssignPlan />} />
            <Route path="assigned-plans" element={<AssignedPlans />} />
            <Route path="pip-pdp-table" element={<AssignedPlans />} />
            <Route path="review-table" element={<ReviewRecords />} />
            <Route path="department-reports" element={<DepartmentReports />} />
            <Route path="reports" element={<DepartmentReports />} />
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="review-form/:id" element={<ReviewForm />} />
            <Route path="profile" element={<Profile />} />
          </>
        )}
        
        {/* Employee Routes */}
        {currentUser.role === 'employee' && (
          <>
            <Route path="my-tasks" element={<MyTasks />} />
            <Route path="department-reports" element={<DepartmentReports />} />
            <Route path="reports" element={<DepartmentReports />} />
            <Route path="review-form/:id" element={<ReviewForm />} />
            <Route path="profile" element={<Profile />} />
          </>
        )}
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  </Suspense>
  );
}

