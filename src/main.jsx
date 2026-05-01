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
  EyeOff,
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
import { supabase } from './supabaseClient.js';
import './styles.css';

const adminUser = {
  email: 'glenrickmspain@hotmail.com',
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
  teamId: '',
  priority: 'Medium',
  status: 'Pending',
  dueDate: '',
  startDate: '',
  approvalStatus: 'Not Submitted',
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

const teamFormDefaults = {
  name: '',
  department: 'Operations',
  memberIds: []
};

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
    name: `${user.firstName} ${user.lastName}`.trim() || user.email,
    email: user.email,
    role: user.role,
    department: user.department,
    initials: user.initials,
    status: user.status
  };
}

function displayUserName(user) {
  return `${user.firstName} ${user.lastName}`.trim() || user.email || 'System';
}

function profileFromRow(row) {
  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || 'Staff / Employee',
    department: row.department || 'Operations',
    jobTitle: row.job_title || '',
    status: row.status || 'Active',
    initials: row.initials || createInitials(row.first_name, row.last_name),
    createdAt: formatDateTime(new Date(row.created_at))
  };
}

function jobFromRow(row, history = []) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    department: row.department,
    area: row.area,
    location: row.location,
    assignedUserId: row.assigned_user_id || '',
    teamId: row.team_id || '',
    assignedTo: row.assigned_to || 'Unassigned',
    assignedUserInitials: row.assigned_user_initials || 'UA',
    priority: row.priority,
    status: row.status,
    approvalStatus: row.approval_status,
    startDate: row.start_date || '',
    dueDate: row.due_date || '',
    completionDate: row.completion_date || '',
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdById: row.created_by || '',
    lastUpdatedById: row.last_updated_by || '',
    createdBy: row.created_by_name || 'System',
    lastUpdatedBy: row.last_updated_by_name || 'System',
    lastUpdated: formatDateTime(new Date(row.updated_at)),
    history
  };
}

function teamFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    department: row.department || 'Operations',
    memberIds: row.team_members?.map((member) => member.user_id) || [],
    createdAt: row.created_at
  };
}

function historyFromRow(row) {
  return {
    title: row.title,
    by: row.actor_name || 'System',
    at: formatDateTime(new Date(row.created_at)),
    note: row.note || ''
  };
}

function attachmentName(attachment) {
  return typeof attachment === 'string' ? attachment : attachment.name;
}

function attachmentUrl(attachment) {
  return typeof attachment === 'string' ? '' : attachment.url;
}

function enrichJobsWithUsers(jobs, users) {
  const usersById = users.reduce((grouped, user) => {
    grouped[user.id] = user;
    return grouped;
  }, {});

  return jobs.map((job) => ({
    ...job,
    createdBy: usersById[job.createdById] ? displayUserName(usersById[job.createdById]) : job.createdBy,
    lastUpdatedBy: usersById[job.lastUpdatedById] ? displayUserName(usersById[job.lastUpdatedById]) : job.lastUpdatedBy
  }));
}

function enrichJobsWithTeams(jobs, teams) {
  const teamsById = teams.reduce((grouped, team) => {
    grouped[team.id] = team;
    return grouped;
  }, {});

  return jobs.map((job) => ({
    ...job,
    teamName: teamsById[job.teamId]?.name || ''
  }));
}

async function uploadJobAttachments(jobId, files = []) {
  const selectedFiles = Array.from(files).filter((file) => ['image/jpeg', 'image/png'].includes(file.type));

  if (!selectedFiles.length) return [];

  const uploadedFiles = [];

  for (const file of selectedFiles) {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
    const filePath = `${jobId}/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from('job-attachments')
      .upload(filePath, file, { contentType: file.type, upsert: false });

    if (error) throw error;

    const { data } = supabase.storage.from('job-attachments').getPublicUrl(filePath);
    uploadedFiles.push({
      name: file.name,
      url: data.publicUrl,
      path: filePath,
      type: file.type
    });
  }

  return uploadedFiles;
}

function LoginPage({ onLogin }) {
  const [email, setEmail] = useState(adminUser.email);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      setError(error.message || 'Email or password did not match an active user.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError('Enter your email address first.');
      return;
    }

    setError('');
    setMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: 'https://nonchxlantdev.github.io/airportauthorityproj/'
    });

    if (error) {
      setError(error.message);
      return;
    }

    setMessage('Password reset email sent.');
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
            <span className="password-field">
              <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? 'text' : 'password'} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </span>
          </label>
          {error && <p className="form-error">{error}</p>}
          {message && <p className="form-success">{message}</p>}
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            <UserRound size={18} />
            {isSubmitting ? 'Signing in...' : 'Login to Dashboard'}
          </button>
          <button className="forgot-password-button" type="button" onClick={handleForgotPassword}>
            Forgot password?
          </button>
          <p className="login-note">Use the Supabase account created for this airport operations workspace.</p>
        </form>
      </section>
    </main>
  );
}

function DashboardApp({ currentUser, jobs, setJobs, users, setUsers, teams, setTeams, onLogout, onRefreshData }) {
  const capabilities = getUserCapabilities(currentUser);
  const [activeView, setActiveView] = useState(capabilities.canViewAllJobs ? 'dashboard' : 'my-tasks');
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dashboardFilter, setDashboardFilter] = useState('all');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dateFilter, setDateFilter] = useState({
    mode: 'single',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10)
  });

  const currentUserTeamIds = teams.filter((team) => team.memberIds.includes(currentUser.id)).map((team) => team.id);
  const visibleJobs = capabilities.canViewAllJobs
    ? jobs
    : jobs.filter((job) => job.assignedUserId === currentUser.id || currentUserTeamIds.includes(job.teamId));
  const dashboardData = useMemo(() => buildDashboardData(visibleJobs), [visibleJobs]);
  const dashboardJobs = useMemo(() => filterJobsByMetric(visibleJobs, dashboardFilter), [visibleJobs, dashboardFilter]);

  async function handleCreateJob(formData, attachmentFiles = []) {
    const assignedUser = users.find((user) => user.id === formData.assignedUserId);
    const jobId = `BAC-${new Date().getFullYear()}-${String(jobs.length + 1).padStart(3, '0')}`;
    const completionDate = formData.status === 'Completed' ? new Date().toISOString().slice(0, 10) : '';
    let attachments = [];

    try {
      attachments = await uploadJobAttachments(jobId, attachmentFiles);
    } catch (error) {
      window.alert(error.message);
      return false;
    }

    const historyItem = {
      title: 'Job created',
      by: currentUser.name,
      at: formatDateTime(),
      note: formData.comments || 'Initial job record created.'
    };

    const { error } = await supabase.from('jobs').insert({
      id: jobId,
      title: formData.title,
      description: formData.description,
      department: formData.department,
      area: areas[0],
      location: formData.location,
      assigned_user_id: formData.assignedUserId || null,
      team_id: formData.teamId || null,
      assigned_to: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
      assigned_user_initials: assignedUser ? assignedUser.initials : 'UA',
      priority: formData.priority,
      status: formData.status,
      approval_status: formData.approvalStatus,
      start_date: formData.startDate || null,
      due_date: formData.dueDate || null,
      completion_date: completionDate || null,
      attachments,
      created_by: currentUser.id,
      last_updated_by: currentUser.id
    });

    if (error) {
      window.alert(error.message);
      return false;
    }

    await supabase.from('job_history').insert({
      job_id: jobId,
      title: historyItem.title,
      note: historyItem.note,
      actor_id: currentUser.id,
      actor_name: currentUser.name
    });

    const nextJob = {
      ...formData,
      id: jobId,
      area: areas[0],
      createdById: currentUser.id,
      lastUpdatedById: currentUser.id,
      teamId: formData.teamId || '',
      teamName: teams.find((team) => team.id === formData.teamId)?.name || '',
      createdBy: currentUser.name,
      assignedTo: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
      assignedUserInitials: assignedUser ? assignedUser.initials : 'UA',
      completionDate,
      attachments,
      history: [historyItem],
      lastUpdatedBy: currentUser.name,
      lastUpdated: formatDateTime()
    };

    setJobs((currentJobs) => [nextJob, ...currentJobs]);
    setSelectedJob(nextJob);
    setActiveView('jobs');
    return true;
  }

  async function handleUpdateJob(jobId, formData, attachmentFiles = [], existingAttachments = []) {
    const assignedUser = users.find((user) => user.id === formData.assignedUserId);
    let uploadedAttachments = [];

    try {
      uploadedAttachments = await uploadJobAttachments(jobId, attachmentFiles);
    } catch (error) {
      window.alert(error.message);
      return false;
    }

    const attachments = [...existingAttachments, ...uploadedAttachments];
    const completionDate = formData.status === 'Completed' ? (formData.completionDate || new Date().toISOString().slice(0, 10)) : '';
    const updatePayload = {
      title: formData.title,
      description: formData.description,
      department: formData.department,
      location: formData.location,
      assigned_user_id: formData.assignedUserId || null,
      team_id: formData.teamId || null,
      assigned_to: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
      assigned_user_initials: assignedUser ? assignedUser.initials : 'UA',
      priority: formData.priority,
      status: formData.status,
      approval_status: formData.approvalStatus,
      start_date: formData.startDate || null,
      due_date: formData.dueDate || null,
      completion_date: completionDate || null,
      attachments,
      last_updated_by: currentUser.id
    };

    const { error } = await supabase.from('jobs').update(updatePayload).eq('id', jobId);

    if (error) {
      window.alert(error.message);
      return false;
    }

    await supabase.from('job_history').insert({
      job_id: jobId,
      title: 'Job details updated',
      note: 'Task fields or attachments were edited.',
      actor_id: currentUser.id,
      actor_name: currentUser.name
    });

    setJobs((currentJobs) => currentJobs.map((job) => {
      if (job.id !== jobId) return job;

      const updatedJob = {
        ...job,
        ...formData,
        assignedTo: assignedUser ? `${assignedUser.firstName} ${assignedUser.lastName}` : 'Unassigned',
        assignedUserInitials: assignedUser ? assignedUser.initials : 'UA',
        teamName: teams.find((team) => team.id === formData.teamId)?.name || '',
        completionDate,
        attachments,
        lastUpdated: formatDateTime(),
        lastUpdatedBy: currentUser.name,
        lastUpdatedById: currentUser.id,
        history: [
          {
            title: 'Job details updated',
            by: currentUser.name,
            at: formatDateTime(),
            note: 'Task fields or attachments were edited.'
          },
          ...job.history
        ]
      };

      setSelectedJob((currentSelectedJob) => (
        currentSelectedJob?.id === jobId ? updatedJob : currentSelectedJob
      ));

      return updatedJob;
    }));
    return true;
  }

  async function handleCreateUser(formData) {
    const { data, error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          first_name: formData.firstName,
          last_name: formData.lastName
        }
      }
    });

    if (error) {
      window.alert(error.message);
      return;
    }

    if (data.user?.id) {
      await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          department: formData.department,
          job_title: formData.jobTitle,
          status: formData.status,
          initials: createInitials(formData.firstName, formData.lastName)
        })
        .eq('id', data.user.id);
    }

    await onRefreshData();
    setActiveView('users');
  }

  async function handleCreateTeam(formData) {
    const { data, error } = await supabase
      .from('teams')
      .insert({
        name: formData.name,
        department: formData.department,
        created_by: currentUser.id
      })
      .select()
      .single();

    if (error) {
      window.alert(error.message);
      return false;
    }

    if (formData.memberIds.length) {
      const { error: memberError } = await supabase.from('team_members').insert(
        formData.memberIds.map((userId) => ({ team_id: data.id, user_id: userId }))
      );

      if (memberError) {
        window.alert(memberError.message);
        return false;
      }
    }

    setTeams((currentTeams) => [
      {
        id: data.id,
        name: data.name,
        department: data.department,
        memberIds: formData.memberIds,
        createdAt: data.created_at
      },
      ...currentTeams
    ]);
    return true;
  }

  async function handleUpdateUser(userId, formData) {
    const updatedInitials = createInitials(formData.firstName, formData.lastName);
    const updatedName = `${formData.firstName} ${formData.lastName}`;
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        department: formData.department,
        job_title: formData.jobTitle,
        status: formData.status,
        initials: updatedInitials
      })
      .eq('id', userId);

    if (error) {
      window.alert(error.message);
      return;
    }

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

  async function handleUpdateJobStatus(jobId, nextStatus, note) {
    const updatedAt = formatDateTime();
    const completionDate = nextStatus === 'Completed' ? new Date().toISOString().slice(0, 10) : '';
    const updatePayload = {
      status: nextStatus,
      completion_date: completionDate || null,
      last_updated_by: currentUser.id
    };

    if (nextStatus === 'Completed') {
      updatePayload.approval_status = 'Pending Approval';
    }

    const { error } = await supabase
      .from('jobs')
      .update(updatePayload)
      .eq('id', jobId);

    if (error) {
      window.alert(error.message);
      return;
    }

    await supabase.from('job_history').insert({
      job_id: jobId,
      title: `Status updated to ${nextStatus}`,
      note: note || 'Status changed from task detail view.',
      actor_id: currentUser.id,
      actor_name: currentUser.name
    });

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
    <div className={isSidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}>
      <Sidebar activeView={activeView} capabilities={capabilities} onNavigate={setActiveView} onLogout={onLogout} isCollapsed={isSidebarCollapsed} />
      <main className="main-content">
        <TopBar activeView={activeView} currentUser={currentUser} onToggleSidebar={() => setIsSidebarCollapsed((current) => !current)} />
        <section className="content-pad">
          {activeView === 'dashboard' && (
            <DashboardView
              dashboardData={dashboardData}
              jobs={dashboardJobs}
              onCreateJob={() => setActiveView('create-job')}
              onViewJob={(job) => setSelectedJob(job)}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              canCreateJobs={capabilities.canCreateJobs}
              dateFilter={dateFilter}
              setDateFilter={setDateFilter}
              selectedMetricFilter={dashboardFilter}
              onSelectMetricFilter={setDashboardFilter}
            />
          )}
          {activeView === 'my-tasks' && (
            <MyTasksView
              currentUser={currentUser}
              jobs={jobs.filter((job) => job.assignedUserId === currentUser.id || currentUserTeamIds.includes(job.teamId))}
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
            <CreateJobView users={users} teams={teams} onCreateJob={handleCreateJob} />
          )}
          {activeView === 'users' && capabilities.canManageUsers && (
            <UsersView
              users={users}
              jobs={jobs}
              teams={teams}
              onCreateUser={handleCreateUser}
              onCreateTeam={handleCreateTeam}
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
          canEditJob={currentUser.role === 'System Administrator' || selectedJob.createdById === currentUser.id}
          users={users}
          teams={teams}
          onUpdateJob={handleUpdateJob}
          onUpdateStatus={handleUpdateJobStatus}
          onClose={() => setSelectedJob(null)}
        />
      )}
    </div>
  );
}

function Sidebar({ activeView, capabilities, onNavigate, onLogout, isCollapsed }) {
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
        <div className="sidebar-brand-text">
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
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className="nav-item logout-nav-item" type="button" onClick={onLogout}>
          <X size={20} />
          <span>Log Out</span>
        </button>
      </nav>
      <div className="sidebar-footer">
        <Plane size={28} />
        <span>Connecting people, elevating Belize</span>
      </div>
    </aside>
  );
}

function TopBar({ activeView, currentUser, onToggleSidebar }) {
  const title = navItems.find((item) => item.key === activeView)?.label || 'Dashboard';
  return (
    <header className="topbar">
      <div className="topbar-title">
        <button className="icon-button" type="button" onClick={onToggleSidebar} aria-label="Toggle task bar"><Menu size={22} /></button>
        <strong>{title}</strong>
      </div>
      <div className="user-tools">
        <button className="notification-button" aria-label="Notifications">
          <Bell size={21} />
          <span>0</span>
        </button>
        <div className="profile-button">
          <span className="avatar"><UserRound size={19} /></span>
          <span>
            <strong>{currentUser.name}</strong>
            <small>{currentUser.role}</small>
          </span>
        </div>
      </div>
    </header>
  );
}

function DashboardView({ dashboardData, jobs, onCreateJob, onViewJob, searchTerm, setSearchTerm, canCreateJobs, dateFilter, setDateFilter, selectedMetricFilter, onSelectMetricFilter }) {
  const title = selectedMetricFilter === 'all'
    ? 'Recent Jobs'
    : dashboardData.metrics.find((metric) => metric.filterKey === selectedMetricFilter)?.label || 'Recent Jobs';

  return (
    <>
      <PageHeading
        title="Dashboard"
        description="Live overview for Philip S. W. Goldson International Airport"
        action={<ActionButtons onCreateJob={onCreateJob} canCreateJobs={canCreateJobs} dateFilter={dateFilter} setDateFilter={setDateFilter} />}
      />
      <MetricGrid metrics={dashboardData.metrics} selectedMetricFilter={selectedMetricFilter} onSelectMetricFilter={onSelectMetricFilter} />
      <ChartGrid dashboardData={dashboardData} />
      <section className="dashboard-lower">
        <RecentJobs
          jobs={jobs}
          onCreateJob={onCreateJob}
          onViewJob={onViewJob}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          canCreateJobs={canCreateJobs}
          title={title}
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

function MetricGrid({ metrics, selectedMetricFilter = 'all', onSelectMetricFilter }) {
  return (
    <section className="metric-grid">
      {metrics.map((card) => {
        const Icon = card.icon;
        const isActive = selectedMetricFilter === card.filterKey;
        return (
          <button
            className={`metric-card metric-button ${card.tone}${isActive ? ' selected' : ''}`}
            key={card.label}
            type="button"
            onClick={() => onSelectMetricFilter?.(isActive ? 'all' : card.filterKey)}
          >
            <div className="metric-icon"><Icon size={27} /></div>
            <div>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.hint}</p>
            </div>
          </button>
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
  const [departmentFilter, setDepartmentFilter] = useState('All Departments');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [areaFilter, setAreaFilter] = useState(areas[0]);
  const visibleJobs = jobs.filter((job) => {
    const target = `${job.id} ${job.title} ${job.department} ${job.location} ${job.assignedTo}`.toLowerCase();
    const matchesSearch = target.includes(searchTerm.toLowerCase());
    const matchesDepartment = departmentFilter === 'All Departments' || job.department === departmentFilter;
    const matchesStatus = statusFilter === 'All Statuses' || job.status === statusFilter;
    const matchesArea = areaFilter === areas[0] || job.area === areaFilter;
    return matchesSearch && matchesDepartment && matchesStatus && matchesArea;
  });

  return (
    <section className="panel recent-jobs">
      <div className="panel-header jobs-header">
        <h2>{title}</h2>
        <div className="filters">
          <select aria-label="Department filter" value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)}>
            <option>All Departments</option>
            {departments.map((department) => <option key={department}>{department}</option>)}
          </select>
          <select aria-label="Status filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option>All Statuses</option>
            {statuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <select aria-label="Area filter" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)}>
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
                <td>
                  <span className="person"><span>{job.assignedUserInitials}</span>{job.assignedTo}</span>
                  {job.teamName && <small className="team-line">Team: {job.teamName}</small>}
                </td>
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

function CreateJobView({ users, teams, onCreateJob }) {
  const [formData, setFormData] = useState(jobFormDefaults);
  const [attachmentFiles, setAttachmentFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const wasCreated = await onCreateJob(formData, attachmentFiles);
    if (wasCreated) {
      setFormData(jobFormDefaults);
      setAttachmentFiles([]);
      event.target.reset();
    }
    setIsSubmitting(false);
  }

  return (
    <>
      <PageHeading title="Create New Job" description="Add a live job record for Philip S. W. Goldson International Airport" />
      <form className="panel form-panel" onSubmit={handleSubmit}>
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
            Assign to team
            <select value={formData.teamId} onChange={(event) => updateField('teamId', event.target.value)}>
              <option value="">No team</option>
              {teams.map((team) => <option key={team.id} value={team.id}>{team.name} - {team.department}</option>)}
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
            Photo attachments
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(event) => setAttachmentFiles(Array.from(event.target.files || []))}
            />
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
          <button className="primary-button fit-button" type="submit" disabled={isSubmitting}>
            <CirclePlus size={18} />
            {isSubmitting ? 'Creating Job...' : 'Create Job'}
          </button>
        </div>
      </form>
    </>
  );
}

function UsersView({ users, jobs, teams, onCreateUser, onCreateTeam, onUpdateUser, onViewJob }) {
  const [formData, setFormData] = useState(userFormDefaults);
  const [teamFormData, setTeamFormData] = useState(teamFormDefaults);
  const [editingUserId, setEditingUserId] = useState(null);
  const [mode, setMode] = useState('list');
  const [userSearch, setUserSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const isEditing = Boolean(editingUserId);
  const filteredUsers = users.filter((user) => {
    const target = `${user.firstName} ${user.lastName} ${user.email} ${user.department} ${user.role}`.toLowerCase();
    return target.includes(userSearch.toLowerCase());
  });

  function updateField(field, value) {
    setFormData((current) => ({ ...current, [field]: value }));
  }

  function updateTeamField(field, value) {
    setTeamFormData((current) => ({ ...current, [field]: value }));
  }

  function toggleTeamMember(userId) {
    setTeamFormData((current) => ({
      ...current,
      memberIds: current.memberIds.includes(userId)
        ? current.memberIds.filter((memberId) => memberId !== userId)
        : [...current.memberIds, userId]
    }));
  }

  function startEditUser(user) {
    setEditingUserId(user.id);
    setMode('form');
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
    setTeamFormData(teamFormDefaults);
    setShowUserPassword(false);
    setMode('list');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);

    if (isEditing) {
      await onUpdateUser(editingUserId, formData);
    } else {
      await onCreateUser(formData);
    }

    setIsSubmitting(false);
    resetForm();
  }

  async function handleTeamSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    const wasCreated = await onCreateTeam(teamFormData);
    setIsSubmitting(false);
    if (wasCreated) resetForm();
  }

  return (
    <>
      <PageHeading
        title={mode === 'list' ? 'Users' : mode === 'team' ? 'Create Team' : isEditing ? 'Edit User' : 'Create User'}
        description={mode === 'list' ? 'Search users and manage assignment teams' : mode === 'team' ? 'Group multiple users so they can share access to assigned jobs' : 'Create users, edit permissions, and reset login access'}
        action={mode === 'list' ? (
          <div className="toolbar-actions">
            <button className="export-button" type="button" onClick={() => { setMode('team'); setTeamFormData(teamFormDefaults); }}>
              <Users size={18} />
              Create Team
            </button>
            <button className="export-button" type="button" onClick={() => { setMode('form'); setEditingUserId(null); setFormData(userFormDefaults); }}>
              <CirclePlus size={18} />
              Create User
            </button>
          </div>
        ) : (
          <button className="secondary-button" type="button" onClick={resetForm}>Back to Users</button>
        )}
      />
      {mode === 'team' ? (
        <form className="panel form-panel" onSubmit={handleTeamSubmit}>
          <div className="form-grid compact-form">
            <label>
              Team name
              <input required value={teamFormData.name} onChange={(event) => updateTeamField('name', event.target.value)} placeholder="Example: Maintenance Night Shift" />
            </label>
            <label>
              Department
              <select value={teamFormData.department} onChange={(event) => updateTeamField('department', event.target.value)}>
                {departments.map((department) => <option key={department}>{department}</option>)}
              </select>
            </label>
            <div className="wide-field team-member-picker">
              {users.map((user) => (
                <label key={user.id}>
                  <input
                    type="checkbox"
                    checked={teamFormData.memberIds.includes(user.id)}
                    onChange={() => toggleTeamMember(user.id)}
                  />
                  <span>{displayUserName(user)} <small>{user.department}</small></span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-actions">
            <button className="primary-button fit-button" type="submit" disabled={isSubmitting}>
              <Users size={18} />
              {isSubmitting ? 'Creating Team...' : 'Create Team'}
            </button>
          </div>
        </form>
      ) : mode === 'form' ? (
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
              <span className="password-field">
                <input
                  required={!isEditing}
                  minLength={formData.password ? 6 : undefined}
                  type={showUserPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  placeholder={isEditing ? 'Leave blank to keep current password' : 'Minimum 6 characters'}
                />
                <button type="button" onClick={() => setShowUserPassword((current) => !current)} aria-label={showUserPassword ? 'Hide password' : 'Show password'}>
                  {showUserPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
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
            <button className="primary-button fit-button" type="submit" disabled={isSubmitting}>
              <Users size={18} />
              {isSubmitting ? 'Saving...' : isEditing ? 'Save User Settings' : 'Create User'}
            </button>
          </div>
        </form>
      ) : (
        <>
        <section className="panel users-list teams-list">
          <div className="panel-header users-panel-header">
            <h2>Teams</h2>
            <span className="record-count">{teams.length} total</span>
          </div>
          {teams.length ? teams.map((team) => (
            <article className="user-card" key={team.id}>
              <span className="avatar user-avatar"><Users size={18} /></span>
              <div className="user-card-main">
                <div className="user-card-heading">
                  <div>
                    <strong>{team.name}</strong>
                    <p>{team.department}</p>
                    <small>{team.memberIds.length} member{team.memberIds.length === 1 ? '' : 's'}</small>
                  </div>
                </div>
                <div className="permission-strip">
                  {team.memberIds.map((memberId) => {
                    const member = users.find((user) => user.id === memberId);
                    return member ? <span key={memberId}>{displayUserName(member)}</span> : null;
                  })}
                </div>
              </div>
            </article>
          )) : (
            <EmptyState title="No teams yet" description="Create a team to assign jobs to multiple users." compact />
          )}
        </section>
        <section className="panel users-list">
          <div className="panel-header users-panel-header">
            <h2>Created Users</h2>
            <div className="filters">
              <label className="search-box">
                <input value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search users..." />
                <Search size={16} />
              </label>
              <span className="record-count">{filteredUsers.length} total</span>
            </div>
          </div>
          {filteredUsers.length ? filteredUsers.map((user) => (
            <UserSummaryCard
              user={user}
              jobs={jobs.filter((job) => job.assignedUserId === user.id)}
              onEditUser={startEditUser}
              onViewJob={onViewJob}
              key={user.id}
            />
          )) : (
            <EmptyState title="No matching users" description="Adjust the search or create a new user." compact />
          )}
        </section>
        </>
      )}
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

function jobToFormData(job) {
  return {
    title: job.title || '',
    description: job.description || '',
    department: job.department || 'Operations',
    location: job.location || 'Terminal 1',
    assignedUserId: job.assignedUserId || '',
    teamId: job.teamId || '',
    priority: job.priority || 'Medium',
    status: job.status || 'Pending',
    dueDate: job.dueDate || '',
    startDate: job.startDate || '',
    completionDate: job.completionDate || '',
    approvalStatus: job.approvalStatus || 'Not Submitted',
    comments: ''
  };
}

function JobDetailsDrawer({ job, currentUser, canUpdateStatus, canEditJob, users, teams, onUpdateJob, onUpdateStatus, onClose }) {
  const [statusValue, setStatusValue] = useState(job.status);
  const [statusNote, setStatusNote] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(() => jobToFormData(job));
  const [editFiles, setEditFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setStatusValue(job.status);
    setStatusNote('');
    setEditData(jobToFormData(job));
    setEditFiles([]);
    setIsEditing(false);
  }, [job.id, job.status]);

  function handleStatusSubmit(event) {
    event.preventDefault();
    onUpdateStatus(job.id, statusValue, statusNote);
  }

  function updateEditField(field, value) {
    setEditData((current) => ({ ...current, [field]: value }));
  }

  async function handleEditSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    const wasUpdated = await onUpdateJob(job.id, editData, editFiles, job.attachments);
    setIsSaving(false);
    if (wasUpdated) setIsEditing(false);
  }

  return (
    <aside className="drawer-backdrop" aria-label="Job details">
      <section className="job-drawer">
        <div className="drawer-header">
          <div>
            <span className="job-id">{job.id}</span>
            <h2>{job.title}</h2>
          </div>
          <div className="drawer-actions">
            {canEditJob && (
              <button className="secondary-button icon-text-button" type="button" onClick={() => setIsEditing((current) => !current)}>
                <Pencil size={14} />
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            )}
            <button className="icon-button" type="button" onClick={onClose} aria-label="Close job details"><X size={20} /></button>
          </div>
        </div>
        {isEditing && (
          <section className="detail-section status-update-panel">
            <h3>Edit Job</h3>
            <form className="drawer-edit-form" onSubmit={handleEditSubmit}>
              <label className="wide-field">
                Job title
                <input required value={editData.title} onChange={(event) => updateEditField('title', event.target.value)} />
              </label>
              <label>
                Department
                <select value={editData.department} onChange={(event) => updateEditField('department', event.target.value)}>
                  {departments.map((department) => <option key={department}>{department}</option>)}
                </select>
              </label>
              <label>
                Specific location
                <select value={editData.location} onChange={(event) => updateEditField('location', event.target.value)}>
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
                <select value={editData.assignedUserId} onChange={(event) => updateEditField('assignedUserId', event.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} - {user.department}</option>)}
                </select>
              </label>
              <label>
                Assign to team
                <select value={editData.teamId} onChange={(event) => updateEditField('teamId', event.target.value)}>
                  <option value="">No team</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{team.name} - {team.department}</option>)}
                </select>
              </label>
              <label>
                Priority
                <select value={editData.priority} onChange={(event) => updateEditField('priority', event.target.value)}>
                  {priorities.map((priority) => <option key={priority}>{priority}</option>)}
                </select>
              </label>
              <label>
                Status
                <select value={editData.status} onChange={(event) => updateEditField('status', event.target.value)}>
                  {statuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                Start date
                <input type="date" value={editData.startDate} onChange={(event) => updateEditField('startDate', event.target.value)} />
              </label>
              <label>
                Due date
                <input type="date" value={editData.dueDate} onChange={(event) => updateEditField('dueDate', event.target.value)} />
              </label>
              <label>
                Approval status
                <select value={editData.approvalStatus} onChange={(event) => updateEditField('approvalStatus', event.target.value)}>
                  <option>Not Submitted</option>
                  <option>Pending Approval</option>
                  <option>Approved</option>
                  <option>Rejected</option>
                </select>
              </label>
              <label>
                Add photo attachments
                <input type="file" accept="image/jpeg,image/png" multiple onChange={(event) => setEditFiles(Array.from(event.target.files || []))} />
              </label>
              <label className="wide-field">
                Description
                <textarea required value={editData.description} onChange={(event) => updateEditField('description', event.target.value)} />
              </label>
              <button className="primary-button fit-button" type="submit" disabled={isSaving}>
                <CheckCircle2 size={18} />
                {isSaving ? 'Saving...' : 'Save Job'}
              </button>
            </form>
          </section>
        )}
        <div className="detail-grid">
          <Detail label="Department" value={job.department} />
          <Detail label="Area" value={job.area} />
          <Detail label="Location" value={job.location} />
          <Detail label="Assigned Staff" value={job.assignedTo} />
          <Detail label="Assigned Team" value={job.teamName || 'No team'} />
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
              {job.attachments.map((attachment) => (
                <li key={attachmentUrl(attachment) || attachmentName(attachment)}>
                  <Paperclip size={15} />
                  {attachmentUrl(attachment) ? (
                    <a href={attachmentUrl(attachment)} target="_blank" rel="noreferrer">{attachmentName(attachment)}</a>
                  ) : attachmentName(attachment)}
                </li>
              ))}
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
      { label: 'Pending Jobs', value: jobs.filter((job) => job.status === 'Pending').length, hint: 'Awaiting start or assignment', tone: 'pending', icon: CalendarDays, filterKey: 'pending' },
      { label: 'Completed Today', value: completedToday.length, hint: 'Completed with today as completion date', tone: 'complete', icon: CheckCircle2, filterKey: 'completed-today' },
      { label: 'Delayed Jobs', value: jobs.filter((job) => job.status === 'Delayed').length + overdueJobs.length, hint: 'Delayed or past due', tone: 'delayed', icon: ShieldAlert, filterKey: 'delayed' },
      { label: 'Total Active Jobs', value: activeJobs.length, hint: 'Open work across airport operations', tone: 'active', icon: BriefcaseBusiness, filterKey: 'active' }
    ],
    departmentStats: buildStats(jobs, departments, 'department', ['#1f73dc', '#5bc5d8', '#ffd34d', '#7ad2bd', '#8cc9a8', '#657483', '#9f7aea', '#f97316', '#14b8a6', '#ef4444']),
    areaStats: buildStats(jobs, areas, 'area', ['#1f73dc']),
    statusStats: buildStats(jobs, statuses, 'status', ['#ffd34d', '#1f73dc', '#11a879', '#ec4a4a', '#657483']),
    overdueJobs
  };
}

function filterJobsByMetric(jobs, filterKey) {
  if (filterKey === 'pending') return jobs.filter((job) => job.status === 'Pending');
  if (filterKey === 'completed-today') {
    const today = new Date().toISOString().slice(0, 10);
    return jobs.filter((job) => job.status === 'Completed' && job.completionDate === today);
  }
  if (filterKey === 'delayed') return jobs.filter((job) => job.status === 'Delayed' || isOverdue(job));
  if (filterKey === 'active') return jobs.filter((job) => !['Completed', 'Cancelled'].includes(job.status));
  return jobs;
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

async function loadProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(profileFromRow);
}

async function loadJobs() {
  const [{ data: jobRows, error: jobsError }, { data: historyRows, error: historyError }] = await Promise.all([
    supabase.from('jobs').select('*').order('created_at', { ascending: false }),
    supabase.from('job_history').select('*').order('created_at', { ascending: false })
  ]);

  if (jobsError) throw jobsError;
  if (historyError) throw historyError;

  const historyByJob = historyRows.reduce((grouped, row) => {
    grouped[row.job_id] = grouped[row.job_id] || [];
    grouped[row.job_id].push(historyFromRow(row));
    return grouped;
  }, {});

  return jobRows.map((row) => jobFromRow(row, historyByJob[row.id] || []));
}

async function loadTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('*, team_members(user_id)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data.map(teamFromRow);
}

async function loadCurrentUser(session) {
  if (!session?.user?.id) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (error) throw error;
  return userToSession(profileFromRow(data));
}

function App() {
  const [jobs, setJobs] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sessionUser, setSessionUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [appError, setAppError] = useState('');

  async function refreshData() {
    const [nextUsers, nextJobs, nextTeams] = await Promise.all([loadProfiles(), loadJobs(), loadTeams()]);
    setUsers(nextUsers);
    setTeams(nextTeams);
    setJobs(enrichJobsWithTeams(enrichJobsWithUsers(nextJobs, nextUsers), nextTeams));
  }

  async function handleLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const profile = await loadCurrentUser(data.session);
    if (!profile || profile.status !== 'Active') {
      await supabase.auth.signOut();
      throw new Error('This user is not active.');
    }

    setSessionUser(profile);
    await refreshData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setSessionUser(null);
    setJobs([]);
    setUsers([]);
    setTeams([]);
  }

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      try {
        const { data } = await supabase.auth.getSession();
        const profile = await loadCurrentUser(data.session);

        if (isMounted && profile?.status === 'Active') {
          setSessionUser(profile);
          await refreshData();
        }
      } catch (error) {
        if (isMounted) setAppError(error.message);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (isLoading) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="login-card">
            <h2>Loading workspace</h2>
            <span>Connecting to Supabase...</span>
          </div>
        </section>
      </main>
    );
  }

  if (appError) {
    return (
      <main className="login-page">
        <section className="login-panel">
          <div className="login-card">
            <h2>Connection issue</h2>
            <p className="form-error">{appError}</p>
          </div>
        </section>
      </main>
    );
  }

  return sessionUser
    ? (
      <DashboardApp
        currentUser={sessionUser}
        jobs={jobs}
        setJobs={setJobs}
        users={users}
        setUsers={setUsers}
        teams={teams}
        setTeams={setTeams}
        onLogout={handleLogout}
        onRefreshData={refreshData}
      />
    )
    : <LoginPage onLogin={handleLogin} />;
}

createRoot(document.getElementById('root')).render(<App />);
