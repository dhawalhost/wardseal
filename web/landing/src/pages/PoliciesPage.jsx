import { Link } from 'react-router-dom';
import { ArrowUpRight, ChevronRight } from 'lucide-react';

const docs = 'https://github.com/dhawalhost/wardseal/blob/main/docs/policies';

const policyGroups = [
  {
    id: 'privacy',
    title: 'Privacy and terms',
    desc: 'The legal terms and privacy commitments that apply to everyone using WardSeal',
    links: [
      { label: 'Privacy policy', to: '/privacy-policy' },
      { label: 'Terms of service', to: '/terms-of-service' },
      { label: 'Cookie policy', to: '/cookies' },
      { label: 'Acceptable use policy', to: `${docs}/acceptable-use-policy.md`, external: true },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    desc: 'How we run security, handle incidents and take vulnerability reports',
    links: [
      { label: 'Security and trust', to: `${docs}/security-and-trust.md`, external: true },
      { label: 'Incident and breach notification', to: `${docs}/incident-response-and-breach-notification-policy.md`, external: true },
      { label: 'Vulnerability disclosure', to: `${docs}/vulnerability-disclosure-policy.md`, external: true },
    ],
  },
  {
    id: 'enterprise',
    title: 'Enterprise and DPA',
    desc: 'Contractual and operational data processing terms for business customers',
    links: [
      { label: 'Data processing addendum', to: `${docs}/data-processing-addendum-dpa.md`, external: true },
      { label: 'Subprocessors and transfers', to: `${docs}/subprocessors-and-international-transfers.md`, external: true },
      { label: 'Retention and deletion', to: `${docs}/data-retention-and-deletion-policy.md`, external: true },
      { label: 'Service level policy', to: `${docs}/service-level-policy-sla.md`, external: true },
    ],
  },
  {
    id: 'regional',
    title: 'Regional addenda',
    desc: 'Overlays for India, the United States and the EU/EEA',
    links: [
      { label: 'India DPDP addendum', to: `${docs}/addenda/india-dpdp-addendum.md`, external: true },
      { label: 'US state privacy addendum', to: `${docs}/addenda/us-state-privacy-addendum.md`, external: true },
      { label: 'EU/EEA addendum', to: `${docs}/addenda/eu-eea-privacy-and-dpa-addendum.md`, external: true },
      { label: 'Jurisdiction matrix', to: `${docs}/jurisdiction-compliance-matrix-india-us-eu.md`, external: true },
    ],
  },
];

export default function PoliciesPage() {
  return (
    <main className="policy-index-page">
      <section className="section policy-index">
        <div className="container">
          <div className="section-header">
            <span className="tag">Legal</span>
            <h1 className="policy-title">Policies and agreements</h1>
            <p>Every agreement, privacy commitment and security policy that governs WardSeal, in one place</p>
          </div>

          <div className="policy-groups">
            {policyGroups.map((group) => (
              <article key={group.id} className="policy-group">
                <div>
                  <h2 className="policy-group-title">{group.title}</h2>
                  <p className="policy-group-desc">{group.desc}</p>
                </div>
                <ul className="policy-links">
                  {group.links.map((link) => (
                    <li key={link.to}>
                      {link.external ? (
                        <a href={link.to} target="_blank" rel="noreferrer" className="policy-link">
                          {link.label}
                          <ArrowUpRight size={16} strokeWidth={1.5} />
                        </a>
                      ) : (
                        <Link to={link.to} className="policy-link">
                          {link.label}
                          <ChevronRight size={16} strokeWidth={1.5} />
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-cta">
        <div className="container">
          <div className="cta-panel">
            <div>
              <h2>Questions about security or compliance</h2>
              <p>Write to the security team for questionnaires, the whitepaper or a call with an engineer</p>
            </div>
            <div className="cta-actions">
              <a href="mailto:security@wardseal.com" className="btn btn-light btn-lg">Email security</a>
              <a href="https://github.com/dhawalhost/wardseal" className="btn btn-ghost-light btn-lg">View the source</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
