import { useState } from 'react'
import { ArrowRight, ArrowUpRight } from 'lucide-react'
import siteConfig from '../siteConfig'
import SealMark from '../components/SealMark'

const { consoleBaseUrl, idBaseUrl } = siteConfig
const loginRedirectUri = encodeURIComponent(`${consoleBaseUrl}/dashboard`)
const signupHref = `${idBaseUrl}/signup?redirect_uri=${loginRedirectUri}`
const loginHref = `${idBaseUrl}/login?redirect_uri=${loginRedirectUri}`

const protocols = [
  { name: 'OpenID Connect', spec: 'Core 1.0 with PKCE' },
  { name: 'SAML 2.0', spec: 'IdP and SP initiated federation' },
  { name: 'SCIM 2.0', spec: 'RFC 7643 and 7644 provisioning' },
  { name: 'WebAuthn', spec: 'FIDO2 passkeys and security keys' },
  { name: 'OAuth 2.1', spec: 'Delegated authorization' },
  { name: 'SPIFFE', spec: 'mTLS identities for workloads' },
]

const controlPlaneSteps = [
  {
    title: 'Authenticate',
    desc: 'People sign in once with a passkey, adaptive MFA or your SAML provider. WardSeal issues a signed, short-lived session.',
  },
  {
    title: 'Authorize',
    desc: 'Each request is checked against roles, groups and network rules at the moment it happens, so old grants do not linger.',
  },
  {
    title: 'Provision',
    desc: 'SCIM keeps Okta, Google Workspace, your HR system and internal services in step. Removing someone removes their access.',
  },
]

const tabFeatures = {
  sso: {
    label: 'Single sign-on',
    title: 'One sign-in for workforce and customer apps',
    desc: 'Federate every application behind one identity provider that you control.',
    points: [
      'SAML 2.0 and OIDC, started from the IdP or the app',
      'Passkey and security key enrollment for every user',
      'Step-up MFA when the network or device looks unfamiliar',
      'Revoke a session everywhere from one place',
    ],
    file: 'verify.ts',
    code: `const session = await wardseal.verifyToken(token, {
  audience: "manage.wardseal.local",
  requireMFA: true,
  maxAge: "8h",
});

// { sub: "usr_9981", mfa: "webauthn", role: "admin" }`,
  },
  scim: {
    label: 'SCIM provisioning',
    title: 'Directories that keep themselves current',
    desc: 'Joiners, movers and leavers flow from your source of truth without spreadsheets.',
    points: [
      'RFC 7643 and 7644 endpoints for users and groups',
      'Deprovisioning closes access as soon as the HR record changes',
      'Schema extensions for department, manager and team',
      'Every SCIM payload logged, delivered or rejected',
    ],
    file: 'POST /scim/v2/Users',
    code: `{
  "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
  "userName": "sarah.chen@northwind.io",
  "active": true,
  "groups": ["Engineering", "Infrastructure-Admin"]
}`,
  },
  zerotrust: {
    label: 'Access policy',
    title: 'Rules that look at the request, not just the role',
    desc: 'Policies weigh network, device and MFA state before a session is granted.',
    points: [
      'CIDR ranges and location rules per resource',
      'Just-in-time access requests with approval workflows',
      'Short-lived SPIFFE certificates for service-to-service calls',
      'Control plane and data plane kept apart',
    ],
    file: 'production-db.policy',
    code: `policy "ProductionDatabaseAccess" {
  enforce_ip_range       = ["10.240.0.0/16"]
  require_device_posture = "hardened"
  require_mfa            = true
  max_session_ttl        = "2h"
}`,
  },
  compliance: {
    label: 'Audit',
    title: 'A record of every decision, signed',
    desc: 'Each sign-in, token and policy change is written to a tamper-evident log.',
    points: [
      'Authentication, token issuance and admin changes all recorded',
      'Export to Splunk, Datadog, S3 or Elasticsearch',
      'Admin actions attributed with IP and user agent',
      'Scheduled posture scores and compliance reports',
    ],
    file: 'audit-event.json',
    code: `{
  "event": "identity.token.granted",
  "actor": "maya.patel@northwind.io",
  "resource": "console.admin",
  "decision": "allow",
  "signature": "ed25519:8fa10b93…"
}`,
  },
}

const decisionSteps = [
  { time: '09:41:02.118', title: 'Passkey verified', meta: 'WebAuthn · YubiKey 5C NFC' },
  { time: '09:41:02.131', title: 'Policy ProductionDatabaseAccess', meta: 'IP 10.240.4.17 in range · device hardened · MFA' },
  { time: '09:41:02.140', title: 'Session issued', meta: 'OIDC · expires in 2h' },
]

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('sso')
  const tab = tabFeatures[activeTab]

  return (
    <main className="landing-main">
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <h1 className="hero-title">Every sign-in decided, signed and on the record</h1>
            <p className="hero-subtitle">
              WardSeal runs SSO, passkeys, SCIM provisioning and access policy for your people and services, and writes each decision to a signed audit log
            </p>
            <div className="hero-cta">
              <a className="btn btn-accent btn-lg" href={signupHref}>
                Request access
                <ArrowRight size={16} strokeWidth={1.75} />
              </a>
              <a className="btn btn-outline btn-lg" href={loginHref}>
                Sign in
              </a>
            </div>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="record">
              <div className="record-head">
                <div>
                  <p className="record-label">Access decision</p>
                  <p className="record-id">evt_7f3a21c9</p>
                </div>
                <span className="record-outcome">Allowed</span>
              </div>

              <div className="record-subject">
                <span className="record-avatar">MP</span>
                <div>
                  <p className="record-name">Maya Patel</p>
                  <p className="record-meta">maya.patel@northwind.io → prod-postgres-eu</p>
                </div>
              </div>

              <ol className="record-steps">
                {decisionSteps.map((s, i) => (
                  <li key={s.title} style={{ '--i': i }}>
                    <span className="record-step-dot" />
                    <div className="record-step-body">
                      <p className="record-step-title">{s.title}</p>
                      <p className="record-step-meta">{s.meta}</p>
                    </div>
                    <span className="record-step-time">{s.time}</span>
                  </li>
                ))}
              </ol>

              <div className="record-foot">
                <span className="seal-chip">ed25519:8fa1…0b93</span>
                <span className="record-foot-note">Appended to audit log · 14 Nov, 09:41 UTC</span>
              </div>

              <SealMark className="record-seal" />
            </div>
          </div>
        </div>
      </section>

      <section className="section section-protocols" id="protocols" aria-labelledby="protocols-title">
        <div className="container protocols-layout">
          <div>
            <h2 id="protocols-title" className="section-title-sm">Built on open standards</h2>
            <p className="section-lede">Bring your existing apps and directories. Nothing is locked to WardSeal</p>
          </div>
          <dl className="protocols-grid">
            {protocols.map((p) => (
              <div key={p.name} className="protocol-item">
                <dt>{p.name}</dt>
                <dd>{p.spec}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="section" id="architecture" aria-labelledby="architecture-title">
        <div className="container">
          <div className="section-header">
            <h2 id="architecture-title">How a request moves through WardSeal</h2>
            <p>Three steps that usually live in three tools, handled in one place</p>
          </div>

          <ol className="steps">
            {controlPlaneSteps.map((step, idx) => (
              <li key={step.title} className="step">
                <span className="step-num">{idx + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-capabilities" id="capabilities" aria-labelledby="capabilities-title">
        <div className="container">
          <div className="section-header">
            <h2 id="capabilities-title">What security and platform teams run on it</h2>
            <p>Workforce access, service-to-service identity and the evidence your auditors ask for</p>
          </div>

          <div className="tabs" role="tablist" aria-label="Capabilities">
            {Object.entries(tabFeatures).map(([key, t]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={activeTab === key}
                aria-controls="capabilities-panel"
                onClick={() => setActiveTab(key)}
                className={`tab ${activeTab === key ? 'active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="tab-panel" id="capabilities-panel" role="tabpanel">
            <div className="tab-copy">
              <h3>{tab.title}</h3>
              <p className="tab-desc">{tab.desc}</p>
              <ul className="tab-points">
                {tab.points.map((pt) => (
                  <li key={pt}>{pt}</li>
                ))}
              </ul>
              <a className="text-link" href={signupHref}>
                Try it in a sandbox
                <ArrowRight size={14} strokeWidth={1.75} />
              </a>
            </div>

            <div className="code-card">
              <div className="code-card-header">{tab.file}</div>
              <pre className="code-body"><code>{tab.code}</code></pre>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-deployment" aria-labelledby="deploy-title">
        <div className="container deployment">
          <div className="deployment-text">
            <h2 id="deploy-title">Run it in your cluster, or ours</h2>
            <p>
              Install WardSeal on your own Kubernetes with the Helm chart, including air-gapped environments, or let us run a dedicated instance for you
            </p>
            <p className="deployment-tags">Kubernetes · Helm · Air-gapped installs · Your region</p>
          </div>
          <div className="terminal">
            <div className="terminal-header">zsh · helm</div>
            <div className="terminal-content">
              <p><span className="prompt">$</span> helm repo add wardseal https://charts.wardseal.com</p>
              <p><span className="prompt">$</span> helm repo update</p>
              <p><span className="prompt">$</span> helm install wardseal wardseal/control-plane \</p>
              <p className="indent">--namespace wardseal-system \</p>
              <p className="indent">--set security.fido2=enabled</p>
              <p className="terminal-out">STATUS: deployed · REVISION: 1</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-cta" id="get-started" aria-labelledby="cta-title">
        <div className="container">
          <div className="cta-panel">
            <div>
              <h2 id="cta-title">Put identity under one seal</h2>
              <p>Start with SSO for one app, then bring in directories and policies when you are ready</p>
            </div>
            <div className="cta-actions">
              <a className="btn btn-light btn-lg" href={signupHref}>
                Request access
                <ArrowRight size={16} strokeWidth={1.75} />
              </a>
              <a className="btn btn-ghost-light btn-lg" href="https://github.com/dhawalhost/wardseal" target="_blank" rel="noreferrer">
                Read the docs
                <ArrowUpRight size={16} strokeWidth={1.75} />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
