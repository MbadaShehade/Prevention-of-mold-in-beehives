'use client';
import './Navigation.css';
import { useState, useEffect, useRef } from 'react';
import ThemeToggle from '../ThemeToggle/ThemeToggle';
import { useRouter, usePathname } from 'next/navigation';

export default function Navigation({ isLoggedIn, hiveDetails }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const menuRef = useRef(null);
  const hamburgerRef = useRef(null);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Mark as mounted to enable client-side rendering
    setIsMounted(true);
    
    // Set initial window width
    setWindowWidth(window.innerWidth);
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    
    // Handle click outside to close menu
    const handleClickOutside = (event) => {
      if (menuOpen && 
          menuRef.current && 
          !menuRef.current.contains(event.target) &&
          hamburgerRef.current &&
          !hamburgerRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    // Handle scroll to hash
    if (window.performance && window.performance.navigation.type === window.performance.navigation.TYPE_RELOAD) {
      if (window.location.hash) {
        router.replace(window.location.pathname);
      }
    } 
    else if (window.location.hash && pathname === '/') {
      const targetId = window.location.hash.substring(1);
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }

    // Add event listeners
    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen, router, pathname]);

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const handleSmoothScroll = (e, id) => {
    e.preventDefault();
    setMenuOpen(false);
    
    // Check if we're on the homepage
    if (pathname === '/') {
      // We're on the homepage, just scroll to the section
      const targetElement = document.getElementById(id);
      if (targetElement) {
        // Scroll immediately without delay
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(`/#${id}`);
    }
  };

  // If not mounted, return a placeholder structure that matches client render
  if (!isMounted) {
    return (
      <>
        {!isLoggedIn && !hiveDetails && (
          <nav>
            <ul className="nav-links">
              <li><a href="#problem" className="nav-link"><i>The Problem</i></a></li>
              <li><a href="#how-it-works" className="nav-link"><i>Our Solution</i></a></li>
            </ul>
          </nav>
        )}
        <div className="header-controls">
          <ThemeToggle />
        </div>
      </>
    );
  }

  return (
    <>
      {(isLoggedIn  || hiveDetails) ? (
        <>
          {windowWidth <= 700 ? (
            <>
              <div className="mobile-header-controls">
                <ThemeToggle />
              </div>
            </>
          ) : (
            <>
              <div className="header-controls">
                <ThemeToggle />
              </div>
            </>
          )}
        </>
      ) : (
        <>
          {windowWidth <= 1420 ? (
            <>
              <div className="hamburger-menu" onClick={toggleMenu} ref={hamburgerRef}>
                <div className={`hamburger ${menuOpen ? 'open' : ''}`}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>

              {menuOpen && (
                <div className="mobile-menu" ref={menuRef}>
                  <nav>
                    <ul className="mobile-nav-links">
                      <li><a href="#problem" className="nav-link" onClick={(e) => handleSmoothScroll(e, 'problem')}><i>The Problem</i></a></li>
                      <li><a href="#how-it-works" className="nav-link" onClick={(e) => handleSmoothScroll(e, 'how-it-works')}><i>Our Solution</i></a></li>
                    </ul>
                  </nav>
                  <div className="mobile-header-controls">
                    <ThemeToggle />
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <nav>
                <ul className="nav-links">
                  <li><a href="#problem" className="nav-link" onClick={(e) => handleSmoothScroll(e, 'problem')}><i>The Problem</i></a></li>
                  <li><a href="#how-it-works" className="nav-link" onClick={(e) => handleSmoothScroll(e, 'how-it-works')}><i>Our Solution</i></a></li>
                </ul>
              </nav>
              <div className="header-controls">
                <ThemeToggle />
              </div>
            </>
          )}
        </>
      )}
    </>
  );
}