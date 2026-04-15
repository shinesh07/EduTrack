import { Link } from 'react-router-dom';

const featureCards = [
  {
    title: 'Attendance Without Spreadsheet Chaos',
    description:
      'Teachers can mark classes in bulk, students can track today’s attendance, and admins can review the complete record with filters.',
    accent: 'from-gold-500/20 to-gold-400/5',
  },
  {
    title: 'Results That Stay Organized',
    description:
      'Store subject-wise marks, calculate grades clearly, and let students review performance semester by semester.',
    accent: 'from-navy-400/20 to-navy-200/5',
  },
  {
    title: 'Verification and Access Control',
    description:
      'Email verification, role-based access, teacher assignment, and secure authentication keep each workflow in the right hands.',
    accent: 'from-emerald-400/20 to-emerald-200/5',
  },
];

const roleCards = [
  {
    role: 'Admin',
    icon: '🛡️',
    blurb: 'Runs the academic system from one place.',
    items: ['Create teachers and students', 'Assign students to teachers', 'Review attendance and results'],
  },
  {
    role: 'Teacher',
    icon: '👩‍🏫',
    blurb: 'Works with only the students assigned to them.',
    items: ['Mark attendance by subject', 'Add and manage results', 'Monitor class progress quickly'],
  },
  {
    role: 'Student',
    icon: '🎓',
    blurb: 'Gets a clean personal academic portal.',
    items: ['Check attendance history', 'See semester-wise results', 'Download transcript PDF'],
  },
];

const highlights = [
  'Public signup for teachers and students',
  'Verification email resend support',
  'Teacher course/subject mapping',
  'Transcript export using PDFKit',
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f3f5fb] text-navy-900 overflow-x-hidden">
      <section className="relative isolate overflow-hidden bg-navy-900">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(240,165,0,0.28),_transparent_32%),radial-gradient(circle_at_80%_20%,_rgba(93,122,191,0.28),_transparent_28%),linear-gradient(135deg,_#0a1628_0%,_#152465_55%,_#0a1628_100%)]" />
        <div className="absolute inset-0 opacity-10 [background-image:linear-gradient(rgba(255,255,255,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto max-w-7xl px-6 py-6 lg:px-10">
          <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-3 backdrop-blur-sm">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-500 text-xl shadow-lg shadow-gold-500/20">
                🎓
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-white">EduTrack</p>
                <p className="text-xs uppercase tracking-[0.32em] text-navy-200">Student Management System</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-6 text-sm text-navy-100 md:flex">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#roles" className="hover:text-white transition-colors">Roles</a>
              <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden rounded-full border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 sm:inline-flex"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="inline-flex rounded-full bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-900 shadow-lg shadow-gold-500/25 transition hover:bg-gold-400"
              >
                Get Started
              </Link>
            </div>
          </header>

          <div className="grid items-center gap-12 pb-16 pt-14 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-20">
            <div className="max-w-2xl animate-fade-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-gold-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold-400">
                Attendance, Results, and Verification in one place
              </div>
              <h1 className="font-display text-5xl leading-[0.95] text-white sm:text-6xl lg:text-7xl">
                Academic operations
                <span className="block text-gold-500">that feel clear, fast, and modern.</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-navy-100 sm:text-lg">
                EduTrack gives administrators, teachers, and students a single workspace for attendance,
                results, verification, and transcript access without the usual dashboard clutter.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-navy-900 transition hover:bg-navy-50"
                >
                  Create an Account
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Open Dashboard
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-2">
                {highlights.map((item) => (
                  <div
                    key={item}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-navy-100 backdrop-blur-sm"
                  >
                    <span className="mr-2 text-gold-400">•</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative animate-fade-in">
              <div className="absolute -left-8 top-12 hidden h-24 w-24 rounded-full bg-gold-500/20 blur-2xl lg:block" />
              <div className="absolute -right-8 bottom-10 hidden h-28 w-28 rounded-full bg-navy-300/20 blur-2xl lg:block" />

              <div className="relative rounded-[32px] border border-white/10 bg-white/8 p-4 shadow-2xl shadow-black/20 backdrop-blur-md">
                <div className="rounded-[28px] bg-white p-5 sm:p-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-navy-900 p-5 text-white">
                      <p className="text-xs uppercase tracking-[0.28em] text-gold-400">Live Snapshot</p>
                      <p className="mt-5 text-4xl font-semibold">3</p>
                      <p className="mt-1 text-sm text-navy-200">Role-based portals</p>
                      <div className="mt-5 flex gap-2">
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Admin</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Teacher</span>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs">Student</span>
                      </div>
                    </div>

                    <div className="rounded-3xl bg-[#f9f4e8] p-5">
                      <p className="text-xs uppercase tracking-[0.28em] text-amber-700">Signup Flow</p>
                      <p className="mt-4 text-2xl font-semibold text-navy-900">Email verification built in</p>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        New accounts receive verification links, and users can request a fresh email if needed.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-[28px] border border-navy-100 bg-[#f6f8fc] p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-navy-900">What teams use EduTrack for</p>
                        <p className="text-xs text-gray-500">Built for day-to-day academic coordination</p>
                      </div>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                        Ready
                      </span>
                    </div>

                    <div className="mt-5 space-y-3">
                      {[
                        ['Attendance management', 'Bulk teacher marking with filtered admin review'],
                        ['Result publishing', 'Semester-wise marks, grades, and student visibility'],
                        ['Transcript access', 'PDF download available from the student experience'],
                      ].map(([title, desc]) => (
                        <div key={title} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-navy-900">{title}</p>
                              <p className="mt-1 text-sm leading-6 text-gray-500">{desc}</p>
                            </div>
                            <span className="mt-1 text-gold-500">●</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-6 py-16 lg:px-10">
        <section id="features" className="animate-fade-in">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-navy-500">Features</p>
              <h2 className="mt-3 font-display text-4xl text-navy-900 sm:text-5xl">
                A complete academic workflow, not just a login screen.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
              The platform is designed for routine institutional work: onboarding, verification, subject assignment,
              attendance, result management, and student access to records.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {featureCards.map((card) => (
              <article
                key={card.title}
                className="group relative overflow-hidden rounded-[28px] border border-white bg-white p-7 shadow-[0_20px_50px_rgba(10,22,40,0.06)]"
              >
                <div className={`absolute inset-x-0 top-0 h-28 bg-gradient-to-br ${card.accent}`} />
                <div className="relative">
                  <div className="mb-5 h-12 w-12 rounded-2xl bg-navy-900 text-xl text-white flex items-center justify-center shadow-lg shadow-navy-900/15">
                    ✦
                  </div>
                  <h3 className="text-2xl font-display font-semibold text-navy-900">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">{card.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="roles" className="mt-20 animate-fade-in">
          <div className="rounded-[36px] bg-navy-900 px-6 py-10 text-white sm:px-8 lg:px-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold-400">Roles</p>
              <h2 className="mt-3 font-display text-4xl sm:text-5xl">Three focused experiences, one connected system.</h2>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {roleCards.map((card) => (
                <article key={card.role} className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{card.icon}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.22em] text-navy-100">
                      {card.role}
                    </span>
                  </div>
                  <p className="mt-5 text-lg font-semibold">{card.blurb}</p>
                  <div className="mt-5 space-y-3 text-sm text-navy-100">
                    {card.items.map((item) => (
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

        <section id="workflow" className="mt-20 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[32px] bg-[#fff9ec] p-8 shadow-[0_20px_50px_rgba(240,165,0,0.08)]">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-amber-700">Workflow</p>
            <h2 className="mt-3 font-display text-4xl text-navy-900">What the project covers end to end.</h2>
            <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
              From first signup to transcript download, the product is shaped around everyday campus processes rather
              than disconnected utilities.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ['1. Create accounts', 'Students and teachers can sign up, while admins can onboard users manually.'],
              ['2. Verify access', 'Email verification protects account activation and reduces invalid sign-ins.'],
              ['3. Manage classes', 'Teachers get department and subject context for their assigned academic work.'],
              ['4. Track outcomes', 'Attendance, results, and transcript access stay connected to the same profile.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-[28px] border border-navy-100 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-navy-600">{title}</p>
                <p className="mt-3 text-sm leading-7 text-gray-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20">
          <div className="relative overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#0a1628_0%,#152465_55%,#0f2142_100%)] px-6 py-10 text-white sm:px-8 lg:px-12">
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-gold-500/20 blur-3xl" />
            <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-gold-400">Start Using EduTrack</p>
                <h2 className="mt-3 font-display text-4xl sm:text-5xl">Open the platform and make academic work easier to manage.</h2>
                <p className="mt-4 text-sm leading-7 text-navy-100 sm:text-base">
                  Use the public home page to introduce the platform, then guide users into signup, verification, and the right dashboard.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center rounded-2xl bg-gold-500 px-6 py-3.5 text-sm font-semibold text-navy-900 transition hover:bg-gold-400"
                >
                  Create Account
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
