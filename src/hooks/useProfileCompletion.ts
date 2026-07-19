import { useAuth } from '../contexts/AuthContext';

export function useProfileCompletion() {
  const { user } = useAuth();

  const isProfileComplete = () => {
    if (!user) return true; // Not logged in, don't show modal
    return !!(
      user.firstName &&
      user.lastName &&
      user.bio &&
      (user as any).travelPreferences?.style?.length > 0
    );
  };

  const profileCompletionPercentage = () => {
    if (!user) return 100;
    const checks = [
      !!user.firstName,
      !!user.lastName,
      !!user.bio,
      !!((user as any).travelPreferences?.style?.length > 0),
      !!user.profileImage,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  };

  return {
    isProfileComplete: isProfileComplete(),
    profileCompletionPercentage: profileCompletionPercentage(),
  };
}
