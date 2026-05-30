import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Clock, Check, Edit, Users, X, Bell, LogOut, Utensils, Search, Store, Loader2, Plus, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import toast from 'react-hot-toast';

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'my-lunch' | 'dept-ordering' | 'order-history'>('my-lunch');
  const [showNotifications, setShowNotifications] = useState(false);

  // Fetch active vendor for HOD/Employee
  // Real-time polling is added here (every 3 seconds) to ensure that if an admin 
  // switches the active vendor via the radio button on their panel, the change 
  // is reflected across all employee dashboards immediately without needing a hard reload.
  const { data: activeVendor, isLoading: loadingActiveVendor } = useQuery({
    queryKey: ['active-vendor'],
    queryFn: async () => {
      const res = await axios.get('/active-vendor');
      return res.data;
    },
    refetchInterval: 3000, // Poll active vendor status every 3 seconds
  });

  // Fetch menu items (general fallback)
  // This query is automatically re-triggered when activeVendor.id changes 
  // due to the reactive query key pattern.
  const { data: menuItems, isLoading: loadingMenu } = useQuery({
    queryKey: ['menu', activeVendor?.id],
    queryFn: async () => {
      const res = await axios.get('/menu-items');
      return res.data;
    },
    enabled: !!activeVendor?.id
  });

  // Fetch current order
  const { data: currentOrder, isLoading: loadingOrder } = useQuery({
    queryKey: ['my-order'],
    queryFn: async () => {
      const res = await axios.get('/orders/today');
      return res.data;
    }
  });

  // Fetch deadline
  const { data: deadline } = useQuery({
    queryKey: ['deadline'],
    queryFn: async () => {
      const res = await axios.get('/deadline');
      return res.data;
    }
  });

  // Fetch tenant status (read-only state check)
  const { data: tenantStatus } = useQuery({
    queryKey: ['tenant-status'],
    queryFn: async () => {
      const res = await axios.get('/tenant/status');
      return res.data;
    }
  });

  const orderMutation = useMutation({
    mutationFn: async (itemId: string) => {
      if (deadline) {
        const now = new Date();
        const [hours, minutes] = deadline.cutoff_time.split(':');
        const cutoff = new Date();
        cutoff.setHours(parseInt(hours), parseInt(minutes), 0);
        
        if (now > cutoff) {
          throw new Error('ORDER_CLOSED');
        }
      }
      return axios.post('/orders', { menuItemId: itemId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-order'] });
      queryClient.invalidateQueries({ queryKey: ['hod-live-orders-tracking'] });
      toast.success('Order placed successfully!');
    },
    onError: (err: any) => {
      if (err.message === 'ORDER_CLOSED') {
        toast.error('Ordering is closed for today');
      } else {
        toast.error('Failed to place order');
      }
    }
  });

  const cancelMutation = useMutation({
  mutationFn: async () => {
    return axios.delete('/orders/today');
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['my-order'] });
    queryClient.invalidateQueries({ queryKey: ['hod-live-orders-tracking'] });
    toast.success('Order cancelled successfully!');
  },
  onError: (err: any) => {
    toast.error(err.response?.data?.message || 'Failed to cancel order');
  }
});

  const handleConfirmOrder = () => {
    if (!selectedMeal) return;
    orderMutation.mutate(selectedMeal);
  };

  if (loadingMenu || loadingOrder || loadingActiveVendor) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <span className="text-sm font-black text-gray-500 uppercase tracking-widest">Loading Dashboard...</span>
      </div>
    );
  }

  const isConfirmed = !!currentOrder;
  const isPastDeadline = deadline ? (new Date() > new Date(new Date().setHours(parseInt(deadline.cutoff_time.split(':')[0]), parseInt(deadline.cutoff_time.split(':')[1]), 0))) : false;

  const isHod = user?.role === 'hod';
  const widthClass = (isHod && activeTab === 'dept-ordering') ? 'max-w-6xl' : 'max-w-2xl';

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {tenantStatus?.is_read_only && (
        <div className="bg-gradient-to-r from-red-600 via-amber-600 to-red-600 text-white py-3 px-4 shadow-sm border-b border-red-700 font-sans">
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
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-10">
        <div className={`${widthClass} mx-auto flex items-center justify-between transition-all duration-300`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">LunchOS</h1>
            {isHod && (
              <span className="ml-2 text-[10px] font-black tracking-widest bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full uppercase">
                HOD VIEW
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowNotifications(true)} 
              className="p-2 text-gray-400 hover:text-gray-600 relative"
            >
              <Bell className="w-6 h-6" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button onClick={logout} className="p-2 text-red-400 hover:text-red-600">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Menu */}
      <div className="bg-white border-b border-gray-100 sticky top-[72px] z-10 shadow-sm shadow-gray-100/40">
        <div className={`${widthClass} mx-auto px-4 flex gap-8 transition-all duration-300`}>
          <button
            onClick={() => setActiveTab('my-lunch')}
            className={`py-4 font-black uppercase text-xs tracking-widest border-b-2 transition-all ${
              activeTab === 'my-lunch'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-900'
            }`}
          >
            My Lunch Selection
          </button>
          {isHod && (
            <button
              onClick={() => setActiveTab('dept-ordering')}
              className={`py-4 font-black uppercase text-xs tracking-widest border-b-2 transition-all flex items-center gap-2 ${
                activeTab === 'dept-ordering'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              Order For Department
            </button>
          )}
          {isHod && (
  <button
    onClick={() => setActiveTab('dept-overview' as any)}
    className={`py-4 font-black uppercase text-xs tracking-widest border-b-2 transition-all flex items-center gap-2 ${
      activeTab === 'dept-overview' as any
        ? 'border-blue-600 text-blue-600'
        : 'border-transparent text-gray-400 hover:text-gray-900'
    }`}
  >
    <Users className="w-4 h-4" />
    Department Overview
  </button>
)}
        
          <button
            onClick={() => setActiveTab('order-history')}
            className={`py-4 font-black uppercase text-xs tracking-widest border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'order-history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-400 hover:text-gray-900'
            }`}
          >
            <History className="w-4 h-4" />
            Order History
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className={`${widthClass} mx-auto px-4 py-8 transition-all duration-300`}>
        {activeTab === 'my-lunch' ? (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Hello, {user?.name} 👋</h2>
              <p className="text-gray-500">Pick your meal for today's lunch</p>
              {activeVendor && (
                <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-blue-50/50 border border-blue-100/50 rounded-xl text-xs font-bold text-blue-700">
                  <Store className="w-3.5 h-3.5" />
                  <span>Ordering from: {activeVendor.name}</span>
                </div>
              )}
            </div>

            {isConfirmed ? (
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                <div className="w-20 h-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Order Confirmed!</h3>
                <p className="text-gray-600 mb-8">
                  Your lunch is locked in. {isPastDeadline ? 'Ordering is now closed.' : 'You can still modify it until the deadline.'}
                </p>
                <div className="p-6 bg-gray-50 rounded-2xl mb-8 border border-gray-100">
                  <p className="text-sm font-medium text-gray-500 mb-1">SELECTED MEAL</p>
                  <p className="text-xl font-bold text-gray-900">{currentOrder.menu_item_name}</p>
                </div>
                {!isPastDeadline && (
  <div className="flex items-center justify-center gap-4">
    <button onClick={() => {
  setSelectedMeal(currentOrder.menu_item_id);
  queryClient.setQueryData(['my-order'], null);
}}
      
      className="flex items-center gap-2 text-blue-600 font-bold hover:text-blue-700 hover:underline transition-all"
    >
      <Edit className="w-4 h-4" /> Change Selection
    </button>
    <span className="text-gray-300">|</span>
    <button 
      onClick={() => cancelMutation.mutate()}
      disabled={cancelMutation.isPending}
      className="flex items-center gap-2 text-red-500 font-bold hover:text-red-600 hover:underline transition-all disabled:opacity-50"
    >
      <X className="w-4 h-4" /> {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Order'}
    </button>
  </div>
)}
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`flex items-center gap-2 border p-4 rounded-2xl mb-6 ${isPastDeadline ? 'bg-red-50 border-red-100' : 'bg-blue-50 border-blue-100'}`}>
                  <Clock className={`w-5 h-5 ${isPastDeadline ? 'text-red-600' : 'text-blue-600'}`} />
                  <p className={`text-sm font-medium ${isPastDeadline ? 'text-red-800' : 'text-blue-800'}`}>
                    {isPastDeadline ? `Ordering closed at ${deadline?.cutoff_time?.slice(0, 5)}` : `Ordering closes at ${deadline?.cutoff_time?.slice(0, 5)} today`}
                  </p>
                </div>

                <div className="grid gap-3">
                  {menuItems?.filter((meal: any) => activeVendor ? meal.vendor_id === activeVendor.id : true).map((meal: any) => (
                    <button
                      key={meal.id}
                      onClick={() => !isPastDeadline && setSelectedMeal(meal.id)}
                      disabled={isPastDeadline}
                      className={`relative p-5 text-left rounded-2xl border-2 transition-all ${
                        selectedMeal === meal.id
                          ? 'border-blue-600 bg-white shadow-xl shadow-blue-900/5'
                          : 'border-white bg-white hover:border-gray-200'
                      } ${isPastDeadline ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-lg text-gray-900">{meal.name}</h4>
                          <p className="text-sm text-gray-500">{meal.description}</p>
                        </div>
                        {!isPastDeadline && (
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedMeal === meal.id ? 'border-blue-600 bg-blue-600' : 'border-gray-200'
                          }`}>
                            {selectedMeal === meal.id && <Check className="w-3 h-3 text-white" />}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                  {menuItems?.filter((meal: any) => activeVendor ? meal.vendor_id === activeVendor.id : true).length === 0 && (
                    <div className="text-center p-8 bg-white rounded-3xl border border-gray-100">
                      <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500 font-medium text-sm">No items found for this vendor today.</p>
                    </div>
                  )}
                </div>

                {!isPastDeadline && (
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-50/80 backdrop-blur-md border-t border-gray-100 md:relative md:bg-transparent md:border-t-0 md:p-0 md:pt-6">
                    <div className="max-w-2xl mx-auto">
                      <button
                        onClick={handleConfirmOrder}
                        disabled={!selectedMeal || orderMutation.isPending}
                        className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                      >
                        {orderMutation.isPending ? 'Confirming...' : 'Place Order'}
                      </button>
                    </div>
                  </div>
                )}
                {isPastDeadline && (
                  <div className="p-8 text-center bg-white rounded-3xl border border-gray-100">
                    <p className="text-gray-500 font-medium">Sorry, you missed today's ordering window.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : activeTab === 'dept-ordering' ? (
          <DepartmentOrderTab activeVendor={activeVendor} deadline={deadline} />
        ) : activeTab === ('dept-overview' as any) ? (
          <DepartmentOverviewTab />
        ) : (
          <OrderHistoryTab />
        )}
      </main>

      {showNotifications && (
        <NotificationsModal 
          activeVendor={activeVendor} 
          deadline={deadline}
          onClose={() => setShowNotifications(false)} 
        />
      )}
    </div>
  );
}

interface NotificationsModalProps {
  activeVendor?: { name: string } | null;
  deadline?: { cutoff_time: string } | null;
  onClose: () => void;
}

function NotificationsModal({ activeVendor, deadline, onClose }: NotificationsModalProps) {
  const notifications = [];

  if (activeVendor) {
    notifications.push({
      id: 'vendor',
      title: 'Today\'s Vendor Active 🍲',
      message: `Today's lunch orders are sourced from ${activeVendor.name}. Check out their menu to select your meal!`,
      time: 'Today',
      type: 'success'
    });
  } else {
    notifications.push({
      id: 'no-vendor',
      title: 'Awaiting Vendor Activation ⏳',
      message: 'An office administrator has not finalized today\'s vendor yet. Once activated, the meal ordering will unlock.',
      time: 'Today',
      type: 'warning'
    });
  }

  if (deadline) {
    notifications.push({
      id: 'deadline',
      title: 'Daily Ordering Deadline ⏰',
      message: `Remember that lunch selection closes at exactly ${deadline.cutoff_time.slice(0, 5)} today. Submit or change your items before then.`,
      time: 'Today',
      type: 'info'
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Notifications</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-all">
            <Plus className="w-6 h-6 rotate-45 text-gray-500" />
          </button>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div key={n.id} className="p-5 bg-gray-50 rounded-2xl border border-gray-100/80 flex flex-col gap-1">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-extrabold text-gray-900 text-sm leading-snug">{n.title}</p>
                  <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {n.time}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mt-1">{n.message}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Bell className="w-8 h-8" />
              </div>
              <h4 className="font-black text-gray-900 mb-2">Clear Skies!</h4>
              <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-xs mx-auto">
                No new announcements. When the system updates or reminders land, they will appear here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DepartmentOrderTab({ activeVendor, deadline }: { activeVendor: any, deadline?: { cutoff_time: string } | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMeal, setSelectedMeal] = useState<string | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate if the cutoff time has passed for today
  const isPastDeadline = deadline ? (new Date() > new Date(new Date().setHours(parseInt(deadline.cutoff_time.split(':')[0]), parseInt(deadline.cutoff_time.split(':')[1]), 0))) : false;

  // Fetch available menu items for the active vendor
  const { data: menuItems, isLoading: loadingMenu } = useQuery({
    queryKey: ['hod-ordering-menu', activeVendor?.id],
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

  // Fetch all department employees (filters to dept on backend already for HOD role)
  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['hod-ordering-staff'],
    queryFn: async () => {
      const res = await axios.get('/team');
      return res.data;
    }
  });

  // Fetch current department orders to check who has already ordered today
  const { data: todayOrders } = useQuery({
    queryKey: ['hod-live-orders-tracking'],
    queryFn: async () => {
      const res = await axios.get('/hod/orders');
      return res.data;
    }
  });

  const bulkOrderMutation = useMutation({
    mutationFn: async ({ orders }: { orders: { userId: string, menuItemId: string }[] }) => {
      return axios.post('/orders/bulk', { orders });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hod-live-orders-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['my-order'] });
      toast.success('Department orders updated successfully');
      setSelectedEmployees([]);
      setSelectedMeal(null);
    },
    onError: () => {
      toast.error('Failed to process department orders');
    }
  });

  const handleBulkOrder = () => {
    if (!selectedMeal) return toast.error('Select a meal or menu item first');
    if (selectedEmployees.length === 0) return toast.error('Please select at least one recipient');
    
    const orders = selectedEmployees.map(id => ({ userId: id, menuItemId: selectedMeal }));
    bulkOrderMutation.mutate({ orders });
  };

  const filteredEmployees = employees?.filter((e: any) => 
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    e.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const orderedUserIds = new Set(todayOrders?.map((o: any) => o.user_id));

  if (!activeVendor) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-100 text-center min-h-[400px] w-full">
        <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
          <Store className="w-10 h-10 text-orange-500" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 mb-2">No Active Vendor</h3>
        <p className="text-gray-500 font-medium max-w-sm">
          Please contact our office administrator to select an active vendor for today's orders.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Menu Selection */}
      <div className="lg:col-span-7 space-y-6">
        <div className="bg-blue-600 rounded-3xl p-8 text-white relative overflow-hidden mb-8 shadow-xl shadow-blue-600/10">
          <div className="relative z-10">
            <p className="text-blue-100 font-extrabold text-xs uppercase tracking-[0.2em] mb-2">Active Food Vendor</p>
            <h2 className="text-3xl font-black mb-2">{activeVendor.name}</h2>
            <div className="flex items-center gap-2 text-blue-100 text-sm font-bold">
              <Utensils className="w-4 h-4" />
              <span>Bulk Order Panel (Your Department Only)</span>
            </div>
          </div>
          <Store className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
        </div>

        {isPastDeadline ? (
          <div className="flex items-center gap-2 border p-4 rounded-2xl mb-6 bg-red-50 border-red-100 shadow-sm shadow-red-100/30">
            <Clock className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">
              Department ordering is closed today. The cutoff time of {deadline?.cutoff_time?.slice(0, 5)} has passed.
            </p>
          </div>
        ) : deadline && (
          <div className="flex items-center gap-2 border p-4 rounded-2xl mb-6 bg-blue-50 border-blue-100 shadow-sm shadow-blue-100/30">
            <Clock className="w-5 h-5 text-blue-600" />
            <p className="text-sm font-medium text-blue-800">
              Department ordering closes at {deadline.cutoff_time.slice(0, 5)} today.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xl font-black text-gray-900">Select a Meal</h3>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">
            {menuItems?.length || 0} Options available
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {loadingMenu ? (
             [1,2,3,4].map(i => <div key={`sk-menu-${i}`} className="h-32 bg-gray-100 rounded-3xl animate-pulse border border-gray-200/50" />)
          ) : menuItems?.map((meal: any) => (
            <button
              key={`meal-${meal.id}`}
              onClick={() => !isPastDeadline && setSelectedMeal(meal.id)}
              disabled={isPastDeadline}
              className={`p-6 text-left rounded-3xl border-2 transition-all relative overflow-hidden flex flex-col justify-between min-h-[140px] group ${
                selectedMeal === meal.id
                  ? 'border-blue-600 bg-blue-50/25 shadow-xl shadow-blue-600/5'
                  : 'border-white bg-white hover:border-gray-200'
              } ${isPastDeadline ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              {selectedMeal === meal.id && (
                <div className="absolute top-0 right-0 p-4">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-extrabold text-gray-900 text-base mb-1 pr-6">{meal.name}</h4>
                <p className="text-xs text-gray-400 font-medium line-clamp-2 leading-relaxed">{meal.description || 'No description provided'}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100/10 flex items-center justify-between w-full">
                <span className="text-blue-600 font-black text-sm">${Number(meal.price).toFixed(2)}</span>
              </div>
            </button>
          ))}
          {!loadingMenu && menuItems?.length === 0 && (
            <div className="col-span-2 text-center p-12 bg-white rounded-3xl border-2 border-dashed border-gray-100">
              <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-bold">This vendor setup has no items available today.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: People Selection */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm sticky top-48">
          <div className="mb-6">
             <h3 className="text-lg font-black text-gray-900 mb-1">Select Recipients</h3>
             <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Bulk order for your team members</p>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search department staff..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 rounded-2xl border-none text-sm font-bold outline-none ring-0 focus:ring-2 focus:ring-blue-100 transition-all font-sans"
            />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto mb-6 pr-2 custom-scrollbar">
            {/* Self Quick Selection */}
            <button 
              onClick={() => {
                if (isPastDeadline) return;
                if (selectedEmployees.includes(user?.id!)) {
                  setSelectedEmployees(selectedEmployees.filter(id => id !== user?.id));
                } else {
                  setSelectedEmployees([...selectedEmployees, user?.id!]);
                }
              }}
              disabled={isPastDeadline}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all border ${
                selectedEmployees.includes(user?.id!) 
                  ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' 
                  : 'bg-gray-50 border-transparent hover:bg-gray-100'
              } ${isPastDeadline ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-black text-xs">ME</span>
                </div>
                <div className="text-left">
                  <p className="font-extrabold text-gray-900 text-sm">Me (Head of Department)</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest ${orderedUserIds.has(user?.id) ? 'text-green-600' : 'text-gray-400'}`}>
                    {orderedUserIds.has(user?.id) ? 'ALREADY ORDERED' : 'NOT ORDERED'}
                  </p>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                selectedEmployees.includes(user?.id!) ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
              }`}>
                {selectedEmployees.includes(user?.id!) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
              </div>
            </button>

            <div className="h-px bg-gray-100 my-4" />

            {/* Core Team Members */}
            {loadingEmployees ? (
              [1, 2, 3].map(i => <div key={`sk-emp-${i}`} className="h-14 bg-gray-50 rounded-2xl animate-pulse" />)
            ) : filteredEmployees?.filter((e: any) => e.id !== user?.id).map((emp: any) => (
              <button 
                key={`emp-${emp.id}`}
                onClick={() => {
                  if (isPastDeadline) return;
                  if (selectedEmployees.includes(emp.id)) {
                    setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                  } else {
                    setSelectedEmployees([...selectedEmployees, emp.id]);
                  }
                }}
                disabled={isPastDeadline}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all border ${
                  selectedEmployees.includes(emp.id) 
                    ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500/10' 
                    : 'bg-gray-50 border-transparent hover:bg-gray-100'
                } ${isPastDeadline ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <img 
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`} 
                    className="w-10 h-10 rounded-xl flex-shrink-0" 
                    alt="" 
                  />
                  <div className="text-left">
                    <p className="font-extrabold text-gray-900 text-sm">{emp.name}</p>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${orderedUserIds.has(emp.id) ? 'text-green-600' : 'text-gray-400'}`}>
                      {orderedUserIds.has(emp.id) ? 'ALREADY ORDERED' : 'NOT ORDERED'}
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedEmployees.includes(emp.id) ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white'
                }`}>
                  {selectedEmployees.includes(emp.id) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={4} />}
                </div>
              </button>
            ))}
            {(!loadingEmployees && filteredEmployees?.filter((e: any) => e.id !== user?.id).length === 0) && (
              <p className="text-xs text-center text-gray-400 py-6">No other department employees found</p>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between px-2 text-xs font-black text-gray-400 uppercase tracking-widest">
              <span>Recipients Selected</span>
              <span className="text-blue-600 font-black">{selectedEmployees.length}</span>
            </div>
            
            <button
              onClick={handleBulkOrder}
              disabled={isPastDeadline || !selectedMeal || selectedEmployees.length === 0 || bulkOrderMutation.isPending}
              className={`w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${isPastDeadline ? 'bg-red-600 hover:bg-red-700 shadow-red-600/25' : ''}`}
            >
              {bulkOrderMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Orders...
                </>
              ) : isPastDeadline ? (
                <>
                  <Clock className="w-5 h-5" />
                  Ordering Closed Today
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  {selectedEmployees.length > 0 ? `Confirm ${selectedEmployees.length} Orders` : 'Select Recipients & Meal'}
                </>
              )}
            </button>
            
            <p className="text-[10px] text-center text-gray-400 font-extrabold uppercase tracking-widest">
              Ordering is bound strictly to active vendor meals
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate component for rendering user's past lunch order history
function OrderHistoryTab() {
  // Fetch user's order history via the newly created backend API route
  const { data: pastOrders, isLoading } = useQuery({
    queryKey: ['order-history'],
    queryFn: async () => {
      const res = await axios.get('/orders/history');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Loading history...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-900 font-sans tracking-tight">Order History</h2>
        <p className="text-gray-500 font-medium">Your historical meal selections and receipts from yesterday and prior</p>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {pastOrders && pastOrders.length > 0 ? (
          <div className="divide-y divide-gray-50">
            {pastOrders.map((order: any) => {
              // Convert stored date to friendly human-readable format
              const formattedDate = new Date(order.order_date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              });

              return (
                <div key={order.id} className="p-6 hover:bg-gray-50/50 transition-all flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest">
                      {formattedDate}
                    </p>
                    <h4 className="font-extrabold text-gray-900 text-lg leading-snug">
                      {order.menu_item_name}
                    </h4>
                    {order.menu_item_description && (
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">
                        {order.menu_item_description}
                      </p>
                    )}
                    {order.vendor_name && (
                      <p className="inline-flex items-center gap-1 mt-1 text-[11px] font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
                        <Store className="w-3 h-3 text-gray-400" />
                        <span>Sourced from {order.vendor_name}</span>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-gray-900 font-black text-sm bg-gray-50 px-3.5 py-1.5 rounded-xl border border-gray-100 font-sans">
                      ${Number(order.total_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-100">
              <History className="w-8 h-8" />
            </div>
            <h4 className="font-black text-gray-900 mb-1">No past orders found</h4>
            <p className="text-xs text-gray-400 font-medium leading-relaxed max-w-sm mx-auto">
              Your previous order submissions from dates prior to today will accumulate here automatically.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
function DepartmentOverviewTab() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const { data: employees, isLoading: loadingEmployees } = useQuery({
    queryKey: ['hod-dept-employees'],
    queryFn: async () => {
      const res = await axios.get('/team');
      return res.data;
    }
  });

  const { data: todayOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['hod-dept-orders'],
    queryFn: async () => {
      const res = await axios.get('/hod/orders');
      return res.data;
    },
    refetchInterval: 10000,
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => axios.post('/hod/employees', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hod-dept-employees'] });
      setIsAdding(false);
      toast.success('Employee added to your department!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to add employee');
    }
  });

  const orderedUserIds = new Set(todayOrders?.map((o: any) => o.user_id));
  const orderedCount = employees?.filter((e: any) => orderedUserIds.has(e.id)).length || 0;
  const totalCount = employees?.length || 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-gray-900">{totalCount}</p>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Total Members</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-green-600">{orderedCount}</p>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Ordered</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-orange-500">{totalCount - orderedCount}</p>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Pending</p>
        </div>
      </div>

      {/* Add Employee */}
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-900">Department Members</h3>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl border-2 border-blue-100 shadow-sm">
          <h4 className="font-bold mb-4 text-gray-900">New Employee</h4>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addMutation.mutate(Object.fromEntries(formData));
          }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input name="name" placeholder="Full Name" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            <input name="email" type="email" placeholder="Email Address" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" required />
            <input name="phone" placeholder="WhatsApp / SMS Number" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            <select name="role" className="p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-blue-500">
              <option value="employee">Employee</option>
              <option value="intern">Intern</option>
            </select>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-gray-500 cursor-pointer">Cancel</button>
              <button type="submit" disabled={addMutation.isPending} className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50">
                {addMutation.isPending ? 'Adding...' : 'Add Employee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee List */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        {loadingEmployees || loadingOrders ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : employees?.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {employees.map((emp: any) => {
              const hasOrdered = orderedUserIds.has(emp.id);
              const order = todayOrders?.find((o: any) => o.user_id === emp.id);
              return (
                <div key={emp.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-all">
                  <div className="flex items-center gap-3">
                    <img
                      src={`https://ui-avatars.com/api/?name=${encodeURIComponent(emp.name)}&background=random`}
                      className="w-10 h-10 rounded-xl"
                      alt=""
                    />
                    <div>
                      <p className="font-bold text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-400 font-medium">{emp.email}</p>
                      {hasOrdered && order && (
                        <p className="text-xs text-blue-600 font-bold mt-0.5">🍽 {order.menu_item_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${
                      hasOrdered ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {hasOrdered ? 'Ordered' : 'Pending'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <h4 className="font-black text-gray-900 mb-2">No department members yet</h4>
            <p className="text-sm text-gray-400 font-medium">Add employees to your department using the button above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
