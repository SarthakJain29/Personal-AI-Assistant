import express from "express";
import type { Express, Request, Response } from "express";
import { google } from "googleapis";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const PORT = 3000;

export const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URL
);

app.get("/auth", (req: Request, res: Response) => {
  //generate the link for Oauth
  const scopes = ["https://www.googleapis.com/auth/calendar"];

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: scopes,
  });

  res.redirect(url);
});

app.get("/callback", async (req: Request, res: Response) => {
  //after user accepts on consent screen, google will hit this endpoint with a code
  const code = req.query.code as string;

  //now sending code + client id + secret to receive access & refresh tokens
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens); //setting the credentials
  res.json({message: "Connected ✅"})
});

app.listen(PORT, () => console.log(`Server is running on PORT: ${PORT}`));
