# Timesheet + Revenue Dashboard

## Folder Structure

```txt
.
├── client
│   ├── src
│   │   ├── components
│   │   │   ├── Dashboard.jsx
│   │   │   ├── EntitySection.jsx
│   │   │   └── TimesheetForm.jsx
│   │   ├── services
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   └── package.json
├── server
│   ├── src
│   │   ├── models
│   │   │   ├── Brand.js
│   │   │   ├── Market.js
│   │   │   ├── Project.js
│   │   │   ├── Resource.js
│   │   │   └── TimesheetEntry.js
│   │   ├── routes
│   │   │   ├── brands.js
│   │   │   ├── crud.js
│   │   │   ├── dashboard.js
│   │   │   ├── markets.js
│   │   │   ├── projects.js
│   │   │   ├── resources.js
│   │   │   └── timesheets.js
│   │   ├── app.js
│   │   ├── db.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── package.json
```

## Setup

```bash
npm install
npm run install:all
cp server/.env.example server/.env
npm run dev
```

Frontend: `http://localhost:5173`

Backend: `http://localhost:5000`

## API Usage

```bash
curl -X POST http://localhost:5000/markets \
  -H "Content-Type: application/json" \
  -d '{"name":"India"}'

curl -X POST http://localhost:5000/brands \
  -H "Content-Type: application/json" \
  -d '{"name":"BMW","marketId":"MARKET_ID"}'

curl -X POST http://localhost:5000/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"BMW Retainer","marketId":"MARKET_ID","brandId":"BRAND_ID"}'

curl -X POST http://localhost:5000/resources \
  -H "Content-Type: application/json" \
  -d '{"name":"Mehul Rana","hourlyRate":75,"marketId":"MARKET_ID"}'

curl -X POST http://localhost:5000/timesheets \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-04-25","resourceId":"RESOURCE_ID","projectId":"PROJECT_ID","hoursWorked":8}'

curl "http://localhost:5000/dashboard/summary?marketId=MARKET_ID&startDate=2026-04-01&endDate=2026-04-30"

curl -o timesheets.csv http://localhost:5000/timesheets/export.csv
```
