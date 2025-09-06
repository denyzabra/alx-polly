# ALX Polly: A Polling Application

Welcome to ALX Polly, a full-stack polling application built with Next.js, TypeScript, and Supabase. This project serves as a practical learning ground for modern web development concepts, with a special focus on identifying and fixing common security vulnerabilities.

[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-green)](https://supabase.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.0-38B2AC)](https://tailwindcss.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-Components-purple)](https://ui.shadcn.com/)

## About the Application

ALX Polly allows authenticated users to create, share, and vote on polls. It's a simple yet powerful application that demonstrates key features of modern web development:

-   **Authentication**: Secure user sign-up and login with rate limiting and suspicious activity detection.
-   **Poll Management**: Users can create, view, update, and delete their own polls.
-   **Voting System**: A straightforward system for casting and viewing votes with duplicate vote prevention.
-   **User Dashboard**: A personalized space for users to manage their polls and view analytics.
-   **QR Code Sharing**: Easy sharing of polls via unique links and QR codes.

The application is built with a modern tech stack:

-   **Framework**: [Next.js](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Backend & Database**: [Supabase](https://supabase.io/)
-   **UI**: [Tailwind CSS](https://tailwindcss.com/) with [shadcn/ui](https://ui.shadcn.com/)
-   **State Management**: React Server Components and Client Components
-   **API Communication**: Next.js Server Actions for data mutations

## Security Features

ALX Polly implements several security measures to protect user data and prevent common vulnerabilities:

-   **Rate Limiting**: Prevents brute force attacks by limiting login and registration attempts.
-   **Account Lockout**: Temporarily locks accounts after multiple failed login attempts.
-   **Device Fingerprinting**: Identifies new devices and can require additional verification.
-   **Suspicious Activity Detection**: Monitors for unusual login patterns and location changes.
-   **Role-Based Access Control (RBAC)**: Restricts access to administrative features based on user roles.
-   **Input Validation**: Validates all user inputs to prevent injection attacks.
-   **Error Handling**: Provides generic error messages to users while logging detailed errors securely.
-   **HTTP-Only Cookies**: Stores sensitive session data in HTTP-only cookies to prevent XSS attacks.

---

## 🚀 The Challenge: Security Audit & Remediation

As a developer, writing functional code is only half the battle. Ensuring that the code is secure, robust, and free of vulnerabilities is just as critical. This version of ALX Polly has been intentionally built with several security flaws, providing a real-world scenario for you to practice your security auditing skills.

**Your mission is to act as a security engineer tasked with auditing this codebase.**

### Your Objectives:

1.  **Identify Vulnerabilities**:
    -   Thoroughly review the codebase to find security weaknesses.
    -   Pay close attention to user authentication, data access, and business logic.
    -   Think about how a malicious actor could misuse the application's features.

2.  **Understand the Impact**:
    -   For each vulnerability you find, determine the potential impact.Query your AI assistant about it. What data could be exposed? What unauthorized actions could be performed?

3.  **Propose and Implement Fixes**:
    -   Once a vulnerability is identified, ask your AI assistant to fix it.
    -   Write secure, efficient, and clean code to patch the security holes.
    -   Ensure that your fixes do not break existing functionality for legitimate users.

### Where to Start?

A good security audit involves both static code analysis and dynamic testing. Here’s a suggested approach:

1.  **Familiarize Yourself with the Code**:
    -   Start with `app/lib/actions/` to understand how the application interacts with the database.
    -   Explore the page routes in the `app/(dashboard)/` directory. How is data displayed and managed?
    -   Look for hidden or undocumented features. Are there any pages not linked in the main UI?

2.  **Use Your AI Assistant**:
    -   This is an open-book test. You are encouraged to use AI tools to help you.
    -   Ask your AI assistant to review snippets of code for security issues.
    -   Describe a feature's behavior to your AI and ask it to identify potential attack vectors.
    -   When you find a vulnerability, ask your AI for the best way to patch it.

---

## Getting Started

To begin your security audit, you'll need to get the application running on your local machine.

### 1. Prerequisites

-   [Node.js](https://nodejs.org/) (v20.x or higher recommended)
-   [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
-   A [Supabase](https://supabase.io/) account (the project is pre-configured, but you may need your own for a clean slate).

### 2. Installation

Clone the repository and install the dependencies:

```bash
git clone <repository-url>
cd alx-polly
npm install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Replace the placeholder values with the keys from your Supabase project dashboard.

### 4. Database Setup

ALX Polly requires several tables in your Supabase database. You can set these up by running the SQL scripts in the `supabase/migrations` directory or by manually creating the following tables:

- `profiles`: User profile information
- `polls`: Poll data
- `poll_options`: Options for each poll
- `votes`: User votes on polls
- `login_attempts`: Tracking for rate limiting and security

### 5. Running the Development Server

Start the application in development mode:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

```
/app                    # Next.js App Router pages and routes
  /(auth)               # Authentication pages (login, register)
  /(dashboard)          # User dashboard pages
  /api                  # API routes
/components             # Reusable React components
  /ui                   # shadcn/ui components
/lib                    # Utility functions and shared code
  /actions              # Server Actions for data mutations
  /context              # React context providers
  /supabase             # Supabase client configuration
  /types                # TypeScript type definitions
  /utils                # Utility functions
    /error-handling.ts  # Error handling utilities
    /identity-verification.ts # Device fingerprinting and verification
    /rate-limiter.ts    # Rate limiting implementation
    /rbac.ts            # Role-based access control
/public                 # Static assets
```

## Security Implementation Details

### Rate Limiting

The application implements a sliding window rate limiter that tracks login and registration attempts by IP address and email. This prevents brute force attacks by limiting the number of attempts within a specific time window.

### Device Verification

When a user logs in from a new device, the system can require additional verification steps. This is implemented through device fingerprinting that combines user agent and IP information.

### Role-Based Access Control

The application uses a role-based access control system to restrict access to certain features based on user roles (USER, ADMIN, MODERATOR). This ensures that only authorized users can access sensitive functionality.

### Error Handling

The application implements a comprehensive error handling system that provides generic error messages to users while logging detailed error information securely. This prevents information leakage that could aid attackers.

Good luck, engineer! This is your chance to step into the shoes of a security professional and make a real impact on the quality and safety of this application. Happy hunting!
