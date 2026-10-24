import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ShieldCheck,
  FolderCheck,
  CircleCheck,
  ListChecks,
} from "lucide-react";
import { capabilities, workflow, questions } from "./content";
export function MarketingHome() {
  return (
    <div className="marketing">
      <a className="skip-link" href="#home-content">
        Skip to content
      </a>
      <header className="marketing-header">
        <div className="marketing-container marketing-header-inner">
          <Link href="/" className="brand" aria-label="MCA Software home">
            <span className="brand-symbol">
              <ShieldCheck size={22} aria-hidden="true" />
            </span>
            MCA Software
          </Link>
          <nav className="marketing-nav" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#workflow">How it works</a>
            <a href="#questions">Questions</a>
          </nav>
          <Link
            className="marketing-button marketing-button-small"
            href="/login"
          >
            Sign in <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </header>
      <main id="home-content" tabIndex={-1}>
        <section
          className="marketing-container marketing-hero"
          aria-labelledby="home-title"
        >
          <div className="marketing-hero-copy">
            <p className="marketing-eyebrow">
              <span /> BUILT FOR SECRETARIAL PRACTICE
            </p>
            <h1 id="home-title">
              Your practice.
              <br />
              <span>In clear view.</span>
            </h1>
            <p className="marketing-intro">
              Bring your companies, deadlines and team’s work into one organised
              workspace. From the first assignment to the final approval, keep
              the details connected.
            </p>
            <div className="marketing-hero-actions">
              <Link className="marketing-button" href="/login">
                Sign in to your workspace{" "}
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
              <a href="#workflow" className="marketing-text-link">
                See how it works <ArrowRight size={16} aria-hidden="true" />
              </a>
            </div>
            <p className="marketing-access-note">
              Already have an account? Your firm’s work starts here.
            </p>
          </div>
          <div
            className="marketing-workflow-card"
            aria-label="Connected work from company record to completion"
          >
            <div className="marketing-workflow-card-heading">
              <span className="marketing-small-icon">
                <FolderCheck size={23} aria-hidden="true" />
              </span>
              <div>
                <p>ONE CONNECTED WORKSPACE</p>
                <h2>Keep the whole picture.</h2>
              </div>
            </div>
            <p className="marketing-workflow-card-note">
              A place for the company, the work and the evidence behind it.
            </p>
            <ol className="marketing-flow-list">
              {[
                {
                  icon: FolderCheck,
                  title: "Company & obligations",
                  text: "A clear starting point",
                },
                {
                  icon: ListChecks,
                  title: "Tasks & documents",
                  text: "People, progress and supporting files",
                },
                {
                  icon: CircleCheck,
                  title: "Review & approval",
                  text: "Feedback before completion",
                },
              ].map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <span className="marketing-flow-icon">
                    <Icon size={21} aria-hidden="true" />
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <span>{text}</span>
                  </div>
                  <Check size={16} aria-hidden="true" />
                </li>
              ))}
            </ol>
            <div className="marketing-workflow-card-footer">
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Access through your firm account</span>
            </div>
          </div>
        </section>
        <div className="marketing-purpose-strip">
          <div className="marketing-container">
            <p>
              Less scattered information.
              <br />
              <strong>More clarity in everyday work.</strong>
            </p>
            <span>For company secretaries</span>
            <span>For practice teams</span>
            <span>For the people reviewing the work</span>
          </div>
        </div>
        <section
          id="features"
          className="marketing-container marketing-section"
          aria-labelledby="features-title"
        >
          <div className="marketing-section-heading">
            <div>
              <p className="marketing-eyebrow">THE TOOLS YOUR PRACTICE NEEDS</p>
              <h2 id="features-title">One place for the moving parts.</h2>
            </div>
            <p>
              Keep company information, daily work and review decisions
              connected as your team moves forward.
            </p>
          </div>
          <div className="marketing-feature-grid">
            {capabilities.map(({ id, icon: Icon, title, description }) => (
              <article className="marketing-feature" key={id}>
                <span className="marketing-feature-icon">
                  <Icon size={24} aria-hidden="true" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section
          id="workflow"
          className="marketing-workflow-section"
          aria-labelledby="workflow-title"
        >
          <div className="marketing-container marketing-section">
            <div className="marketing-section-heading">
              <div>
                <p className="marketing-eyebrow">A SIMPLE WAY TO WORK</p>
                <h2 id="workflow-title">
                  From an obligation
                  <br />
                  to a completed task.
                </h2>
              </div>
              <p>
                A connected process gives everyone a clear next step, with the
                context they need to take it.
              </p>
            </div>
            <ol className="marketing-steps">
              {workflow.map((step, index) => (
                <li key={step.title}>
                  <span className="marketing-step-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3>{step.title}</h3>
                  <p>{step.detail}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section
          className="marketing-container marketing-section marketing-team-section"
          aria-labelledby="team-title"
        >
          <div>
            <p className="marketing-eyebrow">CLARITY FOR EVERY ROLE</p>
            <h2 id="team-title">
              The same workspace.
              <br />
              The right responsibilities.
            </h2>
            <p>
              Keep your team working from shared records, with access and
              actions based on their role in the firm.
            </p>
            <Link href="/login" className="marketing-text-link">
              Open your firm workspace{" "}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <div className="marketing-role-list">
            {[
              [
                "Administrators",
                "Manage company records, team access and the work across your firm.",
              ],
              [
                "Managers",
                "Plan assignments, review submissions and follow progress through reports.",
              ],
              [
                "Staff",
                "Update assigned work, complete checklists and submit supporting evidence.",
              ],
            ].map(([title, description]) => (
              <article key={title}>
                <CircleCheck size={20} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section
          id="questions"
          className="marketing-container marketing-section marketing-faq"
          aria-labelledby="questions-title"
        >
          <div>
            <p className="marketing-eyebrow">BEFORE YOU SIGN IN</p>
            <h2 id="questions-title">A few useful answers.</h2>
          </div>
          <div>
            {questions.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section
          className="marketing-container marketing-closing"
          aria-labelledby="closing-title"
        >
          <div>
            <p className="marketing-eyebrow">YOUR NEXT STEP</p>
            <h2 id="closing-title">
              Give your practice
              <br />a clearer working day.
            </h2>
            <p>
              Sign in, choose your firm and pick up where your team left off.
            </p>
          </div>
          <Link
            href="/login"
            className="marketing-button marketing-button-light"
          >
            Sign in to MCA Software{" "}
            <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
        </section>
      </main>
      <footer className="marketing-container marketing-footer">
        <div>
          <Link href="/" className="brand">
            <span className="brand-symbol">
              <ShieldCheck size={20} aria-hidden="true" />
            </span>
            MCA Software
          </Link>
          <p>Company records. Connected work. Clearer practice.</p>
        </div>
        <nav aria-label="Footer navigation">
          <a href="#features">Explore features</a>
          <a href="#workflow">Our workflow</a>
          <Link href="/login">Access your workspace</Link>
        </nav>
        <p className="marketing-disclaimer">
          MCA Software is an independent practice-management application and is
          not affiliated with the Ministry of Corporate Affairs.
        </p>
      </footer>
    </div>
  );
}
