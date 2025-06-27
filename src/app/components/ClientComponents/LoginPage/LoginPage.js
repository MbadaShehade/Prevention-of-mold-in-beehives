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
  const [isMobile, setIsMobile] = useState(false);
  const modalRef = useRef(null);
  const router = useRouter();
  const { theme } = useTheme();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 576);
    };

    // Set initial value
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

    // Validation for both login and signup
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{7,}$/; // at least 7 chars, 1 number, 1 capital
    let validationError = '';

    if (!isLogin) {
      // Sign Up validation
      if (username.length <= 4) {
        validationError = 'Username must be longer than 4 characters';
      } else if (!emailRegex.test(email)) {
        validationError = 'Please enter a valid email address';
      } else if (!passwordRegex.test(password)) {
        validationError = 'Password must be at least 7 characters, contain at least 1 number and 1 capital letter';
      } else if (password !== confirmPassword) {
        validationError = 'Passwords do not match';
      }
    } else {
      // Login validation
      if (username.length <= 4) {
        validationError = 'Username must be longer than 4 characters';
      } else if (!emailRegex.test(email)) {
        validationError = 'Please enter a valid email address';
      } else if (password.length === 0) {
        validationError = 'Please enter your password';
      }
    }

    if (validationError) {
      setError(validationError);
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
      } catch (jsonErr) {
        setError('An unexpected error occurred. Please try again.');
        setIsLoading(false);
        return;
      }

      if (!response.ok) {
        // Custom error handling for signup/login
        if (!isLogin && data.error && data.error.toLowerCase().includes('username or email already exists')) {
          setError('Username or email already exists. Please use a different username or email.');
        } else if (data.error && data.error.toLowerCase().includes('username not found')) {
          setError('Username not found');
        } else if (data.error && data.error.toLowerCase().includes('email not found')) {
          setError('Email not found');
        } else if (data.error && data.error.toLowerCase().includes('wrong password')) {
          setError('Incorrect password');
        } else if (data.error && data.error.toLowerCase().includes('username must be longer')) {
          setError('Username must be longer than 4 characters');
        } else if (data.error && data.error.toLowerCase().includes('please enter a valid email address')) {
          setError('Please enter a valid email address');
        } else if (data.error && data.error.toLowerCase().includes('password')) {
          setError(data.error);
        } else {
          setError(data.error || (isLogin ? 'Authentication failed' : 'Sign up failed'));
        }
        setIsLoading(false);
        // Switch to signup form if user not found
        if (data.error === 'User not found, Sign Up first') {
          setIsLogin(false);
          setUsername('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
        }
        return;
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
      }, 1500);

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.com$/;
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
                type="text"
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
                    <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
                      <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
                    type="text"
                    id="resetEmail"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className={isMobile ? "form-inputReset" : "form-input"}
                    required
                  />
                </div>
                <button type="submit" className={isMobile ? "submit-buttonReset" : "submit-button"}>
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
                        <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
                        <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg className="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
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
