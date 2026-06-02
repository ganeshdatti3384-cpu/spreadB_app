import User from "../model/users.js";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/api/auth/google/callback`,
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const role = req.session.role || "Influencer";

        let user = await User.findOne({ email });

        if (user) {
          user.googleId = googleId;
          user.isVerified = true;
          await user.save();
          return done(null, user);
        }

        // Create new Google user
        const newUser = new User({
          firstName: profile.name.givenName || "",
          lastName: profile.name.familyName || "",
          email: email,
          googleId: googleId,
          role: role,
          password: "google-oauth", // dummy (will not be used)
          isVerified: true,
        });

        await newUser.save();
        return done(null, newUser);

      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});
