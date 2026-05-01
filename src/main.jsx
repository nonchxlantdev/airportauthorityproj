import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  CirclePlus,
  ClipboardList,
  Download,
  Eye,
  FileBarChart,
  Grid2X2,
  MapPin,
  Menu,
  Paperclip,
  Pencil,
  Plane,
  Search,
  Settings,
  ShieldAlert,
  UserRound,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { areas, departments, initialAnnouncements, permissions, priorities, roles, statuses } from './mockData.js';
import './styles.css';

const adminUser = {
  id: 'demo-admin',
  name: 'Creator',
  email: 'admin@belizeairport.bz',
  password: 'demo1234',
  initials: 'CR',
  role: 'System Administrator'
};

const navItems = [
  { key: 'dashboard', label: 'Dashboard', icon: Grid2X2 },
  { key: 'my-tasks', label: 'My Tasks', icon: ClipboardList },
  { key: 'jobs', label: 'Jobs / Tasks', icon: BriefcaseBusiness },
  { key: 'create-job', label: 'Create New Job', icon: CirclePlus },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'reports', label: 'Reports', icon: FileBarChart },
  { key: 'departments', label: 'Departments', icon: Building2 },
  { key: 'areas', label: 'Areas / Locations', icon: MapPin },
  { key: 'settings', label: 'Settings', icon: Settings }
];

const jobFormDefaults = {
  title: '',
  description: '',
  department: 'Operations',
  location: 'Terminal 1',
  assignedUserId: '',
  priority: 'Medium',
  status: 'Pending',
  dueDate: '',
  startDate: '',
  approvalStatus: 'Not Submitted',
  attachments: '',
  comments: ''
};

const userFormDefaults = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'Staff / Employee',
  department: 'Operations',
  jobTitle: '',
  status: 'Active',
  password: ''
};

function useLocalStorageState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const updateValue = (nextValue) => {
    const resolved = typeof nextValue === 'function' ? nextValue(value) : nextValue;
    setValue(resolved);
    window.localStorage.setItem(key, JSON.stringify(resolved));
  };

  return [value, updateValue];
}

function formatDateTime(value = new Date()) {
  return new Intl.DateTimeFormat('en-BZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(value);
}

function formatDateLabel(value) {
  if (!value) return 'Select date';
  return new Intl.DateTimeFormat('en-BZ', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}

function createInitials(firstName, lastName) {
  return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || 'NA';
}

function isOverdue(job) {
  if (!job.dueDate || ['Completed', 'Cancelled'].includes(job.status)) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(`${job.dueDate}T00:00:00`) < today;
}

function getUserCapabilities(user) {
  const role = user?.role || '';
  return {
    canCreateJobs: ['System Administrator', 'General Manager / Senior Management', 'Department Manager', 'Supervisor'].includes(role),
    canManageUsers: role === 'System Administrator',
    canViewAllJobs: ['System Administrator', 'General Manager / Senior Management', 'Read-Only / Auditor'].includes(role)
  };
}

function userToSession(user) {
  return {
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role,
    department: user.department,
    initials: user.initials,
    status: user.status
  };
}

function LoginPage({ users, onLogin }) {
  const [email, setEmail] = useState(adminUser.email);
  const [password, setPassword] = useState(adminUser.password);
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === adminUser.email && password === adminUser.password) {
      onLogin(adminUser);
      return;
    }

    const matchingUser = users.find((user) => user.email.trim().toLowerCase() === cleanEmail && user.password === password && user.status === 'Active');
    if (matchingUser) {
      onLogin(userToSession(matchingUser));
      return;
    }

    setError('Email or password did not match an active user.');
  }

  return (
    <main className="login-page">
      <section className="login-visual" aria-label="Belize Airport Concession Company Limited">
        <div className="brand-lockup">
          <div className="logo-mark"><Plane size={34} /></div>
          <div>
            <strong>Belize Airport</strong>
            <span>Concession Company Limited</span>
          </div>
        </div>
        <div className="login-visual-copy">
          <p>Airport Operations Control</p>
          <h1>Manage jobs, approvals, and department activity from one secure workspace.</h1>
        </div>
      </section>
      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Trial Demo</p>
            <h2>Sign in</h2>
            <span>Use the demo credentials to open the operations dashboard.</span>
          </div>
          <label>
            Email address
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" />
          </label>
          <label>
            Password
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete="current-password" />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-button" type="submit">
            <UserRound size={18} />
            Login to Dashboard
          </button>
          <p className="login-note">Admin demo: admin@belizeairport.bz / demo1234. Created users can sign in with their saved password.</p>
        </form>
      </section>
    </main>
  );
}

function DashboardApp({ currentUser, jobs, setJobs, users, setUsers, onLogout }) {
  const capabilities = getUserCapabilities(currentUser);
  const [activeView, setActiveView] = useState(capabilities.canViewAllJobs ? 'dashboard' : 'my-tasks');
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState({
    mode: 'single',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });

  const visibleJobs = capabilities.canViewAllJobs ? jobs : jobs.filter((job) => job.assignedUserId === currentUser.id);
  const dashboardData = useMemo(() => buildDashboardData(visibleJobs), [visibleJobs]);

  function handleCreateJob(formData) {
    const assignedUser = users.find((user) => user.id === formData.assignedUserId);
    const nextJob = {
      ...formData,
      id: `BAC-${new Date().getFullYear()}-${String(jobs.length + 1).padStart(3, '0')}`,
      area: areas[0],
      createdBy: currentUser.name,
      assignedTo: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
      assignedUserInitials: assignedUser ? assignedUser.initials : 'UA',
      completionDate: formData.status === 'Completed' ? new Date().toISOString().slice(0, 10) : '',
      attachments: formData.attachments ? formData.attachments.split(',').map((item) => item.trim()).filter(Boolean) : [],
      history: [
        {
          title: 'Job created',
          by: currentUser.name,
          at: formatDateTime(),
          note: formData.comments || 'Initial job record created.'
        }
      ],
      lastUpdatedBy: currentUser.name,
      lastUpdated: formatDateTime()
    };

    setJobs((currentJobs) => [nextJob, ...currentJobs]);
    setSelectedJob(nextJob);
    setActiveView('jobs');
  }

  function handleCreateUser(formData) {
    const nextUser = {
      ...formData,
      id: `USR-${String(users.length + 1).padStart(3, '0')}`,
      initials: createInitials(formData.firstName, formData.lastName),
      createdAt: formatDateTime()
    };

    setUsers((currentUsers) => [nextUser, ...currentUsers]);
    setActiveView('users');
  }

  function handleUpdateUser(userId, formData) {
    const updatedInitials = createInitials(formData.firstName, formData.lastName);
    const updatedName = `${formData.firstName} ${formData.lastName}`;

    setUsers((currentUsers) => currentUsers.map((user) => {
      if (user.id !== userId) return user;

      return {
        ...user,
        ...formData,
        password: formData.password || user.password,
        initials: updatedInitials,
        updatedAt: formatDateTime()
      };
    }));

    setJobs((currentJobs) => currentJobs.map((job) => {
      if (job.assignedUserId !== userId) return job;

      return {
        ...job,
        assignedTo: updatedName,
        assignedUserInitials: updatedInitials,
        lastUpdated: formatDateTime(),
        lastUpdatedBy: currentUser.name
      };
    }));
  }

  function handleUpdateJobStatus(jobId, nextStatus, note) {
    const updatedAt = formatDateTime();
    const completionDate = nextStatus === 'Completed' ? new Date().toISOString().slice(0, 10) : '';

    setJobs((currentJobs) => currentJobs.map((job) => {
      if (job.id !== jobId) return job;

      const updatedJob = {
        ...job,
        status: nextStatus,
        completionDate,
        approvalStatus: nextStatus === 'Completed' ? 'Pending Approval' : job.approvalStatus,
        lastUpdated: updatedAt,
        lastUpdatedBy: currentUser.name,
        history: [
          {
            title: `Status updated to ${nextStatus}`,
            by: currentUser.name,
            at: updatedAt,
            note: note || 'Status changed from task detail view.'
          },
          ...job.history
        ]
      };

      setSelectedJob((currentSelectedJob) => (
        currentSelectedJob?.id === jobId ? updatedJob : currentSelectedJob
      ));

      return updatedJob;
    }));
  }

  return (
    <div className="app-shell">
      <Sidebar activeView={activeView} capabilities={capabilities} onNavigate={setActiveView} />
      <main className="main-content">
        <TopBar activeView={activeView} currentUser={currentUser} onLogout={onLogout} />
        <section className="content-pad">
          {activeView === 'dashboard' && (
            <DashboardView
              dashboardData={dashboardData}
              jobs={visibleJobs}
              onCreateJob={() => setActiveView('create-job')}
              onViewJob={(job) => setSelectedJob(job)}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              canCreateJobs={capabilities.canCreateJobs}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
            />
          )}
          {activeView === 'my-tasks' && (
            <MyTasksView
              currentUser={currentUser}
              jobs={jobs.filter((job) => job.assignedUserId === currentUser.id)}
              onViewJob={(job) => setSelectedJob(job)}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
            />
          )}
          {activeView === 'jobs' && (
            <JobsView
              jobs={visibleJobs}
              onCreateJob={() => setActiveView('create-job')}
              onViewJob={(job) => setSelectedJob(job)}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              canCreateJobs={capabilities.canCreateJobs}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
            />
          )}
          {activeView === 'create-job' && capabilities.canCreateJobs && (
            <CreateJobView users={users} onCreateJob={handleCreateJob} />
          )}
          {activeView === 'users' && capabilities.canManageUsers && (
            <UsersView
              users={users}
              jobs={jobs}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onViewJob={(job) => setSelectedJob(job)}
            />
          )}
          {['reports', 'departments', 'areas', 'settings'].includes(activeView) && (
            <PlaceholderView activeView={activeView} />
          )}
        </section>
      </main>
      {selectedJob && (
        <JobDetailsDrawer
          job={selectedJob}
          currentUser={currentUser}
          canUpdateStatus={capabilities.canViewAllJobs || selectedJob.assignedUserId === currentUser.id}
          onUpdateStatus={handleUpdateJobStatus}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function Sidebar({ activeView, capabilities, onNavigate }) {
  const visibleNavItems = navItems.filter((item) => {
    if (item.key === 'create-job') return capabilities.canCreateJobs;
    if (item.key === 'users') return capabilities.canManageUsers;
    if (['jobs', 'reports', 'departments', 'areas', 'settings'].includes(item.key)) return capabilities.canViewAllJobs;
    return true;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon"><Plane size={38} /></div>
        <div>
          <strong>Belize Airport</strong>
          <span>Concession Company Limited</span>
        </div>
      </div>
      <nav>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              className={activeView === item.key ? 'nav-item active' : 'nav-item'}
              key={item.key}
              onClick={() => onNavigate(item.key)}
            >
              <Icon size={20} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <Plane size={28} />
        <span>Connecting people, elevating Belize</span>
      </div>
    </aside>
  );
}

function TopBar({ activeView, currentUser, onLogout }) {
  const title = navItems.find((item) => item.key === activeView)?.label || 'Dashboard';
  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="icon-button" aria-label="Open menu"><Menu size={22} /></button>
        <strong>{title}</strong>
      </div>
      <div className="user-tools">
        <button className="notification-button" aria-label="Notifications">
          <Bell size={21} />
          <span>0</span>
        </button>
        <button className="profile-button" onClick={onLogout}>
          <span className="avatar"><UserRound size={19} /></span>
          <span>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.role}</small>
          </span>
        </button>
      </div>
    </header>
  );
}

function DashboardView({ dashboardData, jobs, onCreateJob, onViewJob, searchTerm, setSearchTerm, canCreateJobs, dateFilter, setDateFilter }) {
  return (
    <>
      <PageHeading
        title="Dashboard"
        description="Live overview for Philip S. W. Goldson International Airport"
        action={<ActionButtons onCreateJob={onCreateJob} canCreateJobs={canCreateJobs} dateFilter={dateFilter} setDateFilter={setDateFilter} />}
      />
      <MetricGrid metrics={dashboardData.metrics} />
      <ChartGrid dashboardData={dashboardData} />
      <section className="dashboard-lower">
        <RecentJobs
          jobs={jobs}
          onCreateJob={onCreateJob}
          onViewJob={onViewJob}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          canCreateJobs={canCreateJobs}
        />
        <aside className="right-rail">
          <OverdueJobs jobs={dashboardData.overdueJobs} onViewJob={onViewJob} />
          <QuickActions onCreateJob={onCreateJob} />
          <Announcements />
        </aside>
      </section>
    </>
  );
}

function JobsView({ jobs, onCreateJob, onViewJob, searchTerm, setSearchTerm, canCreateJobs, dateFilter, setDateFilter }) {
  return (
    <>
      <PageHeading
        title="Jobs / Tasks"
        description="Create, search, and view airport job records"
        action={<ActionButtons onCreateJob={onCreateJob} canCreateJobs={canCreateJobs} dateFilter={dateFilter} setDateFilter={setDateFilter} />}
      />
      <RecentJobs
        jobs={jobs}
        onCreateJob={onCreateJob}
        onViewJob={onViewJob}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        canCreateJobs={canCreateJobs}
      />
    </>
  );
}

function MyTasksView({ currentUser, jobs, onViewJob, searchTerm, setSearchTerm }) {
  const openJobs = jobs.filter((job) => !['Completed', 'Cancelled'].includes(job.status));
  const completedJobs = jobs.filter((job) => job.status === 'Completed');

  return (
    <>
      <PageHeading
        title="My Tasks"
        description={`Assigned job list for ${currentUser.name}`}
      />
      <section className="metric-grid task-metrics">
        <article className="metric-card active">
          <div className="metric-icon"><BriefcaseBusiness size={27} /></div>
          <div>
            <span>Assigned Tasks</span>
            <strong>{jobs.length}</strong>
            <p>Total jobs assigned to this user</p>
          </div>
        </article>
        <article className="metric-card pending">
          <div className="metric-icon"><CalendarDays size={27} /></div>
          <div>
            <span>Open Tasks</span>
            <strong>{openJobs.length}</strong>
            <p>Pending, in progress, or delayed</p>
          </div>
        </article>
        <article className="metric-card complete">
          <div className="metric-icon"><CheckCircle2 size={27} /></div>
          <div>
            <span>Completed</span>
            <strong>{completedJobs.length}</strong>
            <p>Completed assignments</p>
          </div>
        </article>
      </section>
      <RecentJobs
        jobs={jobs}
        onViewJob={onViewJob}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        canCreateJobs={false}
        title="Assigned Tasks"
        emptyTitle="No assigned tasks"
        emptyDescription="When a manager assigns a job to this user, it will appear here after login."
      />
    </>
  );
}

function PageHeading({ title, description, action }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function ActionButtons({ onCreateJob, canCreateJobs, dateFilter, setDateFilter }) {
  return (
    <div className="toolbar-actions">
      <DateRangeControl dateFilter={dateFilter} setDateFilter={setDateFilter} />
      <button className="export-button" type="button">
        <Download size={18} />
        Export Report
      </button>
      {canCreateJobs && <button className="export-button" type="button" onClick={onCreateJob}>
        <CirclePlus size={18} />
        New Job
      </button>}
    </div>
  );
}

function DateRangeControl({ dateFilter, setDateFilter }) {
  const label = dateFilter.mode === 'range'
    ? `${formatDateLabel(dateFilter.startDate)} - ${formatDateLabel(dateFilter.endDate)}`
    : formatDateLabel(dateFilter.startDate);

  function updateDateFilter(field, value) {
    setDateFilter((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="date-range-control" aria-label="Dashboard date selector">
      <div className="date-control-label">
        <CalendarDays size={18} />
        <span>{label}</span>
      </div>
      <select value={dateFilter.mode} onChange={(event) => updateDateFilter('mode', event.target.value)} aria-label="Date selection mode">
        <option value="single">Single Date</option>
        <option value="range">Date Range</option>
      </select>
      <input
        type="date"
        value={dateFilter.startDate}
        onChange={(event) => updateDateFilter('startDate', event.target.value)}
        aria-label={dateFilter.mode === 'range' ? 'Start date' : 'Selected date'}
      />
      {dateFilter.mode === 'range' && (
        <input
          type="date"
          value={dateFilter.endDate}
          min={dateFilter.startDate}
          onChange={(event) => updateDateFilter('endDate', event.target.value)}
          aria-label="End date"
        />
      )}
    </div>
  );
}

function MetricGrid({ metrics }) {
  return (
    <section className="metric-grid">
      {metrics.map((card) => {
        const Icon = card.icon;
        return (
          <article className={`metric-card ${card.tone}`} key={card.label}>
            <div className="metric-icon"><Icon size={27} /></div>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.hint}</p>
            </div>
          </article>
        );
      })}
    </section>
  );
}

function ChartGrid({ dashboardData }) {
  return (
    <section className="chart-grid">
      <ChartCard title="Jobs by Department" stats={dashboardData.departmentStats} />
      <ChartCard title="Jobs by Area" stats={dashboardData.areaStats} />
      <ChartCard title="Status Breakdown" stats={dashboardData.statusStats} />
    </section>
  );
}

function ChartCard({ title, stats }) {
  const total = stats.reduce((sum, item) => sum + item.count, 0);
  const gradient = total
    ? stats.map((item, index) => {
      const previous = stats.slice(0, index).reduce((sum, stat) => sum + stat.percent, 0);
      return `${item.color} ${previous}% ${previous + item.percent}%`;
    }).join(', ')
    : '#e6edf4 0% 100%';

  return (
    <article className="panel chart-card">
      <div className="panel-header">
        <h2>{title}</h2>
        <button type="button">View full report</button>
      </div>
      <div className="chart-content">
        <div className="donut" style={{ '--segments': gradient }} aria-hidden="true" />
        {total ? (
          <ul className="legend">
            {stats.filter((item) => item.count > 0).map((item) => (
              <li key={item.label}>
                <span className="legend-dot" style={{ background: item.color }} />
                <span>{item.label}</span>
                <strong>{item.count} ({item.percent}%)</strong>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No data yet" description="Create a job to populate this chart." compact />
        )}
      </div>
    </article>
  );
}

function RecentJobs({ jobs, onCreateJob, onViewJob, searchTerm, setSearchTerm, canCreateJobs = true, title = 'Recent Jobs', emptyTitle = 'No jobs yet', emptyDescription = 'Create the first job to test the workflow live.' }) {
  const visibleJobs = jobs.filter((job) => {
    const target = `${job.id} ${job.title} ${job.department} ${job.location} ${job.assignedTo}`.toLowerCase();
    return target.includes(searchTerm.toLowerCase());
  });

  return (
    <section className="panel recent-jobs">
      <div className="panel-header jobs-header">
        <h2>{title}</h2>
        <div className="filters">
          <select aria-label="Department filter" defaultValue="All Departments">
            <option>All Departments</option>
            {departments.map((department) => <option key={department}>{department}</option>)}
          </select>
          <select aria-label="Status filter" defaultValue="All Statuses">
            <option>All Statuses</option>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select aria-label="Area filter" defaultValue={areas[0]}>
            {areas.map((area) => <option key={area}>{area}</option>)}
          </select>
          <label className="search-box">
            <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search jobs..." />
            <Search size={16} />
          </label>
          {canCreateJobs && <button className="new-job-button" type="button" onClick={onCreateJob}><CirclePlus size={16} /> New Job</button>}
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Job ID</th>
              <th>Title</th>
              <th>Department</th>
              <th>Assigned To</th>
              <th>Area / Location</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Due Date</th>
              <th>Last Updated</th>
              <th>Attachments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleJobs.map((job) => (
              <tr key={job.id}>
                <td><span className="job-id">{job.id}</span></td>
                <td><strong>{job.title}</strong></td>
                <td>{job.department}</td>
                <td><span className="person"><span>{job.assignedUserInitials}</span>{job.assignedTo}</span></td>
                <td>{job.area} / {job.location}</td>
                <td><StatusPill label={job.status} /></td>
                <td><PriorityPill label={job.priority} /></td>
                <td>{job.dueDate || 'Not set'}</td>
                <td>{job.lastUpdated}</td>
                <td><span className="attachment"><Paperclip size={14} /> {job.attachments.length}</span></td>
                <td>
                  <button className="action-button" type="button" onClick={() => onViewJob(job)} aria-label={`View ${job.id}`}>
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visibleJobs.length && (
          <EmptyState title={emptyTitle} description={emptyDescription} actionLabel={canCreateJobs ? 'Create Job' : undefined} onAction={onCreateJob} />
        )}
      </div>
    </section>
  );
}

function CreateJobView({ users, onCreateJob }) {
  const [formData, setFormData] = useState(jobFormDefaults);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  return (
    <>
      <PageHeading title="Create New Job" description="Add a live job record for Philip S. W. Goldson International Airport" />
      <form className="panel form-panel" onSubmit={(event) => { event.preventDefault(); onCreateJob(formData); setFormData(jobFormDefaults); }}>
        <div className="form-grid">
          <label className="wide-field">
            Job title
            <input required value={formData.title} onChange={(event) => updateField('title', event.target.value)} placeholder="Example: Inspect baggage scanner" />
          </label>
          <label>
            Department
            <select value={formData.department} onChange={(event) => updateField('department', event.target.value)}>
              {departments.map((department) => <option key={department}>{department}</option>)}
            </select>
          </label>
          <label>
            Area
            <select value={areas[0]} disabled>
              <option>{areas[0]}</option>
            </select>
          </label>
          <label>
            Specific location
            <select value={formData.location} onChange={(event) => updateField('location', event.target.value)}>
              <option>Terminal 1</option>
              <option>Terminal 2</option>
              <option>Cargo Area</option>
              <option>Runway / Apron</option>
              <option>Parking Area</option>
              <option>VIP Lounge</option>
              <option>Immigration Area</option>
              <option>Customs Area</option>
              <option>Restrooms</option>
              <option>Other Airport Location</option>
            </select>
          </label>
          <label>
            Assign to
            <select value={formData.assignedUserId} onChange={(event) => updateField('assignedUserId', event.target.value)}>
              <option value="">Unassigned</option>
              {users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} - {user.department}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select value={formData.priority} onChange={(event) => updateField('priority', event.target.value)}>
              {priorities.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={formData.status} onChange={(event) => updateField('status', event.target.value)}>
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label>
            Start date
            <input type="date" value={formData.startDate} onChange={(event) => updateField('startDate', event.target.value)} />
          </label>
          <label>
            Due date
            <input type="date" value={formData.dueDate} onChange={(event) => updateField('dueDate', event.target.value)} />
          </label>
          <label>
            Approval status
            <select value={formData.approvalStatus} onChange={(event) => updateField('approvalStatus', event.target.value)}>
              <option>Not Submitted</option>
              <option>Pending Approval</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </label>
          <label>
            Attachments
            <input value={formData.attachments} onChange={(event) => updateField('attachments', event.target.value)} placeholder="File names separated by commas" />
          </label>
          <label className="wide-field">
            Description
            <textarea required value={formData.description} onChange={(event) => updateField('description', event.target.value)} placeholder="Describe the work, safety notes, or expected proof of completion." />
          </label>
          <label className="wide-field">
            Initial comment
            <textarea value={formData.comments} onChange={(event) => updateField('comments', event.target.value)} placeholder="Optional note for the assigned staff or manager." />
          </label>
        </div>
        <div className="form-actions">
          <button className="primary-button fit-button" type="submit"><CirclePlus size={18} /> Create Job</button>
        </div>
      </form>
    </>
  );
}

function UsersView({ users, jobs, onCreateUser, onUpdateUser, onViewJob }) {
  const [formData, setFormData] = useState(userFormDefaults);
  const [editingUserId, setEditingUserId] = useState(null);
  const isEditing = Boolean(editingUserId);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function startEditUser(user) {
    setEditingUserId(user.id);
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      department: user.department,
      jobTitle: user.jobTitle || '',
      status: user.status,
      password: ''
    });
  }

  function resetForm() {
    setEditingUserId(null);
    setFormData(userFormDefaults);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (isEditing) {
      onUpdateUser(editingUserId, formData);
    } else {
      onCreateUser(formData);
    }

    resetForm();
  }

  return (
    <>
      <PageHeading title="Users" description="Create users, edit permissions, and reset login access" />
      <section className="split-layout">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <div className="panel-header form-title">
            <h2>{isEditing ? 'Edit User' : 'Create User'}</h2>
            {isEditing && <button className="secondary-button" type="button" onClick={resetForm}>Cancel Edit</button>}
          </div>
          <div className="form-grid compact-form">
            <label>
              First name
              <input required value={formData.firstName} onChange={(event) => updateField('firstName', event.target.value)} />
            </label>
            <label>
              Last name
              <input required value={formData.lastName} onChange={(event) => updateField('lastName', event.target.value)} />
            </label>
            <label className="wide-field">
              Email
              <input required type="email" value={formData.email} onChange={(event) => updateField('email', event.target.value)} />
            </label>
            <label className="wide-field">
              {isEditing ? 'Reset password' : 'Login password'}
              <input
                required={!isEditing}
                minLength={formData.password ? 6 : undefined}
                type="password"
                value={formData.password}
                onChange={(event) => updateField('password', event.target.value)}
                placeholder={isEditing ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
              />
            </label>
            <label>
              Phone
              <input value={formData.phone} onChange={(event) => updateField('phone', event.target.value)} />
            </label>
            <label>
              Job title
              <input value={formData.jobTitle} onChange={(event) => updateField('jobTitle', event.target.value)} placeholder="Supervisor, Technician, Officer" />
            </label>
            <label>
              Role
              <select value={formData.role} onChange={(event) => updateField('role', event.target.value)}>
                {roles.map((role) => <option key={role}>{role}</option>)}
              </select>
            </label>
            <label>
              Department
              <select value={formData.department} onChange={(event) => updateField('department', event.target.value)}>
                {departments.map((department) => <option key={department}>{department}</option>)}
              </select>
            </label>
            <label>
              Status
              <select value={formData.status} onChange={(event) => updateField('status', event.target.value)}>
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </label>
          </div>
          <div className="permission-strip">
            {permissions.slice(0, 6).map((permission) => <span key={permission}>{permission}</span>)}
          </div>
          <div className="form-actions">
            <button className="primary-button fit-button" type="submit">
              <Users size={18} />
              {isEditing ? 'Save User Settings' : 'Create User'}
            </button>
          </div>
        </form>
        <section className="panel users-list">
          <div className="panel-header">
            <h2>Created Users</h2>
            <span className="record-count">{users.length} total</span>
          </div>
          {users.length ? users.map((user) => (
            <UserSummaryCard
              user={user}
              jobs={jobs.filter((job) => job.assignedUserId === user.id)}
              onEditUser={startEditUser}
              onViewJob={onViewJob}
              key={user.id}
            />
          )) : (
            <EmptyState title="No users yet" description="Create a user, then assign them to a new job." compact />
          )}
        </section>
      </section>
    </>
  );
}

function UserSummaryCard({ user, jobs, onEditUser, onViewJob }) {
  return (
    <article className="user-card">
      <span className="avatar user-avatar">{user.initials}</span>
      <div className="user-card-main">
        <div className="user-card-heading">
          <div>
            <strong>{user.firstName} {user.lastName}</strong>
            <p>{user.role}</p>
            <small>{user.department} - {user.email}</small>
          </div>
          <div className="user-card-actions">
            <StatusBadge label={user.status} />
            <button className="secondary-button icon-text-button" type="button" onClick={() => onEditUser(user)}>
              <Pencil size={14} />
              Edit
            </button>
          </div>
        </div>
        <div className="user-login-note">
          <span>Login enabled</span>
          <span>{jobs.length} assigned task{jobs.length === 1 ? '' : 's'}</span>
        </div>
        {jobs.length ? (
          <div className="assigned-task-list">
            {jobs.slice(0, 3).map((job) => (
              <button type="button" onClick={() => onViewJob(job)} key={job.id}>
                <span className="job-id">{job.id}</span>
                <strong>{job.title}</strong>
                <StatusPill label={job.status} />
              </button>
            ))}
          </div>
        ) : (
          <p className="muted-line">No tasks assigned yet.</p>
        )}
      </div>
    </article>
  );
}

function JobDetailsDrawer({ job, currentUser, canUpdateStatus, onUpdateStatus, onClose }) {
  const [statusValue, setStatusValue] = useState(job.status);
  const [statusNote, setStatusNote] = useState('');

  useEffect(() => {
    setStatusValue(job.status);
    setStatusNote('');
  }, [job.id, job.status]);

  function handleStatusSubmit(event) {
    event.preventDefault();
    onUpdateStatus(job.id, statusValue, statusNote);
  }

  return (
    <aside className="drawer-backdrop" aria-label="Job details">
      <section className="job-drawer">
        <div className="drawer-header">
          <div>
            <span className="job-id">{job.id}</span>
            <h2>{job.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close job details"><X size={20} /></button>
        </div>
        <div className="detail-grid">
          <Detail label="Department" value={job.department} />
          <Detail label="Area" value={job.area} />
          <Detail label="Location" value={job.location} />
          <Detail label="Assigned Staff" value={job.assignedTo} />
          <Detail label="Created By" value={job.createdBy} />
          <Detail label="Priority" value={<PriorityPill label={job.priority} />} />
          <Detail label="Status" value={<StatusPill label={job.status} />} />
          <Detail label="Approval" value={job.approvalStatus} />
          <Detail label="Start Date" value={job.startDate || 'Not set'} />
          <Detail label="Due Date" value={job.dueDate || 'Not set'} />
          <Detail label="Completion Date" value={job.completionDate || 'Not completed'} />
          <Detail label="Last Updated By" value={job.lastUpdatedBy} />
        </div>
        <section className="detail-section">
          <h3>Description</h3>
          <p>{job.description}</p>
        </section>
        {canUpdateStatus && (
          <section className="detail-section status-update-panel">
            <h3>Update Task Status</h3>
            <form onSubmit={handleStatusSubmit}>
              <label>
                Status
                <select value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>
                  {statuses.filter((status) => status !== 'Cancelled' || getUserCapabilities(currentUser).canViewAllJobs).map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label>
                Update note
                <textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Add progress notes, blockers, or completion details." />
              </label>
              <button className="primary-button fit-button" type="submit">
                <CheckCircle2 size={18} />
                Save Status
              </button>
            </form>
          </section>
        )}
        <section className="detail-section">
          <h3>Attachments</h3>
          {job.attachments.length ? (
            <ul className="attachment-list">
              {job.attachments.map((attachment) => <li key={attachment}><Paperclip size={15} /> {attachment}</li>)}
            </ul>
          ) : <p>No attachments added.</p>}
        </section>
        <section className="detail-section">
          <h3>Job History Timeline</h3>
          <ol className="timeline">
            {job.history.map((item) => (
              <li key={`${item.title}-${item.at}`}>
                <strong>{item.title}</strong>
                <span>{item.at} by {item.by}</span>
                <p>{item.note}</p>
              </li>
            ))}
          </ol>
        </section>
      </section>
    </aside>
  );
}

function Detail({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PlaceholderView({ activeView }) {
  const labels = {
    reports: 'Reports',
    departments: 'Departments',
    areas: 'Areas / Locations',
    settings: 'Settings'
  };
  return (
    <>
      <PageHeading title={labels[activeView]} description="This module is reserved for the next trial phase." />
      <section className="panel placeholder-panel">
        <Wrench size={30} />
        <h2>{labels[activeView]} module</h2>
        <p>The live test build now focuses on login, dashboard, job creation, job viewing, and user creation.</p>
      </section>
    </>
  );
}

function StatusPill({ label }) {
  return <span className={`pill status-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</span>;
}

function PriorityPill({ label }) {
  return <span className={`pill priority-${label.toLowerCase()}`}>{label}</span>;
}

function StatusBadge({ label }) {
  return <span className={`pill user-status-${label.toLowerCase()}`}>{label}</span>;
}

function OverdueJobs({ jobs, onViewJob }) {
  return (
    <section className="panel rail-panel">
      <div className="panel-header">
        <h2><ShieldAlert size={17} /> Overdue Jobs</h2>
        <button type="button">View all</button>
      </div>
      <div className="stack-list">
        {jobs.length ? jobs.map((job) => (
          <button className="compact-job compact-job-button" type="button" key={job.id} onClick={() => onViewJob(job)}>
            <div>
              <strong>{job.id}</strong>
              <p>{job.title}</p>
              <span>Due: {job.dueDate}</span>
            </div>
            <PriorityPill label={job.priority} />
          </button>
        )) : <EmptyState title="No overdue jobs" description="Past-due active jobs will appear here." compact />}
      </div>
    </section>
  );
}

function QuickActions({ onCreateJob }) {
  return (
    <section className="panel rail-panel">
      <div className="panel-header">
        <h2><Wrench size={17} /> Quick Actions</h2>
      </div>
      <div className="quick-actions">
        <button type="button" onClick={onCreateJob}><CirclePlus size={15} /> Create New Job</button>
        <button type="button"><ClipboardList size={15} /> View All Jobs</button>
        <button type="button"><FileBarChart size={15} /> View Reports</button>
        <button type="button"><CalendarDays size={15} /> Calendar View</button>
      </div>
    </section>
  );
}

function Announcements() {
  return (
    <section className="panel rail-panel">
      <div className="panel-header">
        <h2><Bell size={17} /> Announcements</h2>
        <button type="button">View all</button>
      </div>
      {initialAnnouncements.length ? initialAnnouncements.map((item) => (
        <article className="announcement" key={item.title}>
          <strong>{item.title}</strong>
          <p>{item.body}</p>
          <span>{item.location}</span>
        </article>
      )) : <EmptyState title="No announcements" description="Announcements will appear here when added." compact />}
    </section>
  );
}

function EmptyState({ title, description, actionLabel, onAction, compact = false }) {
  return (
    <div className={compact ? 'empty-state compact-empty' : 'empty-state'}>
      <strong>{title}</strong>
      <p>{description}</p>
      {actionLabel && <button className="new-job-button" type="button" onClick={onAction}>{actionLabel}</button>}
    </div>
  );
}

function buildDashboardData(jobs) {
  const activeJobs = jobs.filter((job) => !['Completed', 'Cancelled'].includes(job.status));
  const today = new Date().toISOString().slice(0, 10);
  const completedToday = jobs.filter((job) => job.status === 'Completed' && job.completionDate === today);
  const overdueJobs = jobs.filter(isOverdue);

  return {
    metrics: [
      { label: 'Pending Jobs', value: jobs.filter((job) => job.status === 'Pending').length, hint: 'Awaiting start or assignment', tone: 'pending', icon: CalendarDays },
      { label: 'Completed Today', value: completedToday.length, hint: 'Completed with today as completion date', tone: 'complete', icon: CheckCircle2 },
      { label: 'Delayed Jobs', value: jobs.filter((job) => job.status === 'Delayed').length + overdueJobs.length, hint: 'Delayed or past due', tone: 'delayed', icon: ShieldAlert },
      { label: 'Total Active Jobs', value: activeJobs.length, hint: 'Open work across airport operations', tone: 'active', icon: BriefcaseBusiness }
    ],
    departmentStats: buildStats(jobs, departments, 'department', ['#1f73dc', '#5bc5d8', '#ffd34d', '#7ad2bd', '#8cc9a8', '#657483', '#9f7aea', '#f97316', '#14b8a6', '#ef4444']),
    areaStats: buildStats(jobs, areas, 'area', ['#1f73dc']),
    statusStats: buildStats(jobs, statuses, 'status', ['#ffd34d', '#1f73dc', '#11a879', '#ec4a4a', '#657483']),
    overdueJobs
  };
}

function buildStats(records, labels, field, colors) {
  const total = records.length;
  return labels.map((label, index) => {
    const count = records.filter((record) => record[field] === label).length;
    return {
      label,
      count,
      percent: total ? Math.round((count / total) * 100) : 0,
      color: colors[index % colors.length]
    };
  });
}

function App() {
  const [jobs, setJobs] = useLocalStorageState('air-authority-jobs', []);
  const [users, setUsers] = useLocalStorageState('air-authority-users', []);
  const [sessionUser, setSessionUser] = useState(null);

  return sessionUser
    ? (
      <DashboardApp
        currentUser={sessionUser}
        jobs={jobs}
        setJobs={setJobs}
        users={users}
        setUsers={setUsers}
        onLogout={() => setSessionUser(null)}
      />
    )
    : <LoginPage users={users} onLogin={setSessionUser} />;
}

createRoot(document.getElementById('root')).render(<App />);
