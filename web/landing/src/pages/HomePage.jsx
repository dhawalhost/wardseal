import { useEffect } from 'react'
import {
  ShieldCheck, Lock, ArrowRight, Activity, Shield, Network,
  Server, Key, Users, Fingerprint, Building2, CheckCircle2,
  KeyRound, Layers, GitBranch, Eye
} from 'lucide-react'
import siteConfig from '../siteConfig'

const { consoleBaseUrl, idBaseUrl } = siteConfig
const loginRedirectUri = encodeURIComponent(`${consoleBaseUrl}/dashboard`)

const protocols = [
  { name: 'OIDC', desc: 'OpenID Connect' },
  { name: 'SAML 2.0', desc: 'Federation' },
  { name: 'SCIM 2.0', desc: 'Provisioning' },
  { name: 'WebAuthn', desc: 'Passkeys' },
  { name: 'OAuth 2.1', desc: 'Delegation' },
  { name: 'JWT', desc: 'Token auth' },
]

const controlPlane = [
  {
    step: '01',
    icon: <KeyRound size={22} />,
    title: 'Authenticate',
    desc: 'Verify users once with SSO, MFA, and passkeys — then issue trusted sessions across every application.',
  },
  {
    step: '02',
    icon: <Shield size={22} />,
    title: 'Authorize',
    desc: 'Evaluate roles, groups, and policies at request time so least privilege is enforced, not assumed.',
  },
  {
    step: '03',
    icon: <GitBranch size={22} />,
    title: 'Provision',
    desc: 'Sync identities through SCIM so joiner–mover–leaver changes propagate without manual tickets.',
  },
]

const capabilities = [
  {
    icon: <Fingerprint size={22} />,
    title: 'Workforce & app SSO',
    desc: 'One identity plane for internal tools and customer-facing apps, with OIDC and SAML federation you already operate.',
    points: ['IdP and SP initiated flows', 'Passwordless + step-up MFA', 'Session and risk signals'],
  },
  {
    icon: <Layers size={22} />,
    title: 'Access governance',
    desc: 'Requests, approvals, and policy decisions stay auditable — so compliance is continuous, not a quarterly scramble.',
    points: ['RBAC and group models', 'IP and context policies', 'Immutable decision trails'],
  },
  {
    icon: <Network size={22} />,
    title: 'Directory lifecycle',
    desc: 'Keep directories and apps aligned as people join, change roles, and leave — automatically.',
    points: ['SCIM 2.0 sync', 'Clean offboarding by default', 'Workload identities'],
  },
]

const pillars = [
  {
    icon: <Building2 size={20} />,
    title: 'Your cloud or ours',
    desc: 'Deploy self-hosted or managed. Identity data stays under your control for regulated environments.',
  },
  {
    icon: <Key size={20} />,
    title: 'Open standards first',
    desc: 'Built on OIDC, SAML, SCIM, and WebAuthn — interoperable with the stack your team already trusts.',
  },
  {
    icon: <Eye size={20} />,
    title: 'Audit-ready by default',
    desc: 'Every authentication and authorization decision is attributable for security and compliance reviews.',
  },
  {
    icon: <Server size={20} />,
    title: 'Operable at scale',
    desc: 'Posture metrics, health checks, and admin workflows designed for identity teams — not dashboards for show.',
  },
]

export default function HomePage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in-view')
            observer.unobserve(e.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <main>
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text reveal">
            <div className="tag">
              <Lock size={14} aria-hidden="true" /> Identity &amp; access platform
            </div>
            <p className="hero-brand">WardSeal</p>
            <h1>The control plane for enterprise identity</h1>
            <p className="hero-subtitle">
              Authenticate users, authorize access, and govern directories from one platform —
              built on open standards for teams that cannot leave identity to chance.
            </p>
            <div className="hero-cta">
              <a className="btn btn-accent btn-lg" href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>
                Request access <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="btn btn-outline btn-lg" href={`${idBaseUrl}/login?redirect_uri=${loginRedirectUri}`}>
                Sign in to console
              </a>
            </div>
            <div className="hero-trust" role="list" aria-label="Trust signals">
              {['Zero-trust ready', 'SOC 2 Type II ready', 'Self-hosted or cloud'].map((label, i) => (
                <span key={label} style={{ display: 'contents' }}>
                  {i > 0 && <div className="trust-dot" aria-hidden="true" />}
                  <div className="trust-indicator" role="listitem">
                    <ShieldCheck size={16} aria-hidden="true" /> {label}
                  </div>
                </span>
              ))}
            </div>
          </div>

          <div className="hero-visual reveal" aria-hidden="true">
            <div className="hero-stage">
              <div className="hero-stage-glow" />
              <div className="hero-auth-card hero-float">
                <div className="hero-auth-brand">
                  <img src="/wardseal.svg" alt="" className="hero-auth-logo" />
                  <span>WardSeal</span>
                </div>
                <p className="hero-auth-kicker">Sign in</p>
                <p className="hero-auth-title">Continue to your workspace</p>
                <div className="hero-auth-field">
                  <Users size={14} />
                  <span>alex@acme.com</span>
                </div>
                <div className="hero-auth-btn">Continue</div>
                <div className="hero-auth-divider"><span>or continue with</span></div>
                <div className="hero-auth-sso">
                  <span>Okta</span>
                  <span>Entra ID</span>
                  <span>Passkey</span>
                </div>
              </div>

              <div className="hero-link-pulse">
                <span>OIDC session</span>
                <ArrowRight size={12} />
                <span>Policy check</span>
              </div>

              <div className="hero-console-card hero-float-delay">
                <div className="hero-console-bar">
                  <span className="hero-preview-dot" />
                  <span className="hero-preview-dot" />
                  <span className="hero-preview-dot" />
                  <span className="hero-preview-title">Admin · Access posture</span>
                </div>
                <div className="hero-console-body">
                  <div className="hero-console-metrics">
                    <div>
                      <span className="hero-preview-metric-label">Identities</span>
                      <strong>12,480</strong>
                    </div>
                    <div>
                      <span className="hero-preview-metric-label">MFA coverage</span>
                      <strong>99.1%</strong>
                    </div>
                  </div>
                  <ul className="hero-preview-list">
                    <li><span>Policy · Step-up MFA</span><span className="hero-preview-badge">Enforced</span></li>
                    <li><span>SCIM · HR sync</span><span className="hero-preview-badge">Live</span></li>
                    <li><span>SSO · Finance apps</span><span className="hero-preview-badge">Healthy</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-protocols" aria-label="Supported standards">
        <div className="container">
          <p className="protocols-label reveal">Built on the standards identity teams already trust</p>
          <div className="protocols-row reveal">
            {protocols.map((p) => (
              <div key={p.name} className="protocol-chip">
                <strong>{p.name}</strong>
                <span>{p.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="product">
        <div className="container">
          <div className="section-header reveal">
            <p className="section-eyebrow">Identity control plane</p>
            <h2>How WardSeal governs access end to end</h2>
            <p>
              Three coordinated layers — authentication, authorization, and provisioning —
              so every access decision is intentional and attributable.
            </p>
          </div>
          <div className="flow-grid">
            {controlPlane.map((item, index) => (
              <article key={item.step} className="flow-card reveal">
                <div className="flow-step">{item.step}</div>
                <div className="flow-icon" aria-hidden="true">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
                {index < controlPlane.length - 1 && (
                  <div className="flow-connector" aria-hidden="true">
                    <ArrowRight size={16} />
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-muted" id="capabilities">
        <div className="container">
          <div className="section-header reveal">
            <p className="section-eyebrow">Capabilities</p>
            <h2>Everything an identity team needs — without the tool sprawl</h2>
            <p>
              Replace fragmented SSO, MFA, and directory scripts with one operable platform
              your security and engineering teams can run together.
            </p>
          </div>
          <div className="feature-grid">
            {capabilities.map((f) => (
              <article key={f.title} className="feature-card reveal">
                <div className="feature-icon" aria-hidden="true">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
                <ul className="feature-details">
                  {f.points.map((text) => (
                    <li key={text}>
                      <CheckCircle2 size={14} aria-hidden="true" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="platform">
        <div className="container">
          <div className="section-header reveal">
            <p className="section-eyebrow">Why WardSeal</p>
            <h2>Identity infrastructure worthy of the enterprise</h2>
            <p>
              Designed for organizations that treat identity as a platform of record —
              not a collection of point products.
            </p>
          </div>
          <div className="pillar-grid">
            {pillars.map((p) => (
              <article key={p.title} className="pillar-card reveal">
                <div className="pillar-icon" aria-hidden="true">{p.icon}</div>
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-cta" id="get-started">
        <div className="container">
          <div className="cta-banner reveal">
            <div className="cta-icon" aria-hidden="true">
              <Activity size={28} />
            </div>
            <h2>Put identity under one seal of control</h2>
            <p>
              Deploy WardSeal, connect your applications, and establish a single source of truth
              for who can access what — and why.
            </p>
            <div className="cta-actions">
              <a className="btn btn-accent btn-lg" href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>
                Request access <ArrowRight size={18} aria-hidden="true" />
              </a>
              <a className="btn btn-outline btn-lg" href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer">
                Review documentation
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
