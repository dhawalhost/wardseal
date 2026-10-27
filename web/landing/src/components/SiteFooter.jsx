import { Link } from 'react-router-dom'
import siteConfig from '../siteConfig'

const { consoleBaseUrl, idBaseUrl } = siteConfig

export default function SiteFooter() {
  const loginRedirectUri = encodeURIComponent(`${consoleBaseUrl}/dashboard`)

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div>
            <Link className="logo" to="/" style={{ marginBottom: '24px' }}>
              <div className="logo-container">
                <img src="/wardseal.svg" alt="WardSeal" className="logo-img" />
              </div>
              <span className="logo-text">WardSeal</span>
            </Link>
            <p className="footer-tagline">
              Enterprise identity and access management — authentication, authorization,
              and directory governance on open standards.
            </p>
          </div>
          <div className="footer-col">
            <h4>Product</h4>
            <ul>
              <li><a href="/#product">Control plane</a></li>
              <li><a href="/#capabilities">Capabilities</a></li>
              <li><a href="/#platform">Platform</a></li>
              <li><a href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>Request access</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Resources</h4>
            <ul>
              <li><a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer">Documentation</a></li>
              <li><Link to="/policies">Policies</Link></li>
              <li><a href={`${idBaseUrl}/login?redirect_uri=${loginRedirectUri}`}>Console sign-in</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/cookies">Cookie Policy</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} WardSeal. All rights reserved.</span>
          <span>OIDC · SAML · SCIM · WebAuthn</span>
        </div>
      </div>
    </footer>
  )
}
