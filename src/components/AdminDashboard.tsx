import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  Users, 
  Utensils, 
  TrendingUp, 
  Clock, 
  Bell, 
  LogOut, 
  Plus, 
  Search, 
  Filter, 
  Download,
  AlertCircle,
  ChevronRight,
  Settings,
  Store,
  Edit2,
  Trash2,
  Ban,
  UserCheck,
  Menu,
  Loader2,
  Check,
  Smartphone,
  MessageCircle,
  Copy,
  Info,
  CheckSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import toast from 'react-hot-toast';

function formatTime(timeStr: string) {
  if (!timeStr) return '09:30 AM';
  try {
    const [h, m] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(h), parseInt(m), 0);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return timeStr;
  }
}

function Countdown({ targetTime }: { targetTime: string }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isClosed, setIsClosed] = useState(false);

  useEffect(() => {
    if (!targetTime) return;

    const updateTimer = () => {
      const now = new Date();
      const timeParts = targetTime.split(':');
      const hours = parseInt(timeParts[0]) || 0;
      const minutes = parseInt(timeParts[1]) || 0;
      
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      if (now > target) {
        setTimeLeft('CLOSED');
        setIsClosed(true);
        return;
      }

      setIsClosed(false);
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);

    return () => clearInterval(timer);
  }, [targetTime]);

  return <p className={`font-black tracking-tight leading-none ${isClosed ? 'text-red-500' : 'text-gray-900'}`}>{timeLeft}</p>;
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'stats' | 'orders' | 'vendors' | 'employees' | 'order'>('stats');
  const [selectedVendorForMenu, setSelectedVendorForMenu] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Stats Query
  // Adding real-time polling (every 3 seconds) ensures that updates/activations
  // are immediately synchronised across the Overview and Order Lunch sections.
  const { data: stats } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await axios.get('/admin/stats');
      return res.data;
    },
    refetchInterval: 3000, // Poll every 3 seconds for real-time synchronization
  });

  // Fetch tenant status (read-only state check)
  const { data: tenantStatus } = useQuery({
    queryKey: ['tenant-status'],
    queryFn: async () => {
      const res = await axios.get('/tenant/status');
      return res.data;
    }
  });

  // Live Orders Query
  const { data: liveOrders } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const res = await axios.get('/admin/orders');
      return res.data;
    },
    enabled: activeTab === 'orders'
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {tenantStatus?.is_read_only && (
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white py-3 px-4 shadow-sm border-b border-red-700 font-sans z-50">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-center md:text-left">
            <div className="flex items-center gap-2">
              <span className="p-1 px-2 bg-white/20 text-[10px] font-black rounded uppercase tracking-wider">RESTRICTED</span>
              <span className="text-sm font-bold">
                <strong>Read-Only Mode:</strong> This workspace is in read-only view. No new orders or updates can be saved at this time.
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="opacity-90 font-medium">To restore, contact Support:</span>
              <a href={`mailto:${tenantStatus?.support_email || 'support@lunchos.com'}`} className="font-extrabold underline hover:text-red-100 flex items-center gap-1">
                {tenantStatus?.support_email || 'support@lunchos.com'}
              </a>
              <span className="opacity-50">|</span>
              <span className="font-extrabold flex items-center gap-1">
                {tenantStatus?.support_phone || '+1 (555) 019-8234'}
              </span>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Utensils className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Lunch<span className="text-blue-600">OS</span></h1>
        </div>
        <button 
          onClick={() => setShowMobileMenu(!showMobileMenu)}
          className="p-2 text-gray-400 hover:text-gray-900 transition-colors"
        >
          {showMobileMenu ? <Plus className="w-8 h-8 rotate-45" /> : <Menu className="w-8 h-8" />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col md:sticky md:top-0 h-screen transition-transform duration-300 md:translate-x-0
        ${showMobileMenu ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
           <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Lunch<span className="text-blue-600">OS</span></h1>
          </div>
          <button onClick={() => setShowMobileMenu(false)} className="md:hidden p-2 text-gray-400">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={TrendingUp} label="Overview" active={activeTab === 'stats'} onClick={() => { setActiveTab('stats'); setShowMobileMenu(false); }} />
          <NavItem icon={Utensils} label="Order Lunch" active={activeTab === 'order'} onClick={() => { setActiveTab('order'); setShowMobileMenu(false); }} />
          <NavItem icon={Clock} label="Live Orders" active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setShowMobileMenu(false); }} />
          <NavItem icon={Store} label="Vendors & Menus" active={activeTab === 'vendors'} onClick={() => { setActiveTab('vendors'); setShowMobileMenu(false); }} />
          <NavItem icon={Users} label="Employees" active={activeTab === 'employees'} onClick={() => { setActiveTab('employees'); setShowMobileMenu(false); }} />
          <NavItem icon={Download} label="Reports" active={activeTab === 'reports' as any} onClick={() => { setActiveTab('reports' as any); setShowMobileMenu(false); }} />
          <NavItem icon={Settings} label="Settings" active={activeTab === 'settings' as any} onClick={() => { setActiveTab('settings' as any); setShowMobileMenu(false); }} />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-red-500 font-bold hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-5 h-5" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 md:px-8 sticky top-0 z-20">
          <h2 className="text-lg font-bold text-gray-900 capitalize">{activeTab}</h2>
          <div className="flex items-center gap-2 md:gap-4">
             <div className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-bold font-mono">
               <Clock className="w-4 h-4" /> {formatTime(stats?.cutoffTime)} Cutoff
             </div>
             <button 
              onClick={() => setShowNotifications(true)}
              className="p-2 text-gray-400 hover:text-gray-600 relative"
             >
               <Bell className="w-6 h-6" />
               <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
             <button 
              onClick={() => setShowProfile(true)}
              className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden border border-gray-100 hover:ring-2 hover:ring-blue-500 transition-all"
             >
               <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt="avatar" />
             </button>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {activeTab === 'stats' && (
            <OverviewTab 
              stats={stats} 
              onManageMenu={(id) => setSelectedVendorForMenu(id)} 
              onSwitchTab={setActiveTab}
            />
          )}
          {activeTab === 'order' && <OrderTab stats={stats} onSwitchTab={setActiveTab} />}
          {activeTab === 'orders' && <OrdersTab orders={liveOrders} />}
          {activeTab === 'vendors' && <VendorsTab onManageMenu={(id) => setSelectedVendorForMenu(id)} />}
          {activeTab === 'employees' && <EmployeesTab stats={stats} />}
          {activeTab === 'reports' as any && <ReportsTab stats={stats} />}
          {activeTab === 'settings' as any && <SettingsTab stats={stats} />}
        </div>
      </main>

      {selectedVendorForMenu && (
        <ManageMenuModal 
          vendorId={selectedVendorForMenu} 
          onClose={() => setSelectedVendorForMenu(null)} 
        />
      )}

      {showProfile && (
        <AdminProfileModal onClose={() => setShowProfile(false)} />
      )}

      {showNotifications && (
        <NotificationsModal onClose={() => setShowNotifications(false)} />
      )}
    </div>
    </div>
  );
}

function NotificationsModal({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await axios.get('/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoading(false);
      }
    };
    fetchNotifications();
  }, []);

  const markAsRead = async (id: string, is_read: boolean) => {
    if (is_read) return;
    try {
      await axios.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-black text-gray-900">Notifications</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><Plus className="w-6 h-6 rotate-45 text-black" /></button>
        </div>
        <div className="p-8 overflow-y-auto grow">
          {loading ? (
            <div className="flex justify-center p-4"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((n) => (
                <div 
                   key={n.id} 
                   className={`p-4 rounded-2xl border ${n.is_read ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-white border-blue-100 shadow-sm'} transition-colors cursor-pointer`}
                   onClick={() => markAsRead(n.id, n.is_read)}
                >
                  <p className={`text-sm ${n.is_read ? 'text-gray-600 font-medium' : 'text-gray-900 font-bold'}`}>{n.title}</p>
                  <p className="text-xs text-gray-400 mt-2 font-mono">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8" />
              </div>
              <h4 className="font-black text-gray-900 mb-2">No notifications yet</h4>
              <p className="text-sm text-gray-400 font-medium leading-relaxed">
                When there are updates from System Admin, or system reminders, they will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminProfileModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['admin-profile'],
    queryFn: async () => {
      const res = await axios.get('/admin/profile');
      return res.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      return axios.put('/admin/profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-profile'] });
      toast.success('Profile updated');
      onClose();
    }
  });

  if (isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-black text-gray-900">Admin Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><Plus className="w-6 h-6 rotate-45" /></button>
        </div>
        <div className="overflow-y-auto p-8 flex-1">
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            mutation.mutate(Object.fromEntries(formData));
          }} className="space-y-6">
            <div className="flex flex-col items-center mb-8">
              <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden border-4 border-blue-50 mb-4">
                <img src={`https://ui-avatars.com/api/?name=${profile?.name}&background=random`} alt="avatar" className="w-full h-full object-cover" />
              </div>
              <p className="text-sm font-bold text-gray-400 capitalize">System Administrator</p>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase ml-1">Full Name</label>
              <input name="name" defaultValue={profile?.name} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900" required />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase ml-1">Email Address</label>
              <input value={profile?.email} disabled className="w-full p-4 bg-gray-100 rounded-2xl border-none outline-none text-gray-500 font-medium" />
              <p className="text-[10px] text-gray-400 mt-1 italic">Email cannot be changed.</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black text-gray-400 uppercase ml-1">Phone Number</label>
              <input name="phone" defaultValue={profile?.phone} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900" />
            </div>

            <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">
              Save Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function ManageMenuModal({ vendorId, onClose }: { vendorId: string, onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: menu, isLoading } = useQuery({
    queryKey: ['admin-menu', vendorId],
    queryFn: async () => {
      const res = await axios.get(`/admin/vendors/${vendorId}/menu`);
      return res.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return axios.post(`/admin/vendors/${vendorId}/menu`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu', vendorId] });
      toast.success('Item added to menu');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`/admin/menu-items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-menu', vendorId] });
      toast.success('Item removed');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="text-xl font-black">Manage Menu</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-all">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>

        <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
          {/* Add Item Form */}
          <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
            <h4 className="font-bold mb-4 text-blue-900">Add New Meal</h4>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              addMutation.mutate(Object.fromEntries(formData));
              (e.target as HTMLFormElement).reset();
            }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input name="name" placeholder="Meal Name" className="p-3 bg-white rounded-xl border-none text-sm shadow-sm" required />
              <input name="price" type="number" step="0.01" placeholder="Price (optional)" className="p-3 bg-white rounded-xl border-none text-sm shadow-sm" />
              <input name="description" placeholder="Short description" className="p-3 bg-white rounded-xl border-none text-sm shadow-sm md:col-span-2" />
              <button type="submit" className="md:col-span-2 py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700 transition-all">
                Add to Menu
              </button>
            </form>
          </div>

          {/* Current Menu List */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900">Current Selection</h4>
            {isLoading ? <div>Loading menu...</div> : menu?.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
                <div>
                  <h5 className="font-bold">{item.name}</h5>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <div className="text-right">
                   <div className="font-black text-blue-600">${item.price}</div>
                   <button 
                    onClick={() => {
                      deleteMutation.mutate(item.id);
                    }}
                    className="text-[10px] uppercase font-black text-red-500 hover:underline"
                   >
                    Remove
                   </button>
                </div>
              </div>
            ))}
            {menu?.length === 0 && <p className="text-center text-gray-400 py-10">No items in menu yet</p>}
          </div>
        </div>
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black hover:bg-gray-800 transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function UpgradePlanModal({ currentPlan, onClose, onUpgrade, isLoading }: { currentPlan: string, onClose: () => void, onUpgrade: (plan: string, limit: number) => void, isLoading: boolean }) {
  const plans = [
    { name: 'Starter', limit: 20, label: '0-20 Employees', current: currentPlan === 'Starter' },
    { name: 'Standard', limit: 50, label: '21-50 Employees', current: currentPlan === 'Standard' },
    { name: 'Pro', limit: 100, label: '51-100 Employees', current: currentPlan === 'Pro' },
    { name: 'Enterprise', limit: 500, label: '100+ Employees', current: currentPlan === 'Enterprise' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative">
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center text-center p-8"
            >
              <div className="relative mb-8">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-24 h-24 border-4 border-blue-50 border-t-blue-600 rounded-full"
                />
                <motion.div 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <TrendingUp className="w-8 h-8 text-blue-600" />
                </motion.div>
              </div>
              <h3 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Upgrading System...</h3>
              <p className="text-gray-500 font-bold max-w-xs mx-auto">We're expanding your workspace capacity to accommodate more team members.</p>
              <div className="mt-8 flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -10, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                    className="w-2 h-2 bg-blue-600 rounded-full"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Select Employee Capacity</h3>
          <button onClick={onClose} disabled={isLoading} className="p-2 hover:bg-gray-200 rounded-full transition-all group disabled:opacity-50">
            <Plus className="w-6 h-6 rotate-45 text-gray-400 group-hover:text-gray-900" />
          </button>
        </div>
        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center justify-center text-center relative ${
                plan.current 
                ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-600/5' 
                : 'border-gray-100 hover:border-blue-200 hover:bg-gray-50'
              }`}
            >
              {plan.current && (
                <div className="absolute top-3 right-3">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                </div>
              )}
              <h4 className="font-black text-gray-900 text-lg mb-1">{plan.name}</h4>
              <p className="text-blue-600 font-bold mb-6">{plan.label}</p>
              
              {plan.current ? (
                <div className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-xs font-black uppercase tracking-widest">
                  Active Plan
                </div>
              ) : (
                <button 
                  onClick={() => onUpgrade(plan.name, plan.limit)}
                  disabled={isLoading}
                  className="w-full py-3 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Select This Tier
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-3 text-gray-400">
            <AlertCircle className="w-4 h-4" />
            <p className="text-xs font-bold leading-none">Changing your plan will immediately update your employee seat capacity.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsTab({ stats }: { stats: any }) {
  const queryClient = useQueryClient();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [cutoffTime, setCutoffTime] = useState('');
  const { data: deadline } = useQuery({
    queryKey: ['admin-deadline'],
    queryFn: async () => {
      const res = await axios.get('/admin/deadline');
      return res.data;
    }
  });

  useEffect(() => {
    if (deadline?.cutoff_time) {
      // Input type="time" expects HH:mm
      setCutoffTime(deadline.cutoff_time.slice(0, 5));
    }
  }, [deadline]);

  const deadlineMutation = useMutation({
    mutationFn: async (time: string) => {
      return axios.post('/admin/deadline', { cutoff_time: time });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-deadline'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Deadline updated');
    }
  });

  const settingsMutation = useMutation({
    mutationFn: async (data: any) => {
      return axios.patch('/admin/settings', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Preferences updated');
    }
  });

  const upgradeMutation = useMutation({
    mutationFn: async ({ plan, limit }: { plan: string, limit: number }) => {
      return axios.patch('/admin/plan', { plan, limit });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setShowUpgrade(false);
      toast.success('Plan upgraded successfully');
    }
  });

  return (
    <div className="max-w-2xl space-y-8">
      {showUpgrade && (
        <UpgradePlanModal 
          currentPlan={stats?.subscription_plan || 'Starter'} 
          onClose={() => setShowUpgrade(false)}
          onUpgrade={(plan, limit) => upgradeMutation.mutate({ plan, limit })}
          isLoading={upgradeMutation.isPending}
        />
      )}
      <div className="bg-white p-8 rounded-3xl border border-gray-100">
        <h3 className="text-xl font-black mb-6 text-gray-900">Order Deadline</h3>
        <p className="text-gray-500 mb-6 font-medium">Set the time when ordering closes for the day.</p>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <input 
            type="time" 
            value={cutoffTime}
            onChange={(e) => setCutoffTime(e.target.value)}
            className="p-4 bg-gray-50 rounded-2xl border-none font-bold text-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            id="cutoff-input"
          />
          <button 
            onClick={() => {
              if (!cutoffTime) return toast.error('Please select a time');
              deadlineMutation.mutate(cutoffTime);
            }}
            className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black shadow-lg shadow-gray-200 hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
          >
            {deadlineMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100">
        <h3 className="text-xl font-black mb-6 text-gray-900">System Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <span className="font-bold text-gray-700">Auto-send summary to vendor</span>
            <input 
              type="checkbox" 
              checked={stats?.auto_send_summary} 
              onChange={(e) => settingsMutation.mutate({ 
                auto_send_summary: e.target.checked,
                whatsapp_reminders: stats?.whatsapp_reminders
              })}
              className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500 cursor-pointer" 
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
            <span className="font-bold text-gray-700">WhatsApp reminders at 9:00 AM</span>
            <input 
              type="checkbox" 
              checked={stats?.whatsapp_reminders} 
              onChange={(e) => settingsMutation.mutate({ 
                auto_send_summary: stats?.auto_send_summary,
                whatsapp_reminders: e.target.checked
              })}
              className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500 cursor-pointer" 
            />
          </div>
        </div>
      </div>

      <div className="p-8 bg-blue-50 rounded-3xl border border-blue-100">
         <h3 className="text-xl font-black text-blue-900 mb-2">Company Plan</h3>
         <div className="flex justify-between items-end">
           <div>
             <p className="text-blue-700 font-medium mb-1">{stats?.subscription_plan || 'Starter'} Plan</p>
             <p className="text-2xl font-black text-blue-900">{stats?.employeeLimit} seats</p>
           </div>
           <button 
            onClick={() => setShowUpgrade(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all"
           >
             Upgrade
           </button>
         </div>
      </div>
    </div>
  );
}

function ReportsTab({ stats }: { stats: any }) {
  const { data: summary } = useQuery({
    queryKey: ['admin-summary'],
    queryFn: async () => {
      const res = await axios.get('/admin/orders/summary');
      return res.data;
    }
  });

  const sendWhatsApp = () => {
    const vendorContact = stats?.activeVendor?.contact_info || '';
    if (!vendorContact) {
      toast.error('No contact number configured for the active vendor!');
      return;
    }
    const totalQty = summary?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const vendorName = stats?.activeVendor?.name || 'Vendor';

    let orderText = `LunchOS Order Summary\n`;
    orderText += `-----------------------------\n`;
    orderText += `Date: ${todayStr}\n`;
    orderText += `Vendor: ${vendorName}\n`;
    orderText += `-----------------------------\n\n`;

    summary?.forEach((item: any) => {
      orderText += `${item.name} x ${item.quantity}\n`;
    });

    orderText += `\n-----------------------------\n`;
    orderText += `Total Items Ordered: ${totalQty}\n`;
    orderText += `-----------------------------`;

    const cleanPhone = vendorContact.replace(/[^\d+]/g, '');
    const encodedText = encodeURIComponent(orderText);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;
    window.open(waUrl, '_blank');
    toast.success('Opening WhatsApp chat...');
  };

  const sendSMS = () => {
    const vendorContact = stats?.activeVendor?.contact_info || '';
    if (!vendorContact) {
      toast.error('No contact number configured for the active vendor!');
      return;
    }
    const totalQty = summary?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const vendorName = stats?.activeVendor?.name || 'Vendor';

    let orderText = `LunchOS Order Summary\n`;
    orderText += `-----------------------------\n`;
    orderText += `Date: ${todayStr}\n`;
    orderText += `Vendor: ${vendorName}\n`;
    orderText += `-----------------------------\n\n`;

    summary?.forEach((item: any) => {
      orderText += `${item.name} x ${item.quantity}\n`;
    });

    orderText += `\n-----------------------------\n`;
    orderText += `Total Items Ordered: ${totalQty}\n`;
    orderText += `-----------------------------`;

    const cleanPhone = vendorContact.replace(/[^\d+]/g, '');
    const encodedText = encodeURIComponent(orderText);
    const smsUrl = `sms:${cleanPhone}?body=${encodedText}`;
    window.open(smsUrl, '_blank');
    toast.success('Opening SMS dispatch...');
  };

  const copyText = () => {
    const totalQty = summary?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const vendorName = stats?.activeVendor?.name || 'Vendor';

    let orderText = `LunchOS Order Summary\n`;
    orderText += `-----------------------------\n`;
    orderText += `Date: ${todayStr}\n`;
    orderText += `Vendor: ${vendorName}\n`;
    orderText += `-----------------------------\n\n`;

    summary?.forEach((item: any) => {
      orderText += `${item.name} x ${item.quantity}\n`;
    });

    orderText += `\n-----------------------------\n`;
    orderText += `Total Items Ordered: ${totalQty}\n`;
    orderText += `-----------------------------`;

    navigator.clipboard.writeText(orderText);
    toast.success('Order summary copied to clipboard!');
  };

  const exportCSV = () => {
    if (!summary) return;
    const headers = ['Meal Name', 'Quantity'];
    const rows = summary.map((item: any) => [item.name, item.quantity]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `lunch_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    toast.success('Report downloaded!');
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black">Daily Order Summary</h3>
            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>

          <div className="space-y-4">
            {summary?.map((item: any) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <span className="font-bold text-gray-700">{item.name}</span>
                <span className="bg-white px-4 py-1 rounded-full font-black text-blue-600 border border-gray-100">{item.quantity}</span>
              </div>
            ))}
            {summary?.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                {stats?.activeVendor?.on_system === false ? (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-amber-800">External Vendor Ordering Enabled</h4>
                      <p className="text-xs text-amber-700 font-semibold leading-relaxed">
                        This vendor is not on the system. Send the daily order summary manually via WhatsApp or SMS below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-start gap-3">
                    <CheckSquare className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-green-800">System Integrated Vendor</h4>
                      <p className="text-xs text-green-700 font-semibold leading-relaxed">
                        This vendor features portal access, but you can also choose to dispatch immediate SMS or WhatsApp reminders below.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={sendWhatsApp}
                    className="py-3 px-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-600/10 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp Order
                  </button>
                  <button 
                    onClick={sendSMS}
                    className="py-3 px-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-md shadow-blue-600/10 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                  >
                    <Smartphone className="w-4 h-4" /> SMS Order
                  </button>
                </div>
                
                <button 
                  onClick={copyText}
                  className="w-full py-3 px-4 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 border border-gray-200"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy Order Summary Text
                </button>
              </div>
            )}
            {(!summary || summary.length === 0) && (
              <div className="text-center py-10 text-gray-400 font-medium">No orders yet for today</div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100">
           <h3 className="text-xl font-black mb-8">Department Insights</h3>
           <div className="space-y-6">
             {stats?.departmentInsights?.map((dept: any) => (
               <div key={dept.name}>
                 <div className="flex justify-between text-sm font-bold mb-2">
                   <span className="text-gray-600">{dept.name}</span>
                   <span className="text-gray-900">{dept.order_count} orders</span>
                 </div>
                 <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                   <div 
                     className="bg-blue-600 h-full transition-all duration-1000" 
                     style={{ width: `${(dept.order_count / stats.totalEmployees) * 100}%` }}
                    />
                 </div>
               </div>
             ))}
             {(!stats?.departmentInsights || stats.departmentInsights.length === 0) && (
               <div className="text-center py-10 text-gray-400 font-medium italic">No department data yet</div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}

function ManageDepartmentsModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: departments, isLoading } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const res = await axios.get('/admin/departments');
      return res.data;
    }
  });

  const mutation = useMutation({
    mutationFn: async (name: string) => {
      return axios.post('/admin/departments', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      toast.success('Department added');
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-gray-900">Manage Departments</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><Plus className="w-6 h-6 rotate-45" /></button>
        </div>
        <div className="p-8 space-y-6">
          <form onSubmit={(e) => {
            e.preventDefault();
            const input = (e.target as HTMLFormElement).elements.namedItem('deptName') as HTMLInputElement;
            mutation.mutate(input.value);
            input.value = '';
          }} className="flex gap-2">
            <input 
              name="deptName" 
              placeholder="e.g. Sales, Marketing" 
              className="flex-1 p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" 
              required 
            />
            <button type="submit" className="px-6 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all">
              Add
            </button>
          </form>

          <div className="space-y-2">
            <h4 className="text-xs font-black text-gray-400 uppercase ml-1">Existing Departments</h4>
            <div className="max-h-[30vh] overflow-y-auto space-y-1">
              {isLoading ? <p>Loading...</p> : departments?.map((d: any) => (
                <div key={d.id} className="p-4 bg-gray-50 rounded-2xl font-bold text-gray-700 flex justify-between items-center">
                  {d.name}
                </div>
              ))}
              {departments?.length === 0 && <p className="text-center py-6 text-gray-400 font-medium">No departments yet</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditEmployeeModal({ employee, departments, onClose, onSave }: { employee: any, departments: any[], onClose: () => void, onSave: (data: any) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-gray-900">Edit Employee</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><Plus className="w-6 h-6 rotate-45" /></button>
        </div>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          onSave(Object.fromEntries(formData));
        }} className="p-8 space-y-6">
          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase ml-1">Full Name</label>
            <input name="name" defaultValue={employee.name} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase ml-1">Email Address</label>
            <input name="email" type="email" defaultValue={employee.email} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" required />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase ml-1">WhatsApp / SMS Number</label>
            <input name="phone" type="text" defaultValue={employee.phone || ''} placeholder="Phone Number" className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase ml-1">Department</label>
            <select name="department_id" defaultValue={employee.department_id} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" required>
              <option value="">Select Department</option>
              {departments?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-black text-gray-400 uppercase ml-1">Role</label>
            <select name="role" defaultValue={employee.role} className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold" required>
              <option value="employee">Employee</option>
              <option value="hod">HOD</option>
              <option value="intern">Intern</option>
            </select>
          </div>

          <button type="submit" className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-lg hover:bg-gray-800 transition-all">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}

function EmployeesTab({ stats }: { stats: any }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [showDepts, setShowDepts] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ['admin-employees'],
    queryFn: async () => {
      const res = await axios.get('/team');
      return res.data;
    }
  });

  const { data: departments } = useQuery({
    queryKey: ['admin-departments'],
    queryFn: async () => {
      const res = await axios.get('/admin/departments');
      return res.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return axios.post('/users', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setIsAdding(false);
      toast.success('Employee added successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add employee');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Employee removed');
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.patch(`/users/${id}/toggle-status`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
      toast.success('Status updated');
    }
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return axios.put(`/users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-employees'] });
      setEditingEmployee(null);
      toast.success('Employee updated');
    }
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-black text-gray-900">Team Members</h3>
          <p className="text-sm text-gray-500 font-medium">
            {stats?.totalEmployees} / {stats?.employeeLimit || 20} seats used
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowDepts(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
          >
            Manage Departments
          </button>
          {!isAdding && (
            <button 
              onClick={() => {
                const isAtLimit = (stats?.totalEmployees || 0) >= (stats?.employeeLimit || 20);
                if (isAtLimit) {
                  toast.error('Employee limit reached. Please upgrade your plan in Settings.');
                } else {
                  setIsAdding(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      {showDepts && <ManageDepartmentsModal onClose={() => setShowDepts(false)} />}
      
      {editingEmployee && (
        <EditEmployeeModal 
          employee={editingEmployee}
          departments={departments || []}
          onClose={() => setEditingEmployee(null)}
          onSave={(data) => editMutation.mutate({ id: editingEmployee.id, data })}
        />
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm">
          <h4 className="font-bold mb-4">New Employee</h4>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addMutation.mutate(Object.fromEntries(formData));
          }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <input name="name" placeholder="Full Name" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            <input name="email" type="email" placeholder="Email Address" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            <input name="phone" placeholder="WhatsApp / SMS Number" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <select name="department_id" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="">Select Department</option>
              {departments?.map((d: any) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <select name="role" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="employee">Employee</option>
              <option value="hod">HOD</option>
              <option value="intern">Intern</option>
            </select>
            <div className="lg:col-span-5 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm">Create User</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[600px]">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                <th className="px-6 lg:px-8 py-4">Name</th>
                <th className="px-6 lg:px-8 py-4">Contact Details</th>
                <th className="px-6 lg:px-8 py-4">Role</th>
                <th className="px-6 lg:px-8 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees?.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-gray-50 transition-all group">
                  <td className="px-6 lg:px-8 py-4 font-bold text-gray-900">{emp.name}</td>
                  <td className="px-6 lg:px-8 py-4 text-gray-500 font-medium truncate max-w-[200px] lg:max-w-none">
                    <div className="space-y-0.5">
                      <div className="text-gray-800 font-semibold">{emp.email}</div>
                      {emp.phone && (
                        <div className="text-xs text-blue-600 font-bold">WhatsApp/SMS: {emp.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 lg:px-8 py-4 capitalize">
                     <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                       !emp.is_active ? 'bg-red-50 text-red-600' :
                       emp.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                       emp.role === 'hod' ? 'bg-orange-50 text-orange-600' :
                       'bg-gray-100 text-gray-600'
                     }`}>
                       {emp.is_active ? (emp.role || 'employee') : 'Suspended'}
                     </span>
                  </td>
                  <td className="px-6 lg:px-8 py-4 text-right">
                     {emp.id !== user?.id && (
                       <div className="flex justify-end gap-1 lg:gap-2 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all">
                         <button 
                          onClick={() => setEditingEmployee(emp)}
                          className="p-1.5 lg:p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-all"
                          title="Edit"
                         >
                           <Edit2 className="w-4 h-4" />
                         </button>

                         <button 
                          onClick={() => {
                            toggleStatusMutation.mutate(emp.id);
                          }}
                          className={`p-1.5 lg:p-2 rounded-lg transition-all ${
                            emp.is_active 
                            ? 'hover:bg-orange-50 text-gray-400 hover:text-orange-600' 
                            : 'hover:bg-green-50 text-gray-400 hover:text-green-600'
                          }`}
                          title={emp.is_active ? "Suspend" : "Unsuspend"}
                         >
                           {emp.is_active ? <Ban className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                         </button>

                         <button 
                          onClick={() => {
                            deleteMutation.mutate(emp.id);
                          }}
                          className="p-1.5 lg:p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-all"
                          title="Delete"
                         >
                           <Trash2 className="w-4 h-4" />
                         </button>
                       </div>
                     )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!employees || employees.length === 0) && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-50 text-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8" />
            </div>
            <p className="text-gray-400 font-medium italic">No employees found in this tenant.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VendorsTab({ onManageMenu }: { onManageMenu: (vendorId: string) => void }) {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContact, setEditContact] = useState('');
  const [editOnSystem, setEditOnSystem] = useState(true);

  // Fetch vendors lists with real-time polling to ensure swift updates
  const { data: vendors, isLoading } = useQuery({
    queryKey: ['admin-vendors'],
    queryFn: async () => {
      const res = await axios.get('/admin/vendors');
      return res.data;
    },
    refetchInterval: 3000, // Sync changes every 3 seconds
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      return axios.post('/admin/vendors', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      setIsAdding(false);
      toast.success('Vendor added');
    }
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.patch(`/admin/vendors/${id}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ordering-menu'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['active-vendor'] });
      toast.success('Vendor activated for today');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to activate vendor');
    }
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string, data: any }) => {
      return axios.put(`/admin/vendors/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setEditingId(null);
      toast.success('Vendor updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update vendor');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.delete(`/admin/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ordering-menu'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['active-vendor'] });
      toast.success('Vendor deleted successfully');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete vendor');
    }
  });

  const toggleSuspendMutation = useMutation({
    mutationFn: async (id: string) => {
      return axios.patch(`/admin/vendors/${id}/toggle-suspend`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-ordering-menu'] });
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      queryClient.invalidateQueries({ queryKey: ['active-vendor'] });
      toast.success('Vendor status updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update vendor status');
    }
  });

  if (isLoading) return <div>Loading vendors...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-black text-gray-900">All Vendors</h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20"
          >
            <Plus className="w-4 h-4" /> Add New Vendor
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm animate-in slide-in-from-top-4 duration-300">
          <h4 className="font-bold mb-4">New Vendor</h4>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const payload: any = Object.fromEntries(formData);
            // Translate form text value to proper boolean
            payload.on_system = payload.on_system === 'true';
            addMutation.mutate(payload);
          }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" placeholder="Vendor Name" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            <input name="contact_info" placeholder="Phone Number (SMS & WhatsApp)" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            <div className="md:col-span-2">
              <label className="text-xs font-black text-gray-400 uppercase block mb-1">Portal System Availability</label>
              <select name="on_system" className="w-full p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
                <option value="true">Registered on System (Accesses platform dashboard)</option>
                <option value="false">External Vendor (SMS & WhatsApp deliveries only)</option>
              </select>
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-gray-500">Cancel</button>
              <button type="submit" className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm">Create Vendor</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vendors?.map((vendor: any) => {
          const isEditing = editingId === vendor.id;
          return (
            <div 
              key={vendor.id} 
              className={`p-6 rounded-3xl border-2 transition-all bg-white relative overflow-hidden flex flex-col justify-between ${
                vendor.is_active 
                  ? 'border-blue-600 ring-4 ring-blue-50/50' 
                  : vendor.is_suspended 
                    ? 'border-gray-200 bg-gray-50/50 opacity-75' 
                    : 'border-gray-100'
              }`}
            >
              {/* Badges top right */}
              <div className="absolute top-4 right-4 flex gap-2">
                {vendor.is_active && (
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 rounded-full flex items-center gap-1">
                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Active Today
                  </span>
                )}
                {vendor.is_suspended && (
                  <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 rounded-full flex items-center gap-1">
                    <Ban className="w-3.5 h-3.5 stroke-[3]" /> Suspended
                  </span>
                )}
              </div>

              <div>
                {isEditing ? (
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      editMutation.mutate({ id: vendor.id, data: { name: editName, contact_info: editContact, on_system: editOnSystem } });
                    }}
                    className="space-y-3 mt-2"
                  >
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase">Vendor Name</label>
                      <input 
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase">Contact Info</label>
                      <input 
                        value={editContact}
                        onChange={(e) => setEditContact(e.target.value)}
                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        required 
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase">System Status</label>
                      <select 
                        value={editOnSystem ? "true" : "false"}
                        onChange={(e) => setEditOnSystem(e.target.value === "true")}
                        className="w-full mt-1 p-3 bg-gray-50 rounded-xl border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        required 
                      >
                        <option value="true">Registered on System (Portal access)</option>
                        <option value="false">External Vendor (SMS & WhatsApp orders)</option>
                      </select>
                    </div>
                    <div className="flex gap-2 justify-end pt-2">
                      <button 
                        type="button" 
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                      <button 
                        type="submit"
                        className="px-4 py-1.5 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </form>
                ) : (
                  // Entire row details are made clickable, so the vendor can be activated effortlessly
                  // simply by clicking their card details, with a read-only radio button reflecting the state.
                  <div 
                    onClick={() => {
                      if (!vendor.is_active && !vendor.is_suspended) {
                        activateMutation.mutate(vendor.id);
                      }
                    }}
                    className={`flex items-start gap-4 ${vendor.is_suspended ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="mt-1">
                      <input 
                        type="radio" 
                        name="active-vendor"
                        disabled={vendor.is_suspended}
                        checked={vendor.is_active && !vendor.is_suspended}
                        readOnly
                        className={`w-6 h-6 text-blue-600 border-2 border-gray-300 focus:ring-blue-500 ${vendor.is_suspended ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                    </div>
                    <div className="pr-25">
                      <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                        {vendor.name}
                        {vendor.on_system === false ? (
                          <span className="text-[10px] bg-amber-50 text-amber-600 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide border border-amber-100">SMS / WhatsApp</span>
                        ) : (
                          <span className="text-[10px] bg-green-50 text-green-600 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide border border-green-100">Portal Access</span>
                        )}
                      </h4>
                      <p className="text-sm text-gray-500 font-medium">{vendor.contact_info}</p>
                    </div>
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="mt-6 flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onManageMenu(vendor.id)}
                      className="flex-1 py-2.5 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl font-bold text-xs transition-all border border-gray-100 flex items-center justify-center gap-2"
                    >
                      <Utensils className="w-3.5 h-3.5" /> Manage Menu Selection
                    </button>
                  </div>
                  <div className="flex gap-2 border-t border-gray-100 pt-3">
                    <button
                      onClick={() => {
                        setEditingId(vendor.id);
                        setEditName(vendor.name);
                        setEditContact(vendor.contact_info);
                        setEditOnSystem(vendor.on_system !== false);
                      }}
                      className="flex-1 py-2 text-gray-600 hover:bg-gray-50 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" strokeWidth={3} /> Edit Info
                    </button>
                    <button
                      onClick={() => {
                        // Directly trigger toggleSuspend without blocking confirm prompt windows
                        toggleSuspendMutation.mutate(vendor.id);
                      }}
                      className={`flex-1 py-2 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                        vendor.is_suspended 
                          ? 'text-teal-600 hover:bg-teal-50/50' 
                          : 'text-amber-600 hover:bg-amber-50/50'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" strokeWidth={3} /> {vendor.is_suspended ? 'Reactivate' : 'Suspend'}
                    </button>
                    <button
                      onClick={() => {
                        // Instantly trigger vendor deletion on click to prevent iframe dialog block issues
                        deleteMutation.mutate(vendor.id);
                      }}
                      className="flex-1 py-2 text-red-600 hover:bg-red-50 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={3} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {vendors?.length === 0 && <div className="md:col-span-2 text-center py-20 text-gray-400 font-medium italic">No vendors added yet</div>}
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
        active ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}

function OrderTab({ stats, onSwitchTab }: { stats: any, onSwitchTab: (tab: any) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Handle loading state for stats
  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <h3 className="text-xl font-black text-gray-900 uppercase">Synchronizing...</h3>
      </div>
    );
  }

  const activeVendor = stats.activeVendor;

  // Fetch available menu items for the active vendor
  const { data: menuItems, isLoading: loadingMenu } = useQuery({
    queryKey: ['admin-ordering-menu', activeVendor?.id],
    queryFn: async () => {
      if (!activeVendor?.id) return [];
      try {
        const res = await axios.get('/menu-items');
        const allItems = res.data;
        if (!Array.isArray(allItems)) return [];
        
        // Filter for current active vendor items
        const filtered = allItems.filter((item: any) => item.vendor_id === activeVendor.id);
        
        // Ensure uniqueness by ID
        const uniqueMenu = [];
        const seenIds = new Set();
        for (const item of filtered) {
          if (item?.id && !seenIds.has(item.id)) {
            uniqueMenu.push(item);
            seenIds.add(item.id);
          }
        }
        return uniqueMenu;
      } catch (err: any) {
        console.error('Menu fetch error:', err);
        return [];
      }
    },
    enabled: !!activeVendor?.id
  });

  // Fetch all employees for bulk ordering
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['admin-ordering-staff'],
    queryFn: async () => {
      const res = await axios.get('/team');
      return res.data;
    }
  });

  // Fetch current orders to see who has ordered
  const { data: todayOrders } = useQuery({
    queryKey: ['admin-live-orders-tracking'],
    queryFn: async () => {
      const res = await axios.get('/admin/orders'); // Reusing admin live orders
      return res.data;
    }
  });

  const bulkOrderMutation = useMutation({
    mutationFn: async ({ orders }: { orders: { userId: string, menuItemId: string }[] }) => {
      return axios.post('/orders/bulk', { orders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-live-orders-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Orders placed successfully');
      setSelectedEmployees([]);
      setSelectedMeal(null);
    },
    onError: () => {
      toast.error('Failed to process bulk orders');
    }
  });

  const handleBulkOrder = () => {
    if (!selectedMeal) return toast.error('Select a meal first');
    
    const targets = selectedEmployees.length > 0 ? selectedEmployees : [user?.id!];
    const orders = targets.map(id => ({ userId: id, menuItemId: selectedMeal }));
    
    bulkOrderMutation.mutate({ orders });
  };

  const filteredEmployees = employees?.filter((e: any) => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const orderedUserIds = new Set(todayOrders?.map((o: any) => o.user_id));

  if (!activeVendor) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-center min-h-[400px]">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
          <Store className="w-10 h-10 text-orange-500" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">No Active Vendor</h3>
        <p className="text-gray-500 font-medium max-w-sm mb-8">
          You need to select an active vendor for today's orders in the vendors tab.
        </p>
        <button 
          onClick={() => onSwitchTab('vendors')}
          className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black shadow-xl shadow-gray-200 hover:scale-[1.02] transition-all active:scale-[0.98]"
        >
          Go to Vendors
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Menu Selection */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden mb-8">
          <div className="relative z-10">
            <p className="text-blue-100 font-black text-xs uppercase tracking-[0.2em] mb-2">Active Vendor</p>
            <h2 className="text-4xl font-black mb-2">{activeVendor.name}</h2>
            <div className="flex items-center gap-2 text-blue-100 text-sm font-bold">
              <Utensils className="w-4 h-4" />
              <span>Full Daily Menu</span>
            </div>
          </div>
          <Store className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 rotate-12" />
        </div>

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-black text-gray-900">Select a Meal</h3>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
            {menuItems?.length || 0} Options available
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loadingMenu ? (
             [1,2,3,4].map(i => <div key={`skeleton-menu-${i}`} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)
          ) : menuItems?.map((meal: any) => (
            <button
              key={`meal-${meal.id}`}
              onClick={() => setSelectedMeal(meal.id)}
              className={`p-6 text-left rounded-3xl border-2 transition-all relative overflow-hidden group ${
                selectedMeal === meal.id
                  ? 'border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-600/10'
                  : 'border-white bg-white hover:border-gray-200'
              }`}
            >
              {selectedMeal === meal.id && (
                <div className="absolute top-0 right-0 p-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
              <h4 className="font-black text-gray-900 text-lg mb-1">{meal.name}</h4>
              <p className="text-sm text-gray-500 line-clamp-2 font-medium mb-4">{meal.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-blue-600 font-black">${meal.price}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Column: People Selection */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm sticky top-24">
          <div className="mb-6">
             <h3 className="text-lg font-black text-gray-900 mb-1">Place Order For</h3>
             <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Select yourself or team members</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search team..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border-none text-sm font-bold outline-none ring-0 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div className="space-y-2 max-h-[400px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
            {/* Self Option */}
            <button 
              onClick={() => {
                if (selectedEmployees.includes(user?.id!)) {
                  setSelectedEmployees(selectedEmployees.filter(id => id !== user?.id));
                } else {
                  setSelectedEmployees([...selectedEmployees, user?.id!]);
                }
              }}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${
                selectedEmployees.includes(user?.id!) 
                  ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' 
                  : 'bg-gray-50 border-transparent hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-xs">ME</span>
                </div>
                <div className="text-left">
                  <p className="font-black text-gray-900 text-sm">Me (Administrator)</p>
                  <p className="text-[10px] text-blue-600 font-bold uppercase tracking-widest">
                    {orderedUserIds.has(user?.id) ? 'ALREADY ORDERED' : 'NOT ORDERED'}
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedEmployees.includes(user?.id!) ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
              }`}>
                {selectedEmployees.includes(user?.id!) && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
              </div>
            </button>

            <div className="h-px bg-gray-100 my-4" />

            {/* Team Members */}
            {loadingEmployees ? (
              [1,2,3].map(i => <div key={`skeleton-emp-${i}`} className="h-14 bg-gray-50 rounded-2xl animate-pulse" />)
            ) : filteredEmployees?.filter((e: any) => e.id !== user?.id).map((emp: any) => (
              <button 
                key={`emp-${emp.id}`}
                onClick={() => {
                  if (selectedEmployees.includes(emp.id)) {
                    setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                  } else {
                    setSelectedEmployees([...selectedEmployees, emp.id]);
                  }
                }}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${
                  selectedEmployees.includes(emp.id) 
                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' 
                    : 'bg-gray-50 border-transparent hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${emp.name}&background=random`} 
                    className="w-10 h-10 rounded-xl flex-shrink-0" 
                    alt="" 
                  />
                  <div className="text-left">
                    <p className="font-black text-gray-900 text-sm">{emp.name}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${orderedUserIds.has(emp.id) ? 'text-green-600' : 'text-gray-400'}`}>
                      {orderedUserIds.has(emp.id) ? 'ALREADY ORDERED' : 'NOT ORDERED'}
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedEmployees.includes(emp.id) ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                }`}>
                  {selectedEmployees.includes(emp.id) && <Check className="w-3 h-3 text-white" strokeWidth={4} />}
                </div>
              </button>
            ))}
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between px-2 text-sm font-bold text-gray-500">
              <span>Selected Recipients</span>
              <span className="text-blue-600 font-black">{selectedEmployees.length}</span>
            </div>
            
            <button
              onClick={handleBulkOrder}
              disabled={!selectedMeal || (selectedEmployees.length === 0 && !selectedMeal) || bulkOrderMutation.isPending}
              className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {bulkOrderMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5" />
                  {selectedEmployees.length > 0 ? `Confirm ${selectedEmployees.length} Orders` : 'Select Recipients'}
                </>
              )}
            </button>
            
            <p className="text-[10px] text-center text-gray-400 font-black uppercase tracking-tighter">
              Orders will appear in the live feed immediately
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({ stats, onManageMenu, onSwitchTab }: { stats: any, onManageMenu: (vendorId: string) => void, onSwitchTab: (tab: any) => void }) {
  const [showUnordered, setShowUnordered] = useState(false);
  const queryClient = useQueryClient();

  // Dispatch multi-channel reminders to employees who have not yet submitted their lunch choices
  const remindMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post('/admin/orders/remind');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Broadcasting complete! Reminders sent successfully via Email, WhatsApp, and SMS to ${data.sentCount} employees.`);
      // Refresh the local state and counters
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['admin-unordered'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch lunch reminders');
    }
  });

  if (!stats) return null;

  return (
    <div className="space-y-8">
      {showUnordered && <UnorderedListModal onClose={() => setShowUnordered(false)} />}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 leading-tight">Control Center</h2>
          <p className="text-gray-500 font-medium">Dashboard • {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white border border-gray-100 p-3 rounded-2xl flex items-center gap-3 shadow-sm">
             <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center">
               <Clock className="w-5 h-5" />
             </div>
             <div>
               <p className="text-[10px] font-black text-gray-400 uppercase leading-none mb-1">Time Remaining</p>
               <Countdown targetTime={stats.cutoffTime} />
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={Users} label="Total Employees" value={stats.totalEmployees} color="blue" />
        <StatCard icon={Utensils} label="Orders Today" value={stats.ordersToday} color="green" />
        <StatCard icon={AlertCircle} label="Pending Response" value={stats.totalEmployees - stats.ordersToday} color="orange" />
        <StatCard icon={TrendingUp} label="Est. Total Cost" value={`$${stats.totalCost.toFixed(2)}`} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 overflow-hidden relative">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900">Current Active Vendor</h3>
            <span className={`px-3 py-1 rounded-full text-xs font-black ${stats.activeVendor ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {stats.activeVendor ? 'ACTIVE' : 'NO VENDOR SELECTED'}
            </span>
          </div>
          <div className="flex items-center gap-6">
             <div className="w-24 h-24 bg-gray-100 rounded-2xl flex items-center justify-center">
               <Store className="w-10 h-10 text-gray-400" />
             </div>
             <div>
               <h4 className="text-3xl font-black text-gray-900 mb-1">{stats.activeVendor?.name || '---'}</h4>
               <p className="text-gray-500 font-medium">Providing meals for this week</p>
               <div className="flex gap-4 mt-6">
                 {stats.activeVendor && (
                   <button 
                    onClick={() => onManageMenu(stats.activeVendor.id)}
                    className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
                  >
                    Manage Menu
                  </button>
                 )}
                 <button 
                  onClick={() => onSwitchTab('vendors')}
                  className="px-6 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
                 >
                  Change Vendor
                 </button>
               </div>
             </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-3xl p-8 text-white">
          <h3 className="text-xl font-bold mb-6">Quick Reminders</h3>
          <p className="text-gray-400 mb-8 font-medium">Send a buzz to those who haven't ordered yet. Total: {stats.totalEmployees - stats.ordersToday}</p>
          <div className="space-y-3">
            <button 
              disabled={stats.totalEmployees - stats.ordersToday === 0 || remindMutation.isPending}
              onClick={() => remindMutation.mutate()}
              className="w-full py-4 bg-white text-gray-900 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-50 hover:text-blue-600 transition-all disabled:opacity-30"
            >
              {remindMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-gray-900" />
                  Sending Reminders...
                </>
              ) : (
                <>
                  <Bell className="w-5 h-5" /> Send Reminder
                </>
              )}
            </button>
            <button 
              onClick={() => setShowUnordered(true)}
              className="w-full py-2 bg-gray-800 text-gray-400 rounded-xl font-bold text-xs hover:text-white transition-all"
            >
              View Unordered List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UnorderedListModal({ onClose }: { onClose: () => void }) {
  const { data: employees, isLoading } = useQuery({
    queryKey: ['admin-unordered'],
    queryFn: async () => {
      const res = await axios.get('/admin/orders/unordered');
      return res.data;
    }
  });

  // Track people who have already been successfully buzzed in this modal session
  const [buzzedIds, setBuzzedIds] = useState<string[]>([]);
  // Track currently processing buzz actions to show localized loading spinner
  const [buzzingIds, setBuzzingIds] = useState<string[]>([]);

  const handleBuzz = async (userId: string) => {
    setBuzzingIds(prev => [...prev, userId]);
    try {
      const res = await axios.post('/admin/orders/buzz', { userId });
      toast.success(res.data.message || 'Buzz sent successfully!');
      setBuzzedIds(prev => [...prev, userId]);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to dispatch buzz notification');
    } finally {
      setBuzzingIds(prev => prev.filter(id => id !== userId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-black">Pending Orders</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full"><Plus className="w-6 h-6 rotate-45" /></button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Employees...</span>
            </div>
          ) : employees?.map((emp: any) => {
            const isBuzzed = buzzedIds.includes(emp.id);
            const isBuzzing = buzzingIds.includes(emp.id);

            return (
              <div key={emp.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100/50 hover:bg-white transition-all duration-200">
                <div>
                  <p className="font-bold text-gray-900">{emp.name}</p>
                  <p className="text-xs text-gray-500 font-semibold">{emp.department_name || 'No Department'}</p>
                  {emp.phone ? (
                    <p className="text-[10px] text-blue-600 font-bold mt-0.5">WhatsApp / SMS: {emp.phone}</p>
                  ) : (
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">Email selection reminders only</p>
                  )}
                </div>
                <div>
                  {isBuzzed ? (
                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl uppercase tracking-wider">
                      <Check className="w-3.5 h-3.5 stroke-[3]" /> Done
                    </span>
                  ) : (
                    <button 
                      disabled={isBuzzing}
                      onClick={() => handleBuzz(emp.id)}
                      className={`text-xs font-black px-4 py-2 rounded-xl transition-all border outline-none ${
                        isBuzzing 
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10 hover:shadow-lg'
                      }`}
                    >
                      {isBuzzing ? (
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Buzzing...
                        </span>
                      ) : (
                        'Buzz'
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          {employees?.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <p className="font-black text-gray-900 text-sm">Everyone has ordered! 🎉</p>
              <p className="text-xs text-gray-400 mt-1 max-w-[200px] mx-auto font-medium">All employees are successfully set for today's lunch.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersTab({ orders }: { orders: any[] }) {
  const [search, setSearch] = useState('');
  
  const filtered = orders?.filter(o => 
    o.user_name.toLowerCase().includes(search.toLowerCase()) || 
    o.menu_item_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search employee or meal..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">
             <Filter className="w-4 h-4" /> Filter
           </button>
           <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-bold">
             <Download className="w-4 h-4" /> Export Report
           </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50 text-gray-400 text-xs font-black uppercase tracking-wider">
              <th className="px-8 py-4">Employee</th>
              <th className="px-8 py-4">Department</th>
              <th className="px-8 py-4">Ordered Meal</th>
              <th className="px-8 py-4">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered?.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-all group">
                <td className="px-8 py-5">
                  <div className="font-bold text-gray-900">{order.user_name}</div>
                </td>
                <td className="px-8 py-5">
                  <span className="px-2.5 py-1 bg-gray-100 rounded-lg text-xs font-bold text-gray-600">
                    {order.department_name || 'No Dept'}
                  </span>
                </td>
                <td className="px-8 py-5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-bold text-gray-700">{order.menu_item_name}</span>
                  </div>
                </td>
                <td className="px-8 py-5 text-sm text-gray-400 font-medium">
                  {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!filtered || filtered.length === 0) && (
          <div className="py-20 text-center text-gray-400 font-medium font-mono text-sm underline decoration-gray-200 decoration-2">
            NO ORDERS FOUND
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: { icon: any, label: string, value: any, color: string }) {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 hover:shadow-lg hover:shadow-gray-200/50 transition-all group">
      <div className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm font-bold text-gray-400 mb-1">{label}</p>
      <p className="text-3xl font-black text-gray-900 tracking-tight">{value}</p>
    </div>
  );
}
