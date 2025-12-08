🟢 Milestone 1: Secure Foundation & Project Setup
Goal: Build a secure, authenticated skeleton for the entire application.

Tasks:

Finalize Tech Stack: Decide on the framework, database, and hosting.

Set Up Development Environment: Initialize the project and repository.

Design Database Schema: Create the users table for the admin and the interns table.

Implement User Authentication System: Build a secure login system for the single management user. This includes:

Login page.

Password hashing.

Session management.

Create a Basic Authenticated Dashboard: Build a main page after login that will host the navigation menu (e.g., for "Intern Registration," "Attendance"). No features work without logging in first.


🟡 Milestone 2: Core Feature - Intern Registration Module
Goal: Implement the complete flow for registering a new intern, including sending the email receipt.

Tasks:

Build the Registration Form: Create the user interface form with all necessary fields (aligned with the interns table).

Implement Backend Logic: Develop the server-side code to receive the form data, validate it, and save it to the interns table in the database.

Integrate Email Service: Connect the application to an email service (e.g., SMTP, SendGrid, Mailgun).

Generate & Send Receipt: Code the functionality that, upon successful registration, generates a customized receipt (in HTML or PDF format) and automatically sends it to the intern's email address.

✅ Exit Criteria: A user can fill out the registration form, submit it, and the intern's data is saved in the database while a receipt is sent to their email.


🟠 Milestone 3: Core Feature - Attendance List Module
Goal: Implement the functionality to record attendance and export the list to Excel.

Tasks:

Build Attendance Recording Interface: Create a simple UI (e.g., a list of interns with checkboxes for a given day) to mark attendance.

Implement Attendance Storage: Develop the backend to save the daily attendance records to the attendance table, linking each record to an intern.

Create "Export to Excel" Functionality: Build the feature that queries the database for the most recent attendance records and generates/downloads an Excel (.xlsx) file. This depends on the data structures from Milestones 1 and 2.

✅ Exit Criteria: A user can mark interns as present/absent for a day and download a corresponding Excel file of the attendance list.

🔵 Milestone 4: Security, User Authentication & Polish
Goal: Secure the application and refine the user experience.

Tasks:

Implement User Login System: Create a secure authentication system for the single management user.

Apply Basic Styling (UI/UX): Now that all core functions work, apply CSS and front-end polish to make the application intuitive and easy to use for a non-tech-savvy person. Doing this last ensures styling doesn't break during feature implementation.

Connect Print Functionality: Implement the front-end code to link the "Print" function from the browser to the exported Excel attendance list and the emailed receipt.

Basic Security Hardening: Ensure all data is validated, database queries are sanitized, and the site is served over HTTPS.

✅ Exit Criteria: The application is password-protected, visually clean and intuitive, and all core features are fully functional and secure.

🟣 Milestone 5: Deployment & Training
Goal: Launch the application for the end-user and provide training.

Tasks:

Deploy to Production: Move the application from the development server to a live, production server that the user can access.

Final Testing: Perform end-to-end testing on the live environment to ensure everything works as expected.

Conduct Tutorial Session: Hold the physical tutorial session with Madam Bibianna, walking her through each feature.

✅ Exit Criteria: The MANTech system is live, accessible to the user, and the user has been trained on how to use it.

What's Next (Post-MVP)
After these milestones are complete and the MVP is successfully in use, you can then add the more advanced features without conflict, as they will be new modules:

Milestone 6: Event Planning Module

Milestone 7: Budget Management & Statistics Module
