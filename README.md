# Dog Grooming Theory Coursework App

A full-stack web application to digitize and streamline dog grooming theory coursework assessment for Upper Hound Dog Grooming Academy.

## Features

- **AI-Powered Assessment**: Automated marking with OpenAI GPT-4 for instant feedback
- **Human Review**: Course leaders can review and override AI assessments
- **Multi-Question Types**: Support for multiple choice, short text, and long-form answers
- **Role-Based Access**: Different interfaces for students, course leaders, and administrators
- **Real-time Updates**: Live progress tracking and notifications
- **Comprehensive Analytics**: Track student progress and system performance

## Tech Stack

- **Frontend**: Next.js 15 with React 19 and TypeScript
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **AI**: OpenAI GPT-4 API for intelligent assessment
- **UI**: shadcn/ui components with Tailwind CSS
- **Deployment**: Vercel (frontend) + Supabase (backend)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase CLI (`npm install -g supabase`)
- Supabase account and project
- OpenAI API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dog-grooming-theory-coursework-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase CLI**
   ```bash
   # Initialize Supabase in the project
   npx supabase init
   
   # Login to your Supabase account
   npx supabase login
   
   # Link to your existing Supabase project
   npx supabase link --project-ref your-project-ref
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```

   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   SUPABASE_DB_PASSWORD=your_database_password
   OPENAI_API_KEY=your_openai_api_key
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

5. **Set up the database**
   
   Use Supabase CLI to push the consolidated schema:
   ```bash
   # Push the consolidated migration to your database
   npx supabase db push
   
   # Alternative: Push to specific database URL if needed
   npx supabase db push --db-url "postgresql://postgres.your-ref:password@aws-region.pooler.supabase.com:6543/postgres"
   ```

6. **Verify the setup**
   ```bash
   # Run verification scripts to ensure everything is working
   npm run verify-rls
   npm run verify-crud
   npm run test
   ```

7. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   ├── dashboard/         # Student/Course Leader dashboard
│   ├── admin/             # Admin interface
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/                # shadcn/ui base components
│   ├── forms/             # Form components
│   └── layout/            # Layout components
├── lib/                   # Utility functions
│   ├── supabase/          # Supabase client and utilities
│   ├── ai/                # OpenAI integration
│   └── utils.ts           # General utilities
├── types/                 # TypeScript type definitions
└── hooks/                 # Custom React hooks
```

## Database Schema

The application uses PostgreSQL with a comprehensive course management system:

### Core Tables
- **profiles**: User information and roles (student, course_leader, admin)
- **courses**: Course catalog with enrollment management
- **course_enrollments**: Student-to-course relationships with progress tracking
- **course_instructors**: Instructor-to-course assignments

### Content & Assessment
- **questions**: Question bank with course-specific assignments
- **assignments**: Course-specific assignments with question collections
- **submissions**: Student answers and assessment data
- **ai_assessments**: AI-generated feedback and scores
- **final_grades**: Instructor final assessments and overrides

### Authentication & Invitations
- **invitations**: Course-specific invitation system
- **coursework_assignments**: Legacy assignment support

All tables include Row Level Security (RLS) policies for proper access control based on user roles and course enrollments.

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## User Roles

### Students
- Complete coursework assignments
- View AI feedback and final grades
- Track progress across modules
- Access assignment history

### Course Leaders
- Review AI assessments
- Provide manual overrides and additional feedback
- Monitor student progress
- Manage question assignments

### Administrators
- Manage users and roles
- Create and edit questions
- View system analytics
- Configure AI parameters

## AI Assessment

The system uses OpenAI GPT-4 to:

1. **Evaluate Answers**: Assess accuracy, completeness, and understanding
2. **Generate Feedback**: Provide constructive, actionable feedback
3. **Score Submissions**: Assign scores from 0-100 with confidence levels
4. **Suggest Improvements**: Offer specific recommendations for enhancement

## Security Features

- Row Level Security (RLS) policies for data protection
- Role-based access control
- Input validation and sanitization
- Encrypted data transmission
- GDPR compliance considerations

## Deployment

### Vercel Deployment

1. **Connect repository to Vercel**
2. **Set environment variables in Vercel dashboard**
3. **Deploy automatically on push to main branch**

### Supabase Setup

1. **Create Supabase project**
2. **Run database migrations**
3. **Configure Row Level Security policies**
4. **Set up authentication providers**

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

For support, contact the development team or create an issue in the repository.

## License

This project is proprietary software developed for Upper Hound Dog Grooming Academy.

---

**Built with ❤️ for better dog grooming education**