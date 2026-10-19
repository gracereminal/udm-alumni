import { useNavigate } from 'react-router-dom';
import RegSuccessView from '../../views/RegSuccessView';
import { useProfile } from '../../context/ProfileContext';

/** Registration Submitted — summary of what was carried over. The account is pending until an Admin approves it, so this leads back to Sign In. */
export default function RegistrationSuccess() {
  const navigate = useNavigate();
  const a = useProfile().lastRegistration?.a || {};
  const name = [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' ') || '—';
  const carryOver = [
    { label: 'Name', value: name },
    { label: 'Email Address', value: a.email || '—' },
    { label: 'Mobile Number', value: a.mobile || '—' },
    { label: 'Gender', value: a.gender || '—' },
    { label: 'Marital Status', value: a.marital_status || '—' },
    { label: 'Present Address', value: a.present_address || '—' },
    { label: 'College / Department', value: a.college || '—' },
    { label: 'Course', value: a.course || a.course_other || '—' },
    { label: 'Year Graduated', value: a.year_graduated || '—' },
  ];
  if (a.marital_status === 'Married') carryOver.splice(5, 0, { label: 'Full Name After Marriage', value: a.married_name || '—' });

  return (
    <RegSuccessView
      regFirstName={a.first_name || 'Alumnus'}
      regEmail={a.email || 'your email'}
      carryOver={carryOver}
      goSignin={() => navigate('/signin', { replace: true })}
      goHome={() => navigate('/', { replace: true })}
    />
  );
}
