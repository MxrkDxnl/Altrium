import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';

export default function Sidebar({ onNavigate }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const role = currentUser?.role === 'company_manager' ? 'operational_manager' : (currentUser?.role || 'employee');

  const navLinks = {
    employee: [
      { name: 'Dashboard', path: '/' },
      { name: 'My Tasks', path: '/my-tasks' },
      ...((currentUser?.department === 'Human Resources' || currentUser?.department === 'HR') && currentUser?.report_portfolio
        ? [{ name: 'Department Reports', path: '/department-reports', matchPaths: ['/department-reports', '/reports'] }]
        : []),
      { name: 'History', path: '/history', matchPaths: ['/history', '/past-records', '/my-development'] },
      { name: 'Profile Page', path: '/profile' },
    ],
    team_manager: [
      { name: 'Dashboard', path: '/' },
      { name: 'My Tasks', path: '/my-tasks' },
      { name: 'Assign Reviews', path: '/assign-tasks', matchPaths: ['/assign-tasks', '/assign-reviews'] },
      { name: 'Assign PIP / PDP', path: '/assign-plan', matchPaths: ['/assign-plan', '/assign-pip-pdp'] },
      { name: 'Review Table', path: '/review-table' },
      { name: 'Assigned Plans', path: '/assigned-plans', matchPaths: ['/assigned-plans', '/pip-pdp-table'] },
      { name: 'History', path: '/history', matchPaths: ['/history', '/past-records', '/my-development'] },
      { name: 'Profile Page', path: '/profile' },
    ],
    department_manager: [
      { name: 'Dashboard', path: '/' },
      { name: 'My Tasks', path: '/my-tasks' },
      { name: 'Assign Reviews', path: '/assign-tasks', matchPaths: ['/assign-tasks', '/assign-reviews'] },
      { name: 'Assign PIP / PDP', path: '/assign-plan', matchPaths: ['/assign-plan', '/assign-pip-pdp'] },
      { name: 'Department Reports', path: '/department-reports', matchPaths: ['/department-reports', '/reports'] },
      { name: 'Review Table', path: '/review-table' },
      { name: 'Assigned Plans', path: '/assigned-plans', matchPaths: ['/assigned-plans', '/pip-pdp-table'] },
      { name: 'History', path: '/history', matchPaths: ['/history', '/past-records', '/my-development'] },
      { name: 'Profile Page', path: '/profile' },
    ],
    hr_manager: [
      { name: 'Dashboard', path: '/' },
      { name: 'My Tasks', path: '/my-tasks' },
      { name: 'Assign Reviews', path: '/assign-tasks', matchPaths: ['/assign-tasks', '/assign-reviews'] },
      { name: 'Assign PIP / PDP', path: '/assign-plan', matchPaths: ['/assign-plan', '/assign-pip-pdp'] },
      { name: 'Assigned Plans', path: '/assigned-plans', matchPaths: ['/assigned-plans', '/pip-pdp-table'] },
      { name: 'History', path: '/history', matchPaths: ['/history', '/company-archive', '/past-records'] },
      { name: 'Profile Page', path: '/profile' },
    ],
    operational_manager: [
      { name: 'Dashboard', path: '/' },
      { name: 'Assign Reviews', path: '/assign-tasks', matchPaths: ['/assign-tasks', '/assign-reviews'] },
      { name: 'Assign PIP / PDP', path: '/assign-plan', matchPaths: ['/assign-plan', '/assign-pip-pdp'] },
      { name: 'Department Reports', path: '/department-reports', matchPaths: ['/department-reports', '/reports'] },
      { name: 'Review Table', path: '/review-table' },
      { name: 'Assigned Plans', path: '/assigned-plans', matchPaths: ['/assigned-plans', '/pip-pdp-table'] },
      { name: 'History', path: '/history', matchPaths: ['/history', '/company-archive', '/past-records'] },
      { name: 'Profile Page', path: '/profile' },
    ],
    admin: [
      { name: 'Dashboard', path: '/' },
      { name: 'Manage Members', path: '/members' },
      { name: 'Employee Passwords', path: '/employee-passwords', matchPaths: ['/employee-passwords', '/employee-access'] },
      { name: 'Profile Page', path: '/profile' },
    ]
  };

  const links = navLinks[role] || navLinks.employee;

  return (
    <div className="h-full py-6 flex flex-col">
      <nav className="flex-1 px-4 space-y-2 mt-4 md:mt-8">
        {links.map((link) => {
          const isCurrentActive = link.matchPaths
            ? link.matchPaths.includes(location.pathname)
            : location.pathname === link.path;

          return (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={() => onNavigate && onNavigate()}
              className={() =>
                `block px-4 py-3 rounded-md transition-colors ${
                  isCurrentActive
                    ? 'bg-amber-500 text-black font-medium'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {link.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
