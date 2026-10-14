import { useNavigate } from 'react-router-dom';
import RegSuccessView from '../../views/RegSuccessView';
import { useProfile } from '../../context/ProfileContext';

/** Registration Successful — summary of what was carried over, then on to the Alumni Dashboard / Profile. */
export default function RegistrationSuccess() {
  const navigate = useNavigate();
  const { a } = useProfile();
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
      carryOver={carryOver}
      goSurvey={() => navigate('/alumni/profile')}
      goAlumniDash={() => navigate('/alumni/dashboard')}
    />
  );
}
