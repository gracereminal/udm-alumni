# Test Plan — UDM Alumni Management & Engagement System (UDM-AMES)

| | |
|---|---|
| **System** | UDM Alumni Management & Engagement System (UDM Alumni Tracer) |
| **Roles under test** | Alumni, College / Department, Admin |
| **Environment** | Production build (Railway + Neon PostgreSQL), current Chrome, Edge, Firefox and Safari, desktop and phone width (760 px and below) |
| **Test accounts** | Admin (`admin@udmalumni.edu`), College Dean (e.g. CCS), test alumni created for the run and archived afterwards |
| **Reference** | [product-req-document.md](product-req-document.md), [deploy-notes.md](deploy-notes.md) |

Fill in **Actual Result** and **Status** while running each case. Status is **Passed** when the actual result matches the expected result, otherwise **Failed** (note the defect in Actual Result).

---

## 1. Authentication

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 1 | Admin Authentication: Launch URL, Enter admin credentials, Login | URL, Username, Password | Admin should be able to login and be redirected to the Admin dashboard. | | |
| 2 | College Authentication: Launch URL, Enter college staff credentials, Login | URL, College staff email, Password | College user should be able to login and be redirected to the College dashboard. | | |
| 3 | Alumni Authentication (email): Launch URL, Enter alumni email and password, Login | URL, Alumni email, Password | Alumni should be able to login and be redirected to the Alumni dashboard. | | |
| 4 | Alumni Authentication (Alumni ID): Launch URL, Enter Alumni ID and password, Login | URL, Alumni ID (`AM-YYYY-Nnnnn`), Password | Alumni should be able to login using the Alumni ID and be redirected to the Alumni dashboard. | | |
| 5 | Invalid Login: Launch URL, Enter a wrong password, Login, Then try an unregistered email | Valid email + wrong password, Unregistered email | The same generic "incorrect email or password" message is shown both times; the system does not reveal which accounts exist. | | |
| 6 | Account Lockout: Enter a wrong password five times in a row, Try again with the correct password | Valid email, Wrong password ×5, Correct password | The account is locked for 15 minutes and the correct password is refused until the lockout ends. | | |
| 7 | Logout: Login, Click Logout, Press the browser Back button | Any valid account | The user is signed out and returned to Sign In; protected pages cannot be opened with Back. | | |

## 2. Change Password (one-time and temporary passwords)

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 8 | Forced Password Change: Login with a one-time password, Type a dashboard URL in the address bar | Staff email, One-time password, `/admin/dashboard` | The user is sent to the Change Password screen and cannot open any other page. | | |
| 9 | Invalid New Password: Enter a weak password, Then two passwords that do not match, Submit | `password`, `NewPass123` / `NewPass124` | Validation messages are shown; the password is not changed. | | |
| 10 | Set New Password: Enter a valid new password twice, Submit | New password (8+ chars, 1 number, 1 uppercase) | Password is changed, other sessions are signed out and the user is redirected to their dashboard. | | |

## 3. Forgot / Reset Password

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 11 | Request Reset Code: Click Forgot password, Enter email or Alumni ID, Submit | Registered email or Alumni ID | The 6-digit code step is shown and a reset email with a code and a Reset Password link is received. | | |
| 12 | Unknown Email: Click Forgot password, Enter an unregistered email, Submit | Unregistered email | The flow continues to the done screen; no email is sent and no "account not found" message appears. | | |
| 13 | Reset with Code: Enter the 6-digit code, Enter a valid new password, Submit, Login with the new password | Code from email, New password | Password is changed and the new password works at Sign In. | | |
| 14 | Reused Link: Open the Reset Password link again after it was used | Used reset link | The expired / invalid link state is shown. | | |

## 4. Alumni Registration

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 15 | Privacy Consent Required: Click Register as Alumni, Click Continue without ticking consent | Consent unchecked | Registration does not proceed; the consent checkbox is marked required. | | |
| 16 | Personal Information: Tick consent, Fill in personal details, Select Married and Yes for IP group and PWD, Continue | Name, Birth date, Addresses, Gender, Marital status = Married, IP = Yes, PWD = Yes | "Name after marriage" and the IP / PWD follow-up fields appear and are required; the step is accepted when filled. | | |
| 17 | Contact Validation: Leave mobile or Facebook blank, Enter an invalid email, Continue | Blank required fields, `maria@` | Field errors are shown; the step does not proceed. | | |
| 18 | Duplicate Email: Register with an email that already belongs to an account | Existing account email | The server rejects the registration and the email field shows the error. | | |
| 19 | Educational Background: Select a college, Check the program list, Select "Others" | College = CCS, Program = Others | The program list only shows the selected college's programs; "Others" opens a free-text field. | | |
| 20 | Password Rules: Enter a password without a number or uppercase letter | `password`, `PASSWORD`, `Pass1` | Validation explains the rules (8+ chars, a number, an uppercase letter); the step does not proceed. | | |
| 21 | Successful Registration: Complete all steps with valid data, Submit, Sign in with the new account | Valid data for all steps | Success screen shows a new Alumni ID; the alumnus signs in right away and Admin and the college get a "new registration" notification. | | |

## 5. Role-based Access

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 22 | Alumni Opens Admin Page: Login as alumni, Type an Admin URL | `/admin/dashboard`, `/admin/records` | The alumnus is redirected to their own area; the API rejects the call. | | |
| 23 | College Opens Admin Page: Login as college staff, Type an Admin URL | `/admin/ai-data`, `/admin/tracer` | The college user is redirected to their own area; the API rejects the call. | | |
| 24 | College Scope: Login as CCS staff, Open Alumni Records and Reports | CCS College account | Only CCS alumni and figures appear; other colleges' records are never shown. | | |

## 6. Alumni Portal

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 25 | Alumni Dashboard: Login as alumni, View the dashboard | Alumni account | Profile summary and completion, survey status, announcements, events and open jobs are shown. | | |
| 26 | Edit Profile / Tracer Survey: Click Edit, Update answers in each tab, Save Changes | Updated employment details | Changes are saved; Profile and Dashboard completion show the new values. | | |
| 27 | Conditional Survey Sections: Set employment status to Employed, then Self-employed, then Unemployed | Employment status values | Employment Details shows only if ever employed; Self-Employment shows only if self-employed. | | |
| 28 | Upload Profile Photo: Upload a valid photo, Save Changes, Then try an invalid file | JPG under 2 MB, `.gif` file, 5 MB JPG | The valid photo is shown on the profile; the invalid files are refused with an error message. | | |
| 29 | Directory Visibility: Open Privacy & My Data, Turn on directory visibility and one contact channel, Search for the alumnus with Ctrl+K from another account | Visibility switches, Alumni name | Settings save at once; the alumnus appears in the search with only that channel. | | |
| 30 | Download My Data: Open Privacy & My Data, Click Download a copy | Alumni account | A JSON file with the alumnus' record is downloaded. | | |
| 31 | Upload Proof of Employment: Open the proof request notice, Upload the document | PDF or image file | The proof is uploaded and staff can open it only through a signed link. | | |

## 7. Jobs (Alumni)

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 32 | Search and Filter Jobs: Open Jobs, Enter a keyword, Apply filters | Keyword, Job type, Location | Only matching postings are listed. | | |
| 33 | Save Job: Click Save on a posting, Open saved jobs | Job posting | The job appears as saved. | | |
| 34 | Apply via Email: Click Apply, Edit the prefilled message, Choose Email, Mark as applied | Posting with an email address | The mail app opens with subject and message; the listing shows "Application sent via Email". | | |
| 35 | Apply via Messenger: Click Apply, Choose Facebook Messenger, Mark as applied | Posting with a Messenger link | `m.me` opens in a new tab, the message is copied, and the listing shows "Application sent via Messenger". | | |
| 36 | Post a Job: Click Post a job, Fill in the form, Submit | Title, Company, Description, How to apply, Messenger | The posting goes to the Admin review queue and is not public yet. | | |

## 8. Events (Alumni)

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 37 | Register for Event: Open Events, Click Register, Answer the event questions, Submit | Event custom answers | A registered banner appears and a confirmation email with an entry pass code (`UDM-XXXX-NNNNN`) is received. | | |
| 38 | Full Event: Try to register for an event with status Full | Full event | Registration is refused with a message. | | |
| 39 | Add to Calendar: Click Add to Calendar on an event | Event | Google Calendar opens prefilled with the time (Asia/Manila), venue and link back to the event. | | |

## 9. Messages

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 40 | Alumni to Office: Login as alumni, Open Messages, Select Alumni Relations Office, Send a message | Message text | The message is sent; Admin sees the thread with an unread count. | | |
| 41 | Alumni to College: Open Messages, Select own college, Send a message | Message text | The message is sent; the college staff see it with an unread count. Only the office and own college are available as recipients. | | |
| 42 | College to Office: Login as college staff, Message the Alumni Relations Office | Message text | Admin receives the message in the college thread. | | |

## 10. College / Department Portal

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 43 | College Dashboard: Login as college staff, Filter by program and batch range | Program, Batch range | KPIs and the employment donut update for the college; the university comparison shows rates only. | | |
| 44 | College Alumni Records: Open Alumni Records, Search, Filter, Sort, Open a quick view | Name, Program, Batch | Only the college's records are shown; the quick view offers Verify only (no add, edit or delete). | | |
| 45 | Outreach Contact: Open Outreach, Click Contact on an unresponsive alumnus, Choose Email, Confirm | Unresponsive alumnus | The mail app opens and the record shows "Today · Email". | | |
| 46 | College Reports: Open Reports, Choose a report type, Preview | Report type | The report is locked to the college; the college cannot be changed. | | |

## 11. Admin — Alumni Records

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 47 | Admin Dashboard: Login as Admin, Filter by batch range | Batch range | System-wide KPIs and charts update; totals match Alumni Records and Reports. | | |
| 48 | Search and Filter Records: Search, Filter by college, program, batch and status, Sort | Filter values | The table shows matching records with correct pagination and status KPI cards. | | |
| 49 | Add Record: Click Add, Fill in the form, Save | New alumni details | The record is created and appears in the table. | | |
| 50 | Edit Record: Open a record, Edit fields, Save | Updated details | Changes are saved and appear in the change history. | | |
| 51 | Bulk Actions: Select several records, Bulk verify, Then export to CSV | Selected records | Status of all selected records changes, KPI cards update and a CSV file is downloaded. | | |
| 52 | Archive and Restore: Archive a record with a reason, Then restore it | Reason | The record leaves the active counts when archived and returns when restored. | | |

## 12. Admin — AI Data Management

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 53 | Upload Masterlist: Open AI Data Management, Upload a masterlist file | CSV or `.xlsx` in the template columns | The file is read and the rows are listed for validation. | | |
| 54 | Invalid File: Upload a wrong file type or a file over 5 MB / 2,000 rows | `.pdf`, 6 MB CSV, 2,500-row CSV | The upload is refused with a clear message. | | |
| 55 | Run AI Validation: Click Run AI validation | Masterlist with bad names, wrong years, duplicates, missing contacts | Rows are scored, problems are flagged and a fix is suggested. | | |
| 56 | Confirm Blocked: Leave one flagged row without a decision, Click Confirm | Undecided flagged row | Confirm is blocked until every flagged row has a decision; nothing is written. | | |
| 57 | Confirm Import: Decide all flagged rows, Click Confirm | Reviewed batch | New records and accounts are created, and new alumni receive the invite email with a temporary password. | | |
| 58 | Roll Back Batch: Roll back a batch where no new alumni has signed in | Confirmed batch | Created records are removed, updated records are restored and the audit log shows the rollback. | | |

## 13. Admin — Reports

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 59 | Generate Form A: Open Reports, Choose UDM Alumni Survey — Form A, Set filters, Preview | College, Program, Batch range | The report previews with figures matching the dashboard for the same scope. | | |
| 60 | Other Report Types: Preview Employability by Program, Batch Coverage Audit, Employer & Industry Distribution, Inclusion Profile | Each report type | Each report previews correctly; Inclusion shows aggregated counts only and Employer shows no named alumni. | | |
| 61 | Export Report: Export to PDF, Excel and CSV | Any report | Each file is produced and the export appears in the report history. | | |

## 14. Admin — Jobs and Events Management

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 62 | Post Job: Click Post job, Fill in the form with a cover photo, Publish | Title, Company, Cover photo, How to apply | The job is published and visible to alumni. | | |
| 63 | Approve Submitted Job: Open the review queue, Approve an alumni submission | Job from test case 36 | The job is published and only the poster is notified. | | |
| 64 | Decline Submitted Job: Decline an alumni submission | Pending job | The job is not published and the poster is notified. | | |
| 65 | Create Event: Click Create event, Add cover photo, agenda and custom fields, Publish | Event details | The event is published and its Dashboard announcement appears for alumni. | | |
| 66 | Change Event Status: Set status to Full, then Past | Existing event | Alumni see the new status; registrants are notified of changes. | | |

## 15. Admin — Alumni Tracer (Question Settings)

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 67 | Edit Question Text: Open Alumni Tracer, Edit a question's text and placeholder, Save | New question text | The Register form and Edit Profile show the new text right away. | | |
| 68 | Add Question: Add a required single-choice question to Employment | Question text, 2+ options | The question appears in Edit Profile and completion is recalculated for every alumnus. | | |
| 69 | Core Field Protection: Try to hide or make optional a core field | Email, College, Program | The switch is disabled; the core field stays required and shown. | | |

## 16. Responsive Layout

| Test Case Number | Test Step | Test Data | Expected Result | Actual Result | Status (Passed/Failed) |
|---|---|---|---|---|---|
| 70 | Phone Layout: Open each role's main pages at 760 px width or less | Phone or browser dev tools | The phone layout is used; no horizontal scroll and all actions are reachable. | | |

---

## Summary

| Module | Test Cases | Passed | Failed |
|---|---|---|---|
| 1. Authentication | 1–7 | | |
| 2. Change Password | 8–10 | | |
| 3. Forgot / Reset Password | 11–14 | | |
| 4. Alumni Registration | 15–21 | | |
| 5. Role-based Access | 22–24 | | |
| 6. Alumni Portal | 25–31 | | |
| 7. Jobs (Alumni) | 32–36 | | |
| 8. Events (Alumni) | 37–39 | | |
| 9. Messages | 40–42 | | |
| 10. College / Department Portal | 43–46 | | |
| 11. Admin — Alumni Records | 47–52 | | |
| 12. Admin — AI Data Management | 53–58 | | |
| 13. Admin — Reports | 59–61 | | |
| 14. Admin — Jobs and Events | 62–66 | | |
| 15. Admin — Alumni Tracer | 67–69 | | |
| 16. Responsive Layout | 70 | | |
| **Total** | **70** | | |

**Tested by:** ____________________  **Date:** ____________________
