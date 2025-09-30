# Color Clash - Complete Deployment Setup Guide

## 🚀 Backend Setup with Supabase

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully initialized
3. Go to Settings → API to get your project URL and anon key

### 2. Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Run Database Migrations

In your Supabase dashboard:

1. Go to SQL Editor
2. Run the migration files in order:
   - First: `supabase/migrations/create_user_profiles.sql`
   - Second: `supabase/migrations/create_game_sessions.sql`

### 4. Deploy Edge Function

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

4. Deploy the moderation function:
   ```bash
   supabase functions deploy moderate-content
   ```

### 5. Configure Authentication

In your Supabase dashboard:

1. Go to Authentication → Settings
2. Disable email confirmations (for faster auth)
3. Set Site URL to your domain
4. Configure any additional providers if needed

## 🔐 Authentication Flow

### How It Works

1. **Wallet Connection**: User connects wallet via Farcaster MiniApp or MetaMask
2. **Message Signing**: User signs a message to prove wallet ownership
3. **Supabase Auth**: Creates/authenticates user with signed message as password
4. **Session Caching**: JWT token stored in localStorage for subsequent visits
5. **Auto-Authentication**: On return visits, user is automatically authenticated

### Security Features

- **Message Signing**: Cryptographic proof of wallet ownership
- **JWT Tokens**: Secure, time-limited session tokens
- **Row Level Security**: Database-level access control
- **Content Moderation**: Real-time content filtering

## 🛡️ Moderation System

### Content Filtering

The moderation system checks for:
- Profanity and harmful content
- Suspicious URLs and patterns
- Spam-like behavior
- Excessive capitalization
- Content length limits

### Customization

Edit `supabase/functions/moderate-content/index.ts` to:
- Add/remove blocked words
- Adjust filtering rules
- Integrate third-party moderation APIs
- Customize response messages

## 📊 Database Schema

### User Profiles Table
- Stores wallet addresses and game statistics
- Tracks total games, wins, and tokens earned
- Supports Farcaster integration

### Game Sessions Table
- Records individual game results
- Tracks performance metrics
- Enables analytics and leaderboards

## 🚀 Frontend Integration

### Key Features Implemented

1. **Seamless Authentication**
   - Auto-connects on wallet connection
   - Persistent sessions across visits
   - No repeated auth prompts

2. **Real-time Moderation**
   - Content filtered before sharing
   - Fail-safe design (allows content if service down)
   - User-friendly error messages

3. **Statistics Tracking**
   - Game results automatically recorded
   - User stats updated in real-time
   - Leaderboard integration

## 🔧 Configuration Options

### Game Settings
Edit `src/config/gameConfig.ts` for:
- Daily game limits
- Roulette rewards
- Bot difficulty
- Contract addresses

### Moderation Rules
Edit `supabase/functions/moderate-content/index.ts` for:
- Blocked word lists
- Content filtering rules
- Response messages

## 📱 Farcaster Integration

### MiniApp Features
- Automatic context detection
- Seamless wallet connection
- Optimized sharing flows
- Fast loading times

### Sharing Integration
- Pre-moderated content
- Direct Warpcast integration
- Community engagement features

## 🔍 Monitoring & Analytics

### Available Metrics
- User registration and retention
- Game completion rates
- Token distribution
- Content moderation stats

### Database Queries
Use Supabase dashboard to query:
- Top players by tokens won
- Daily active users
- Game session analytics
- Moderation effectiveness

## 🚨 Security Best Practices

### Implemented Security
- Row Level Security (RLS) on all tables
- JWT token expiration
- Input validation and sanitization
- Content moderation
- Wallet signature verification

### Additional Recommendations
- Regular security audits
- Rate limiting on API endpoints
- Monitoring for suspicious activity
- Regular backup procedures

## 🎯 Performance Optimizations

### Caching Strategy
- JWT tokens cached in localStorage
- User sessions persist across visits
- Minimal database queries
- Optimized indexes

### Fast Authentication
- Single signature per session
- Auto-authentication on return
- Fail-safe moderation
- Optimized database queries

## 📈 Scaling Considerations

### Database Scaling
- Indexed queries for performance
- Partitioning for large datasets
- Connection pooling
- Read replicas for analytics

### Edge Function Scaling
- Stateless design
- Fast cold starts
- Efficient content filtering
- Error handling and retries

## 🔄 Maintenance

### Regular Tasks
- Monitor error logs
- Update blocked word lists
- Review moderation effectiveness
- Backup database regularly

### Updates
- Keep dependencies updated
- Monitor Supabase changelog
- Test new features thoroughly
- Maintain documentation

---

## 🎉 You're Ready!

Your Color Clash game now has:
- ✅ Fast, secure authentication
- ✅ Real-time content moderation  
- ✅ Persistent user sessions
- ✅ Comprehensive analytics
- ✅ Production-ready security

The system is designed to be fast, secure, and user-friendly while maintaining the high performance expected in a gaming environment.