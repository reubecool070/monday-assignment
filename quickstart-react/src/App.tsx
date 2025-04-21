import React from 'react';
import { useState, useEffect } from 'react';
import './App.css';
import mondaySdk from 'monday-sdk-js';
import '@vibe/core/tokens';
import { AttentionBox, TextField, Button, Loader, Box, Divider } from '@vibe/core';

// Define more specific interfaces for Monday SDK context data
interface MondayUserData {
  id: string;
}

interface MondayContext {
  user: MondayUserData;
  itemId: string;
  boardId: string;
  sessionToken?: string;
}

interface CalculationHistory {
  id: string;
  itemId: string;
  boardId: string;
  sourceValue: number;
  factorValue: number;
  result: number;
  timestamp: string;
}

interface ItemColumn {
  id: string;
  title: string;
  type: string;
  value: any;
  text: string;
}

interface Item {
  id: string;
  name: string;
  column_values: ItemColumn[];
}

// API endpoints
const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? '' // In production, use relative path for API endpoints
    : 'http://localhost:8302'; // In development, use the backend server URL
const ENDPOINTS = {
  executeMultiplication: `${API_BASE_URL}/monday/execute-multiplication`,
  itemCalculations: (itemId: string) => `${API_BASE_URL}/monday/item/${itemId}/calculations`,
  boardCalculations: (boardId: string) => `${API_BASE_URL}/monday/board/${boardId}/calculations`,
  allCalculations: `${API_BASE_URL}/monday/calculations`,
};

// Initialize Monday SDK
const monday = mondaySdk();

const App: React.FC = () => {
  const [context, setContext] = useState<MondayContext | undefined>();
  const [sourceValue, setSourceValue] = useState<number>(0);
  const [factorValue, setFactorValue] = useState<number>(0);
  const [result, setResult] = useState<number | null>(null);
  const [item, setItem] = useState<Item | null>(null);
  const [history, setHistory] = useState<CalculationHistory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [numberColumnId, setNumberColumnId] = useState<string>('');
  const [factorColumnId, setFactorColumnId] = useState<string>('');
  const [resultColumnId, setResultColumnId] = useState<string>('');

  useEffect(() => {
    // Notify the monday platform that user gains a first value in an app
    monday.execute('valueCreatedForUser');

    // Set up context listener
    monday.listen('context', async (res: any) => {
      console.log('Monday context data:', res.data);

      // Extract context data
      const contextData: MondayContext = {
        user: res.data?.user || { id: 'unknown' },
        itemId: res.data?.itemId || '8964176119',
        boardId: res.data?.boardId ? String(res.data.boardId) : '8964176101',
        sessionToken: res.data?.sessionToken,
      };
      console.log('Context data:', contextData);

      setContext(contextData);

      // If we have an itemId, fetch its details and calculation history
      if (contextData.itemId) {
        // await fetchItemDetails(contextData.itemId);
        await fetchCalculationHistory(contextData.boardId, contextData.itemId);
      }
    });
  }, []);

  // Fetch item details from Monday.com
  const fetchItemDetails = async (itemId: string) => {
    setIsLoading(true);
    try {
      // Get item details including column values
      const response = await monday.api(`
        query {
          items (ids: [${itemId}]) {
            id
            name
            column_values {
              id
              title
              type
              value
              text
            }
          }
        }
      `);

      if (response.data?.items && response.data.items.length > 0) {
        const fetchedItem = response.data.items[0];
        setItem(fetchedItem);

        // Find appropriate column IDs based on column types
        const columns = fetchedItem.column_values;

        // Identify columns by type or title patterns
        const numberColumns = columns.filter(
          (col: ItemColumn) => col.type === 'numeric' || col.title.toLowerCase().includes('number')
        );

        const factorColumns = columns.filter(
          (col: ItemColumn) =>
            col.type === 'numeric' &&
            (col.title.toLowerCase().includes('factor') || col.title.toLowerCase().includes('multiplier'))
        );

        const resultColumns = columns.filter(
          (col: ItemColumn) =>
            col.type === 'numeric' &&
            (col.title.toLowerCase().includes('result') || col.title.toLowerCase().includes('product'))
        );

        // Set column IDs if found
        if (numberColumns.length > 0) {
          setNumberColumnId(numberColumns[0].id);
          const numValue = parseFloat(numberColumns[0].text || '0');
          setSourceValue(isNaN(numValue) ? 0 : numValue);
        }

        if (factorColumns.length > 0) {
          setFactorColumnId(factorColumns[0].id);
          const factValue = parseFloat(factorColumns[0].text || '0');
          setFactorValue(isNaN(factValue) ? 0 : factValue);
        }

        if (resultColumns.length > 0) {
          setResultColumnId(resultColumns[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching item details:', err);
      setError('Failed to load item details from Monday');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch calculation history from backend API
  const fetchCalculationHistory = async (boardId: string, itemId: string) => {
    console.log(API_BASE_URL);
    setIsLoading(true);
    try {
      // Add auth token to request
      const options = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: context?.sessionToken || '',
        },
      };

      const response = await fetch(ENDPOINTS.itemCalculations(itemId), options);
      console.log('Response:', response);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setHistory(Array.isArray(data.history) ? data.history : []);
    } catch (err) {
      console.error('Error fetching calculation history:', err);
      // setError('Failed to load calculation history. Using mock data.');

      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Call backend to execute calculation and update Monday
  const executeCalculation = async () => {
    if (!context?.itemId || !context.boardId) {
      setError('Missing context information (item or board ID)');
      return;
    }

    setIsLoading(true);
    try {
      // Create payload for backend
      const payload = {
        itemId: context.itemId,
        boardId: context.boardId,
        sourceColumnId: numberColumnId,
        sourceValue: sourceValue,
        factorColumnId: factorColumnId,
        factorValue: factorValue,
        targetColumnId: resultColumnId,
        sessionToken: context.sessionToken,
      };

      // Execute calculation via backend API
      const response = await fetch(ENDPOINTS.executeMultiplication, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: context.sessionToken || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const responseData = await response.json();

      if (responseData.success) {
        setResult(responseData.result || sourceValue * factorValue);
        setError(null);

        // Refresh history after calculation
        await fetchCalculationHistory(context.boardId, context.itemId);
      } else {
        throw new Error(responseData.message || 'Unknown error during calculation');
      }
    } catch (err: any) {
      console.error('Error executing calculation:', err);
      setError(`Failed to execute calculation: ${err.message}`);

      // Calculate locally as fallback
      const calculatedResult = sourceValue * factorValue;
      setResult(calculatedResult);
    } finally {
      setIsLoading(false);
    }
  };

  // Format date for display
  const formatDate = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      return timestamp;
    }
  };

  // Loading state
  if (isLoading && !item) {
    return (
      <div
        className="loading-container"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}
      >
        <Loader size="medium" />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: 'white' }} className="App">
      <div
        className="calculator-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          alignItems: 'flex-start',
          padding: '16px',
          width: '100%',
        }}
      >
        <h2 style={{ margin: 0 }}>Multiplication Calculator</h2>

        {error && (
          <div style={{ width: '100%', marginBottom: '16px' }}>
            <AttentionBox title="Notice" text={error} type="warning" className="error-box" />
          </div>
        )}

        <div style={{ width: '100%', display: 'flex', gap: '16px' }}>
          <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Source Number{numberColumnId ? ` (${numberColumnId})` : ''}</label>
            <TextField
              placeholder="Enter number"
              type="number"
              value={sourceValue.toString()}
              onChange={(value) => setSourceValue(Number(value))}
            />
          </div>

          <div style={{ width: '50%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label>Multiplication Factor{factorColumnId ? ` (${factorColumnId})` : ''}</label>
            <TextField
              placeholder="Enter factor"
              type="number"
              value={factorValue.toString()}
              onChange={(value) => setFactorValue(Number(value))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Button onClick={executeCalculation} size="medium">
            Calculate & Save
          </Button>

          <Button
            onClick={() => fetchCalculationHistory(context?.boardId || '', context?.itemId || '')}
            kind="tertiary"
            size="medium"
          >
            Refresh History
          </Button>

          {isLoading && <Loader size="xs" />}
        </div>

        {result !== null && (
          <Box padding="medium" style={{ backgroundColor: '#f5f6f8', borderRadius: '4px', width: '100%' }}>
            <strong>Result: {result}</strong> {resultColumnId ? `(Column ID: ${resultColumnId})` : ''}
          </Box>
        )}

        <Divider />

        <h3 style={{ margin: '8px 0' }}>Calculation History</h3>

        {history.length === 0 ? (
          <p>No calculation history available</p>
        ) : (
          <div style={{ width: '100%', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc', backgroundColor: '#f5f6f8' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Source Value</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Factor</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Result</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px 16px' }}>{item.sourceValue}</td>
                    <td style={{ padding: '12px 16px' }}>{item.factorValue}</td>
                    <td style={{ padding: '12px 16px' }}>{item.result}</td>
                    <td style={{ padding: '12px 16px' }}>{formatDate(item.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
