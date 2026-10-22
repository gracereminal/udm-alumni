<?php

namespace Database\Seeders;

use App\Services\SurveyService;
use App\Support\EntryPass;
use App\Support\SurveyMapping;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

/**
 * Demo data for local, testing and staging ONLY. A few hundred alumni (or DEMO_ALUMNI in total, e.g. 3000 for a load
 * test) across every college and program for batches 2019–2026, with survey responses and current employment so the stats are real and checkable, plus the demo accounts
 * (password demoPass123): alumni maria.delacruz@udmalumni.edu, college ccs.dean@udmalumni.edu, admin
 * admin@udmalumni.edu and the self-registered paolo.mendoza@gmail.com.
 *
 * Refuses to run with APP_ENV=production, against a production-looking database, or when alumni already exist
 * (start over with: php artisan migrate:fresh --seed).
 */
class DemoSeeder extends Seeder
{
    public const PASSWORD = 'demoPass123';

    private const GENERATED = 640;

    private const FIRST = ['Angelo', 'Bea', 'Carlo', 'Danica', 'Enzo', 'Francine', 'Gabriel', 'Hannah', 'Isaac', 'Jasmine', 'Kevin', 'Louise', 'Miguel', 'Nicole', 'Oliver', 'Patricia', 'Quincy', 'Rhea', 'Samuel', 'Trisha', 'Ulysses', 'Vanessa', 'Warren', 'Ysabel', 'Zachary', 'Andrea', 'Bryan', 'Camille', 'Dominic', 'Erika', 'Francis', 'Grace', 'Harold', 'Ivy', 'Joshua', 'Kristine', 'Lorenzo', 'Mae', 'Nathan', 'Pauline'];

    private const LAST = ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Ocampo', 'Garcia', 'Mendoza', 'Torres', 'Tomas', 'Andrada', 'Castillo', 'Flores', 'Villanueva', 'Ramos', 'Castro', 'Rivera', 'Aquino', 'Navarro', 'Salazar', 'Mercado', 'Domingo', 'Gonzales', 'Lim', 'Tan', 'Soriano', 'Pascual', 'Valdez', 'Manalo', 'Dizon', 'Lopez'];

    private const EMPLOYERS = [
        'tech' => ['Accenture Philippines', 'Trend Micro', 'Globe Telecom', 'GCash (Mynt)', 'Maya Philippines', 'Canva Philippines', 'Oracle Philippines', 'Concentrix', 'PLDT', 'Smart Communications'],
        'health' => ['Ospital ng Maynila', 'Philippine General Hospital', "St. Luke's Medical Center", 'Manila Doctors Hospital', 'Department of Health'],
        'edu' => ['Manila City Schools Division', 'DepEd NCR', 'Far Eastern University', 'Universidad de Manila', 'Ateneo de Manila University'],
        'gov' => ['Manila City Hall', 'Manila Police District', 'Bureau of Internal Revenue', 'Department of Social Welfare and Development', 'Philippine National Police'],
        'biz' => ['BDO Unibank', 'BPI', 'SM Retail', 'Jollibee Foods Corporation', 'Robinsons Land', 'Ayala Land', 'San Miguel Corporation', 'Manila Hotel'],
    ];

    private const TITLES = [
        'tech' => ['Software Engineer', 'Web Developer', 'IT Support Specialist', 'Network Support Engineer', 'QA / Software Tester', 'Systems Administrator', 'Data Analyst', 'Cloud Engineer'],
        'health' => ['Staff Nurse', 'Physical Therapist', 'Clinical Instructor', 'Public Health Nurse'],
        'edu' => ['Secondary School Teacher', 'Physical Education Teacher', 'Instructor', 'Guidance Associate'],
        'gov' => ['Police Officer', 'Administrative Officer', 'Social Worker', 'Legal Assistant'],
        'biz' => ['Accounting Associate', 'Marketing Associate', 'HR Associate', 'Bank Teller', 'Front Office Associate', 'Business Analyst'],
    ];

    private const SECTOR = [
        'tech' => 'Information and communication', 'health' => 'Human health and social work activities', 'edu' => 'Education',
        'gov' => 'Public administration and defense', 'biz' => 'Financial and insurance activities',
    ];

    private const TTJ = ['Less than a month', '1 to 6 months', '1 to 6 months', '1 to 6 months', '7 to 11 months', '1 year to less than 2 years', '2 years to less than 3 years'];

    /** Named people from the prototype (records, directory, job queue), one row per person. */
    private const PEOPLE = [
        ['first' => 'Angela Mae', 'last' => 'Dizon', 'mid' => 'AM-2024-00891', 'prog' => 'CBPM-BSBA-MM', 'batch' => 2024, 'status' => 'flagged', 'emp' => ['employed', 'SAP Systems Analyst', 'Accenture Philippines', 'tech'], 'note' => 'Membership ID needs confirmation — submitted before Alumni Office activation.', 'dir' => ['industry' => 'IT Consulting', 'skills' => ['SAP ERP', 'SQL', 'Business Process Modeling'], 'email' => true, 'links' => ['linkedin' => 'linkedin.com/in/angeladizon']]],
        ['first' => 'Christian Paul', 'last' => 'Mendoza', 'mid' => 'AM-2024-03310', 'prog' => 'CCS-BSIT', 'batch' => 2024, 'status' => 'verified', 'emp' => ['employed', 'Associate Cybersecurity Engineer', 'Trend Micro', 'tech'], 'dir' => ['industry' => 'Cybersecurity', 'skills' => ['Network Security', 'Penetration Testing', 'Python'], 'links' => ['facebook' => 'cpmendoza', 'linkedin' => 'linkedin.com/in/cpmendoza']]],
        ['first' => 'Kristine', 'last' => 'Bautista', 'mid' => 'AM-2024-04421', 'prog' => 'CBPM-BSBA-HRM', 'batch' => 2024, 'status' => 'verified', 'emp' => ['employed', 'HR Associate', 'BDO Unibank', 'biz']],
        ['first' => 'Jerome', 'last' => 'Aquino', 'mid' => 'AM-2023-02219', 'prog' => 'CCS-BSIT', 'batch' => 2023, 'status' => 'flagged', 'emp' => ['employed', 'Database Administrator', 'Oracle Philippines', 'tech'], 'note' => 'Employer certificate uploaded — awaiting cross-check with masterlist entry.'],
        ['first' => 'Michelle', 'last' => 'Ramos', 'mid' => 'AM-2023-06654', 'prog' => 'CAS-BSPsych', 'batch' => 2023, 'status' => 'verified', 'emp' => ['employed', 'Customer Experience Specialist', 'Concentrix', 'biz']],
        ['first' => 'Allan', 'last' => 'Del Rosario', 'mid' => 'AM-2022-07781', 'prog' => 'CCS-BSIT', 'batch' => 2022, 'status' => 'flagged', 'emp' => ['self_employed', 'Freelance Web Developer', 'Self-employed', 'tech'], 'note' => 'Self-employment declared — request business or BIR registration proof.', 'proof' => true],
        ['first' => 'Charmaine', 'last' => 'Lopez', 'mid' => 'AM-2022-03390', 'prog' => 'CCJ-BSCrim', 'batch' => 2022, 'status' => 'verified', 'emp' => ['employed', 'Police Officer', 'Manila Police District', 'gov']],
        ['first' => 'Bryan', 'last' => 'Navarro', 'mid' => 'AM-2021-05512', 'prog' => 'CHS-BSN', 'batch' => 2021, 'status' => 'verified', 'emp' => ['further_studies']],
        ['first' => 'Kathleen', 'last' => 'Mercado', 'mid' => 'AM-2021-00984', 'prog' => 'COED-BSEd-Eng', 'batch' => 2021, 'status' => 'flagged', 'emp' => ['not_employed'], 'note' => 'Survey submitted without employment section — follow up before batch clearance.'],
        ['first' => 'Paolo', 'last' => 'Enriquez', 'mid' => 'AM-2020-06120', 'prog' => 'CHS-BSN', 'batch' => 2020, 'status' => 'verified', 'emp' => ['employed', 'Staff Nurse', 'Ospital ng Maynila', 'health']],
        ['first' => 'John Carlo', 'last' => 'Reyes', 'mid' => 'AM-2022-01932', 'prog' => 'CCS-BSIT', 'batch' => 2022, 'status' => 'flagged', 'emp' => ['employed', 'Cloud DevOps Specialist', 'GCash (Mynt)', 'tech'], 'note' => 'Two submissions filed under one Membership ID — merge duplicates before review.', 'dir' => ['industry' => 'Financial Technology', 'skills' => ['Kubernetes', 'Docker', 'Terraform'], 'email' => true, 'links' => ['linkedin' => 'linkedin.com/in/jcreyes-devops', 'website' => 'jcreyes.dev']]],
        ['first' => 'Maria', 'last' => 'Santos', 'mid' => 'AM-2023-04128', 'prog' => 'CCS-BSIT', 'batch' => 2023, 'status' => 'verified', 'emp' => ['employed', 'Senior Software Engineer', 'Canva Philippines', 'tech'], 'account' => 'maria.santos@udm.edu.ph', 'dir' => ['industry' => 'Software & Design', 'skills' => ['React', 'TypeScript', 'Node.js'], 'email' => true, 'links' => ['facebook' => 'mariasantos.dev', 'linkedin' => 'linkedin.com/in/mariasantos', 'website' => 'mariasantos.io']]],
        ['first' => 'Mark Kenneth', 'last' => 'Torres', 'mid' => 'AM-2023-07712', 'prog' => 'CCS-BSIT', 'batch' => 2023, 'status' => 'verified', 'emp' => ['self_employed', 'Full-Stack Mobile Developer', 'Independent Consultant', 'tech'], 'dir' => ['industry' => 'Freelance Software Development', 'skills' => ['React Native', 'Firebase', 'Next.js'], 'email' => true, 'links' => ['facebook' => 'mktorres', 'website' => 'mktorres.studio']]],
        ['first' => 'Patricia Anne', 'last' => 'Lim', 'mid' => 'AM-2020-01104', 'prog' => 'CBPM-BSBA-BE', 'batch' => 2020, 'status' => 'verified', 'emp' => ['employed', 'Lead Product Manager', 'Globe Telecom', 'tech'], 'account' => 'patricia.lim@udm.edu.ph', 'dir' => ['industry' => 'Telecommunications', 'skills' => ['Agile Scrum', 'Product Lifecycle', 'Data Analytics'], 'links' => ['linkedin' => 'linkedin.com/in/patricialim-pm']]],
        ['first' => 'Rafael', 'last' => 'De La Cruz', 'mid' => 'AM-2021-08912', 'prog' => 'CCS-BSIT', 'batch' => 2021, 'status' => 'verified', 'emp' => ['self_employed', 'Co-Founder & CTO', 'PayByte Solutions', 'tech', 'self_owned'], 'account' => 'rafael.delacruz@udm.edu.ph', 'dir' => ['industry' => 'Financial Technology', 'skills' => ['Go', 'Microservices', 'PostgreSQL'], 'links' => []]],
        ['first' => 'Joanna', 'last' => 'Rivera', 'mid' => 'AM-2019-02277', 'prog' => 'CAS-BSPsych', 'batch' => 2019, 'status' => 'flagged', 'emp' => ['not_employed'], 'note' => 'Career milestone dates overlap (2023 start vs 2022 promotion) — ask alumna to correct entries.'],
        ['first' => 'Dennis', 'last' => 'Oliveros', 'mid' => 'AM-2018-00418', 'prog' => 'CCJ-BSCrim', 'batch' => 2018, 'status' => 'verified', 'archived' => true, 'emp' => ['further_studies']],
        ['first' => 'Grace', 'last' => 'Villanueva', 'mid' => 'AM-2017-05590', 'prog' => 'COED-BSEd-Math', 'batch' => 2017, 'status' => 'verified', 'archived' => true, 'emp' => ['employed', 'Secondary School Teacher', 'Manila City Schools Division', 'edu']],
    ];

    private const JOBS = [
        ['title' => 'Junior Backend Developer', 'company' => 'Brightline Tech', 'location' => 'Manila · Hybrid', 'type' => 'full_time', 'badge' => 'Alumni Founded', 'salary' => '₱35,000 - ₱48,000', 'note' => '2 UDM alumni work here', 'tags' => ['Node.js', 'SQL', 'Express', 'AWS'], 'days' => 2, 'deadline' => 11, 'apply' => 'careers@brightline.tech', 'messenger' => 'brightlinetech', 'desc' => 'Build and maintain REST APIs for Brightline’s logistics platform. You will pair with senior engineers, write tests, and ship weekly. Fresh graduates with solid Node.js and SQL fundamentals are welcome.'],
        ['title' => 'Product Marketing Associate', 'company' => 'Nimbus Systems', 'location' => 'Cebu · Remote', 'type' => 'full_time', 'badge' => 'UDM Referral Available', 'salary' => '₱40,000 - ₱55,000', 'tags' => ['Marketing', 'SaaS', 'Growth Marketing'], 'days' => 5, 'deadline' => 16, 'apply' => 'talent@nimbus.systems', 'desc' => 'Own go-to-market messaging for Nimbus’ SaaS suite: launch campaigns, write product copy, and work with sales on enablement. Marketing, communication or business graduates preferred.'],
        ['title' => 'Data Analyst Intern', 'company' => 'Veyra Analytics', 'location' => 'Quezon City · On-site', 'type' => 'internship', 'badge' => 'Alumni Hiring Partner', 'salary' => '₱18,000 - ₱22,000', 'salary_note' => 'allowance / month', 'tags' => ['SQL', 'Excel', 'Python', 'Power BI'], 'days' => 7, 'deadline' => 6, 'apply' => 'https://veyra.ai/careers', 'desc' => '6-month internship supporting client reporting. You will clean data, build Power BI dashboards and present weekly findings. Open to final-year students and recent graduates.'],
        ['title' => 'UX/UI Designer', 'company' => 'Formwell Studio', 'location' => 'Pasig · Hybrid', 'type' => 'full_time', 'badge' => 'Lead by Alumni', 'salary' => '₱45,000 - ₱65,000', 'tags' => ['Figma', 'Design Systems', 'User Research'], 'days' => 3, 'deadline' => 22, 'apply' => 'hello@formwell.studio', 'messenger' => 'formwellstudio', 'desc' => 'Design end-to-end product experiences for fintech and e-commerce clients, maintain the studio design system and run usability sessions. A portfolio is required.'],
        ['title' => 'Cloud Support Engineer', 'company' => 'Northpoint Cloud', 'location' => 'Davao · Remote', 'type' => 'full_time', 'badge' => 'Urgent Hiring', 'salary' => '₱50,000 - ₱70,000', 'note' => 'Fast-track interview for UDM grads', 'tags' => ['AWS', 'Linux', 'Docker', 'Terraform'], 'days' => 0, 'deadline' => 4, 'apply' => 'jobs@northpoint.cloud', 'desc' => 'Troubleshoot customer workloads on AWS, own incident follow-ups and write runbooks. Rotating on-call with allowance.'],
    ];

    /** Alumni-submitted postings waiting in the approval queue. */
    private const QUEUE = [
        ['by' => 'maria.santos@udm.edu.ph', 'hours' => 2, 'title' => 'QA Automation Engineer', 'company' => 'Seaboard Digital', 'location' => 'Manila · Hybrid', 'type' => 'full_time', 'salary' => '₱38,000 - ₱50,000', 'tags' => ['Selenium', 'Cypress', 'CI/CD', 'JavaScript'], 'apply' => 'careers@seaboard.digital', 'deadline' => 7, 'desc' => 'Seaboard Digital is hiring a QA Automation Engineer to build and maintain end-to-end test suites for its banking apps. 1–2 years of test automation experience preferred; fresh grads with strong JavaScript fundamentals are welcome to apply. I work on the QA team and can refer UDM alumni directly.'],
        ['by' => 'rafael.delacruz@udm.edu.ph', 'hours' => 26, 'title' => 'IT Support Associate', 'company' => 'Coastal Bank', 'location' => 'Makati · On-site', 'type' => 'full_time', 'salary' => '₱25,000 - ₱30,000', 'tags' => ['Help Desk', 'Windows', 'Networking'], 'apply' => 'hr.recruitment@coastalbank.ph', 'deadline' => 9, 'desc' => 'Entry-level IT support role at the Makati head office. Handles employee tickets, device setup and basic network troubleshooting. Rotating shifts, with HMO from day one. Open to BSIT and BSCS graduates.'],
        ['by' => 'patricia.lim@udm.edu.ph', 'hours' => 600, 'title' => 'Finance Analyst', 'company' => 'Veyra Analytics', 'location' => 'Quezon City · Hybrid', 'type' => 'contract', 'salary' => '₱32,000 - ₱40,000', 'tags' => ['Excel', 'Financial Modeling', 'Power BI'], 'apply' => 'talent@veyra.ai', 'deadline' => 12, 'desc' => '6-month contract, extendable, supporting month-end close and client reporting. Strong Excel required; Power BI is a plus. Hybrid set-up, 3 days on-site in Quezon City.'],
    ];

    /** Events relative to "today" (Manila), so the demo always has upcoming and past events. */
    private const EVENTS = [
        ['in' => 10, 't1' => '16:00', 't2' => '22:00', 'title' => 'UDM Grand Alumni Homecoming 2026', 'category' => 'event', 'organizer' => 'UDM Alumni Relations Office', 'venue' => 'UDM Gymnasium, Mehan Gardens, Manila', 'fee' => 'Free for alumni · ₱350 per guest', 'regs' => 412,
            'highlights' => ['Recognition of golden (Batch 1976) and silver (Batch 2001) jubilarians', 'Outstanding Alumni Awards', 'Variety show by the UDM alumni chorale', 'Batch tables of ten — reserve with the Alumni Affairs office'],
            'fields' => [['key' => 'guests', 'label' => 'Guests you’re bringing', 'hint' => '₱350 per guest, payable at the registration desk', 'options' => ['None', '1', '2', '3']], ['key' => 'seat', 'label' => 'Seating preference', 'options' => ['With my batch', 'Open seating']]],
            'body' => "The biggest gathering of Merlions returns to the gymnasium for an evening of batch reunions, a variety show by the alumni chorale, and the awarding of this year’s Outstanding Alumni.\n\nGolden jubilarians (Batch 1976) and silver jubilarians (Batch 2001) will be recognized on stage. Batch coordinators may reserve tables of ten at the Alumni Affairs office.",
            'agenda' => [['15:00', 'Registration and batch check-in'], ['16:00', 'Holy Mass at the university chapel'], ['17:30', 'Opening program and jubilarian recognition'], ['19:00', 'Dinner, variety show and batch presentations'], ['21:00', 'Raffle draw and socials']]],
        ['in' => 4, 't1' => '09:00', 't2' => '16:00', 'title' => 'Alumni Job Fair — 18 partner employers', 'category' => 'career', 'organizer' => 'Career & Placement Office', 'venue' => 'UDM Quadrangle and Function Rooms 2–4', 'fee' => 'Free admission', 'regs' => 286,
            'highlights' => ['18 partner employers across fintech, BPO and engineering', 'On-the-spot interviews and same-day job offers', 'Free resume clinic and mock interviews'],
            'body' => "Eighteen partner employers will conduct on-the-spot interviews, with same-day job offers for qualified applicants. Bring five copies of your resume and a valid ID.\n\nA resume clinic and mock-interview room run all day in Function Room 4 for alumni who graduated within the last three years.",
            'agenda' => [['09:00', 'Booths open · initial screening'], ['10:30', 'Resume clinic (Function Room 4)'], ['13:00', 'Employer talks: fintech and BPO tracks'], ['15:00', 'Final interviews and job-offer releasing']]],
        ['in' => 25, 't1' => '05:00', 't2' => '09:00', 'title' => 'Merlion Run 2026 — Scholarship Fun Run', 'category' => 'community', 'organizer' => 'UDM Alumni Association', 'venue' => 'Rizal Park, Ermita, Manila', 'fee' => '₱500 (3K) · ₱650 (5K) · ₱800 (10K)', 'capacity' => 600, 'regs' => 134,
            'highlights' => ['100% of proceeds fund alumni scholarships', 'Singlet, race bib and finisher medal included', '3K, 5K and 10K categories'],
            'fields' => [['key' => 'dist', 'label' => 'Race category', 'hint' => 'Fee is paid when claiming your race kit', 'options' => ['3K · ₱500', '5K · ₱650', '10K · ₱800']], ['key' => 'size', 'label' => 'Singlet size', 'options' => ['XS', 'S', 'M', 'L', 'XL']]],
            'body' => "Proceeds go entirely to the alumni scholarship fund, which supported 60 scholars this academic year. Registration includes a singlet, race bib and finisher medal.\n\nRace kits may be claimed at the Alumni Affairs office, 9:00 AM to 5:00 PM.",
            'agenda' => [['05:00', 'Assembly and warm-up'], ['05:30', '10K gun start'], ['05:45', '5K and 3K gun start'], ['08:00', 'Awarding and raffle']]],
        ['in' => 39, 't1' => '18:00', 't2' => '21:00', 'title' => 'Career Mentorship Night with Batch 2010–2015', 'category' => 'career', 'organizer' => 'UDM Alumni Relations Office', 'venue' => 'Audio-Visual Room, Building B', 'fee' => 'Free · limited to 80 participants', 'capacity' => 80, 'regs' => 80,
            'highlights' => ['Twelve mentors from IT, education, finance and public service', 'Three rounds of small-group sessions', 'Resume and interview review'],
            'body' => "Mentors from IT, education, finance and public service hold three rounds of small-group sessions with graduating students and recent alumni looking to shift careers.\n\nSign-ups close once the 80-participant cap is reached.",
            'agenda' => [['18:00', 'Registration and mentor matching'], ['18:30', 'Round 1 — industry breakout'], ['19:30', 'Round 2 — resume and interview review'], ['20:30', 'Open networking']]],
        ['in' => -25, 't1' => '06:00', 't2' => '10:00', 'title' => 'Alumni Coastal Cleanup at Manila Bay', 'category' => 'community', 'organizer' => 'UDM Alumni Association', 'venue' => 'Manila Baywalk, Roxas Boulevard', 'fee' => 'Free · volunteers', 'regs' => 96,
            'highlights' => ['96 alumni volunteers', 'Over 400 kg of waste collected'],
            'body' => 'Alumni volunteers and their families joined International Coastal Cleanup Day along the Manila Baywalk, in partnership with the city environment office.',
            'agenda' => [['06:00', 'Assembly and safety briefing'], ['06:30', 'Cleanup in assigned zones'], ['09:30', 'Waste audit and group photo']]],
    ];

    private const NOTICES = [
        ['kind' => 'reminder', 'source' => 'UDM Alumni Relations Office', 'title' => 'Alumni survey cycle now open', 'body' => 'Employment records for AY 2025–2026 are being consolidated for CHED reporting. Update your answers before November 15.', 'ago' => 16],
        ['kind' => 'update', 'source' => 'University Bulletin', 'title' => 'UDM alumni scholarship fund reaches ₱2.4M', 'body' => 'Contributions from the 2015–2020 batches will support 60 new scholars this academic year.', 'ago' => 24],
    ];

    private CarbonImmutable $today;

    private string $demoHash;

    private string $unusableHash;

    public function run(): void
    {
        self::assertAllowed();
        if (DB::table('alumnus')->exists()) {
            throw new RuntimeException('Alumni already exist. Start over with: php artisan migrate:fresh --seed');
        }

        mt_srand(20261014); // the same demo numbers in every environment
        $this->today = CarbonImmutable::now('Asia/Manila')->startOfDay();
        $this->demoHash = Hash::make(self::PASSWORD);
        $this->unusableHash = Hash::make(bin2hex(random_bytes(24)));

        DB::transaction(function () {
            $this->seed();
            // completion_pct with the full client rule (profile + survey questions), as a real save would store it.
            app(SurveyService::class)->recomputeAll();
        });

        $this->command->info(sprintf(
            'Demo data seeded: %d alumni, %d user accounts. Demo password: %s',
            DB::table('alumnus')->count(), DB::table('user_account')->count(), self::PASSWORD,
        ));
    }

    /**
     * Demo data (fake alumni and a public password) must never reach a real database. APP_ENV alone is not enough,
     * so the target database is checked too.
     */
    public static function assertAllowed(): void
    {
        if (app()->environment('production')) {
            throw new RuntimeException('Refusing to seed demo data with APP_ENV=production.');
        }
        $connection = config('database.connections.'.config('database.default'));
        $url = (string) ($connection['url'] ?? '');
        if (preg_match('/sslmode=(require|verify-ca|verify-full)/', $url) || in_array($connection['sslmode'] ?? '', ['require', 'verify-ca', 'verify-full'], true)) {
            throw new RuntimeException('Refusing to seed demo data: the database requires TLS, so it looks like a production database.');
        }
        $host = $url !== '' ? (string) parse_url($url, PHP_URL_HOST) : (string) ($connection['host'] ?? '');
        if (! in_array($host, ['localhost', '127.0.0.1', '::1'], true) && ! config('app.allow_demo_seed')) {
            throw new RuntimeException("Refusing to seed demo data into non-local database host \"{$host}\". Set ALLOW_DEMO_SEED=true for a staging database.");
        }
    }

    /** Generated alumni on top of Maria, Paolo and PEOPLE, so the total matches DEMO_ALUMNI when it is set. */
    private static function generatedCount(): int
    {
        $total = config('app.demo_alumni');
        if ($total === null) {
            return self::GENERATED;
        }
        $named = 2 + count(self::PEOPLE);
        if ($total <= $named || $total > 50000) {
            throw new RuntimeException(sprintf('DEMO_ALUMNI must be between %d and 50000.', $named + 1));
        }

        return $total - $named;
    }

    private function seed(): void
    {
        $cycleId = DB::selectOne('SELECT cycle_id FROM v_active_cycle')->cycle_id;
        $programs = collect(DB::select('SELECT p.program_id, p.code, p.name, c.code AS college_code FROM program p JOIN college c ON c.college_id = p.college_id ORDER BY p.program_id'));
        $byCode = $programs->keyBy('code');
        $collegeId = fn (string $code) => DB::table('college')->where('code', $code)->value('college_id');

        // Demo accounts.
        $adminId = $this->user('admin@udmalumni.edu', 'admin', 'System Admin', ['role_label' => 'Administrator'], $this->demoHash);
        $deanId = $this->user('ccs.dean@udmalumni.edu', 'dept', 'Dr. Maria Santos', ['role_label' => 'College Dean', 'college_id' => $collegeId('CCS')], $this->demoHash);
        $mariaUser = $this->user('maria.delacruz@udmalumni.edu', 'alumni', 'Maria Dela Cruz', [], $this->demoHash);
        $mariaId = $this->alumnus([
            'user_id' => $mariaUser, 'membership_id' => 'AM-2024-00567', 'student_no' => '24-05-567', 'program_id' => $byCode['CCS-BSIT']->program_id,
            'year_graduated' => 2024, 'first_name' => 'Maria', 'last_name' => 'Dela Cruz', 'birth_date' => '2002-03-14', 'sex' => 'female',
            'present_address' => '1520 Dalupan St., Sampaloc, Manila', 'mobile_no' => '639171234567', 'verification_status' => 'verified', 'record_source' => 'survey',
            'privacy_consent_at' => $this->at(-60), 'directory_opt_in' => true, 'industry' => 'Data Engineering', 'created_at' => $this->at(-60),
        ]);
        $this->links($mariaId, ['linkedin' => 'linkedin.com/in/mariadelacruz'], true);
        $this->links($mariaId, ['facebook' => 'maria.delacruz'], false);
        $this->submitSurvey($mariaId, $cycleId, $this->answersFor(['employed', 'Junior Data Engineer', 'Maya Philippines', 'tech'], 'tech'), $this->at(-28, '10:00'));
        $this->skills($mariaId, ['Python', 'Spark', 'SQL', 'Power BI', 'Excel']);

        // A recent self-registration (BSIT, College of Computing Studies): active and verified straight away.
        $paoloUser = $this->user('paolo.mendoza@gmail.com', 'alumni', 'Paolo Mendoza', [], $this->demoHash);
        $paoloId = $this->alumnus([
            'user_id' => $paoloUser, 'membership_id' => 'AM-2026-00001', 'program_id' => $byCode['CCS-BSIT']->program_id, 'year_graduated' => 2026, 'first_name' => 'Paolo', 'last_name' => 'Mendoza',
            'birth_date' => '2004-06-21', 'sex' => 'male', 'civil_status' => 'single', 'present_address' => '2187 Juan Luna St., Tondo, Manila', 'mobile_no' => '639175550142',
            'verification_status' => 'verified', 'record_source' => 'self_registration', 'privacy_consent_at' => $this->at(-2), 'created_at' => $this->at(-2),
        ]);
        $this->links($paoloId, ['facebook' => 'paolo.mendoza'], false);

        $accountByEmail = [];
        foreach (self::PEOPLE as $p) {
            $prog = $byCode[$p['prog']];
            $userId = isset($p['account']) ? $this->user($p['account'], 'alumni', "{$p['first']} {$p['last']}", [], $this->unusableHash) : null;
            if ($userId) {
                $accountByEmail[$p['account']] = $userId;
            }
            $digits = substr($p['mid'], -5);
            $id = $this->alumnus([
                'user_id' => $userId, 'membership_id' => $p['mid'], 'student_no' => sprintf('%02d-%s-%s', $p['batch'] % 100, substr($digits, 0, 2), substr($digits, 2)),
                'program_id' => $prog->program_id, 'year_graduated' => $p['batch'], 'first_name' => $p['first'], 'last_name' => $p['last'],
                'birth_date' => $this->dob($p['batch']), 'sex' => $this->rand() < 0.5 ? 'female' : 'male', 'present_address' => '1100 Taft Ave., Ermita, Manila',
                'mobile_no' => '6391'.str_pad((string) mt_rand(0, 99999999), 8, '0', STR_PAD_LEFT), 'contact_email' => $userId ? null : $this->exampleEmail($p['first'], $p['last'], $digits),
                'verification_status' => $p['status'], 'record_source' => 'survey', 'flag_note' => $p['note'] ?? null,
                'archived_at' => ! empty($p['archived']) ? $this->at(-5) : null, 'privacy_consent_at' => $userId ? $this->at(-90) : null,
                'directory_opt_in' => isset($p['dir']), 'show_email' => ! empty($p['dir']['email']), 'industry' => $p['dir']['industry'] ?? null,
                'created_at' => $this->at(-30 - mt_rand(0, 59)),
            ]);
            $this->submitSurvey($id, $cycleId, $this->answersFor($p['emp'], $p['emp'][3] ?? self::family($prog->name)), $this->at(-mt_rand(0, 24)));
            if (isset($p['dir'])) {
                $this->skills($id, $p['dir']['skills']);
                $this->links($id, $p['dir']['links'], true);
            }
            if ($p['status'] === 'flagged') {
                DB::table('record_review')->insert(['alumni_id' => $id, 'reviewer_id' => $adminId, 'action' => 'flag', 'note' => $p['note'], 'created_at' => $this->at(-3)]);
            }
            if (! empty($p['proof'])) {
                DB::table('proof_document')->insert(['alumni_id' => $id, 'requested_by' => $adminId, 'requested_at' => $this->at(-4), 'created_at' => $this->at(-4)]);
            }
        }

        // Generated alumni across every college / program for batches 2019–2026.
        $catalogPrograms = $programs->where('college_code', '!=', 'OTH')->values()->all();
        $popular = ['CCS-BSIT', 'CET-BSCS', 'CHS-BSN', 'CCJ-BSCrim'];
        $othId = $collegeId('OTH');
        $generated = self::generatedCount();
        for ($i = 0; $i < $generated; $i++) {
            $unmapped = $i % 97 === 13;
            $prog = $unmapped ? null : ($this->rand() < 0.22 ? $byCode[$this->pick($popular)] : $this->pick($catalogPrograms));
            $batch = 2019 + mt_rand(0, 7);
            $fam = $prog ? self::family($prog->name) : 'biz';
            $first = $this->pick(self::FIRST);
            $last = $this->pick(self::LAST);
            $seq = 20000 + $i;
            $userId = $this->rand() < 0.55
                ? $this->user($this->exampleEmail($first, $last, (string) $seq), 'alumni', "{$first} {$last}", [], $this->unusableHash)
                : null;
            $id = $this->alumnus([
                'user_id' => $userId, 'membership_id' => sprintf('AM-%d-%05d', $batch, $seq),
                'student_no' => sprintf('%02d-%02d-%03d', $batch % 100, intdiv($seq, 1000) % 100, $seq % 1000),
                'program_id' => $prog?->program_id, 'course_other' => $unmapped ? 'Bachelor of Science in Marine Transportation' : null,
                'declared_college_id' => $unmapped ? $othId : null, 'year_graduated' => $batch, 'first_name' => $first, 'last_name' => $last,
                'birth_date' => $this->dob($batch), 'sex' => $this->rand() < 0.52 ? 'female' : 'male', 'present_address' => 'Metro Manila',
                'mobile_no' => '6399'.str_pad((string) mt_rand(0, 99999999), 8, '0', STR_PAD_LEFT),
                'contact_email' => $userId ? null : $this->exampleEmail($first, $last, (string) $seq),
                'is_indigenous' => ($ip = $this->rand() < 0.04), 'indigenous_group' => $ip ? $this->pick(['Aeta', 'Igorot', 'Lumad', 'Mangyan', 'Ifugao']) : null,
                'pwd_type' => $this->rand() < 0.022 ? $this->pick(['physical', 'visual', 'hearing', 'psychosocial', 'chronic_illness']) : null,
                'verification_status' => $this->rand() < 0.04 ? 'flagged' : 'verified',
                'archived_at' => $this->rand() < 0.03 ? $this->at(-10) : null,
                'record_source' => $userId ? 'self_registration' : $this->pick(['import', 'admin_encoded']),
                'privacy_consent_at' => $userId ? $this->at(-200) : null,
                'created_at' => $this->at(-mt_rand(0, 199)),
            ]);
            // Older batches are better traced and better employed.
            $age = 2026 - $batch;
            if ($this->rand() >= min(0.85, 0.42 + $age * 0.06)) {
                continue;
            }
            $roll = $this->rand();
            $empP = min(0.9, 0.62 + $age * 0.04);
            $outcome = match (true) {
                $roll < $empP * 0.88 => ['employed', $this->pick(self::TITLES[$fam]), $this->pick(self::EMPLOYERS[$fam]), $fam],
                $roll < $empP => ['self_employed', $this->pick(['Online Seller', 'Freelance Consultant', 'Small Business Owner']), 'Self-employed', $fam, $this->rand() < 0.5 ? 'self_owned' : null],
                $roll < $empP + 0.06 => ['further_studies'],
                default => ['not_employed'],
            };
            $this->submitSurvey($id, $cycleId, $this->answersFor($outcome, $fam), $this->at(-mt_rand(0, 15)));
            if ($this->rand() < 0.05) {
                DB::table('alumnus')->where('alumni_id', $id)->update(['directory_opt_in' => true]);
            }
        }

        // Jobs: admin postings (approved), alumni submissions (pending), Maria's saves and one application.
        $jobIds = [];
        foreach (self::JOBS as $j) {
            $jobId = DB::table('job_posting')->insertGetId([
                'posted_by' => $adminId, 'reviewed_by' => $adminId, 'title' => $j['title'], 'company' => $j['company'], 'location' => $j['location'],
                'employment_type' => $j['type'], 'salary_range' => $j['salary'], 'salary_note' => $j['salary_note'] ?? 'per month',
                'deadline' => $this->today->addDays($j['deadline'])->toDateString(), 'apply_via' => $j['apply'], 'messenger' => $j['messenger'] ?? null,
                'description' => $j['desc'], 'badge' => $j['badge'], 'note' => $j['note'] ?? null, 'source' => 'admin', 'approval_status' => 'approved',
                'published_at' => $this->at(-$j['days']), 'created_at' => $this->at(-$j['days']),
            ], 'job_id');
            $jobIds[$j['company']] = $jobId;
            $this->jobSkills($jobId, $j['tags']);
        }
        foreach (self::QUEUE as $q) {
            $jobId = DB::table('job_posting')->insertGetId([
                'posted_by' => $accountByEmail[$q['by']], 'title' => $q['title'], 'company' => $q['company'], 'location' => $q['location'],
                'employment_type' => $q['type'], 'salary_range' => $q['salary'], 'salary_note' => 'per month',
                'deadline' => $this->today->addDays($q['deadline'])->toDateString(), 'apply_via' => $q['apply'], 'submitter_email' => $q['by'],
                'description' => $q['desc'], 'source' => 'alumni', 'approval_status' => 'pending',
                'created_at' => CarbonImmutable::now()->subHours($q['hours']),
            ], 'job_id');
            $this->jobSkills($jobId, $q['tags']);
        }
        foreach (['Brightline Tech', 'Formwell Studio', 'Northpoint Cloud'] as $company) {
            DB::table('saved_job')->insert(['alumni_id' => $mariaId, 'job_id' => $jobIds[$company], 'saved_at' => $this->at(-1)]);
        }
        DB::table('saved_job')->where(['alumni_id' => $mariaId, 'job_id' => $jobIds['Brightline Tech']])
            ->update(['applied_at' => $this->at(-1, '14:00'), 'applied_via' => 'email']);

        // Events with real registrations from the population.
        $active = DB::table('alumnus as a')->leftJoin('user_account as u', 'u.user_id', '=', 'a.user_id')
            ->whereNull('a.archived_at')->whereNull('a.merged_into_id')->where('a.alumni_id', '<>', $mariaId)->where('a.alumni_id', '<>', $paoloId)
            ->orderBy('a.alumni_id')->get(['a.alumni_id', DB::raw('COALESCE(u.email, a.contact_email) AS email')])->all();
        foreach (self::EVENTS as $e) {
            $day = $this->today->addDays($e['in'])->toDateString();
            $published = $this->at(-max(1, 30 - abs($e['in'])));
            $eventId = DB::table('event')->insertGetId([
                'created_by' => $adminId, 'title' => $e['title'], 'category' => $e['category'], 'organizer' => $e['organizer'],
                'starts_at' => "{$day} {$e['t1']}:00+08", 'ends_at' => "{$day} {$e['t2']}:00+08", 'venue' => $e['venue'], 'fee_text' => $e['fee'],
                'capacity' => $e['capacity'] ?? null, 'highlights' => json_encode($e['highlights']),
                'teaser' => mb_substr(explode("\n\n", $e['body'])[0], 0, 150), 'body' => $e['body'],
                'published_at' => $published, 'created_at' => $published,
            ], 'event_id');
            foreach ($e['agenda'] as $k => [$time, $title]) {
                DB::table('event_agenda_item')->insert(['event_id' => $eventId, 'starts_at' => $time, 'title' => $title, 'sort' => $k]);
            }
            foreach ($e['fields'] ?? [] as $k => $f) {
                DB::table('event_reg_field')->insert([
                    'event_id' => $eventId, 'field_key' => $f['key'], 'label' => $f['label'], 'hint' => $f['hint'] ?? null,
                    'options' => json_encode($f['options']), 'sort' => $k,
                ]);
            }
            $n = min($e['regs'], count($active));
            $start = mt_rand(0, count($active) - 1);
            $rows = [];
            for ($k = 0; $k < $n; $k++) {
                $who = $active[($start + $k) % count($active)];
                $rows[] = [
                    'event_id' => $eventId, 'alumni_id' => $who->alumni_id, 'rsvp' => 'going',
                    'answers' => json_encode((object) collect($e['fields'] ?? [])->mapWithKeys(fn ($f) => [$f['key'] => $this->pick($f['options'])])->all()),
                    'entry_pass' => EntryPass::code($eventId, (string) $who->email),
                    'created_at' => $published->addHours(mt_rand(0, 400)),
                ];
            }
            foreach (array_chunk($rows, 200) as $chunk) {
                DB::table('event_registration')->insert($chunk);
            }
        }
        foreach (self::NOTICES as $nt) {
            DB::table('announcement')->insert([
                'author_id' => $adminId, 'kind' => $nt['kind'], 'source' => $nt['source'], 'title' => $nt['title'], 'body' => $nt['body'],
                'published_at' => $this->at(-$nt['ago']), 'created_at' => $this->at(-$nt['ago']),
            ]);
        }

        // Outreach history for the CCS dean (recorded hand-offs; the portal sends nothing) and report exports.
        $unresponsive = DB::table('v_unresponsive')->where('college_id', $collegeId('CCS'))->orderBy('alumni_id')->limit(3)->pluck('alumni_id');
        foreach ($unresponsive as $k => $alumniId) {
            DB::table('outreach_contact')->insert([
                'alumni_id' => $alumniId, 'contacted_by' => $deanId, 'method' => $k === 1 ? 'messenger' : 'email',
                'message' => 'Hi! The UDM Alumni Office is updating its tracer records. Could you take five minutes to answer the survey in the portal?',
                'outcome' => 'sent', 'contacted_at' => $this->at(-9 - $k * 12),
            ]);
        }
        DB::table('report_export')->insert([
            ['type' => 'ched', 'format' => 'pdf', 'generated_by' => $adminId, 'status' => 'submitted', 'record_count' => 0, 'scope_label' => 'All colleges · last five batches', 'created_at' => $this->at(-47)],
            ['type' => 'coverage', 'format' => 'excel', 'generated_by' => $adminId, 'status' => 'ready', 'record_count' => 0, 'scope_label' => 'All colleges · last five batches', 'created_at' => $this->at(-30)],
        ]);

        // Notifications whose numbers come from the views at creation time (never typed).
        $notify = fn (int $userId, string $type, string $title, string $message, string $link) => DB::table('notification')->insert([
            'user_id' => $userId, 'type' => $type, 'title' => $title, 'message' => $message, 'link_url' => $link,
        ]);
        $notify($adminId, 'registration', 'New alumni registration', 'Paolo Mendoza (BSIT 2026) registered.', 'records');
        $notify($deanId, 'registration', 'New alumni registration', 'Paolo Mendoza (BSIT 2026) registered.', 'records');
        $notify($adminId, 'job_submitted', count(self::QUEUE).' job postings submitted for review', 'Alumni-submitted postings are waiting in the approval queue.', 'jobs');
        $notify($mariaUser, 'job_match', 'New job match: Cloud Support Engineer', 'Northpoint Cloud is hiring and your skills match this posting.', 'jobs');
        $notify($mariaUser, 'survey', 'Alumni survey response received', 'Thank you — your AY 2025–2026 survey has been recorded.', 'dashboard');

        $this->messages($mariaId, $mariaUser, $adminId, $deanId);
    }

    /** The mockup's sample Messages: Maria with the office and with CCS, and the CCS dean with the office. */
    private function messages(int $mariaId, int $mariaUser, int $adminId, int $deanId): void
    {
        $threads = [
            [['channel' => 'office', 'alumni_id' => $mariaId], [
                [$adminId, 'admin', -3, '09:12', 'Hi! Welcome to the UDM Alumni portal. Let us know if you need help completing your profile.'],
                [$mariaUser, 'alumni', -3, '09:20', 'Thank you! Where can I update my employment details?'],
                [$adminId, 'admin', -3, '09:24', 'Open Alumni Profile → Edit Profile → Employment. Our office reviews changes within 2 working days.'],
            ]],
            [['channel' => 'college', 'alumni_id' => $mariaId], [
                [$deanId, 'dept', -2, '13:10', 'Hello! This is the CCS Coordinator. Please confirm your program and graduation year for our records.'],
                [$mariaUser, 'alumni', -2, '13:32', 'BSIT, graduated 2024. Thank you!'],
            ]],
            [['channel' => 'admin', 'staff_user_id' => $deanId], [
                [$adminId, 'admin', -1, '10:05', 'Good day, Coordinator. Please send the CCS outreach summary before the end of the month.'],
                [$deanId, 'dept', -1, '10:22', 'Noted. I will send it by Friday.'],
            ]],
        ];
        foreach ($threads as [$thread, $msgs]) {
            $last = $this->at($msgs[array_key_last($msgs)][2], $msgs[array_key_last($msgs)][3]);
            $id = DB::table('message_thread')->insertGetId($thread + ['last_message_at' => $last, 'created_at' => $this->at($msgs[0][2], $msgs[0][3])], 'thread_id');
            // Each sender has read up to their own last message; the other side's newest reply stays unread.
            $read = [];
            foreach ($msgs as [$by, $role, $day, $time, $body]) {
                $read[$by] = DB::table('message')->insertGetId(['thread_id' => $id, 'sender_id' => $by, 'sender_role' => $role, 'body' => $body, 'created_at' => $this->at($day, $time)], 'message_id');
            }
            foreach ($read as $by => $lastId) {
                DB::table('message_read')->insert(['thread_id' => $id, 'user_id' => $by, 'last_read_id' => $lastId]);
            }
        }
    }

    /** @param  array<string, mixed>  $extra */
    private function user(string $email, string $role, string $name, array $extra, string $hash): int
    {
        return DB::table('user_account')->insertGetId(array_merge([
            'email' => $email, 'password_hash' => $hash, 'role' => $role, 'display_name' => $name,
        ], $extra), 'user_id');
    }

    /** @param  array<string, mixed>  $row */
    private function alumnus(array $row): int
    {
        $row['permanent_address'] ??= $row['present_address'] ?? null;
        $row['civil_status'] ??= 'single';
        $row['updated_at'] = $row['created_at'];

        return DB::table('alumnus')->insertGetId($row, 'alumni_id');
    }

    /** @param  array<string, mixed>  $answers */
    private function submitSurvey(int $alumniId, int $cycleId, array $answers, CarbonImmutable $when): void
    {
        $responseId = DB::table('survey_response')->insertGetId([
            'alumni_id' => $alumniId, 'cycle_id' => $cycleId, 'status' => 'submitted',
            'completion_pct' => SurveyMapping::completionPct($answers), 'current_section' => 4,
            'first_gen_grad' => SurveyMapping::yesNo($answers, 'first_grad'), 'passed_udmcat' => SurveyMapping::yesNo($answers, 'udmcat'),
            'answers' => json_encode($answers), 'submitted_at' => $when, 'created_at' => $when, 'updated_at' => $when,
        ], 'response_id');
        $employment = SurveyMapping::employment($answers);
        if ($employment !== null) {
            DB::table('employment_record')->insert($employment + [
                'alumni_id' => $alumniId, 'response_id' => $responseId, 'is_current' => true, 'created_at' => $when, 'updated_at' => $when,
            ]);
        }
        foreach (SurveyMapping::credentials($answers) as $c) {
            DB::table('credential')->insert(['alumni_id' => $alumniId, 'type' => $c['type'], 'name' => $c['name']]);
        }
    }

    /**
     * Survey answers for an employment outcome, as the form would produce them.
     *
     * @param  array<int, string|null>  $outcome  [status, title?, employer?, family?, org?]
     * @return array<string, mixed>
     */
    private function answersFor(array $outcome, string $fam): array
    {
        $a = [
            'first_grad' => $this->rand() < 0.37 ? 'Yes' : 'No',
            'udmcat' => $this->rand() < 0.8 ? 'Yes' : 'No',
            'honors' => $this->rand() < 0.12 ? 'Cum Laude' : 'None',
            'prof_exams' => match (true) {
                $fam === 'health' && $this->rand() < 0.7 => 'Nursing Licensure Examination',
                $fam === 'edu' && $this->rand() < 0.6 => 'Licensure Examination for Teachers',
                default => 'None',
            },
        ];
        [$status, $title, $employer, $f, $org] = array_pad($outcome, 5, null);
        if ($status === 'not_employed' || $status === 'further_studies') {
            $a['ever_employed'] = 'No';
            $a['unemployed_reason'] = $status === 'further_studies'
                ? ['Advance or further study']
                : [$this->pick(['Lack of work experience', 'No job opportunity available', 'Awaiting results of a job application', 'Family concern and decided not to find a job'])];
        } else {
            $self = $status === 'self_employed';
            $f ??= 'biz';
            $a += [
                'ever_employed' => 'Yes', 'job_name' => $title, 'employer' => $employer, 'job_address' => 'Metro Manila',
                'job_status' => $self ? 'Self-employed' : $this->pick(['Regular or Permanent', 'Regular or Permanent', 'Regular or Permanent', 'Contractual', 'Temporary']),
                'org_type' => $org === 'self_owned' || $self ? 'Self-owned business' : ($f === 'gov' || ($f === 'edu' && $this->rand() < 0.6) ? 'Government' : 'Private'),
                'business_line' => self::SECTOR[$f],
                'occ_class' => $this->pick(['Professionals', 'Professionals', 'Technicians and associate professionals', 'Clerical support workers', 'Service and sales workers']),
                'place_of_work' => $this->rand() < 0.93 ? 'Local (within the Philippines)' : 'Abroad',
                'time_to_job' => $this->pick(self::TTJ),
                'job_related' => $this->rand() < 0.72 ? 'Yes' : 'No', 'still_working' => 'Yes', 'stay_reasons' => ['Salaries and benefits'],
            ];
            if ($self) {
                $a += [
                    'se_years' => $this->pick(['1 year', '2 years', '3 years']), 'se_nature' => $title, 'se_reason' => ['Independence at work'],
                    'se_related' => $a['job_related'], 'se_other_job' => 'No',
                ];
            }
        }
        $a['fb_contribute'] = $this->pick(['Mentoring graduating students', 'Hiring UDM graduates in my company', 'Donating to the scholarship fund', 'Speaking at career talks']);
        $a['fb_activity'] = $this->pick(['Annual job fair', 'Batch reunions', 'Career webinars', 'Alumni sports fest']);

        return $a;
    }

    /** @param  array<string, string>  $links */
    private function links(int $alumniId, array $links, bool $visible): void
    {
        foreach ($links as $platform => $url) {
            DB::table('social_link')->insert(['alumni_id' => $alumniId, 'platform' => $platform, 'url' => $url, 'is_visible' => $visible]);
        }
    }

    /** @param  list<string>  $names */
    private function skills(int $alumniId, array $names): void
    {
        foreach ($names as $k => $name) {
            $skillId = DB::selectOne(
                'INSERT INTO skill (name) VALUES (?) ON CONFLICT (lower(name)) DO UPDATE SET name = skill.name RETURNING skill_id', [$name],
            )->skill_id;
            DB::table('alumni_skill')->insertOrIgnore(['alumni_id' => $alumniId, 'skill_id' => $skillId, 'is_top' => $k === 0]);
        }
    }

    /** @param  list<string>  $tags */
    private function jobSkills(int $jobId, array $tags): void
    {
        foreach ($tags as $tag) {
            DB::insert('INSERT INTO job_skill (job_id, skill_id) SELECT ?, skill_id FROM skill WHERE lower(name) = lower(?)', [$jobId, $tag]);
        }
    }

    private static function family(string $programName): string
    {
        return match (true) {
            (bool) preg_match('/Information|Computer|Data Science|Cybersecurity|Electronics/', $programName) => 'tech',
            (bool) preg_match('/Nursing|Physical Therapy|Psychology/', $programName) => 'health',
            (bool) preg_match('/Education|BTVTE|Physical Education/', $programName) => 'edu',
            (bool) preg_match('/Criminology|Criminal|Juris|Public Administration|Political|Social Work/', $programName) => 'gov',
            default => 'biz',
        };
    }

    /** A Manila date-time relative to today, e.g. at(-3, '14:00'). */
    private function at(int $days, string $time = '09:00'): CarbonImmutable
    {
        return $this->today->addDays($days)->setTimeFromTimeString($time)->utc();
    }

    private function dob(int $batch): string
    {
        return sprintf('%d-%02d-%02d', $batch - 22, mt_rand(1, 12), mt_rand(1, 28));
    }

    private function exampleEmail(string $first, string $last, string $seq): string
    {
        $slug = fn (string $s) => strtolower((string) preg_replace('/[^A-Za-z]+/', '', $s));

        return "{$slug($first)}.{$slug($last)}.{$seq}@example.com";
    }

    private function rand(): float
    {
        return mt_rand() / (mt_getrandmax() + 1);
    }

    /**
     * @template T
     *
     * @param  array<int, T>  $items
     * @return T
     */
    private function pick(array $items): mixed
    {
        return $items[mt_rand(0, count($items) - 1)];
    }
}
