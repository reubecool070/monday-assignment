# Monday.com Calculation App

A custom Monday.com app that performs calculations on number columns and maintains calculation history.

## Overview

This app listens to changes in a number column, performs a calculation based on a custom multiplication factor, and updates another column with the result. The app includes an item view that allows users to:

- Set a custom multiplication factor per item
- Manually trigger recalculations
- View a history of calculations

The app integrates with Monday boards to provide a seamless calculation experience while maintaining a log of all operations.

## Features

- **Automatic Calculations**: Automatically multiplies values in the input_number column by a custom factor when changes are detected
- **Custom Multiplication Factor**: Each item can have its own multiplication factor set through the item view
- **Calculation History**: View a log of past calculations for each item
- **Manual Recalculation**: Trigger manual recalculations with a button in the item view
- **Error Handling**: Built-in retry mechanism for failed updates with error logging

## Technologies Used

### Backend

- **Node.js** with **Express.js**: For the server application
- **TypeScript**: For type-safe code
- **MongoDB** with **Mongoose**: For data storage and retrieval
- **Monday.com API**: For board and column interactions
- **Webhooks**: For listening to column value changes

### Frontend

- **React**: For the item view UI
- **TypeScript**: For type safety
- **@vibe/core & @vibe/icons**: Monday's design system components
- **Monday SDK**: For interaction with the Monday.com platform

## Architecture

The application consists of:

1. **Webhook Listener**: Detects changes in Monday.com board columns
2. **API Server**: Processes webhooks and provides endpoints for the frontend
3. **Database**: Stores calculation history and item-specific multiplication factors
4. **Item View Component**: Provides a UI within Monday.com for interacting with the app

## Getting Started

### Prerequisites

- Node.js (v16.16+)
- npm
- MongoDB
- Monday.com developer account

### Installation

1. Clone the repository

   ```
   git clone https://github.com/yourusername/monday-calculation-app.git
   cd monday-calculation-app
   ```

2. Install dependencies

   ```
   npm install
   ```

3. Set up environment variables in a `.env` file

   ```
   MONDAY_SIGNING_SECRET=your_signing_secret
   MONGODB_URI=mongodb://localhost:27017/monday-calculations
   ```

4. Start the development server
   ```
   npm run dev
   ```

### Monday.com App Setup

1. Create a new app in Monday.com's Developer Center
2. Add the "Custom Item View" feature
3. Add the "Integration" feature
4. Configure the webhook URL to point to your server
5. Add the required scopes:
   - me:read
   - boards:read
   - boards:write
   - webhooks:write

## Usage

### Board Setup

1. Create two number columns in your Monday.com board: `input_number` and `result_number`
2. Install the app to your Monday.com workspace
3. Add the integration recipe to your board

### Item View

1. Open an item on your board
2. Click on the app's icon in the item view panel
3. Enter a custom multiplication factor
4. The result will automatically update when the input number changes
5. View the calculation history in the table below

## API Endpoints

- `POST /monday/webhook`: Webhook endpoint for Monday.com events
- `GET /monday/item/:itemId/factor`: Get multiplication factor for an item
- `POST /monday/item/:itemId/factor`: Update multiplication factor for an item
- `GET /monday/item/:itemId/calculations`: Get calculation history for an item
- `POST /monday/item/:itemId/calculate`: Manually trigger calculation for an item

## Development

### Project Structure

```
/
├── src/
│   ├── api/            # API endpoints
│   ├── components/     # React components for the item view
│   ├── models/         # MongoDB models
│   ├── services/       # Business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main React component
│   └── index.tsx       # Entry point
├── .env                # Environment variables
├── tsconfig.json       # TypeScript configuration
└── README.md           # Project documentation
```

### Building for Production

```
npm run build
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Monday.com Developer Platform
- Monday Vibe Design System
