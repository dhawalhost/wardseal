import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, ShieldCheck, Lock, Globe, Zap } from 'lucide-react';
import { ModeToggle } from '@/components/mode-toggle';

const Landing: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            {/* Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-border/40 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center bg-primary/10 rounded-lg">
                        <img src="/wardseal.svg" alt="WardSeal" className="w-6 h-6 object-contain" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">WardSeal Identity</span>
                </div>
                <div className="flex items-center gap-4">
                    <ModeToggle />
                    <Button variant="ghost" onClick={() => navigate('/login')}>Sign In</Button>
                    <Button onClick={() => navigate('/signup')}>Get Started</Button>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1 flex flex-col">
                <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20 lg:py-32 bg-gradient-to-b from-background to-muted/20">
                    <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80 shadow-sm mb-4">
                            v1.0 Now Available
                        </div>
                        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-foreground">
                            Identity Infrastructure <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">for the Modern Enterprise</span>
                        </h1>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                            Open source Identity and Access Management (IAM).
                            Single Sign-On, Multi-Factor Authentication, and Identity Governance in one unified platform.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                            <Button size="lg" className="px-8 h-12 text-base shadow-lg shadow-primary/20" onClick={() => navigate('/signup')}>
                                Start for Free <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                            <Button size="lg" variant="outline" className="px-8 h-12 text-base" onClick={() => window.open('https://github.com/dhawalhost/wardseal', '_blank')}>
                                View on GitHub
                            </Button>
                        </div>
                    </div>
                </section>

                {/* Features Grid */}
                <section className="py-20 px-6 bg-muted/30 border-t border-border/40">
                    <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<ShieldCheck className="w-10 h-10 text-primary" />}
                            title="Enterprise SSO"
                            description="Secure access to all your apps with OIDC and SAML 2.0 support. Built-in multi-tenancy."
                        />
                        <FeatureCard
                            icon={<Lock className="w-10 h-10 text-primary" />}
                            title="Zero Trust Security"
                            description="Device posture checks, continuous access evaluation, and risk-based authentication."
                        />
                        <FeatureCard
                            icon={<Globe className="w-10 h-10 text-primary" />}
                            title="Identity Governance"
                            description="Automated access reviews, request workflows, and audit logging for comprehensive compliance."
                        />
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-border/40 text-center text-sm text-muted-foreground bg-background">
                <p>&copy; {new Date().getFullYear()} WardSeal Identity. Open Source (Apache 2.0).</p>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="p-6 rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="mb-4 p-3 bg-primary/5 rounded-xl w-fit">{icon}</div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
    </div>
);

export default Landing;
