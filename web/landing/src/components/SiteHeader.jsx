import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
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
        <Link className="logo" to="/" onClick={closeMenu}>
          <div className="logo-container">
            <img src="/wardseal.svg" alt="WardSeal" className="logo-img" />
          </div>
          <span className="logo-text">WardSeal</span>
        </Link>

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
          <a href="/#product" onClick={closeMenu}>Control plane</a>
          <a href="/#capabilities" onClick={closeMenu}>Capabilities</a>
          <a href="/#platform" onClick={closeMenu}>Platform</a>
          <Link to="/policies" className={pathname === '/policies' ? 'active' : ''} onClick={closeMenu}>
            Policies
          </Link>
          <a href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer" onClick={closeMenu}>
            Documentation
          </a>
          <div className={`header-actions${isMenuOpen ? ' header-actions-mobile' : ''}`}>
            {localStorage.getItem('token') ? (
              <a className="btn btn-accent btn-sm" href={`${consoleBaseUrl}/dashboard`}>
                Open console
              </a>
            ) : (
              <>
                <a className="btn-text" href={`${idBaseUrl}/login?redirect_uri=${loginRedirectUri}`}>Sign in</a>
                <a className="btn btn-accent btn-sm" href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>Request access</a>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}
