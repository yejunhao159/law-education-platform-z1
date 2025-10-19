import { LoginForm } from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-200/20 rounded-full blur-3xl animate-float-delayed" />

        {/* Legal document pattern */}
        <div className="absolute top-20 right-20 opacity-[0.03]">
          <svg width="200" height="200" viewBox="0 0 200 200" className="animate-float-slow">
            <rect x="40" y="20" width="120" height="160" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
            <line x1="60" y1="50" x2="140" y2="50" stroke="currentColor" strokeWidth="2" />
            <line x1="60" y1="70" x2="140" y2="70" stroke="currentColor" strokeWidth="2" />
            <line x1="60" y1="90" x2="140" y2="90" stroke="currentColor" strokeWidth="2" />
            <line x1="60" y1="110" x2="120" y2="110" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Scales of justice pattern */}
        <div className="absolute bottom-20 left-20 opacity-[0.03]">
          <svg width="180" height="180" viewBox="0 0 180 180" className="animate-float-slow-delayed">
            <line x1="90" y1="30" x2="90" y2="150" stroke="currentColor" strokeWidth="3" />
            <line x1="50" y1="30" x2="130" y2="30" stroke="currentColor" strokeWidth="3" />
            <circle cx="50" cy="30" r="25" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="130" cy="30" r="25" stroke="currentColor" strokeWidth="2" fill="none" />
            <rect x="70" y="145" width="40" height="10" rx="2" fill="currentColor" />
          </svg>
        </div>

        {/* Book stack pattern */}
        <div className="absolute top-1/2 left-10 opacity-[0.03]">
          <svg width="120" height="120" viewBox="0 0 120 120" className="animate-float">
            <rect x="20" y="40" width="80" height="15" rx="2" fill="currentColor" />
            <rect x="25" y="60" width="70" height="15" rx="2" fill="currentColor" />
            <rect x="30" y="80" width="60" height="15" rx="2" fill="currentColor" />
          </svg>
        </div>
      </div>

      <div className="w-full max-w-md px-6 relative z-10">
        <div className="animate-fade-in-up">
          <div className="text-center mb-12">
            {/* Logo with AI indicator */}
            <div className="inline-flex items-center justify-center mb-8 animate-scale-in">
              <div className="relative">
                <svg
                  width="72"
                  height="72"
                  viewBox="0 0 72 72"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="drop-shadow-lg"
                >
                  {/* Scale base */}
                  <circle cx="36" cy="36" r="34" fill="url(#bgGradient)" fillOpacity="0.1" />

                  {/* Scale pillar */}
                  <line
                    x1="36"
                    y1="20"
                    x2="36"
                    y2="52"
                    stroke="url(#gradient1)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Scale beam */}
                  <line
                    x1="16"
                    y1="20"
                    x2="56"
                    y2="20"
                    stroke="url(#gradient1)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Left scale pan */}
                  <circle cx="16" cy="20" r="8" stroke="url(#gradient1)" strokeWidth="2" fill="white" />
                  <path d="M12 20 L16 24 L20 20" stroke="url(#gradient1)" strokeWidth="1.5" fill="none" />

                  {/* Right scale pan */}
                  <circle cx="56" cy="20" r="8" stroke="url(#gradient1)" strokeWidth="2" fill="white" />
                  <path d="M52 20 L56 24 L60 20" stroke="url(#gradient1)" strokeWidth="1.5" fill="none" />

                  {/* Base */}
                  <rect x="26" y="50" width="20" height="4" rx="2" fill="url(#gradient1)" />

                  <defs>
                    <linearGradient id="gradient1" x1="16" y1="16" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#1e40af" />
                      <stop offset="0.5" stopColor="#3b82f6" />
                      <stop offset="1" stopColor="#60a5fa" />
                    </linearGradient>
                    <linearGradient id="bgGradient" x1="0" y1="0" x2="72" y2="72" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#3b82f6" />
                      <stop offset="1" stopColor="#1e40af" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* AI indicator dot with pulse animation */}
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 ring-2 ring-white animate-pulse-slow" />
              </div>
            </div>

            {/* Title with stagger animation */}
            <h1 className="text-[36px] font-semibold tracking-tight text-gray-900 mb-2 animate-fade-in-up-delayed">
              法学教育平台
            </h1>
            <p className="text-sm text-gray-500 font-light tracking-wide animate-fade-in-up-delayed-2">
              AI-Powered Law Education Platform
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
