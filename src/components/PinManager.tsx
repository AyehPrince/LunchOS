import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import axios from '../lib/axios';
import toast from 'react-hot-toast';

export default function PinManager() {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [hasPin, setHasPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    axios.get('/profile').then(res => {
      setHasPin(!!res.data.hasPin);
      setIsChecking(false);
    }).catch(() => setIsChecking(false));
  }, []);

  const handleSetPin = async () => {
    if (pin.length !== 4) return toast.error('PIN must be 4 digits');
    if (pin !== confirmPin) return toast.error('PINs do not match');
    setIsLoading(true);
    try {
      await axios.post('/auth/set-pin', { pin });
      toast.success('PIN set successfully!');
      setHasPin(true);
      setPin('');
      setConfirmPin('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to set PIN');
    }
    setIsLoading(false);
  };

  const handleRemovePin = async () => {
    setIsLoading(true);
    try {
      await axios.delete('/auth/pin');
      toast.success('PIN removed');
      setHasPin(false);
    } catch (err: any) {
      toast.error('Failed to remove PIN');
    }
    setIsLoading(false);
  };

  if (isChecking) return null;

  if (hasPin) {
    return (
      <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-xl flex items-center justify-center">
            <Check className="w-4 h-4 text-white" strokeWidth={3} />
          </div>
          <div>
            <p className="font-bold text-green-800 text-sm">PIN is set</p>
            <p className="text-xs text-green-600">You can log in with your PIN</p>
          </div>
        </div>
        <button
          onClick={handleRemovePin}
          disabled={isLoading}
          className="text-xs font-black text-red-500 hover:underline cursor-pointer"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="password"
        value={pin}
        onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="Enter 4-digit PIN"
        className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-center tracking-widest text-xl"
        maxLength={4}
      />
      <input
        type="password"
        value={confirmPin}
        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
        placeholder="Confirm PIN"
        className="w-full p-4 bg-gray-50 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-center tracking-widest text-xl"
        maxLength={4}
      />
      <button
        type="button"
        onClick={handleSetPin}
        disabled={isLoading || pin.length !== 4 || confirmPin.length !== 4}
        className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
      >
        {isLoading ? 'Setting PIN...' : 'Set PIN'}
      </button>
    </div>
  );
}