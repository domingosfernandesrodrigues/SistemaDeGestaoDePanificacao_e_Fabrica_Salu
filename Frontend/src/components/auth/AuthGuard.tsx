import { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const navigate = useNavigate();
  const token = localStorage.getItem('sgpf_token');

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  if (!token) {
    return null;
  }

  return <>{children}</>;
}
