# GymChad - AI-Powered Gym Tracking App

A production-ready, full-stack web application for gym tracking, nutrition logging, and AI-powered coaching. Built with React, Express, PostgreSQL, and Claude AI.

## Features

- **Workout Logging**: Track exercises, sets, reps, weight, and RPE with progressive overload recommendations
- **Nutrition Tracking**: Log meals with macro tracking, search food database (Open Food Facts), and track daily calorie intake
- **AI Coach**: Get personalized coaching advice based on your training and nutrition data
- **Progress Analytics**: View charts for training volume, strength curves, calorie adherence, and macro breakdown
- **Split Management**: Create and manage multiple workout splits, activate as needed
- **Mobile-First Design**: Fully responsive, optimized for phone use in the gym
- **PWA Support**: Install on your phone for offline capability

## Tech Stack

### Frontend
- React 18 + TypeScript
- Tailwind CSS for styling
- React Router v6 for navigation
- Zustand for state management
- Recharts for data visualization
- Axios for API calls
- React Hot Toast for notifications
- Vite as build tool

### Backend
- Node.js + Express.js + TypeScript
- PostgreSQL with Prisma ORM
- Supabase for authentication (email/password)
- Anthropic Claude API for AI coaching
- Open Food Facts API integration
- Express Rate Limiting

### Deployment
- Backend: Railway
- Frontend: Vercel
- Database: Supabase PostgreSQL

## Local Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or use Supabase)
- Git

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   - `DATABASE_URL`: PostgreSQL connection string
   - `ANTHROPIC_API_KEY`: Get from https://console.anthropic.com
   - `PORT`: API server port (default 3001)

4. **Set up database**
   ```bash
   # Run Prisma migrations
   npx prisma migrate dev
   
   # Seed with exercises
   npm run prisma:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```
   API will run on `http://localhost:3001`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create .env.local file**
   ```
   VITE_API_URL=http://localhost:3001/api/v1
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   App will run on `http://localhost:5173`

## API Endpoints

### Auth
- `POST /api/v1/auth/verify` - Verify JWT token and create user
- `PUT /api/v1/auth/profile` - Update user profile

### Workouts
- `GET /api/v1/workouts` - List user's workouts (paginated)
- `GET /api/v1/workouts/today` - Get today's workout
- `GET /api/v1/workouts/:id` - Get specific workout
- `POST /api/v1/workouts` - Create new workout
- `PUT /api/v1/workouts/:id` - Update workout
- `DELETE /api/v1/workouts/:id` - Soft delete workout
- `POST /api/v1/workouts/:id/sets` - Add a set
- `PUT /api/v1/workouts/:id/sets/:setId` - Update a set
- `DELETE /api/v1/workouts/:id/sets/:setId` - Delete a set
- `GET /api/v1/workouts/history/:exerciseId` - Last 10 sessions for exercise
- `GET /api/v1/workouts/recommendations` - Progressive overload suggestions

### Exercises
- `GET /api/v1/exercises` - List exercises (filterable by muscle group)
- `POST /api/v1/exercises` - Create custom exercise
- `DELETE /api/v1/exercises/:id` - Delete custom exercise

### Nutrition
- `GET /api/v1/nutrition` - Get nutrition log for a day
- `POST /api/v1/nutrition` - Log a food entry
- `PUT /api/v1/nutrition/:id` - Update nutrition entry
- `DELETE /api/v1/nutrition/:id` - Delete nutrition entry
- `GET /api/v1/nutrition/summary` - Weekly nutrition summary
- `GET /api/v1/foods/search` - Search Open Food Facts API
- `GET /api/v1/foods/custom` - Get user's custom foods
- `POST /api/v1/foods/custom` - Save custom food
- `DELETE /api/v1/foods/custom/:id` - Delete custom food

### Progress
- `GET /api/v1/progress/volume` - Weekly training volume
- `GET /api/v1/progress/strength` - Exercise strength curve (est. 1RM)
- `GET /api/v1/progress/calories` - Daily calorie intake vs target
- `GET /api/v1/progress/macros` - Average macros over period
- `GET /api/v1/progress/bodyweight` - Bodyweight tracking

### AI Coach
- `POST /api/v1/ai/coach` - Chat with AI coach (SSE streaming)

### Splits
- `GET /api/v1/splits` - List user's splits
- `POST /api/v1/splits` - Create split
- `PUT /api/v1/splits/:id` - Update split
- `DELETE /api/v1/splits/:id` - Delete split
- `PUT /api/v1/splits/:id/activate` - Set as active split
- `GET /api/v1/splits/:id/days` - Get split days with exercises

## Database Schema

The app uses Prisma for database management. Key models:

- **User**: App user with authentication and goals
- **Split**: Workout split template (e.g., Bro Split, PPL)
- **SplitDay**: Day within a split
- **SplitDayExercise**: Exercise ordered within a split day
- **Exercise**: Global or custom exercises
- **Workout**: Completed workout session
- **WorkoutSet**: Individual set within a workout
- **NutritionLog**: Logged food entry
- **CustomFood**: User-created food template
- **AISession**: Conversation history with AI coach
- **Event**: Analytics events for tracking user actions

## Progressive Overload

The app includes smart progressive overload recommendations:

- Tracks last 4 sessions of each exercise
- Suggests weight increases when user hits top of rep range for 2+ sessions
- Flags stalled progress (3+ weeks no improvement)
- Suggests deload weeks if needed
- Uses Epley formula to estimate 1RM: `weight × (1 + reps/30)`

## Nutrition Calculations

**TDEE Calculation** (Mifflin-St Jeor formula):
- Men: 10W + 6.25H - 5A + 5
- Women: 10W + 6.25H - 5A - 161
- Multiply by activity factor (1.2-1.9)

**Macro Targets**:
- Protein: 2.2g per kg bodyweight
- Fat: 25% of daily calories
- Carbs: Remainder

**Calorie Targets**:
- Cutting: 80% of TDEE (20% deficit)
- Bulking: 110% of TDEE (10% surplus)
- Maintenance: 100% of TDEE

## AI Coach System

The AI coach uses Claude Sonnet with a rich system prompt containing:
- User profile (goal, TDEE, current split)
- Last 4 weeks of training data (exercises, sets, weights, volume)
- Last 2 weeks of nutrition logs
- Estimated 1RMs for each exercise
- Training volume trends

Claude provides specific, numbered recommendations based on actual user data.

## Deployment

### Deploy Backend to Railway

1. Push code to GitHub
2. Create Railway project
3. Connect GitHub repository
4. Set environment variables in Railway dashboard
5. Railway auto-deploys on git push

### Deploy Frontend to Vercel

1. Push code to GitHub
2. Create Vercel project
3. Connect GitHub repository
4. Set `VITE_*` environment variables
5. Vercel auto-deploys on git push

### Database Setup

Use Supabase (recommended):
1. Create Supabase project
2. Get connection string from project settings
3. Run migrations: `npx prisma migrate deploy`
4. Seed exercises: `npx ts-node prisma/seed.ts`

## Performance Optimizations

- **Caching**: Food search results cached for 1 hour
- **Pagination**: All list endpoints support pagination
- **Rate Limiting**: 150 requests per 15 minutes on API
- **Lazy Loading**: Charts render on-demand
- **LocalStorage**: Recent workouts cached on client

## Security Considerations

- All endpoints require user authentication (via `x-user-id` header or JWT)
- User data filtered by userId on all queries
- Rate limiting prevents API abuse
- Passwords handled by Supabase
- Environment variables for sensitive keys

## Development Workflow

1. Create feature branch: `git checkout -b feature/new-feature`
2. Make changes and test locally
3. Run tests/build: `npm run build`
4. Commit and push: `git push origin feature/new-feature`
5. Create pull request

## Troubleshooting

### API Connection Errors
- Ensure backend is running on correct port
- Check `VITE_API_URL` in frontend `.env.local`
- Check browser console for CORS errors

### Database Connection Issues
- Verify `DATABASE_URL` in backend `.env.local`
- Check PostgreSQL is running
- Run migrations: `npx prisma migrate dev`

### Missing Exercises
- Run seed script: `npm run prisma:seed`

## License

MIT

## Support

For issues or questions, open a GitHub issue.

## Future Enhancements

- [ ] Image uploads for food logging
- [ ] Social features (follow friends, share workouts)
- [ ] Meal planning based on nutritional goals
- [ ] Wearable integration (heart rate, steps)
- [ ] Video form guides for exercises
- [ ] Subscription/payment integration
- [ ] Mobile app (React Native)
- [ ] Real-time notifications
- [ ] Batch data export
- [ ] Machine learning recommendations
4. Run database migrations on first deploy:
   - `npx prisma migrate deploy`
5. Confirm `/health` responds.

## 5) Frontend on Vercel

1. Import the same repo in Vercel.
2. Root directory: `frontend`
3. Add environment variables:
   - `VITE_API_URL`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. Pushes to `main` auto-deploy.

## API

Base URL: `/api/v1`

- Auth: `/auth/verify`, `/auth/profile`
- Exercises: `/exercises`
- Nutrition food search: `/foods/search`
- AI Coach SSE: `/ai/coach`

## Notes

- Every data query should be scoped by `userId`.
- Rate limiting is enabled at `/api/v1` and should be stricter for AI routes in production.
- `Workout.deletedAt` is included for soft-delete support.
- `User.plan` (`FREE | PRO`) is included to support subscriptions.
