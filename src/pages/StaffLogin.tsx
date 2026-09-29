import { Link, useNavigate } from 'react-router-dom'
import IdentityImpression from '../components/ora/IdentityImpression'

export default function StaffLogin() {
  const navigate = useNavigate()
  return (
    <div className="relative">
      <Link to="/" className="btn-quiet absolute left-4 top-6 z-20 md:left-[4%]">
        ← ORA° public site
      </Link>
      <IdentityImpression onSignedIn={() => navigate('/staff')} />
    </div>
  )
}
