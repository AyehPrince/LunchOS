import { useState, useEffect } from 'react';
import axios from '../lib/axios';
import { 
  Building2, 
  Users, 
  ShieldAlert, 
  FileLock, 
  LogOut, 
  RefreshCw, 
  Ban, 
  Unlock, 
  Edit3, 
  X, 
  Mail, 
  PhoneCall, 
  CheckCircle2, 
  Utensils,
  Loader2
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface Tenant {
  id: string;
  name: string;
  subscription_plan: string;
  employee_limit: number;
  is_active: boolean;
  is_read_only: boolean;
  seat_count: number;
  contact_email?: string;
  contact_phone?: string;
  created_at: string;
}

interface Stats {
  totalInstitutions: number;
  activeInstitutions: number;
  readOnlyInstitutions: number;
  totalSeatsUsed: number;
}

interface AuditLog {
  id: string;
  admin_name: string;
  action: string;
  details: string;
  created_at: string;
}

export default function SuperAdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeTab, setActiveTab] = useState<'workspaces' | 'audit'>('workspaces');
  
  const [stats, setStats] = useState<Stats>({
    totalInstitutions: 0,
    activeInstitutions: 0,
    readOnlyInstitutions: 0,
    totalSeatsUsed: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [editingLimitTenantId, setEditingLimitTenantId] = useState<string | null>(null);
  const [tempLimitValue, setTempLimitValue] = useState<string>('');
  
  const [supportSettings, setSupportSettings] = useState({
    support_email: '',
    support_phone: ''
  });
  const [isEditingSupport, setIsEditingSupport] = useState(false);
  const [tempSupportSettings, setTempSupportSettings] = useState({
    supportEmail: '',
    supportPhone: ''
  });

  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageTenantName, setMessageTenantName] = useState('');
  const [messageTenantId, setMessageTenantId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Fetch all institutions, stats and audit logs
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('lunchos_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [tenantsRes, statsRes, settingsRes, auditRes] = await Promise.all([
        axios.get('/super-admin/tenants', { headers }),
        axios.get('/super-admin/stats', { headers }),
        axios.get('/super-admin/settings', { headers }),
        axios.get('/super-admin/audit-logs', { headers })
      ]);

      setTenants(tenantsRes.data);
      setStats(statsRes.data);
      setAuditLogs(auditRes.data);
      setSupportSettings({
        support_email: settingsRes.data.support_email,
        support_phone: settingsRes.data.support_phone
      });
      setTempSupportSettings({
        supportEmail: settingsRes.data.support_email,
        supportPhone: settingsRes.data.support_phone
      });
    } catch (err: any) {
      console.error('Error fetching admin data:', err);
      toast.error(err.response?.data?.message || 'Access Forbidden. Valid Super Admin token needed.');
      // If we are unauthorized, take back to login
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Set Read-Only Mode Toggle
  const handleToggleReadOnly = async (tenantId: string, currentReadOnlyStatus: boolean) => {
    const updatedStatus = !currentReadOnlyStatus;
    try {
      const token = localStorage.getItem('lunchos_token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.put(
        `/super-admin/tenants/${tenantId}/read-only`, 
        { isReadOnly: updatedStatus }, 
        { headers }
      );

      toast.success(response.data.message || 'Status updated successfully.');
      
      // Update local states seamlessly
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, is_read_only: updatedStatus } : t));
      setStats(prev => ({
        ...prev,
        readOnlyInstitutions: prev.readOnlyInstitutions + (updatedStatus ? 1 : -1)
      }));
      // Fetch audits softly to show the log
      const auditRes = await axios.get('/super-admin/audit-logs', { headers });
      setAuditLogs(auditRes.data);
    } catch (err: any) {
      console.error('Failed to toggle read-only mode:', err);
      toast.error(err.response?.data?.message || 'Failed to apply read-only restriction.');
    }
  };

  // Set Employee Ceiling Seat Limit
  const handleSaveLimitDetail = async (tenantId: string) => {
    const limitNum = parseInt(tempLimitValue, 10);
    if (isNaN(limitNum) || limitNum < 1) {
      toast.error('Seat limit count must be at least 1.');
      return;
    }

    try {
      const token = localStorage.getItem('lunchos_token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.put(
        `/super-admin/tenants/${tenantId}/limit`,
        { employeeLimit: limitNum },
        { headers }
      );

      toast.success(response.data.message || 'Limit updated successfully.');
      setTenants(prev => prev.map(t => t.id === tenantId ? { ...t, employee_limit: limitNum } : t));
      setEditingLimitTenantId(null);
      // Fetch audits softly to show the log
      const auditRes = await axios.get('/super-admin/audit-logs', { headers });
      setAuditLogs(auditRes.data);
    } catch (err: any) {
      console.error('Failed to update seat limits:', err);
      toast.error(err.response?.data?.message || 'Failed to alter user allocation size.');
    }
  };

  const handleSaveSupportSettings = async () => {
    try {
      const token = localStorage.getItem('lunchos_token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.put(
        '/super-admin/settings',
        tempSupportSettings,
        { headers }
      );

      toast.success(response.data.message || 'Support settings updated successfully.');
      setSupportSettings({
        support_email: tempSupportSettings.supportEmail,
        support_phone: tempSupportSettings.supportPhone
      });
      setIsEditingSupport(false);
      // Fetch audits softly to show the log
      const auditRes = await axios.get('/super-admin/audit-logs', { headers });
      setAuditLogs(auditRes.data);
    } catch (err: any) {
      console.error('Failed to update support settings:', err);
      toast.error(err.response?.data?.message || 'Failed to update support settings.');
    }
  };

  const handleSendMessage = async () => {
    if (!messageTenantId || messageText.trim() === '') return;
    
    setSendingMsg(true);
    try {
      const token = localStorage.getItem('lunchos_token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.post(
        `/super-admin/tenants/${messageTenantId}/message`,
        { message: messageText },
        { headers }
      );

      toast.success(response.data.message || 'Message sent successfully.');
      setMessageModalOpen(false);
      setMessageText('');
      setMessageTenantId(null);
      // Fetch audits softly to show the log
      const auditRes = await axios.get('/super-admin/audit-logs', { headers });
      setAuditLogs(auditRes.data);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      toast.error(err.response?.data?.message || 'Failed to send message to institution.');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleLogoutAction = () => {
    logout();
    toast.success('Super admin signed out safely');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      {/* Top Professional Header Bar */}
      <header className="bg-slate-950 border-b border-slate-800 sticky top-0 z-10 px-4 sm:px-6 py-4 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold flex items-center justify-center shadow-lg shadow-amber-500/10">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2 justify-center sm:justify-start">
                LunchOS <span className="text-[10px] bg-slate-800 text-slate-300 font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider">Super Control</span>
              </h1>
              <p className="text-xs text-slate-400 font-medium font-mono">Platform-wide tenant ledger & system telemetry</p>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <button
              onClick={fetchData}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl transition-all cursor-pointer shadow-sm border border-slate-700/50"
              title="Refresh Telemetry Log"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-amber-500' : ''}`} />
            </button>
            <button
              onClick={handleLogoutAction}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-950 hover:bg-rose-900/90 text-rose-300 hover:text-rose-100 rounded-xl font-bold transition-all text-sm cursor-pointer border border-rose-900/50"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Frame */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Support & Billing Contact Details Bar */}
        <section className="bg-gradient-to-r from-teal-950/70 to-emerald-950/40 p-5 rounded-2xl border border-teal-800/40 shadow-sm flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="space-y-1 md:w-1/2">
            <h3 className="text-sm font-black uppercase text-teal-400 tracking-wider flex items-center justify-between gap-2">
              <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Support & Active Payment Details</span>
              {!isEditingSupport && (
                <button
                  onClick={() => setIsEditingSupport(true)}
                  className="text-teal-200 hover:text-white p-1 rounded-md hover:bg-teal-900/50 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </h3>
            <p className="text-xs text-slate-300">
              When workspaces are configured to **Read-Only** (e.g. for billing arrears or corporate management), employees receive contact options below:
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3.5 pt-1 md:pt-0">
            {isEditingSupport ? (
              <div className="flex flex-col gap-2 w-full">
                <input
                  type="email"
                  value={tempSupportSettings.supportEmail}
                  onChange={(e) => setTempSupportSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                  placeholder="support@lunchos.com"
                  className="px-3 py-1.5 bg-slate-900/80 border border-teal-500 text-teal-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500/50 w-64"
                />
                <input
                  type="text"
                  value={tempSupportSettings.supportPhone}
                  onChange={(e) => setTempSupportSettings(prev => ({ ...prev, supportPhone: e.target.value }))}
                  placeholder="+1 (555) 019-8234"
                  className="px-3 py-1.5 bg-slate-900/80 border border-teal-500 text-teal-300 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-teal-500/50 w-64"
                />
                <div className="flex justify-end gap-2 mt-1">
                  <button
                    onClick={() => {
                      setTempSupportSettings({
                        supportEmail: supportSettings.support_email,
                        supportPhone: supportSettings.support_phone
                      });
                      setIsEditingSupport(false);
                    }}
                    className="p-1 px-3 text-xs bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSupportSettings}
                    className="p-1 px-3 text-xs bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-md transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3.5 pt-1 md:pt-0">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-teal-800/30 text-teal-300 rounded-lg text-xs font-mono">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  <span>{supportSettings.support_email || 'support@lunchos.com'}</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/60 border border-teal-800/30 text-teal-300 rounded-lg text-xs font-mono">
                  <PhoneCall className="w-3.5 h-3.5 text-teal-400" />
                  <span>{supportSettings.support_phone || '+1 (555) 019-8234'}</span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Tabs for Navigation */}
        <div className="flex items-center gap-6 py-2 border-b border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
          <button
            onClick={() => setActiveTab('workspaces')}
            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'workspaces' ? 'text-amber-500 border-amber-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            Manage Workspaces
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'audit' ? 'text-amber-500 border-amber-500' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            Audit Logs
          </button>
        </div>

        {activeTab === 'workspaces' ? (
          <>
            {/* Telemetry Indicator Widgets */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Corporations</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white">{stats.totalInstitutions}</span>
              <Building2 className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Registered offices</div>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Active Tenants</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-400">{stats.activeInstitutions}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Fully functioning</div>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Locked (Read-Only)</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${stats.readOnlyInstitutions > 0 ? 'text-amber-500' : 'text-slate-300'}`}>
                {stats.readOnlyInstitutions}
              </span>
              <FileLock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Restricted access mode</div>
          </div>

          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-2">
            <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Active Seats</div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-400">{stats.totalSeatsUsed}</span>
              <Users className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-[10px] text-slate-500 font-medium">Registered employees</div>
          </div>
        </section>

        {/* Primary Workspace Administration List */}
        <section className="bg-slate-950 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-5 border-b border-slate-850 flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Institution Registry & Seats Tracking</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Configure limits, read-only guards, and view active seat quotas</p>
            </div>
          </div>

          {loading && tenants.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <p className="text-slate-400 text-sm">Querying secure cloud database...</p>
            </div>
          ) : tenants.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2">
              <Building2 className="w-12 h-12 text-slate-700" />
              <p className="text-slate-400 text-sm font-bold">No institutions are registered on the platform yet.</p>
            </div>
          ) : (
            <div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                      <th className="px-6 py-4">Institution Details</th>
                      <th className="px-6 py-4">Status Mode</th>
                      <th className="px-6 py-4">Subscription Plan</th>
                      <th className="px-6 py-4">Registered Seats Quota</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-slate-300 font-semibold">
                    {tenants.map((item) => {
                      const isLimitExceeded = item.seat_count > item.employee_limit;
                      const percentUsed = item.employee_limit > 0 
                        ? Math.min((item.seat_count / item.employee_limit) * 100, 100) 
                        : 0;

                      return (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-900/50 transition-colors ${
                            item.is_read_only ? 'bg-amber-950/10' : ''
                          }`}
                        >
                          {/* Tenant Id and Name */}
                          <td className="px-6 py-4.5">
                            <div className="font-extrabold text-white text-sm">{item.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 select-all">{item.id}</div>
                            <div className="mt-1 flex flex-col gap-0.5 text-[10px] text-slate-400">
                              {item.contact_email && <div className="flex items-center gap-1"><Mail className="w-3 h-3" /> {item.contact_email}</div>}
                              {item.contact_phone && <div className="flex items-center gap-1"><PhoneCall className="w-3 h-3" /> {item.contact_phone}</div>}
                            </div>
                          </td>

                          {/* Read-Only Status Badge */}
                          <td className="px-6 py-4.5">
                            {item.is_read_only ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-500 text-[10px] uppercase font-bold tracking-wider rounded-lg border border-amber-500/20">
                                <Ban className="w-3 h-3" /> Read-Only
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] uppercase font-bold tracking-wider rounded-lg border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Normal Mode
                              </span>
                            )}
                          </td>

                          {/* Subscription Plan details */}
                          <td className="px-6 py-4.5">
                            <span className="text-xs uppercase font-mono font-bold bg-slate-800 px-2 py-1 rounded border border-slate-700/60 text-slate-300">
                              {item.subscription_plan || 'standard'}
                            </span>
                          </td>

                          {/* Seat limits tracking */}
                          <td className="px-6 py-4.5 space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono max-w-[180px]">
                              <span className="text-slate-400 font-bold">{item.seat_count} used</span>
                              <span className="text-slate-500">/</span>
                              {editingLimitTenantId === item.id ? (
                                <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-md border border-slate-700">
                                  <input
                                    type="number"
                                    value={tempLimitValue}
                                    onChange={(e) => setTempLimitValue(e.target.value)}
                                    className="w-14 bg-slate-800 text-white font-mono text-center text-xs py-0.5 px-1 outline-none border border-slate-700 rounded"
                                    min={1}
                                    disabled={loading}
                                  />
                                  <button
                                    onClick={() => handleSaveLimitDetail(item.id)}
                                    className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white cursor-pointer"
                                    title="Save Seat Ceiling"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingLimitTenantId(null)}
                                    className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 cursor-pointer"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <span className="text-slate-200 font-bold">{item.employee_limit} allowed</span>
                                  <button 
                                    onClick={() => {
                                      setEditingLimitTenantId(item.id);
                                      setTempLimitValue(String(item.employee_limit));
                                    }}
                                    className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                                    title="Edit Allocation Ceiling"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Progress Indicator */}
                            <div className="w-full max-w-[180px] h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isLimitExceeded 
                                    ? 'bg-rose-500' 
                                    : percentUsed > 90 
                                    ? 'bg-amber-400' 
                                    : 'bg-indigo-500'
                                }`}
                                style={{ width: `${percentUsed}%` }}
                              ></div>
                            </div>
                          </td>

                          {/* Read-Only restriction switches */}
                          <td className="px-6 py-4.5 text-right">
                            <div className="flex items-center justify-end gap-2.5">
                              <button
                                onClick={() => {
                                  setMessageTenantId(item.id);
                                  setMessageTenantName(item.name);
                                  setMessageModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 hover:text-blue-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                              >
                                <Mail className="w-3.5 h-3.5" /> Message
                              </button>
                              {item.is_read_only ? (
                                <button
                                  onClick={() => handleToggleReadOnly(item.id, true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/20 hover:border-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                                >
                                  <Unlock className="w-3.5 h-3.5" /> Restore Normal
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleToggleReadOnly(item.id, false)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 hover:border-amber-500/40 text-amber-500 hover:text-amber-400 rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm"
                                >
                                  <Ban className="w-3.5 h-3.5 text-amber-500" /> Apply Read-Only
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card list */}
              <div className="block md:hidden divide-y divide-slate-850">
                {tenants.map((item) => {
                  const isLimitExceeded = item.seat_count > item.employee_limit;
                  const percentUsed = item.employee_limit > 0 
                    ? Math.min((item.seat_count / item.employee_limit) * 100, 100) 
                    : 0;

                  return (
                    <div key={item.id} className={`p-4 sm:p-6 flex flex-col gap-4 ${item.is_read_only ? 'bg-amber-950/10' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-white text-base">{item.name}</h4>
                          <span className="text-[9px] text-slate-500 font-mono select-all truncate max-w-[150px] inline-block mt-0.5">{item.id}</span>
                          <div className="mt-1">
                            <span className="text-[10px] uppercase font-mono font-bold bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 text-slate-300">
                              {item.subscription_plan || 'standard'}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {item.is_read_only ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 text-amber-500 text-[9px] uppercase font-bold tracking-wider rounded border border-amber-500/20">
                              <Ban className="w-3 h-3" /> Read-Only
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] uppercase font-bold tracking-wider rounded border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> Normal
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 space-y-1 bg-slate-900 border border-slate-850 p-3 rounded-xl">
                        {item.contact_email && <div className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> {item.contact_email}</div>}
                        {item.contact_phone && <div className="flex items-center gap-1.5"><PhoneCall className="w-3.5 h-3.5 text-slate-500" /> {item.contact_phone}</div>}
                      </div>

                      <div className="space-y-1 bg-slate-950 p-3 rounded-xl border border-slate-850/50">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 font-bold">{item.seat_count} used</span>
                          <span className="text-slate-500">/</span>
                          {editingLimitTenantId === item.id ? (
                            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-md border border-slate-700">
                              <input
                                type="number"
                                value={tempLimitValue}
                                onChange={(e) => setTempLimitValue(e.target.value)}
                                className="w-12 bg-slate-800 text-white font-mono text-center text-xs py-0.5 px-1 outline-none border border-slate-700 rounded animate-pulse"
                                min={1}
                                disabled={loading}
                              />
                              <button
                                onClick={() => handleSaveLimitDetail(item.id)}
                                className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3 animate-ping-once" />
                              </button>
                              <button
                                onClick={() => setEditingLimitTenantId(null)}
                                className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-200 font-bold">{item.employee_limit} allowed</span>
                              <button 
                                onClick={() => {
                                  setEditingLimitTenantId(item.id);
                                  setTempLimitValue(String(item.employee_limit));
                                }}
                                className="p-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Progress Bar Container */}
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              isLimitExceeded 
                                ? 'bg-rose-500' 
                                : percentUsed > 90 
                                ? 'bg-amber-400' 
                                : 'bg-indigo-500'
                            }`}
                            style={{ width: `${percentUsed}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-850/60 w-full">
                        <button
                          onClick={() => {
                            setMessageTenantId(item.id);
                            setMessageTenantName(item.name);
                            setMessageModalOpen(true);
                          }}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/20 rounded-xl text-xs font-black transition-all cursor-pointer"
                        >
                          <Mail className="w-3.5 h-3.5" /> Message
                        </button>
                        {item.is_read_only ? (
                          <button
                            onClick={() => handleToggleReadOnly(item.id, true)}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20 rounded-xl text-xs font-black transition-all cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" /> Restore
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleReadOnly(item.id, false)}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 bg-amber-500/15 text-amber-550 border border-amber-500/20 rounded-xl text-xs font-black transition-all cursor-pointer"
                          >
                            <Ban className="w-3.5 h-3.5 text-amber-500" /> Lock
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>
          </>
        ) : (
          <section className="bg-slate-950 rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-850">
              <h2 className="text-lg font-black text-white tracking-tight">Audit Logs</h2>
              <p className="text-xs text-slate-400 font-medium mt-1">Immutable record of all super administrator actions</p>
            </div>
            {auditLogs.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center gap-2">
                <FileLock className="w-12 h-12 text-slate-700" />
                <p className="text-slate-400 text-sm font-bold">No system actions recorded yet.</p>
              </div>
            ) : (
              <div>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-850 text-slate-400 text-[11px] font-black uppercase tracking-wider">
                        <th className="px-6 py-4">Date / Time</th>
                        <th className="px-6 py-4">Action</th>
                        <th className="px-6 py-4">Details</th>
                        <th className="px-6 py-4">Administrator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-300 font-semibold text-sm">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-slate-800 border border-slate-700 font-mono text-amber-500">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-300 text-xs">
                            {log.details}
                          </td>
                          <td className="px-6 py-4 text-slate-400">
                            {log.admin_name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Scannable layout */}
                <div className="block md:hidden divide-y divide-slate-850">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                        <span className="font-mono text-[10px]">{new Date(log.created_at).toLocaleString()}</span>
                        <span>By {log.admin_name}</span>
                      </div>
                      <div>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 font-mono text-amber-500 mb-1.5">
                          {log.action}
                        </span>
                        <p className="text-slate-300 text-xs font-semibold leading-relaxed">
                          {log.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>

      {/* Message Modal */}
      {messageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl w-full max-w-md overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
               <h3 className="font-black text-white text-lg">Send Message to Admins</h3>
               <button 
                 onClick={() => setMessageModalOpen(false)}
                 className="text-slate-400 hover:text-white transition-colors"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>
             <div className="p-6 space-y-4">
                <p className="text-sm text-slate-300">
                  Compose a notification to be sent to all active administrators of <strong className="text-amber-400">{messageTenantName}</strong>. This will appear safely in their in-app notification center.
                </p>
                <textarea
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  placeholder="Enter your urgent operational message..."
                  className="w-full h-32 px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-300 outline-none focus:ring-2 focus:ring-amber-500/50 resize-none font-medium"
                ></textarea>
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => setMessageModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMsg || messageText.trim() === ''}
                    className="flex justify-center items-center px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Dispatch'}
                  </button>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
