import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Subscription = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/for-business#pricing', { replace: true });
  }, [navigate]);
  return null;
};

export default Subscription;
