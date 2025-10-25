import { useState, FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(to bottom right, #DBEAFE, #E0E7FF)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{ 
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1F2937', marginBottom: '30px', textAlign: 'center' }}>
          Customer Portal Login
        </h1>

        {error && (
          <div style={{ 
            marginBottom: '20px',
            padding: '12px',
            backgroundColor: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '8px',
            color: '#991B1B',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ 
                width: '100%',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              placeholder="testcustomer@demo.com"
              required
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ 
                width: '100%',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '8px',
                fontSize: '14px'
              }}
              placeholder="password123"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            style={{ 
              width: '100%',
              backgroundColor: '#4F46E5',
              color: 'white',
              padding: '12px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              opacity: isLoading ? 0.5 : 1
            }}
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ 
          marginTop: '32px',
          paddingTop: '24px',
          borderTop: '1px solid #E5E7EB',
          textAlign: 'center'
        }}>
          <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>Test credentials:</p>
          <p style={{ fontSize: '12px', color: '#374151', fontWeight: '600' }}>
            testcustomer@demo.com / password123
          </p>
        </div>

        <div style={{ 
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#EFF6FF',
          borderRadius: '8px',
          fontSize: '11px',
          color: '#1E40AF'
        }}>
          <strong>Debug:</strong> Press F12 and check Console tab for detailed logs
        </div>
      </div>
    </div>
  );
}
