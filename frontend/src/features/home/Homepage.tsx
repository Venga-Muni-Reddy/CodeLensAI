import React from "react";
import {
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  Terminal,
  Activity,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface HomepageProps {
  onNavigateAuth: (view: "login" | "register") => void;
  onNavigateDashboard?: () => void;
  isAuthenticated?: boolean;
}

export const Homepage: React.FC<HomepageProps> = ({
  onNavigateAuth,
  onNavigateDashboard,
  isAuthenticated = false,
}) => {
  return (
    <div className="min-h-screen bg-[#0c0e16] text-[#e2e8f0] selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Background radial glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] right-[-5%] w-[500px] h-[450px] bg-sky-500/10 rounded-full blur-[160px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[550px] h-[400px] bg-purple-600/10 rounded-full blur-[150px]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Navigation Header */}
      <header className="relative z-20 border-b border-[#1d1f28]/80 backdrop-blur-md bg-[#0c0e16]/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30">
              <Cpu className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-semibold tracking-tight text-white text-lg">CodeLens</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                AI v1.0
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <a href="#features" className="hover:text-slate-200 transition-colors">
              Features
            </a>
            <a href="#architecture" className="hover:text-slate-200 transition-colors">
              Architecture
            </a>
            <a href="#telemetry" className="hover:text-slate-200 transition-colors">
              AST Telemetry
            </a>
            <a href="#pricing" className="hover:text-slate-200 transition-colors">
              Pricing
            </a>
          </nav>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <button
                id="btn-goto-dashboard"
                onClick={onNavigateDashboard}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  id="btn-nav-login"
                  onClick={() => onNavigateAuth("login")}
                  className="text-sm font-medium text-slate-300 hover:text-white transition-colors px-3 py-1.5"
                >
                  Sign In
                </button>
                <button
                  id="btn-nav-register"
                  onClick={() => onNavigateAuth("register")}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-all shadow-lg shadow-indigo-600/30 flex items-center space-x-1.5 border border-indigo-400/20"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-20 pb-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>NOW IN PUBLIC BETA • REPOSITORY INTELLIGENCE PLATFORM</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight mb-6">
            Understand Any Codebase{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-sky-300 to-indigo-200">
              in Seconds.
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-2xl mx-auto mb-10">
            Transform complex, legacy, or distributed software repositories into interactive architectural
            telemetry, automated blast radius analysis, and deep AST graph intelligence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              id="btn-hero-start"
              onClick={() => onNavigateAuth(isAuthenticated ? "login" : "register")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center space-x-2 border border-indigo-400/25"
            >
              <span>{isAuthenticated ? "Launch Dashboard" : "Start Free with GitHub"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#telemetry"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#171923] hover:bg-[#1d202d] text-slate-300 hover:text-white font-medium text-sm transition-all border border-[#262938] flex items-center justify-center space-x-2"
            >
              <Terminal className="w-4 h-4 text-slate-400" />
              <span>Explore Telemetry Demo</span>
            </a>
          </div>

          {/* Social Proof Badges */}
          <div className="mt-10 flex items-center justify-center space-x-6 text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Multi-Tenant Workspaces</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              <span>Enterprise RBAC</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Real-Time AST Mapping</span>
            </div>
          </div>
        </div>

        {/* Codebase X-Ray / Telemetry Window Mock */}
        <div
          id="telemetry"
          className="relative max-w-5xl mx-auto rounded-2xl border border-[#232738] bg-[#11131b] shadow-2xl shadow-indigo-950/40 overflow-hidden"
        >
          {/* Window Header */}
          <div className="bg-[#151824] px-4 py-3 border-b border-[#232738] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-xs text-slate-400">
                codelens-core / ast-parser / pipeline.ts
              </span>
            </div>
            <div className="flex items-center space-x-2 font-mono text-xs text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>AST Stream Active</span>
            </div>
          </div>

          {/* Window Content: Split Editor + Graph Telemetry */}
          <div className="grid grid-cols-1 lg:grid-cols-12 font-mono text-xs">
            {/* Left: Code Snippet */}
            <div className="lg:col-span-6 p-6 border-b lg:border-b-0 lg:border-r border-[#232738] bg-[#0c0e16]/60 text-slate-300 overflow-x-auto">
              <div className="text-slate-500 mb-2">// Analyzing AST Node Hierarchy</div>
              <div className="space-y-1">
                <p>
                  <span className="text-indigo-400">import</span> {"{"} parseCodebase {"}"}{" "}
                  <span className="text-indigo-400">from</span>{" "}
                  <span className="text-emerald-400">"@codelens/ast-parser"</span>;
                </p>
                <p>
                  <span className="text-indigo-400">import</span> {"{"} computeBlastRadius {"}"}{" "}
                  <span className="text-indigo-400">from</span>{" "}
                  <span className="text-emerald-400">"@codelens/telemetry"</span>;
                </p>
                <p className="text-slate-500 mt-2">// Extract semantic symbol relationships</p>
                <p>
                  <span className="text-purple-400">export async function</span>{" "}
                  <span className="text-sky-300">analyzeCommit</span>(
                  <span className="text-amber-300">commitId</span>: <span className="text-teal-300">string</span>) {"{"}
                </p>
                <p className="pl-4">
                  <span className="text-purple-400">const</span> ast ={" "}
                  <span className="text-indigo-400">await</span> parseCodebase(commitId);
                </p>
                <p className="pl-4">
                  <span className="text-purple-400">const</span> impact ={" "}
                  <span className="text-indigo-400">await</span> computeBlastRadius(ast);
                </p>
                <p className="pl-4 text-emerald-400">
                  console.log(<span className="text-amber-300">`Mapped ${"{"}ast.totalNodes{"}"} nodes with 0 cycles`</span>);
                </p>
                <p className="pl-4">
                  <span className="text-indigo-400">return</span> impact.summary;
                </p>
                <p>{"}"}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1d1f28] flex items-center justify-between text-slate-400">
                <span className="flex items-center space-x-1.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Telemetry: 1,420ms</span>
                </span>
                <span className="text-emerald-400 font-medium">0 Warnings</span>
              </div>
            </div>

            {/* Right: Real-Time Architecture Telemetry Graph Mock */}
            <div className="lg:col-span-6 p-6 bg-[#11131b] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Topological Dependency Graph
                  </span>
                  <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Depth: 4 Levels
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-[#191c28] border border-[#282d42] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-400" />
                      <div>
                        <div className="text-slate-200 font-sans font-medium text-xs">AuthService</div>
                        <div className="text-[10px] text-slate-500 font-mono">14 dependents • 3 exports</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                      HEALTHY
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#191c28] border border-[#282d42] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-sky-400" />
                      <div>
                        <div className="text-slate-200 font-sans font-medium text-xs">ProjectWorkspaceAPI</div>
                        <div className="text-[10px] text-slate-500 font-mono">22 dependents • 6 models</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-sky-400 font-mono bg-sky-500/10 px-1.5 py-0.5 rounded">
                      ISOLATED
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[#191c28] border border-[#282d42] flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-purple-400" />
                      <div>
                        <div className="text-slate-200 font-sans font-medium text-xs">BlastRadiusCalculator</div>
                        <div className="text-[10px] text-slate-500 font-mono">7 dependents • Alg: Tarjan</div>
                      </div>
                    </div>
                    <span className="text-[10px] text-purple-400 font-mono bg-purple-500/10 px-1.5 py-0.5 rounded">
                      VERIFIED
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1d1f28] flex items-center justify-between text-[11px] text-slate-400">
                <span>Memory Footprint: 28MB</span>
                <span className="text-indigo-400 font-medium">99.8% AST Parsed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section id="features" className="py-20 px-6 max-w-7xl mx-auto border-t border-[#1d1f28]">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-white mb-4">
            Architectural Telemetry Engineered for High-Velocity Teams
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Eliminate cognitive overload when navigating unfamiliar codebases. CodeLens AI parses source trees
            into deep semantic knowledge.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl bg-[#11131b] border border-[#1f2230] hover:border-indigo-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Cpu className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Deep AST Code Intelligence</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Parse code semantics across Python, TypeScript, Go, and Java with full symbol cross-referencing and
              call graph extraction.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl bg-[#11131b] border border-[#1f2230] hover:border-sky-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6 text-sky-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Multi-Tenant Project Workspaces</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Isolate enterprise repositories, team microservices, and audit logs with granular user ownership and
              zero cross-tenant leakages.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-8 rounded-2xl bg-[#11131b] border border-[#1f2230] hover:border-purple-500/40 transition-all group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Automated Blast Radius</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Predict ripple effects across your entire dependency hierarchy before code reviews, preventing breaking
              changes in production.
            </p>
          </div>
        </div>
      </section>

      {/* Technology Ecosystem Marquee */}
      <section className="py-12 border-y border-[#1d1f28] bg-[#0e1018]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center text-xs uppercase tracking-wider text-slate-500 font-mono mb-6">
            Supported Languages & Architecture Frameworks
          </div>
          <div className="flex flex-wrap items-center justify-center gap-8 font-mono text-sm text-slate-400">
            <span className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#141722] border border-[#212433]">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>TypeScript / Node</span>
            </span>
            <span className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#141722] border border-[#212433]">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Python 3.11+</span>
            </span>
            <span className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#141722] border border-[#212433]">
              <span className="w-2 h-2 rounded-full bg-teal-400" />
              <span>Go Modules</span>
            </span>
            <span className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#141722] border border-[#212433]">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>Java / JVM</span>
            </span>
            <span className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-[#141722] border border-[#212433]">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              <span>Docker & K8s</span>
            </span>
          </div>
        </div>
      </section>

      {/* Bottom CTA Box */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-indigo-950/40 via-[#11131b] to-[#0c0e16] border border-indigo-500/30 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[90px] pointer-events-none" />
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            Ready to Map Your Code Architecture?
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-8">
            Start free today, create your multi-tenant workspaces, and unlock high-definition architectural telemetry.
          </p>
          <button
            onClick={() => onNavigateAuth("register")}
            className="px-8 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-xl shadow-indigo-600/30 inline-flex items-center space-x-2 border border-indigo-400/30"
          >
            <span>Create Free Account</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1d1f28] py-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <span className="text-slate-400 font-medium">CodeLens AI</span>
            <span>— Repository Intelligence Platform</span>
          </div>
          <div>© {new Date().getFullYear()} CodeLens AI. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};
