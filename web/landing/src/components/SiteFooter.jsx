import { Link } from 'react-router-dom'
import { Shield, ExternalLink } from 'lucide-react'
import siteConfig from '../siteConfig'

const { consoleBaseUrl, idBaseUrl } = siteConfig

export default function SiteFooter() {
  const loginRedirectUri = encodeURIComponent(`${consoleBaseUrl}/dashboard`)

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-top-grid">
          {/* Brand Info */}
          <div className="footer-brand-col">
            <Link className="logo" to="/">
              <div className="logo-container">
                <img src="/wardseal.svg" alt="WardSeal" className="logo-img" />
              </div>
              <span className="logo-text text-white">WardSeal</span>
            </Link>
            <p className="footer-tagline">
              Enterprise Identity &amp; Access Control Plane — uniting SSO, SCIM 2.0 directory lifecycle, and continuous zero-trust authorization on open standards.
            </p>
            <div className="footer-status-pill">
              <span className="footer-status-dot" />
              <span>Core Control Plane · 99.99% Uptime</span>
            </div>
          </div>

          {/* Nav Columns */}
          <div className="footer-nav-col">
            <h4>Control Plane</h4>
            <ul>
              <li><a href="/#architecture">Architecture</a></li>
              <li><a href="/#capabilities">Capabilities</a></li>
              <li><a href="/#protocols">Open Standards</a></li>
              <li><a href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>Request Access</a></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4>Developers &amp; Ops</h4>
            <ul>
              <li>
                <a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer">
                  GitHub Repository <ExternalLink size={12} />
                </a>
              </li>
              <li><a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer">Helm Charts</a></li>
              <li><a href={`${idBaseUrl}/login?redirect_uri=${loginRedirectUri}`}>Admin Console</a></li>
              <li><Link to="/policies">Security Policies</Link></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4>Governance &amp; Trust</h4>
            <ul>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/terms-of-service">Terms of Service</Link></li>
              <li><Link to="/cookies">Cookie Policy</Link></li>
              <li><a href="/#protocols">SOC 2 Type II Readiness</a></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-copy">
            <span>© {new Date().getFullYear()} WardSeal Inc. All rights reserved.</span>
          </div>
          <div className="footer-standards">
            <span>OIDC 1.0</span>
            <span className="dot" />
            <span>SAML 2.0</span>
            <span className="dot" />
            <span>SCIM 2.0</span>
            <span className="dot" />
            <span>WebAuthn FIDO2</span>
            <span className="dot" />
            <span>SPIFFE</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
