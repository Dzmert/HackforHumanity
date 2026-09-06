import { useEffect, useState } from 'react';
import { BellRing, BellOff, Smartphone } from 'lucide-react';
import { grantsApi } from '@/lib/grants';
import {
  enableDeviceNotifications, disableDeviceNotifications,
  notificationsSupported, permission
} from '@/lib/pushNotifications';

/** Per-device opt-in for browser/device push reminders. */
export default function DeviceNotificationSettings() {
  const [state, setState] = useState('unknown');
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setState(permission()); }, []);

  const enable = async () => {
    setBusy(true);
    setMessage(null);
    const result = await enableDeviceNotifications();
    setState(permission());
    setMessage(result.message);
    setBusy(false);
  };

  const disable = async () => {
    setBusy(true);
    await disableDeviceNotifications();
    setMessage('This device will no longer receive grant reminders.');
    setBusy(false);
  };

  const test = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await grantsApi.sendTestPush();
      setMessage('Test notification sent to this account’s registered devices.');
    } catch (error) {
      setMessage(error.message || 'The test notification could not be sent.');
    }
    setBusy(false);
  };

  if (!notificationsSupported()) {
    return (
      <p className="rounded-xl border border-[#EFE3D6] bg-white p-4 text-sm text-[#756760]">
        This browser cannot show device notifications. Email reminders will still be sent.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-[#EFE3D6] bg-white p-4">
      <div className="flex items-start gap-3">
        <Smartphone className="mt-0.5 shrink-0 text-[#A45846]" size={18} />
        <div className="min-w-0">
          <p className="font-medium text-[#3D342F]">Reminders on this device</p>
          <p className="text-sm text-[#756760]">
            {state === 'granted'
              ? 'This device is set up to receive grant deadline reminders.'
              : state === 'denied'
                ? 'Notifications are blocked for this site. You can allow them again in your browser’s site settings.'
                : 'Allow notifications so deadline reminders reach you even when the Operations Hub is closed.'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {state !== 'granted' && state !== 'denied' && (
          <button disabled={busy} onClick={enable} className="inline-flex items-center gap-2 rounded-xl bg-[#A45846] px-4 py-2 text-sm text-white disabled:opacity-60">
            <BellRing size={16} /> Turn on for this device
          </button>
        )}
        {state === 'granted' && (
          <>
            <button disabled={busy} onClick={enable} className="rounded-xl border border-[#E5D6C8] px-4 py-2 text-sm text-[#7D4037] disabled:opacity-60">
              Re-register this device
            </button>
            <button disabled={busy} onClick={test} className="rounded-xl border border-[#E5D6C8] px-4 py-2 text-sm text-[#7D4037] disabled:opacity-60">
              Send test notification
            </button>
            <button disabled={busy} onClick={disable} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[#A45846] disabled:opacity-60">
              <BellOff size={16} /> Turn off
            </button>
          </>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-[#3D5A3A]">{message}</p>}
    </div>
  );
}