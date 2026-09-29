import { Link } from 'react-router-dom'
import { CLINIC } from '../../data/clinic'
import ScrollWords from '../../motion/ScrollWords'

export default function ClinicalFooter() {
  return (
    <footer className="relative mt-24 border-t border-bone bg-ivory px-4 pb-10 pt-16 md:px-[6%]">
      <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="display max-w-[420px] text-[clamp(2.5rem,5vw,4.5rem)] uppercase">
            <ScrollWords text="When you're ready." />
          </p>
          <Link to="/visit" className="btn-primary mt-8">
            Begin your visit <span aria-hidden>→</span>
          </Link>
        </div>
        <div>
          <p className="label mb-4">Studio</p>
          <address className="not-italic leading-relaxed text-graphite">
            {CLINIC.address.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </address>
          <p className="label mt-4 text-[10px]">{CLINIC.coordinates}</p>
        </div>
        <div>
          <p className="label mb-4">Hours</p>
          <dl className="space-y-1.5 text-graphite">
            {CLINIC.hoursLabel.map(([d, h]) => (
              <div key={d} className="flex justify-between gap-4">
                <dt>{d}</dt>
                <dd className="font-mono text-sm">{h}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <p className="label mb-4">Contact</p>
          <ul className="space-y-1.5 text-graphite">
            <li>
              <a href={CLINIC.phoneHref} className="hover:text-clinic-deep">
                {CLINIC.phone}
              </a>
            </li>
            <li>
              <a href={`mailto:${CLINIC.email}`} className="hover:text-clinic-deep">
                {CLINIC.email}
              </a>
            </li>
            <li>
              <Link to="/manage" className="hover:text-clinic-deep">
                Manage a visit
              </Link>
            </li>
            <li>
              <Link to="/staff/login" className="text-muted hover:text-clinic-deep">
                Staff
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="steel-rule mt-16" />
      <div className="mt-5 flex flex-wrap justify-between gap-3">
        <p className="label text-[10px]">ORA° Dental Studio · Victoria Island, Lagos</p>
        <p className="label text-[10px]">Online booking helps choose an appointment. It does not diagnose or replace a clinician.</p>
      </div>
    </footer>
  )
}
