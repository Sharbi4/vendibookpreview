import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { AuthMarketingPanel } from '@/components/auth/AuthMarketingPanel';
import { AuthFormPanel } from '@/components/auth/AuthFormPanel';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'verify';

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const redirectUrl = searchParams.get('redirect') || '/';

  // Check for mode in URL params
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'signup' || urlMode === 'signin' || urlMode === 'forgot' || urlMode === 'verify') {
      setMode(urlMode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user && !isLoading) {
      navigate(redirectUrl !== '/' ? redirectUrl : '/activation');
    }
  }, [user, isLoading, navigate, redirectUrl]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Marketing (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 xl:w-[55%]">
        <AuthMarketingPanel mode={mode} />
      </div>
      
      {/* Right Panel - Auth Form */}
      <div className="w-full lg:w-1/2 xl:w-[45%]">
        <AuthFormPanel mode={mode} setMode={setMode} />
      </div>
    </div>
  );
};

export default Auth;
