'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Header from '../components/ClientComponents/Header/Header';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import BeehiveManagement from '../components/ClientComponents/BeeHiveManagement/BeehiveManagement';
import FlowersRenderer from '../components/ClientComponents/FlowersRenderer/FlowersRenderer';
import './loggedIn.css';

export default function LoggedInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get('username');
  const email = searchParams.get('email');
  const [userPassword, setUserPassword] = useState('');
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [hiveGroups, setHiveGroups] = useState([]);

  
  // Store password in state and sessionStorage when component mounts
  useEffect(() => {
    const urlPassword = searchParams.get('password');
    const storedPassword = sessionStorage.getItem('userPassword');
    
    console.log('LoggedIn: Checking password sources:', {
      urlPassword: urlPassword ? '[PRESENT]' : '[MISSING]',
      storedPassword: storedPassword ? '[PRESENT]' : '[MISSING]'
    });

    if (urlPassword) {
      console.log('LoggedIn: Using password from URL');
      setUserPassword(urlPassword);
      sessionStorage.setItem('userPassword', urlPassword);
    } else if (storedPassword) {
      console.log('LoggedIn: Using password from sessionStorage');
      setUserPassword(storedPassword);
    } else {
      console.log('LoggedIn: No password available');
    }
  }, [searchParams]);

  // Log when userPassword changes
  useEffect(() => {
    console.log('LoggedIn: userPassword state updated:', userPassword ? '[PRESENT]' : '[MISSING]');
  }, [userPassword]);

  // Only show the UI after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch hive data
  useEffect(() => {
    const fetchAllHives = async () => {
      try {
        const response = await fetch('/api/beehive/fetchAllHives', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email })
        });

        if (!response.ok) {
          throw new Error('Failed to fetch hives');
        }

        const data = await response.json();
        if (!data.beehives || data.beehives.length === 0) {
          setHiveGroups([{
            id: 1,
            hives: []
          }]);
        } else {
          setHiveGroups(data.beehives);
        }
      } catch (error) {
        console.error('Error fetching hives:', error);
        setHiveGroups([{
          id: 1,
          hives: []
        }]);
      }
    };

    if (email) {
      fetchAllHives();
    }
  }, [email]);

  // Initialize EventSource connection for MongoDB Change Streams
  useEffect(() => {
    if (!email) return;

    // Create EventSource connection to the server endpoint
    const eventSource = new EventSource(`/api/beehive/changes?email=${encodeURIComponent(email)}`);

    // Listen for hive updates from the change stream
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('Received hive update:', data);
      // Update the UI with the latest data
      if (data.beehives) {
        setHiveGroups(data.beehives);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [email]);

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  // Handle logout to clear stored password
  const handleConfirmLogout = () => {
    sessionStorage.removeItem('userPassword');
    setUserPassword('');
    router.push('/');
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleOverlayClick = (e) => {
    // Only close if the click is directly on the overlay, not its children
    if (e.target.className === 'logout-modal-overlay') {
      setShowLogoutConfirm(false);
    }
  };

  const handleHiveClick = (hiveId) => {
    const email = searchParams.get('email');
    const username = searchParams.get('username');
    const password = searchParams.get('password');
    
    if (!password) {
      console.error('No password found in URL parameters');
      return;
    }
    
    router.push(`/hiveDetails?id=${hiveId}&email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`);
  };

  if (!mounted) return null;

  return (
    <div className="App">
      <div className={showLogoutConfirm ? 'header-hidden' : ''}>
        <Header isLoggedIn={true} hiveDetails={false}/>
        <button
          onClick={handleLogoutClick}
          className='logout-button'
          style={{
            background: 'linear-gradient(to right, #c53030, #7f1d1d)',
            color: 'white'
          }}
        >
          <Image 
            src={"/logout.png"} 
            className='logout-image' 
            alt="Logout"
            width={20}
            height={20}
          />
          <b className='logout-text'>Logout</b>
        </button>
      </div>
      <FlowersRenderer />
      <main className={`main-content ${showLogoutConfirm ? 'content-hidden' : ''}`}>
        <h2 className={`welcome-title ${theme === 'dark' ? 'dark' : 'light'}`}>
          Welcome,{username}!
        </h2>
        <p className="welcome-description">
          Your HiveGuard dashboard gives you real-time insights into your beehive conditions. 
          Monitor temperature and humidity levels, receive alerts for potential mold risks, 
          and access historical data to ensure your bees thrive in a healthy environment.
        </p>
      </main>
      <div className={showLogoutConfirm ? 'beehive-management-hidden' : ''}>
      </div>

      <BeehiveManagement 
        email={email} 
        username={username} 
        password={userPassword}
        hiveGroups={hiveGroups} 
        setHiveGroups={setHiveGroups}
        returnFromHive={searchParams.get('returnFromHive') === 'true'}
      />
      
      
      {showLogoutConfirm && (
        <div className="logout-modal-overlay" onClick={handleOverlayClick}>
          <div className="logout-modal">
            <div className="logout-modal-content">
              <h3 className="logout-modal-title">Are you sure you want to logout?</h3>
              <div className="logout-modal-buttons">
                <button 
                  onClick={handleCancelLogout} 
                  className="logout-modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmLogout} 
                  className="logout-modal-button confirm-button"
                >
                  <Image 
                    src={"/logout.png"} 
                    className='logout-image' 
                    alt="Logout"
                    width={16}
                    height={16}
                  />
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}