import { Link } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'
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
                <img src="/wardseal.svg" alt="" className="logo-img" />
              </div>
              <span className="logo-text">WardSeal</span>
            </Link>
            <p className="footer-tagline">
              Sign-in, provisioning, access policy and audit for your people and services, on open standards
            </p>
          </div>

          {/* Nav Columns */}
          <div className="footer-nav-col">
            <h4>Product</h4>
            <ul>
              <li><a href="/#architecture">Architecture</a></li>
              <li><a href="/#capabilities">Capabilities</a></li>
              <li><a href="/#protocols">Standards</a></li>
              <li><a href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>Request access</a></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4>Developers</h4>
            <ul>
              <li>
                <a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer">
                  GitHub <ArrowUpRight size={14} strokeWidth={1.5} />
                </a>
              </li>
              <li><a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer">Helm chart</a></li>
              <li><a href={`${idBaseUrl}/login?redirect_uri=${loginRedirectUri}`}>Admin console</a></li>
              <li><Link to="/policies">All policies</Link></li>
            </ul>
          </div>

          <div className="footer-nav-col">
            <h4>Legal</h4>
            <ul>
              <li><Link to="/privacy-policy">Privacy</Link></li>
              <li><Link to="/terms-of-service">Terms</Link></li>
              <li><Link to="/cookies">Cookies</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="footer-copy">
            <span>© {new Date().getFullYear()} WardSeal</span>
          </div>
          <div className="footer-standards">OIDC · SAML 2.0 · SCIM 2.0 · WebAuthn · SPIFFE</div>
        </div>
      </div>
    </footer>
  )
}
