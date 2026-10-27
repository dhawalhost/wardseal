import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react'
import siteConfig from '../siteConfig'

const { consoleBaseUrl, idBaseUrl } = siteConfig

export default function SiteHeader() {
  const { pathname } = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)
  const closeMenu = () => setIsMenuOpen(false)

  const loginRedirectUri = encodeURIComponent(`${consoleBaseUrl}/dashboard`)

  return (
    <header className="site-header">
      <div className="container header-inner">
        <div className="header-left">
          <Link className="logo" to="/" onClick={closeMenu}>
            <div className="logo-container">
              <img src="/wardseal.svg" alt="WardSeal" className="logo-img" />
            </div>
            <span className="logo-text">WardSeal</span>
          </Link>

          <div className="system-status-pill hidden-sm">
            <span className="status-dot-pulse" />
            <span>Systems Normal</span>
          </div>
        </div>

        <button
          type="button"
          className="mobile-toggle"
          onClick={toggleMenu}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`nav-links ${isMenuOpen ? 'active' : ''}`} aria-label="Primary">
          <a href="/#architecture" onClick={closeMenu}>Architecture</a>
          <a href="/#capabilities" onClick={closeMenu}>Capabilities</a>
          <a href="/#protocols" onClick={closeMenu}>Standards</a>
          <Link to="/policies" className={pathname === '/policies' ? 'active' : ''} onClick={closeMenu}>
            Policies
          </Link>
          <a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer" onClick={closeMenu}>
            Docs
          </a>

          <div className={`header-actions${isMenuOpen ? ' header-actions-mobile' : ''}`}>
            {localStorage.getItem('token') ? (
              <a className="btn btn-accent btn-sm" href={`${consoleBaseUrl}/dashboard`}>
                Open Console
                <ArrowRight size={14} />
              </a>
            ) : (
              <>
                <a className="btn btn-ghost btn-sm" href={`${idBaseUrl}/login?redirect_uri=${loginRedirectUri}`}>
                  Sign in
                </a>
                <a className="btn btn-accent btn-sm" href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>
                  Request Access
                  <ArrowRight size={14} />
                </a>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
