'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileWizard, type UserProfile } from '../../components/ProfileWizard';

export default function ProfilePage() {
  const router = useRouter();
  const [initial, setInitial] = useState<Partial<UserProfile> | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('faro_profile');
    if (stored) {
      try { setInitial(JSON.parse(stored)); } catch { /* ignore */ }
    }
    setLoaded(true);
  }, []);

  const handleSave = (profile: UserProfile) => {
    localStorage.setItem('faro_profile', JSON.stringify(profile));
    router.push('/');
  };

  if (!loaded) return null;

  return <ProfileWizard initial={initial} onSave={handleSave} />;
}
