import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import DentalArchNav from './components/ora/DentalArchNav'
import SterileTransition from './motion/SterileTransition'
import Care from './pages/Care'
import Home from './pages/Home'
import Manage from './pages/Manage'
import Visit from './pages/Visit'

// Staff tools are split out so patients never download them.
const Staff = lazy(() => import('./pages/Staff'))
const StaffLogin = lazy(() => import('./pages/StaffLogin'))

function ScrollManager() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const id = hash.slice(1)
      const t = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 420)
      return () => window.clearTimeout(t)
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}

function Shell() {
  const location = useLocation()
  const reduce = useReducedMotion()
  const staff = location.pathname.startsWith('/staff')
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:bg-ivory focus:px-4 focus:py-2">
        Skip to content
      </a>
      {!staff && <DentalArchNav />}
      <SterileTransition />
      <AnimatePresence mode="wait">
        <motion.main
          id="main"
          key={location.pathname.split('/')[1] + (location.pathname.startsWith('/staff/login') ? '-login' : '')}
          initial={{ opacity: reduce ? 1 : 0 }}
          animate={{ opacity: 1, transition: { duration: 0.35, delay: reduce ? 0 : 0.28 } }}
          exit={{ opacity: 0, transition: { duration: reduce ? 0 : 0.22 } }}
        >
          <Suspense fallback={<p className="label py-40 text-center">Opening…</p>}>
          <Routes location={location}>
            <Route path="/" element={<Home />} />
            <Route path="/care" element={<Care />} />
            <Route path="/visit" element={<Visit />} />
            <Route path="/manage" element={<Manage />} />
            <Route path="/manage/:bookingCode" element={<Manage />} />
            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff" element={<Staff />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </motion.main>
      </AnimatePresence>
      <ScrollManager />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  )
}
