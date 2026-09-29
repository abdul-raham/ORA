import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Outlet } from 'react-router-dom'
import IdentityImpression from '../components/ora/IdentityImpression'
import AppointmentDrawer from './AppointmentDrawer'
import CommandHeader from './CommandHeader'
import CommandPalette from './CommandPalette'
import LivingSidebar, { StaffTabBar } from './LivingSidebar'
import NewBookingSheet from './NewBookingSheet'
import { StaffProvider, useStaff } from './StaffContext'

// The studio wakes in layers. Identity wakes navigation, the passphrase wakes
// the data, the second factor wakes controls and removes redaction. Locking
// reverses it without unmounting anything, so work resumes exactly in place.

const layer = (level: number, need: number, reduce: boolean | null) => {
  const on = level >= need
  const near = level === need - 1
  return {
    opacity: on ? 1 : near ? 0.62 : 0.3,
    filter: reduce ? 'none' : on ? 'grayscale(0) blur(0px)' : near ? 'grayscale(0.7) blur(1.2px)' : 'grayscale(1) blur(2.6px)',
    // A lingering filter would become the containing block for fixed popovers.
    ...(on ? { transitionEnd: { filter: 'none' } } : {}),
  }
}

function Workspace() {
  const s = useStaff()
  const reduce = useReducedMotion()
  const level = s.awake ? 3 : s.stage
  const transition = { duration: 0.9, ease: [0.65, 0, 0.35, 1] as const }

  return (
    <div className="flex min-h-[100svh]">
      <motion.div initial={false} animate={layer(level, 1, reduce)} transition={transition} inert={!s.awake} className="sticky top-0 hidden h-[100svh] shrink-0 lg:block">
        <LivingSidebar />
      </motion.div>
      <div className="min-w-0 flex-1 pb-16 lg:pb-0">
        <motion.div initial={false} animate={layer(level, 1, reduce)} transition={transition} inert={!s.awake} className="sticky top-0 z-30">
          <CommandHeader />
        </motion.div>
        <motion.main initial={false} animate={layer(level, 2, reduce)} transition={transition} inert={!s.awake} aria-hidden={!s.awake}>
          <Outlet />
        </motion.main>
      </div>
      {s.awake && <StaffTabBar />}

      <AnimatePresence>
        {!s.awake && (
          <IdentityImpression
            key={s.user ? 'resume' : 'signin'}
            mode={s.user ? 'resume' : 'signin'}
            resumeUser={s.user}
            note={s.lockReason}
            onStage={s.setStage}
            onSignedIn={s.wake}
            onSwitchUser={s.signOut}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>{s.selectedId && <AppointmentDrawer key={s.selectedId} />}</AnimatePresence>
      <AnimatePresence>{s.newBooking && <NewBookingSheet />}</AnimatePresence>
      <CommandPalette />
    </div>
  )
}

export default function StaffShell() {
  return (
    <StaffProvider>
      <Workspace />
    </StaffProvider>
  )
}
