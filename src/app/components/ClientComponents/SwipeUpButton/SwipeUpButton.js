'use client';
import './SwipeUpButton.css';

export default function SwipeUpButton() {
  const handleClick = (e) => {
    e.preventDefault();
    const element = document.getElementById('header');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="swipe-up-button-content cursor-pointer">
      <a className="swipe-up-button-link" onClick={handleClick}>
        <div className="arrow-up">▲</div>
        <h3 className="swipe-up-button-text">Swipe Up</h3>
      </a>
    </div>
  );
} 