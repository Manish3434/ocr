const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Only register GoogleStrategy if clientID and clientSecret are provided.
// Prevents server crash on startup if credentials are missing/empty.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.SERVER_URL || 'http://localhost:5000'}/auth/google/callback`
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0]?.value;
        if (!email) return done(null, false, { message: 'No email found in Google profile' });

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            user.name = user.name || profile.displayName;
            await user.save();
          } else {
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName || email,
              email,
            });
          }
        }

        // Block suspended users from Google OAuth
        if (user.status === 'suspended') {
          return done(null, false, { message: 'Account suspended' });
        }

        await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  ));
} else {
  console.warn("⚠️  Google OAuth credentials missing or incomplete. Google Login disabled.");
}

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});
