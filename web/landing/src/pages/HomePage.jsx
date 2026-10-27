import { useState, useEffect } from 'react'
import {
  ShieldCheck, Lock, ArrowRight, Activity, Shield, Network,
  Server, Key, Users, Fingerprint, Building2, CheckCircle2,
  KeyRound, Layers, GitBranch, Eye, Laptop, Cpu, Terminal,
  ExternalLink, Sparkles, Database, Check
} from 'lucide-react'
import siteConfig from '../siteConfig'

const { consoleBaseUrl, idBaseUrl } = siteConfig
const loginRedirectUri = encodeURIComponent(`${consoleBaseUrl}/dashboard`)

const protocols = [
  { name: 'OIDC Core 1.0', spec: 'OpenID Connect & PKCE', badge: 'Certified' },
  { name: 'SAML 2.0', spec: 'Enterprise Federation', badge: 'Supported' },
  { name: 'SCIM 2.0', spec: 'RFC 7643 / 7644 Sync', badge: 'Automated' },
  { name: 'WebAuthn / Passkeys', spec: 'FIDO2 Passwordless', badge: 'Hardware' },
  { name: 'SPIFFE / SPIRE', spec: 'mTLS Workload Identity', badge: 'Cloud Native' },
  { name: 'OAuth 2.1', spec: 'Delegated Authorization', badge: 'Hardened' },
]

const controlPlaneSteps = [
  {
    step: '01',
    icon: <KeyRound size={24} />,
    title: 'Authenticate',
    subtitle: 'Zero-Password & SSO Gateway',
    desc: 'Verify users once with FIDO2 hardware passkeys, adaptive MFA, or enterprise SAML — then issue cryptographically signed sessions.',
    badge: 'FIDO2 / WebAuthn',
  },
  {
    step: '02',
    icon: <Shield size={24} />,
    title: 'Authorize',
    subtitle: 'Dynamic Policy Engine',
    desc: 'Evaluate RBAC, groups, and IP geofencing at request time. Least privilege is continuously enforced without stale permissions.',
    badge: 'Context-Aware',
  },
  {
    step: '03',
    icon: <GitBranch size={24} />,
    title: 'Provision',
    subtitle: 'Bi-directional SCIM 2.0',
    desc: 'Synchronize directories across HRIS, Okta, Google Workspace, and internal microservices with instant joiner-mover-leaver propagation.',
    badge: 'Real-time Sync',
  },
]

const tabFeatures = {
  sso: {
    title: 'Workforce & Customer SSO',
    desc: 'Federate logins across all company applications with one unified, hardened identity provider.',
    points: [
      'Universal IdP and SP-initiated SAML 2.0 & OIDC flows',
      'FIDO2 WebAuthn passkey enrollment with zero phishing vulnerability',
      'Adaptive step-up MFA triggered by anomalous network context',
      'Centralized session revocation across cloud & on-premise services',
    ],
    code: `// OIDC Session Verification
const session = await wardseal.verifyToken(token, {
  audience: "manage.wardseal.local",
  requireMFA: true,
  maxAge: "8h"
});
// Result: { sub: "usr_9981", mfa: "webauthn_fido2", role: "SuperAdmin" }`,
  },
  scim: {
    title: 'Automated SCIM 2.0 Mesh',
    desc: 'Eliminate manual access spreadsheets with real-time directory synchronization and lifecycle automation.',
    points: [
      'RFC 7643 / 7644 compliant REST endpoints for Users & Groups',
      'Instant deprovisioning closes leaver access vulnerabilities in milliseconds',
      'Custom schema extension support for department, manager, and team attributes',
      'Audit log trail for every SCIM payload delivered or rejected',
    ],
    code: `// SCIM 2.0 Inbound Provisioning Webhook
POST /v2/scim/Users
{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "sarah.chen@enterprise.io",
  "active": true,
  "groups": ["Engineering", "Infrastructure-Admin"]
}`,
  },
  zerotrust: {
    title: 'Continuous Zero-Trust Guardrails',
    desc: 'Contextual access policies that evaluate IP ranges, client certificates, and posture before granting entry.',
    points: [
      'CIDR subnet boundary enforcement and geographical anomaly rejection',
      'Just-in-Time (JIT) access requests with automated approval workflows',
      'SPIFFE/SPIRE compatible workload identities with short-lived mTLS X.509 certs',
      'Complete separation of control plane and data plane communications',
    ],
    code: `// WardSeal Policy Rule Engine
policy "ProductionDatabaseAccess" {
  enforce_ip_range = ["10.240.0.0/16", "192.168.1.0/24"]
  require_device_posture = "hardened"
  require_mfa = true
  max_session_ttl = "2h"
}`,
  },
  compliance: {
    title: 'Immutable Compliance & Audit Trails',
    desc: 'Always be audit-ready for SOC 2 Type II, ISO 27001, and HIPAA with cryptographically signed logs.',
    points: [
      'Every authentication decision, token issuance, and policy change is logged',
      'Tamper-evident log export to Splunk, Datadog, AWS S3, or Elasticsearch',
      'Granular admin activity attribution with full IP and user-agent context',
      'Scheduled posture score calculations and automated compliance reports',
    ],
    code: `// Audit Log Stream
{
  "event": "identity.token.granted",
  "actor": "dhawal@wardseal.local",
  "resource": "console.admin",
  "ip": "127.0.0.1",
  "decision": "ALLOW",
  "signature": "ed25519:8fa10b93..."
}`,
  },
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('sso')
  const [authStage, setAuthStage] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setAuthStage((prev) => (prev + 1) % 3)
    }, 3500)
    return () => clearInterval(timer)
  }, [])

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
    <main className="landing-main">
      {/* ── HERO SECTION ── */}
      <section className="hero">
        <div className="container hero-content">
          <div className="hero-text reveal">
            <div className="hero-badge">
              <span className="badge-pulse-dot" />
              <span>Zero-Trust Identity Fabric · v2.4</span>
            </div>

            <h1 className="hero-title">
              The Unified Control Plane for <span className="highlight-text">Enterprise Identity</span>
            </h1>

            <p className="hero-subtitle">
              Authenticate workforce, automate SCIM directory lifecycles, and enforce continuous zero-trust security policies across all cloud infrastructure.
            </p>

            <div className="hero-cta">
              <a className="btn btn-accent btn-lg" href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>
                Request Access
                <ArrowRight size={18} />
              </a>
              <a className="btn btn-outline btn-lg" href={`${idBaseUrl}/login?redirect_uri=${loginRedirectUri}`}>
                Sign In to Console
              </a>
            </div>

            <div className="hero-trust">
              <div className="trust-indicator">
                <ShieldCheck size={16} /> SOC 2 Type II
              </div>
              <div className="trust-dot" />
              <div className="trust-indicator">
                <CheckCircle2 size={16} /> OIDC &amp; FIDO2 Certified
              </div>
              <div className="trust-dot" />
              <div className="trust-indicator">
                <Server size={16} /> Cloud &amp; Self-Hosted
              </div>
            </div>
          </div>

          {/* Interactive Hero Visual Simulator */}
          <div className="hero-visual reveal" aria-hidden="true">
            <div className="hero-stage">
              <div className="hero-stage-glow" />

              {/* Card 1: Live Authentication Prompt */}
              <div className="hero-auth-card hero-float">
                <div className="hero-auth-brand">
                  <img src="/wardseal.svg" alt="" className="hero-auth-logo" />
                  <span>WardSeal Auth</span>
                </div>
                <p className="hero-auth-kicker">Secure Authentication</p>
                <p className="hero-auth-title">FIDO2 Hardware Key Verification</p>

                <div className="hero-auth-field">
                  <Users size={14} />
                  <span>alex.turner@enterprise.io</span>
                </div>

                <div className="hero-auth-status-box">
                  {authStage === 0 && (
                    <div className="status-step active">
                      <span className="step-spinner" />
                      <span>Requesting hardware passkey...</span>
                    </div>
                  )}
                  {authStage === 1 && (
                    <div className="status-step verified">
                      <Check size={14} className="text-emerald-400" />
                      <span>WebAuthn Signature Verified</span>
                    </div>
                  )}
                  {authStage === 2 && (
                    <div className="status-step issued">
                      <Lock size={14} className="text-sky-400" />
                      <span>OIDC Session Issued (8h TTL)</span>
                    </div>
                  )}
                </div>

                <div className="hero-auth-btn">
                  {authStage === 2 ? 'Session Authenticated' : 'Verify Touch ID / YubiKey'}
                </div>

                <div className="hero-auth-sso">
                  <span>Okta SCIM</span>
                  <span>Entra ID</span>
                  <span>SPIFFE</span>
                </div>
              </div>

              {/* Verification Pulse Badge */}
              <div className="hero-link-pulse">
                <ShieldCheck size={14} />
                <span>Zero-Trust Policy: PASSED</span>
              </div>

              {/* Card 2: Live Cluster Console Posture */}
              <div className="hero-console-card hero-float-delay">
                <div className="hero-console-bar">
                  <span className="hero-preview-dot" />
                  <span className="hero-preview-dot" />
                  <span className="hero-preview-dot" />
                  <span className="hero-preview-title">Control Plane Telemetry</span>
                </div>
                <div className="hero-console-body">
                  <div className="hero-console-metrics">
                    <div>
                      <span className="hero-preview-metric-label">Identities</span>
                      <strong>14,280</strong>
                    </div>
                    <div>
                      <span className="hero-preview-metric-label">MFA Enforced</span>
                      <strong className="text-emerald-500">100%</strong>
                    </div>
                  </div>
                  <ul className="hero-preview-list">
                    <li>
                      <span>SCIM Directory Mesh</span>
                      <span className="hero-preview-badge">Active</span>
                    </li>
                    <li>
                      <span>IP Geofence Guardrail</span>
                      <span className="hero-preview-badge">Strict</span>
                    </li>
                    <li>
                      <span>Kubernetes Ingress mTLS</span>
                      <span className="hero-preview-badge">Verified</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUPPORTED STANDARDS BAR ── */}
      <section className="section section-protocols" id="protocols" aria-label="Supported standards">
        <div className="container">
          <div className="protocols-header reveal">
            <p className="protocols-label">Enterprise Interoperability Without Vendor Lock-In</p>
          </div>
          <div className="protocols-grid reveal">
            {protocols.map((p) => (
              <div key={p.name} className="protocol-card">
                <div className="protocol-card-top">
                  <strong>{p.name}</strong>
                  <span className="protocol-badge">{p.badge}</span>
                </div>
                <p className="protocol-spec">{p.spec}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3-TIER ARCHITECTURE SECTION ── */}
      <section className="section" id="architecture">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-kicker">Unified Core</span>
            <h2>How WardSeal Governs Access End to End</h2>
            <p>
              Three coordinated layers working in complete harmony — eliminating tool sprawl across identity, directories, and perimeter security.
            </p>
          </div>

          <div className="architecture-grid">
            {controlPlaneSteps.map((step, idx) => (
              <div key={step.step} className="architecture-card reveal">
                <div className="card-top-row">
                  <span className="step-pill">{step.step}</span>
                  <span className="card-badge">{step.badge}</span>
                </div>
                <div className="step-icon-wrap">{step.icon}</div>
                <h3>{step.title}</h3>
                <h4 className="step-subtitle">{step.subtitle}</h4>
                <p>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE CAPABILITIES SECTION ── */}
      <section className="section section-capabilities" id="capabilities">
        <div className="container">
          <div className="section-header reveal">
            <span className="section-kicker">Complete Feature Matrix</span>
            <h2>Engineered for Security Architects &amp; DevOps Teams</h2>
            <p>
              Everything modern engineering organizations need to govern workforce access, server-to-server microservices, and compliance requirements.
            </p>
          </div>

          <div className="capabilities-tabs-wrap reveal">
            {/* Segmented Tab Buttons */}
            <div className="capabilities-tab-nav">
              <button
                type="button"
                onClick={() => setActiveTab('sso')}
                className={`cap-tab-btn ${activeTab === 'sso' ? 'active' : ''}`}
              >
                <Fingerprint size={16} />
                <span>Single Sign-On</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('scim')}
                className={`cap-tab-btn ${activeTab === 'scim' ? 'active' : ''}`}
              >
                <GitBranch size={16} />
                <span>SCIM 2.0 Mesh</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('zerotrust')}
                className={`cap-tab-btn ${activeTab === 'zerotrust' ? 'active' : ''}`}
              >
                <Shield size={16} />
                <span>Zero-Trust Policies</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('compliance')}
                className={`cap-tab-btn ${activeTab === 'compliance' ? 'active' : ''}`}
              >
                <Layers size={16} />
                <span>Audit &amp; Governance</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="capabilities-tab-content">
              <div className="tab-left">
                <h3>{tabFeatures[activeTab].title}</h3>
                <p className="tab-desc">{tabFeatures[activeTab].desc}</p>
                <ul className="tab-points">
                  {tabFeatures[activeTab].points.map((pt) => (
                    <li key={pt}>
                      <CheckCircle2 size={16} className="point-icon" />
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
                <div className="tab-cta">
                  <a className="btn btn-accent btn-sm" href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>
                    Explore in Sandbox
                    <ArrowRight size={14} />
                  </a>
                </div>
              </div>

              <div className="tab-right">
                <div className="code-card">
                  <div className="code-card-header">
                    <div className="code-dots">
                      <span />
                      <span />
                      <span />
                    </div>
                    <span className="code-filename">spec.wardseal.ts</span>
                  </div>
                  <pre className="code-body">
                    <code>{tabFeatures[activeTab].code}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEPLOYMENT FLEXIBILITY BANNER ── */}
      <section className="section section-deployment">
        <div className="container">
          <div className="deployment-box reveal">
            <div className="deployment-text">
              <span className="deployment-kicker">Deployment Freedom</span>
              <h2>Your Cloud, Your Perimeter, Your Jurisdiction</h2>
              <p>
                Run WardSeal on your private Kubernetes clusters with our official Helm chart, or let us host your dedicated, SOC 2 compliant environment.
              </p>
              <div className="deployment-tags">
                <span>Kubernetes Native</span>
                <span>Helm Charts</span>
                <span>Air-Gapped Ready</span>
                <span>Zero Data Telemetry Leaks</span>
              </div>
            </div>
            <div className="deployment-terminal">
              <div className="terminal-header">
                <Terminal size={14} />
                <span>bash — helm install</span>
              </div>
              <div className="terminal-content">
                <p><span className="prompt">$</span> helm repo add wardseal https://charts.wardseal.com</p>
                <p><span className="prompt">$</span> helm repo update</p>
                <p><span className="prompt">$</span> helm install wardseal wardseal/control-plane \</p>
                <p className="indent">--namespace wardseal-system \</p>
                <p className="indent">--set security.fido2=enabled</p>
                <p className="success mt-2">✓ WardSeal Cluster Deployed Successfully</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HIGH IMPACT BOTTOM CTA BANNER ── */}
      <section className="section section-cta" id="get-started">
        <div className="container">
          <div className="cta-banner reveal">
            <div className="cta-glow" />
            <div className="cta-logo-wrap">
              <img src="/wardseal.svg" alt="" className="cta-shield-logo" />
            </div>
            <h2>Put Identity Under One Seal of Control</h2>
            <p>
              Deploy WardSeal, federate your enterprise directory, and enforce continuous zero-trust authorization in minutes.
            </p>
            <div className="cta-actions">
              <a className="btn btn-accent btn-lg" href={`${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`}>
                Request Access Today
                <ArrowRight size={18} />
              </a>
              <a className="btn btn-outline-white btn-lg" href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer">
                Read Developer Docs
                <ExternalLink size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
