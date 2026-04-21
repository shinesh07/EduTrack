import { Link } from 'react-router-dom';

const quickStats = [
  { value: '3', label: 'Role-based portals' },
  { value: 'JWT', label: 'Protected access' },
  { value: 'PDF', label: 'Transcript download' },
];

const modules = [
  {
    title: 'Verified onboarding',
    text: 'Students and teachers can sign up, verify email, and enter the right portal.',
  },
  {
    title: 'Semester setup',
    text: 'Admins manage semester courses, assignments, and promotion windows.',
  },
  {
    title: 'Attendance workflow',
    text: 'Students can mark attendance from their portal, and teachers can review or correct records when needed.',
  },
  {
    title: 'Results and records',
    text: 'Students can review results, academic progress, and transcript access.',
  },
];

const roles = [
  {
    title: 'Admin',
    blurb: 'Full control over users, semester structure, attendance, and results.',
    items: ['Manage teachers and students', 'Assign students to teachers', 'Review records and settings'],
  },
  {
    title: 'Teacher',
    blurb: 'A focused workspace for assigned classes, attendance, and marks.',
    items: ['View semester courses', 'Review or correct attendance records', 'Publish results for assigned students'],
  },
  {
    title: 'Student',
    blurb: 'A personal academic portal with attendance, grades, and documents.',
    items: ['Mark today’s attendance', 'View semester-wise results', 'Download transcript PDF'],
  },
];

const previewCards = [
  {
    title: 'Admin preview',
    badge: 'Admin',
    shell: 'bg-navy-900 text-white border-white/10',
    badgeTone: 'bg-gold-500 text-navy-900',
    items: ['Teacher and student management', 'Semester setup and promotion control', 'Attendance and result oversight'],
    footer: 'A central view for institutional operations.',
  },
  {
    title: 'Teacher preview',
    badge: 'Teacher',
    shell: 'bg-[#f6f8fc] text-navy-900 border-navy-100',
    badgeTone: 'bg-white text-navy-700',
    items: ['Assigned semester courses only', 'Attendance review and corrections', 'Result entry for assigned students'],
    footer: 'Focused tools without admin clutter.',
  },
  {
    title: 'Student preview',
    badge: 'Student',
    shell: 'bg-[#fff8ea] text-navy-900 border-amber-200',
    badgeTone: 'bg-white text-amber-800',
    items: ['Mark today’s attendance', 'View grades and semester progress', 'Download transcript PDF'],
    footer: 'A self-service academic snapshot.',
  },
];

const footerGroups = [
  {
    title: 'Platform',
    links: [
      { label: 'Modules', href: '#modules' },
      { label: 'Roles', href: '#roles' },
      { label: 'Footer', href: '#footer' },
    ],
  },
  {
    title: 'Access',
    links: [
      { label: 'Create account', to: '/signup' },
      { label: 'Sign in', to: '/login' },
      { label: 'Verify email', to: '/verify-email' },
    ],
  },
];

function FooterLink({ item }) {
  if (item.to) {
    return (
      <Link to={item.to} className="block text-sm text-gray-500 transition-colors hover:text-navy-900">
        {item.label}
      </Link>
    );
  }

  return (
    <a href={item.href} className="block text-sm text-gray-500 transition-colors hover:text-navy-900">
      {item.label}
    </a>
  );
}

export default function Home() {
  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gray-50 text-navy-900">
      <section className="relative overflow-hidden bg-navy-900">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              'radial-gradient(circle at 25% 25%, #f0a500 0%, transparent 45%), radial-gradient(circle at 78% 24%, #3452a0 0%, transparent 40%)',
          }}
        />
        <svg className="absolute inset-0 h-full w-full opacity-5" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="home-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#home-grid)" />
        </svg>

        <div className="relative mx-auto max-w-7xl px-6 pb-24 pt-6 lg:px-10 lg:pb-28">
          <header className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold-500 text-lg">🎓</div>
              <div>
                <p className="font-display text-2xl font-semibold text-white">EduTrack</p>
                <p className="text-xs uppercase tracking-[0.28em] text-navy-300">Management System</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-7 text-sm text-navy-200 lg:flex">
              <a href="#modules" className="transition-colors hover:text-white">Modules</a>
              <a href="#roles" className="transition-colors hover:text-white">Roles</a>
              <a href="#footer" className="transition-colors hover:text-white">Contact</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="rounded-xl bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
              >
                Get Started
              </Link>
            </div>
          </header>

          <div className="pt-14 lg:pt-20">
            <div className="max-w-3xl animate-fade-in">
              <div className="inline-flex rounded-full border border-gold-500/20 bg-gold-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-gold-400">
                Attendance, results, and academic records
              </div>
              <h1 className="mt-7 font-display text-5xl leading-[0.96] text-white sm:text-6xl">
                A cleaner way to run
                <span className="block text-gold-500">academic operations.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-navy-100 sm:text-lg">
                EduTrack gives admins, teachers, and students one connected system for onboarding,
                attendance, results, semester control, and transcript access.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-navy-900 transition hover:bg-navy-50"
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open Dashboard
                </Link>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                {quickStats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5 backdrop-blur-sm">
                    <p className="text-3xl font-display font-bold text-white">{item.value}</p>
                    <p className="mt-2 text-sm text-navy-100">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-14 animate-fade-in">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-navy-300">Platform Preview</p>
                  <p className="mt-2 font-display text-3xl text-white sm:text-4xl">Split by role, easier to scan</p>
                </div>
                <p className="max-w-xl text-sm leading-7 text-navy-200">
                  Each preview card highlights how the product feels for admins, teachers, and students without forcing everything into one large panel.
                </p>
              </div>

              <div className="mt-8 grid gap-5 lg:grid-cols-3">
                {previewCards.map((card) => (
                  <article
                    key={card.title}
                    className={`rounded-[28px] border p-6 shadow-xl shadow-black/10 backdrop-blur-sm ${card.shell}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-display text-2xl font-semibold">{card.title}</p>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${card.badgeTone}`}>
                        {card.badge}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {card.items.map((item) => (
                        <div
                          key={item}
                          className={`rounded-2xl px-4 py-3 text-sm ${
                            card.badge === 'Admin'
                              ? 'bg-white/6 text-navy-100'
                              : 'bg-white text-gray-600 shadow-sm'
                          }`}
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <div
                      className={`mt-5 rounded-2xl px-4 py-3 text-sm ${
                        card.badge === 'Admin'
                          ? 'border border-white/10 bg-white/5 text-navy-100'
                          : 'border border-black/5 bg-white/70 text-gray-600'
                      }`}
                    >
                      {card.footer}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 pb-16 pt-20 lg:px-10 lg:pt-24">
        <section id="modules" className="scroll-mt-24">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-navy-500">Core Modules</p>
              <h2 className="mt-3 font-display text-4xl text-navy-900 sm:text-5xl">
                Everything important, without the extra noise.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
              The home page now focuses on the real product modules already present in the app.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-4">
            {modules.map((item) => (
              <article key={item.title} className="card p-7">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-900 text-white">
                  ✦
                </div>
                <h3 className="text-2xl font-display font-semibold text-navy-900">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-gray-600">{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="roles" className="mt-24 scroll-mt-24">
          <div className="rounded-[34px] bg-navy-900 px-6 py-11 text-white sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold-400">Three Portals</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">
                Different responsibilities, one connected system.
              </h2>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-3">
              {roles.map((role) => (
                <article key={role.title} className="rounded-[28px] border border-white/10 bg-white/5 p-7 backdrop-blur-sm">
                  <span className="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-gold-400">
                    {role.title}
                  </span>
                  <p className="mt-5 text-lg leading-7 text-white">{role.blurb}</p>

                  <div className="mt-5 space-y-3 text-sm text-navy-100">
                    {role.items.map((item) => (
                      <div key={item} className="flex items-start gap-3">
                        <span className="mt-1 text-gold-400">•</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-24">
          <div className="rounded-[34px] border border-navy-100 bg-white px-6 py-10 shadow-sm sm:px-8 lg:px-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-navy-500">Start Using EduTrack</p>
                <h2 className="mt-3 font-display text-4xl text-navy-900 sm:text-5xl">
                  Ready to move from spreadsheets to one clean workflow?
                </h2>
                <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
                  Create an account, verify access, and enter the right dashboard for your role.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-navy-800"
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-navy-100 bg-white px-6 py-3 text-sm font-semibold text-navy-900 transition hover:bg-navy-50"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>

        <footer
          id="footer"
          className="mt-10 rounded-[30px] border border-navy-100 bg-[linear-gradient(180deg,#f8fbff_0%,#eef3fb_100%)] px-6 py-8 shadow-sm sm:px-8"
        >
          <div className="grid gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-lg text-white">
                  🎓
                </div>
                <div>
                  <p className="font-display text-2xl font-semibold text-navy-900">EduTrack</p>
                  <p className="text-xs uppercase tracking-[0.28em] text-navy-500">Academic Operations Platform</p>
                </div>
              </div>

              <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600">
                Built for admins, teachers, and students who need one reliable place for attendance,
                results, semester setup, and academic records.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              {footerGroups.map((group) => (
                <div key={group.title}>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-navy-700">{group.title}</p>
                  <div className="mt-4 space-y-3">
                    {group.links.map((item) => (
                      <FooterLink key={item.label} item={item} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-navy-100 pt-4 text-sm text-gray-500">
            {currentYear} EduTrack. Professional academic management for daily campus operations.
          </div>
        </footer>
      </main>
    </div>
  );
}
