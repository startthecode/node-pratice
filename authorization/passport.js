import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import "dotenv/config";
import {
  insert,
  insert_with_columname,
  select_by_key,
  update,
} from "../db/mysql_queries.js";
import { encryptionKey } from "./cryptoKey.js";

let google_auth = () => {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/login/google/callback",
        scope: [
          "profile",
          "email",
          "https://www.googleapis.com/auth/user.phonenumbers.read",
        ],
        passReqToCallback: true,
      },
      async function (request, accessToken, refreshToken, profile, cb) {
        try {
          let user_email = profile?.emails[0]?.value;
          let user_type = request.query.state;
          let privatekey = encryptionKey(user_email);
          let user_data = {
            first_name: profile._json.given_name,
            last_name: profile._json.family_name,
            email: profile._json.email,
            display_picture: profile._json.picture,
            session_id: privatekey,
          };

          let user_existance = await select_by_key(
            user_type,
            "email",
            user_email
          );

          if (user_existance.length > 0) {
            await update_users_sessionID(user_type, privatekey, user_email);
            return cb(null, {
              ...user_data,
              session_for: request.query.state,
            });
          }
          let create_user = await insert_new_user(user_type, user_data);
          let created_user = create_user;
          cb(null, created_user);
        } catch (err) {
          cb(err, null);
        }

        // if(profile?.emails[0]?.value)
      }
    )
  );

  //insert
  async function insert_new_user(user_type, data) {
    console.log("data", data);
    try {
      let privatekey = encryptionKey(data.email);
      let insert_new_user = await insert(user_type, data);
      return data;
    } catch (err) {
      throw err;
    }
  }
  async function update_users_sessionID(user_type, session_id, email) {
    let data = `last_login = NOW(),session_id = '${session_id}'`;
    let update_sessionID = await update(user_type, data, "email", email);
    return update_sessionID;
  }

  passport.serializeUser((profile, done) => {
    return done(null, profile);
  });

  passport.deserializeUser((obj, done) => {
    return done(null, obj);
  });
};

export let passport_config = (app) => {
  app.use(passport.initialize());
  app.use(passport.session());
  google_auth();
};
