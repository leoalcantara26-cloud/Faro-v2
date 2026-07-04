'use client';

import { useRouter } from 'next/navigation';
import { ProfileWizard, type UserProfile } from '../../components/ProfileWizard';

export default function OnboardingPage() {
  const router = useRouter();

  const handleSave = (profile: UserProfile) => {
    localStorage.setItem('faro_profile', JSON.stringify(profile));
    router.push('/');
  };

  return <ProfileWizard onSave={handleSave} isOnboarding />;
}
