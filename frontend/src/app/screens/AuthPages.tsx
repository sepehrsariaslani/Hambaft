import type { ReactNode } from 'react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { changePassword, finishOnboardingFlow, loginWithFrappe, signupWithFrappe, submitOnboarding } from '../hambaft-api'

type AuthPageProps = {
  mode: 'login' | 'signup'
}

function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fdf9f2_0%,#f3ebdf_100%)] px-4 py-10 text-[#2d3025]">
      <div className="mx-auto flex min-h-[80vh] max-w-5xl items-center justify-center">
        <section className="grid w-full gap-8 overflow-hidden rounded-[28px] border border-[rgba(45,48,37,0.08)] bg-[rgba(255,252,246,0.92)] p-6 shadow-[0_24px_64px_rgba(84,66,37,0.08)] md:grid-cols-[1.1fr_0.9fr] md:p-10">
          <div className="flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold text-[#9b6b61]">Hambaft</p>
              <h1 className="mt-3 text-3xl font-black leading-tight">{title}</h1>
              <p className="mt-4 text-sm leading-7 text-[#5f6156]">{subtitle}</p>
            </div>
            <div className="mt-8 hidden rounded-[24px] bg-[#2d3025] p-6 text-[#f7f1e7] md:block">
              <p className="text-sm leading-7">
                ورود، آنبوردینگ، امنیت، داشبورد، مالی، عادت‌ها، اهداف، ژورنال و تقویم همگی از مسیر React و session فراپه اجرا می‌شوند.
              </p>
            </div>
          </div>
          {children}
        </section>
      </div>
    </main>
  )
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
}: {
  label: string
  type?: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-3 block text-xs font-bold text-[#6b6c61]">{label}</span>
      <input
        className="w-full rounded-[16px] border border-[#e6dfd3] px-4 py-3 outline-none"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isSignup = mode === 'signup'

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const payload = isSignup
        ? await signupWithFrappe(email.trim(), password, displayName.trim())
        : await loginWithFrappe(email.trim(), password)
      const completed = Boolean(payload?.data?.onboarding_completed)
      navigate(completed ? '/' : '/onboarding', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'خطا در ورود به هم‌بافت')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title={isSignup ? 'ساخت حساب هم‌بافت' : 'ورود به هم‌بافت'}
      subtitle={
        isSignup
          ? 'ثبت‌نام مستقیم به session فراپه وصل شده و بعد از آن کاربر به onboarding یا داشبورد هدایت می‌شود.'
          : 'ورود مستقیم به endpoint احراز هویت hambaft وصل شده و بعد از تأیید session، کاربر به onboarding یا داشبورد می‌رود.'
      }
    >
      <form
        className="rounded-[24px] border border-[rgba(45,48,37,0.08)] bg-white p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
        onSubmit={handleSubmit}
      >
        {isSignup ? <Field label="نام نمایشی" value={displayName} onChange={setDisplayName} /> : null}
        <div className={isSignup ? 'mt-5' : ''}>
          <Field label="ایمیل" type="email" value={email} onChange={setEmail} />
        </div>
        <div className="mt-5">
          <Field label="رمز عبور" type="password" value={password} onChange={setPassword} />
        </div>
        {error ? <p className="mt-4 text-sm font-bold text-[#c2410c]">{error}</p> : null}
        <button
          className="mt-6 w-full rounded-[18px] bg-[#e26645] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'در حال پردازش...' : isSignup ? 'ثبت‌نام' : 'ورود'}
        </button>
        <Link className="mt-4 block text-center text-sm font-bold text-[#7c8363]" to={isSignup ? '/login' : '/signup'}>
          {isSignup ? 'حساب داری؟ ورود' : 'حساب جدید بساز'}
        </Link>
      </form>
    </AuthLayout>
  )
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [workField, setWorkField] = useState('')
  const [waterGoal, setWaterGoal] = useState('8')
  const [sleepGoal, setSleepGoal] = useState('7.5')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      await submitOnboarding({
        display_name: name.trim(),
        work_field: workField.trim(),
        daily_water_goal: Number(waterGoal) || 8,
        sleep_goal_hours: Number(sleepGoal) || 7.5,
      })
      await finishOnboardingFlow()
      navigate('/', { replace: true })
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ثبت اطلاعات onboarding انجام نشد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="شروع تنظیمات هم‌بافت"
      subtitle="این فرم مستقیم Profile Settings را پر می‌کند و onboarding کاربر را در فراپه کامل می‌کند."
    >
      <form
        className="rounded-[24px] border border-[rgba(45,48,37,0.08)] bg-white p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
        onSubmit={handleSubmit}
      >
        <Field label="نام نمایشی" value={name} onChange={setName} />
        <div className="mt-5">
          <Field label="زمینه فعالیت" value={workField} onChange={setWorkField} />
        </div>
        <div className="mt-5">
          <Field label="هدف آب روزانه" type="number" value={waterGoal} onChange={setWaterGoal} />
        </div>
        <div className="mt-5">
          <Field label="هدف خواب" type="number" value={sleepGoal} onChange={setSleepGoal} />
        </div>
        {error ? <p className="mt-4 text-sm font-bold text-[#c2410c]">{error}</p> : null}
        <button
          className="mt-6 w-full rounded-[18px] bg-[#2d3025] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'در حال ذخیره...' : 'تکمیل شروع کار'}
        </button>
      </form>
    </AuthLayout>
  )
}

export function SecurityPage() {
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('تکرار رمز عبور با رمز جدید یکی نیست')
      return
    }

    setSubmitting(true)
    setError(null)
    setMessage(null)

    try {
      await changePassword(oldPassword, newPassword)
      setMessage('رمز عبور با موفقیت تغییر کرد')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'تغییر رمز عبور انجام نشد')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="امنیت حساب"
      subtitle="این صفحه مستقیم endpoint تغییر رمز عبور hambaft را صدا می‌زند و از session جاری فراپه استفاده می‌کند."
    >
      <form
        className="rounded-[24px] border border-[rgba(45,48,37,0.08)] bg-white p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
        onSubmit={handleSubmit}
      >
        <Field label="رمز فعلی" type="password" value={oldPassword} onChange={setOldPassword} />
        <div className="mt-5">
          <Field label="رمز جدید" type="password" value={newPassword} onChange={setNewPassword} />
        </div>
        <div className="mt-5">
          <Field label="تکرار رمز جدید" type="password" value={confirmPassword} onChange={setConfirmPassword} />
        </div>
        {message ? <p className="mt-4 text-sm font-bold text-[#166534]">{message}</p> : null}
        {error ? <p className="mt-4 text-sm font-bold text-[#c2410c]">{error}</p> : null}
        <button
          className="mt-6 w-full rounded-[18px] bg-[#7c8363] px-4 py-3 text-sm font-black text-white disabled:opacity-60"
          type="submit"
          disabled={submitting}
        >
          {submitting ? 'در حال ذخیره...' : 'تغییر رمز عبور'}
        </button>
      </form>
    </AuthLayout>
  )
}
