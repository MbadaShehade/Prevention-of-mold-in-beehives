'use client';

import { useState, useEffect, useRef } from 'react';
import './LoginPage.css';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(false); 
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetStep, setResetStep] = useState(1); 
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [resetError, setResetError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const modalRef = useRef(null);
  const router = useRouter();
  const { theme } = useTheme();

  // Only show the UI after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Handle click outside modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showForgotPassword && 
          modalRef.current && 
          !modalRef.current.contains(event.target)) {
        resetPasswordModal();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showForgotPassword]);

  const resetPasswordModal = () => {
    setShowForgotPassword(false);
    setResetEmailSent(false);
    setResetEmail('');
    setResetStep(1);
    setNewPassword('');
    setConfirmNewPassword('');
    setResetError('');
    setIsLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isLogin && password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isLogin ? 'login' : 'signup',
          username,
          email,
          password,
        }),
      });

      // Add specific error handling for JSON parsing
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        // This catches the specific JSON parsing error
        console.error('JSON parsing error:', jsonError);
        setIsLoading(false);
        setError(`Server returned invalid JSON. This usually means the server is down or not properly connected to the database. Status: ${response.status}`);
        return;
      }

      if (!response.ok) {
        if (data.error === 'User not found, Sign Up first') {
          // Switch to signup form and clear fields
          setIsLogin(false);
          setUsername('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }
        throw new Error(data.error || 'Authentication failed');
      }

      // Clear form after successful authentication
      setUsername('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      
      // Show success state for 2 seconds
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        // Store both the original password (for MQTT) and encrypted password (from DB)
        const originalPassword = password; // The password before encryption
        router.push(`/loggedIn?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}&password=${encodeURIComponent(originalPassword)}`);
      }, 1000);

    } catch (err) {
      setIsLoading(false);
      setError(err.message);
    }
  };

  const verifyEmail = async (e) => {
    e.preventDefault();
    setResetError('');
    setIsLoading(true);
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      setResetError('Please enter a valid email address');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verifyEmail',
          email: resetEmail,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Email verification failed');
      }

      setIsLoading(false);
      // Move to next step
      setResetStep(2);
    } catch (err) {
      setIsLoading(false);
      setResetError(err.message || 'Email not found in our database');
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setResetError('');
    setIsLoading(true);

    if (newPassword !== confirmNewPassword) {
      setResetError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'resetPassword',
          email: resetEmail,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      setIsLoading(false);
      setResetEmailSent(true);
      
      // Reset the form after 3 seconds and close the modal
      setTimeout(() => {
        resetPasswordModal();
      }, 3000);
    } catch (err) {
      setIsLoading(false);
      setResetError(err.message);
    }
  };

  if (!mounted) return null;

  return (
    <div className={`login-container theme-${theme}`}>
      {(isLoading || isSuccess) && (
        <div className="loading-overlay">
          <div className="loading-card">
            {isLoading ? (
              <>
                <div className="loading-spinner"></div>
                <p className="loading-text">Processing your request...</p>
              </>
            ) : (
              <>
                <div className="success-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <p className="loading-text">Success! Redirecting...</p>
              </>
            )}
          </div>
        </div>
      )}
      
      <div className="login-wrapper">
        {/* Left side - Form */}
        <div className="login-card">
          <h1 className="login-title">Account Access</h1>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="login-tabs">
            <button 
              onClick={() => setIsLogin(true)}
              className={`login-tab ${isLogin ? 'active' : ''}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              className={`login-tab ${!isLogin ? 'active signup' : ''}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  User Name
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  required={!isLogin}
                />
              </div>
            )}
            
            {isLogin && (
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  User Name
                </label>
                <input
                  type="text"
                  id="username"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="email" className="form-label">
                Email
              </label>
              <input
                type="email"
                id="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  required
                />
                <button 
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              {isLogin && (
                <button 
                  type="button" 
                  className="forgot-password-link"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Forgot Password?
                </button>
              )}
            </div>
            
            {!isLogin && (
              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <div className="password-input-wrapper">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                    required={!isLogin}
                  />
                  <button 
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              className="submit-button"
            >
              {!isLogin ? 'Create Account' : 'Login'}
            </button>
          </form>
        </div>
        
        {/* Right side - Image */}
        <div className="login-image">
          <Image 
            src="/honeyLogin.png" 
            alt="Login illustration" 
            width={500}
            height={500}
            draggable={false}
          />
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay">
          <div className="modal-content" ref={modalRef}>
            <button 
              className="modal-close"
              onClick={resetPasswordModal}
            >
              &times;
            </button>
            <h2 className="modal-title">Reset Password</h2>
            
            {resetEmailSent ? (
              <div className="success-message">
                <p>Password successfully updated!</p>
                <p className="small-text">You can now login with your new password.</p>
              </div>
            ) : resetStep === 1 ? (
              <form onSubmit={verifyEmail} className="reset-form">
                <p className="modal-description">
                  Enter your email address and we&apos;ll send you instructions to reset your password.
                </p>
                {resetError && <div className="error-message">{resetError}</div>}
                <div className="form-group">
                  <label htmlFor="resetEmail" className="form-label">
                    Email
                  </label>
                  <input
                    type="email"
                    id="resetEmail"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <button type="submit" className="submit-button">
                  Continue
                </button>
              </form>
            ) : (
              <form onSubmit={handlePasswordReset} className="reset-form">
                <p className="modal-description">
                  Enter your new password.
                </p>
                {resetError && <div className="error-message">{resetError}</div>}
                <div className="form-group">
                  <label htmlFor="newPassword" className="form-label">
                    New Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      id="newPassword"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="form-input"
                      required
                    />
                    <button 
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirmNewPassword" className="form-label">
                    Confirm New Password
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmNewPassword ? "text" : "password"}
                      id="confirmNewPassword"
                      placeholder="Confirm new password"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      className="form-input"
                      required
                    />
                    <button 
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                      aria-label={showConfirmNewPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmNewPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button type="submit" className="submit-button">
                  Update Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}