# Roopa Studio Website

Full-stack multi-page business website for `Roopa Studio & Video`, Basavanagudi, Bangalore.

## Pages

- `index.html` - home page
- `services.html` - service packages
- `offers.html` - promotions and bundles
- `portfolio.html` - about and showcase
- `contact.html` - contact details, map and booking form
- `admin.html` - simple private booking dashboard
- `server.js` - Express backend
- `data/bookings.json` - saved booking inquiries
- `render.yaml` - Render Blueprint for web service + Postgres

## Backend features

- Serves the website through Express
- Accepts booking form submissions at `POST /api/bookings`
- Saves inquiries into `data/bookings.json` locally
- Automatically uses PostgreSQL when `DATABASE_URL` is present
- Optional SMTP email notifications for each new inquiry
- Protected booking list endpoint at `GET /api/bookings?key=YOUR_ADMIN_KEY`

## Important setup

Open [script.js](C:\Users\AMK__\Downloads\ROOPASTUD\script.js) and update if needed:

- phone numbers or location details if you want to change them
- location label if you want the exact address wording from your Google business listing

Then create a `.env` file from [.env.example](C:\Users\AMK__\Downloads\ROOPASTUD\.env.example) and set:

- `ADMIN_API_KEY`
- `DATABASE_URL` if you want to use PostgreSQL outside Render
- `DATABASE_SSL` if your external PostgreSQL provider requires SSL
- `BOOKING_TO_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

## Run locally

Install dependencies:

```powershell
npm install
```

Start the app:

```powershell
npm start
```

Then visit:

- `http://localhost:3000` for the website
- `http://localhost:3000/admin` for the booking dashboard

## API routes

- `GET /api/health` - backend health check
- `POST /api/bookings` - save a booking inquiry
- `GET /api/bookings?key=YOUR_ADMIN_KEY` - read saved bookings

## Deploy on Render

This project includes [render.yaml](C:\Users\AMK__\Downloads\ROOPASTUD\render.yaml), so you can deploy it as a Render Blueprint.

### Steps

1. Push this project to GitHub.
2. Log in to Render.
3. Click `New > Blueprint`.
4. Select your GitHub repository.
5. Render will detect `render.yaml` and prepare:
   - one Node web service
   - one Render Postgres database
6. During setup, enter these secret values when Render prompts you:
   - `ADMIN_API_KEY`
   - `BOOKING_TO_EMAIL`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
7. Finish the deploy.
8. Open your Render URL after deployment finishes.
9. Use `/admin` on your deployed URL to view booking inquiries.

### Important Render note

Render free web services use an ephemeral filesystem, so `bookings.json` is not reliable in production there. This app is already prepared to use Render Postgres through `DATABASE_URL`, which is the recommended setup on Render.

### Render docs used

- Render Blueprint reference: https://render.com/docs/blueprint-spec
- Render Node/Express deploy guide: https://render.com/docs/deploy-node-express-app
- Render web services: https://render.com/docs/web-services
- Render Postgres connection guide: https://render.com/docs/postgresql-creating-connecting
- Render free tier limitations: https://render.com/docs/free
