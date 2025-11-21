import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import sessions from 'express-session'
import models from './models.js';

import WebAppAuthProvider from 'msal-node-wrapper'
import dotenv from 'dotenv';
dotenv.config({ path: '.env.dev' });

const authConfig = {
    auth: {
        clientId: process.env.CLIENT_ID,
        authority: process.env.CLOUD_INSTANCE + process.env.TENANT_ID,
        clientSecret: process.env.CLIENT_SECRET,

        // clientId: "{App Registration -> Overview: Application (Client) ID}",
        // authority: "https://login.microsoftonline.com/{App Registration -> Overview: Directory (tenant) ID}",
        // clientSecret: "{App Registration -> Certificates and Secrets -> Client Secrets: Value}",
        redirectUri: "https://retro-arcade-g6fnhabshze3ejeg.northcentralus-01.azurewebsites.net/redirect"
        // The redirect needs to be the correct URL that is getting pointed to by "/". When running locally, you just need "/redirect", but when running in azure through an external domain name, it needs to be "https://custom.domain/redirect"
        // The redirects need to be registered with Azrue App Registrations -> Authentication -> Redirect URI
        // https://retro-arcade-g6fnhabshze3ejeg.northcentralus-01.azurewebsites.net/redirect
    },
	system: {
    	loggerOptions: {
        	loggerCallback(loglevel, message, containsPii) {
            	console.log(message);
        	},
        	piiLoggingEnabled: false,
        	logLevel: 3,
    	}
	}
};

import apiRouter from './routes/apiv1.js';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const oneDay = 1000 * 60 * 60 * 24
app.use((req, res, next) => {
    req.models = models;
    next();
});

app.use(sessions({
    secret: process.env.EXPRESS_SESSION_SECRET,
    saveUninitialized: true,
    cookie: {maxAge: oneDay},
    resave: false
}))

const authProvider = await WebAppAuthProvider.WebAppAuthProvider.initialize(authConfig);
app.use(authProvider.authenticate());

app.use('/api/v1', apiRouter);

// Route handler for home page - must come before static middleware
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

// Static middleware - serves other static files (but won't override the '/' route)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/signin', (req, res, next) => {
    return req.authContext.login({
            postLoginRedirectUri: "/", // redirect here after login
        })(req, res, next);
});

app.get('/signout', (req, res, next) => {
    return req.authContext.logout({
        postLogoutRedirectUri: "/", // redirect here after logout
    })(req, res, next);

});

app.use(authProvider.interactionErrorHandler());

// This needs to be 8080 for Azure to containerize and host it
let PORT = 8080
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });


export default app;
