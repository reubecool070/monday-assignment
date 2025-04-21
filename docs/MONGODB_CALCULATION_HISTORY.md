# MongoDB Calculation History

This document provides detailed information on how to use the calculation history feature with MongoDB.

## Overview

The calculation history feature logs all multiplication calculations performed on an item to a MongoDB database. This provides several advantages:

1. **Persistence**: History is preserved even if Monday.com columns are changed or deleted
2. **Scalability**: Can handle large volumes of calculation history
3. **Performance**: Fast querying and filtering of historical data
4. **Flexibility**: Multiple ways to access and analyze the data

## Setup Requirements

To use this feature, you need:

1. MongoDB installed (locally or in the cloud)
2. MongoDB connection string added to your `.env` file
3. API access for your Monday.com application

## Database Schema

The calculation history is stored in a collection called `calculations` with the following schema:

```typescript
{
  itemId: String,         // Monday.com item ID
  boardId: String,        // Monday.com board ID
  timestamp: Date,        // When the calculation was performed
  sourceColumnId: String, // Column ID containing the first number
  sourceValue: Mixed,     // Value from the source column
  factorColumnId: String, // Column ID containing the factor/multiplier
  factorValue: Mixed,     // Value from the factor column
  targetColumnId: String, // Column ID where the result was stored
  result: Mixed,          // Result of the multiplication
  operation: String,      // Type of operation (e.g., "multiplication")
  accountId: String       // Optional Monday.com account ID for filtering
}
```

## API Endpoints

### Get All Calculations

Retrieve all calculation history with pagination.

**Endpoint**: `GET /monday/calculations`

**Query Parameters**:

- `page`: Page number (default: 1)
- `limit`: Number of records per page (default: 100)
- `accountId`: (Optional) Filter by account ID

**Response**:

```json
{
  "data": [
    {
      "_id": "60c72b2d8e8c143ab8f54e3a",
      "itemId": "1234567",
      "boardId": "7654321",
      "timestamp": "2023-05-15T14:30:45.123Z",
      "sourceColumnId": "numbers",
      "sourceValue": 10,
      "factorColumnId": "factor",
      "factorValue": 5,
      "targetColumnId": "result",
      "result": 50,
      "operation": "multiplication",
      "accountId": "12345"
    }
    // More calculation records...
  ],
  "total": 157,
  "page": 1,
  "limit": 100
}
```

### Get Board Calculations

Retrieve calculation history for a specific board.

**Endpoint**: `GET /monday/board/:boardId/calculations`

**Path Parameters**:

- `boardId`: Monday.com board ID

**Query Parameters**:

- `limit`: Number of records to return (default: 50)

**Response**:

```json
{
  "boardId": "7654321",
  "count": 25,
  "history": [
    {
      "_id": "60c72b2d8e8c143ab8f54e3a",
      "itemId": "1234567",
      "boardId": "7654321",
      "timestamp": "2023-05-15T14:30:45.123Z",
      "sourceColumnId": "numbers",
      "sourceValue": 10,
      "factorColumnId": "factor",
      "factorValue": 5,
      "targetColumnId": "result",
      "result": 50,
      "operation": "multiplication"
    }
    // More calculation records...
  ]
}
```

### Get Item Calculations

Retrieve calculation history for a specific item.

**Endpoint**: `GET /monday/item/:itemId/calculations`

**Path Parameters**:

- `itemId`: Monday.com item ID

**Query Parameters**:

- `limit`: Number of records to return (default: 20)

**Response**:

```json
{
  "itemId": "1234567",
  "count": 8,
  "history": [
    {
      "_id": "60c72b2d8e8c143ab8f54e3a",
      "itemId": "1234567",
      "boardId": "7654321",
      "timestamp": "2023-05-15T14:30:45.123Z",
      "sourceColumnId": "numbers",
      "sourceValue": 10,
      "factorColumnId": "factor",
      "factorValue": 5,
      "targetColumnId": "result",
      "result": 50,
      "operation": "multiplication"
    }
    // More calculation records...
  ]
}
```

## Integration with Monday.com UI

To display calculation history in the Monday.com UI, you can create a custom app with various views:

### Item View Component

Create an item view to display calculation history for a specific item:

```jsx
import React, { useEffect, useState } from 'react';
import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();

const CalculationHistoryItemView = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [itemId, setItemId] = useState(null);

  useEffect(() => {
    // Get the context from Monday
    monday.listen('context', (res) => {
      if (res.data.itemId) {
        setItemId(res.data.itemId);
        fetchHistory(res.data.itemId);
      }
    });
  }, []);

  const fetchHistory = async (id) => {
    setLoading(true);
    try {
      // Get a signed session token
      const token = await monday.get('sessionToken');

      // Fetch calculation history from your backend
      const response = await fetch(`/monday/item/${id}/calculations`, {
        headers: {
          Authorization: token,
        },
      });

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching calculation history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) return <div>Loading calculation history...</div>;

  if (history.length === 0) {
    return <div>No calculation history available for this item.</div>;
  }

  return (
    <div className="calculation-history">
      <h3>Calculation History</h3>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Source</th>
            <th>Factor</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {history.map((log, index) => (
            <tr key={index}>
              <td>{formatDate(log.timestamp)}</td>
              <td>{log.sourceValue}</td>
              <td>{log.factorValue}</td>
              <td>{log.result}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CalculationHistoryItemView;
```

### Board View Component

Create a board view to display calculation history for all items on a board:

```jsx
import React, { useEffect, useState } from 'react';
import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();

const CalculationHistoryBoardView = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardId, setBoardId] = useState(null);

  useEffect(() => {
    // Get the context from Monday
    monday.listen('context', (res) => {
      if (res.data.boardId) {
        setBoardId(res.data.boardId);
        fetchHistory(res.data.boardId);
      }
    });
  }, []);

  const fetchHistory = async (id) => {
    setLoading(true);
    try {
      // Get a signed session token
      const token = await monday.get('sessionToken');

      // Fetch calculation history from your backend
      const response = await fetch(`/monday/board/${id}/calculations`, {
        headers: {
          Authorization: token,
        },
      });

      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching calculation history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group calculations by item
  const groupedByItem = history.reduce((acc, calc) => {
    if (!acc[calc.itemId]) {
      acc[calc.itemId] = [];
    }
    acc[calc.itemId].push(calc);
    return acc;
  }, {});

  if (loading) return <div>Loading calculation history...</div>;

  if (history.length === 0) {
    return <div>No calculation history available for this board.</div>;
  }

  return (
    <div className="calculation-history-board">
      <h2>Board Calculation History</h2>
      {Object.entries(groupedByItem).map(([itemId, calculations]) => (
        <div key={itemId} className="item-calculations">
          <h3>Item {itemId}</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th>Factor</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {calculations.map((calc, index) => (
                <tr key={index}>
                  <td>{new Date(calc.timestamp).toLocaleString()}</td>
                  <td>{calc.sourceValue}</td>
                  <td>{calc.factorValue}</td>
                  <td>{calc.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
};

export default CalculationHistoryBoardView;
```

## Troubleshooting

Common issues and solutions:

1. **Connection Error**: Make sure MongoDB is running and the connection string in `.env` is correct
2. **Authentication Error**: Check that your Monday.com API requests include the proper authentication headers
3. **Missing Data**: Ensure that the calculation service is properly logging data during calculations
4. **Performance Issues**: Add appropriate indexes to the MongoDB collection if query performance is slow
