import './Footer.css'
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content flex-footer">
        <div className="footer-left">
          &copy; 2025 All rights reserved
        </div>
        <div className="footer-contacts">
          <div className="footer-contact-left">
            <div>Mbada Shehady: 0523148812</div>
            <div>mbadashehade@gmail.com</div>
          </div>
          <div className="footer-contact-right">
            <div>Tamer Amer: 0535302155</div>
            <div style={{ marginLeft: '15px' }}>tamiramer66@gmail.com</div>
          </div>
        </div>
      </div>
    </footer>
  );
}