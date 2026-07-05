import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  Utensils, LogOut, ShoppingBag, Menu,
  Plus, Trash2, Check, Loader2, Clock,
  ChevronRight, EyeOff, Eye, User as UserIcon
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '../lib/axios';
import toast from 'react-hot-toast';
import PinManager from './PinManager';

export default function VendorDashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="flex-1 flex flex-col md:flex-row">

        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-gray-100 p-4 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <Utensils className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Lunch<span className="text-green-600">OS</span> <span className="text-sm font-bold text-gray-400">Vendor</span></h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowProfile(true)} className="p-2 text-gray-400">
              <UserIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2 text-gray-400">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Sidebar Overlay */}
        {showMobileMenu && (
          <div className="fixed inset-0 bg-black/20 z-40 md:hidden" onClick={() => setShowMobileMenu(false)} />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-100 flex flex-col md:sticky md:top-0 h-screen transition-transform duration-300 md:translate-x-0 ${showMobileMenu ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                <Utensils className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">Lunch<span className="text-green-600">OS</span></h1>
            </div>
            <button
              onClick={() => { setShowProfile(true); setShowMobileMenu(false); }}
              className="mt-4 p-3 bg-green-50 rounded-2xl w-full text-left hover:bg-green-100 transition-all cursor-pointer"
            >
              <p className="text-xs font-black text-green-700 uppercase tracking-widest">Vendor Portal</p>
              <p className="font-bold text-gray-900 mt-0.5 truncate">{user?.name}</p>
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <NavItem icon={ShoppingBag} label="Today's Orders" active={activeTab === 'orders'} onClick={() => { setActiveTab('orders'); setShowMobileMenu(false); }} />
            <NavItem icon={Utensils} label="My Menu" active={activeTab === 'menu'} onClick={() => { setActiveTab('menu'); setShowMobileMenu(false); }} />
            <NavItem icon={UserIcon} label="Profile" active={false} onClick={() => { setShowProfile(true); setShowMobileMenu(false); }} />
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
            <h2 className="text-lg font-bold text-gray-900 capitalize">{activeTab === 'orders' ? "Today's Orders" : 'My Menu'}</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                <Clock className="w-4 h-4" />
                {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </div>
              <button
                onClick={() => setShowProfile(true)}
                className="hidden md:flex p-2 text-gray-400 hover:text-gray-600"
              >
                <UserIcon className="w-5 h-5" />
              </button>
            </div>
          </header>

          <div className="p-4 md:p-8">
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'menu' && <MenuTab />}
          </div>
        </main>
      </div>

      {showProfile && (
        <ProfileModal onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-black text-gray-900">My Profile</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full">
            <Plus className="w-6 h-6 rotate-45" />
          </button>
        </div>
        <div className="overflow-y-auto p-8 flex-1 space-y-6">
          <div className="flex flex-col items-center mb-2">
            <div className="w-24 h-24 bg-gray-100 rounded-full overflow-hidden border-4 border-green-50 mb-4">
              <img src={`https://ui-avatars.com/api/?name=${user?.name}&background=random`} alt="avatar" className="w-full h-full object-cover" />
            </div>
            <p className="font-black text-gray-900 text-lg">{user?.name}</p>
            <p className="text-sm font-bold text-gray-400 capitalize">{user?.role}</p>
          </div>

          <div className="space-y-1 pt-4 border-t border-gray-100">
            <label className="text-xs font-black text-gray-400 uppercase ml-1">PIN Login</label>
            <p className="text-xs text-gray-400 ml-1 mb-3">Set a 4-digit PIN as a backup login method</p>
            <PinManager />
          </div>
        </div>
      </div>
    </div>
  );
}

function OrdersTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-orders'],
    queryFn: async () => {
      const res = await axios.get('/vendor/orders/today');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const confirmMutation = useMutation({
    mutationFn: async () => {
      return axios.post('/vendor/orders/confirm-all');
    },
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] });
      toast.success(res.data.message || 'All orders confirmed!');
    },
    onError: () => toast.error('Failed to confirm orders')
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  );

  const { orders = [], summary = [], total = 0 } = data || {};
  const pendingCount = orders.filter((o: any) => o.status === 'pending').length;
  const confirmedCount = orders.filter((o: any) => o.status === 'confirmed').length;

  return (
    <div className="space-y-8 max-w-4xl">

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-gray-900">{total}</p>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Total Orders</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-orange-500">{pendingCount}</p>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Pending</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 text-center">
          <p className="text-3xl font-black text-green-600">{confirmedCount}</p>
          <p className="text-xs font-bold text-gray-400 uppercase mt-1">Confirmed</p>
        </div>
      </div>

      {/* Order Summary */}
      {summary.length > 0 && (
        <div className="bg-white p-8 rounded-3xl border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black text-gray-900">Order Summary</h3>
            <span className="text-xs font-black text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase">By Meal</span>
          </div>
          <div className="space-y-3">
            {summary.map((item: any) => (
              <div key={item.meal_name} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="font-bold text-gray-900">{item.meal_name}</span>
                </div>
                <span className="text-2xl font-black text-green-600">×{item.quantity}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirm Button */}
      {pendingCount > 0 && (
        <button
          onClick={() => confirmMutation.mutate()}
          disabled={confirmMutation.isPending}
          className="w-full py-5 bg-green-600 text-white rounded-3xl font-black text-xl shadow-xl shadow-green-600/20 hover:bg-green-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {confirmMutation.isPending ? (
            <><Loader2 className="w-6 h-6 animate-spin" /> Confirming...</>
          ) : (
            <><Check className="w-6 h-6" /> Confirm All {pendingCount} Orders</>
          )}
        </button>
      )}

      {confirmedCount > 0 && pendingCount === 0 && (
        <div className="w-full py-5 bg-green-50 border-2 border-green-200 text-green-700 rounded-3xl font-black text-xl flex items-center justify-center gap-3">
          <Check className="w-6 h-6" /> All Orders Confirmed!
        </div>
      )}

      {/* Individual Orders List */}
      {orders.length > 0 && (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-xl font-black text-gray-900">Individual Orders</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {orders.map((order: any) => (
              <div key={order.id} className="p-5 flex items-center justify-between hover:bg-gray-50 transition-all">
                <div>
                  <p className="font-bold text-gray-900">{order.employee_name}</p>
                  <p className="text-sm text-gray-500 font-medium">{order.meal_name}</p>
                  <p className="text-xs text-gray-400 font-bold">{order.department_name || 'No Department'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${
                    order.status === 'confirmed'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-orange-100 text-orange-700'
                  }`}>
                    {order.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-300" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-300" />
          </div>
          <h4 className="font-black text-gray-900 mb-2">No orders yet today</h4>
          <p className="text-sm text-gray-400 font-medium">Orders will appear here once employees start ordering.</p>
        </div>
      )}
    </div>
  );
}

function MenuTab() {
  const queryClient = useQueryClient();
  const [isAdding, setIsAdding] = useState(false);

  const { data: menuItems = [], isLoading } = useQuery({
    queryKey: ['vendor-menu'],
    queryFn: async () => {
      const res = await axios.get('/vendor/menu');
      return res.data;
    }
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => axios.post('/vendor/menu', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-menu'] });
      setIsAdding(false);
      toast.success('Meal added to menu');
    },
    onError: () => toast.error('Failed to add meal')
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => axios.delete(`/vendor/menu/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-menu'] });
      toast.success('Meal removed');
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => axios.patch(`/vendor/menu/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor-menu'] })
  });

  if (isLoading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-8 h-8 animate-spin text-green-600" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-gray-900">My Menu</h3>
          <p className="text-sm text-gray-400 font-medium">{menuItems.length} items</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-green-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Meal
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-3xl border-2 border-green-100 shadow-sm">
          <h4 className="font-bold mb-4 text-gray-900">New Meal</h4>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            addMutation.mutate(Object.fromEntries(formData));
          }} className="space-y-4">
            <input name="name" placeholder="Meal Name" className="w-full p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-green-500" required />
            <input name="price" type="number" step="0.01" placeholder="Price (e.g. 12.00)" className="w-full p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-green-500" />
            <input name="description" placeholder="Short description (optional)" className="w-full p-3 bg-gray-50 rounded-xl border-none text-sm outline-none focus:ring-2 focus:ring-green-500" />
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-sm font-bold text-gray-500 cursor-pointer">Cancel</button>
              <button type="submit" disabled={addMutation.isPending} className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50">
                {addMutation.isPending ? 'Adding...' : 'Add Meal'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {menuItems.map((item: any) => (
          <div key={item.id} className={`bg-white p-5 rounded-3xl border border-gray-100 flex items-center justify-between transition-all ${!item.is_available ? 'opacity-50' : ''}`}>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-gray-900">{item.name}</h4>
                {!item.is_available && (
                  <span className="text-[10px] bg-gray-100 text-gray-500 font-black px-2 py-0.5 rounded-full uppercase">Hidden</span>
                )}
              </div>
              {item.description && <p className="text-sm text-gray-500 font-medium mt-0.5">{item.description}</p>}
              <p className="text-green-600 font-black mt-1">${item.price}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleMutation.mutate(item.id)}
                className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
                title={item.is_available ? 'Hide from menu' : 'Show on menu'}
              >
                {item.is_available ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button
                onClick={() => deleteMutation.mutate(item.id)}
                className="p-2 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                title="Delete meal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {menuItems.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-8 h-8 text-gray-300" />
            </div>
            <h4 className="font-black text-gray-900 mb-2">No meals yet</h4>
            <p className="text-sm text-gray-400 font-medium">Add your first meal to get started.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all cursor-pointer ${
        active ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      <Icon className="w-5 h-5" />
      {label}
    </button>
  );
}