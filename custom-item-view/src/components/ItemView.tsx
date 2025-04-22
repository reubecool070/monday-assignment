import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Table,
  Text,
  Flex,
  Heading,
  Divider,
  IconButton,
  AlertBanner as Banner,
  Tooltip,
  Loader,
  Icon,
  TableHeader,
  TableHeaderCell,
  TableCell,
  TableBody,
  TableRow,
} from '@vibe/core';
import { Delete, Edit } from '@vibe/icons';

import mondaySdk from 'monday-sdk-js';

const monday = mondaySdk();
monday.setToken(process.env.REACT_APP_MONDAY_TOKEN || '');

interface CalculationItem {
  id: number;
  input: number;
  factor: number;
  result: number;
  timestamp: string;
}

interface ColumnIds {
  inputColumn: string;
  factorColumn: string;
  resultColumn: string;
}

interface Column {
  id: string;
  title: string;
}

function ItemView() {
  const [userInput, setUserInput] = useState<string>('');
  const [multiplicationFactor, setMultiplicationFactor] = useState<string>('2');
  const [result, setResult] = useState<string>('');
  const [calculationHistory, setCalculationHistory] = useState<CalculationItem[]>([]);
  const [itemId, setItemId] = useState<string>('');
  const [boardId, setBoardId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    monday.listen('context', async (res: any) => {
      if (res.data.itemId) {
        setItemId(res.data.itemId);
        setBoardId(res.data.boardId);
      }
    });
  }, []);

  const handleCalculate = async (): Promise<void> => {
    // Reset error state
    setError('');

    if (!userInput) {
      setError('Please enter an input number');
      return;
    }

    const inputNumber = parseFloat(userInput);
    const factor = parseFloat(multiplicationFactor);

    if (isNaN(inputNumber) || isNaN(factor)) {
      setError('Please enter valid numbers');
      return;
    }

    const calculationResult = inputNumber * factor;
    setResult(calculationResult.toString());

    // Add to history
    const newCalculation: CalculationItem = {
      id: Date.now(),
      input: inputNumber,
      factor: factor,
      result: calculationResult,
      timestamp: new Date().toLocaleString(),
    };

    setCalculationHistory((prevHistory) => [newCalculation, ...prevHistory]);

    // Save to Monday.com if we have item and board IDs
    if (itemId && boardId) {
      try {
        setLoading(true);
        await saveCalculationToMonday(inputNumber, factor, calculationResult);
        setLoading(false);
      } catch (err) {
        setLoading(false);
        setError('Failed to save calculation to Monday');
        console.error(err);
      }
    }
  };

  const saveCalculationToMonday = async (input: number, factor: number, calculationResult: number): Promise<void> => {
    // First, check if we have the necessary columns
    const res = await monday.api(`query { boards(ids: ${boardId}) { columns { id title } } }`);
    const columns: Column[] = res.data.boards[0].columns;

    // Find or create columns
    const columnIds = await ensureColumnsExist(columns, [
      { title: 'Input Number', type: 'number' },
      { title: 'Multiplication Factor', type: 'number' },
      { title: 'Result', type: 'number' },
    ]);

    if (columnIds) {
      const query = `mutation {
        change_multiple_column_values (
          item_id: ${itemId}, 
          board_id: ${boardId}, 
          column_values: "{\\"${columnIds.inputColumn}\\": \\"${input}\\", \\"${columnIds.factorColumn}\\": \\"${factor}\\", \\"${columnIds.resultColumn}\\": \\"${calculationResult}\\"}"
        ) {
          id
        }
      }`;

      await monday.api(query);
      monday.execute('notice', {
        message: 'Calculation saved',
        type: 'success',
        timeout: 5000,
      });
    }
  };

  const ensureColumnsExist = async (
    existingColumns: Column[],
    requiredColumns: Array<{ title: string; type: string }>
  ): Promise<ColumnIds | null> => {
    let inputColumn = existingColumns.find((col) => col.title === 'Input Number')?.id;
    let factorColumn = existingColumns.find((col) => col.title === 'Multiplication Factor')?.id;
    let resultColumn = existingColumns.find((col) => col.title === 'Result')?.id;

    // Create missing columns
    if (!inputColumn) {
      const res = await monday.api(
        `mutation { create_column (board_id: ${boardId}, title: "Input Number", column_type: number) { id } }`
      );
      inputColumn = res.data.create_column.id;
    }

    if (!factorColumn) {
      const res = await monday.api(
        `mutation { create_column (board_id: ${boardId}, title: "Multiplication Factor", column_type: number) { id } }`
      );
      factorColumn = res.data.create_column.id;
    }

    if (!resultColumn) {
      const res = await monday.api(
        `mutation { create_column (board_id: ${boardId}, title: "Result", column_type: number) { id } }`
      );
      resultColumn = res.data.create_column.id;
    }

    if (inputColumn && factorColumn && resultColumn) {
      return { inputColumn, factorColumn, resultColumn };
    }

    return null;
  };

  const clearHistory = (): void => {
    setCalculationHistory([]);
  };

  const deleteHistoryItem = (id: number): void => {
    setCalculationHistory((prevHistory) => prevHistory.filter((item) => item.id !== id));
  };

  const columns = [
    { id: '1', title: 'Input' },
    { id: '2', title: 'Factor' },
    { id: '3', title: 'Result' },
    { id: '4', title: 'Timestamp' },
    { id: '5', title: '' },
  ];

  return (
    <Box padding="medium">
      <Flex direction="column" gap="medium">
        <Heading type="h1">Multiplication Calculator</Heading>

        {/* {error && (
          <Banner type="danger" onClose={() => setError('')}>
            {error}
          </Banner>
        )} */}

        <Box padding="medium">
          <Flex direction="column" gap="medium">
            <Flex gap="medium" align="start">
              <Flex direction="column" gap="small" className="flex-grow">
                <Text weight="bold">Input Number</Text>
                <TextField
                  placeholder="Enter a number"
                  value={userInput}
                  onChange={(value) => setUserInput(value)}
                  type="number"
                  size="medium"
                />
              </Flex>

              <Flex align="center" justify="center" style={{ alignSelf: 'flex-end', padding: '8px' }}>
                <Icon icon={Edit} iconSize={24} />
              </Flex>

              <Flex direction="column" gap="small" className="flex-grow">
                <Text weight="bold">Multiplication Factor</Text>
                <TextField
                  placeholder="Enter multiplication factor"
                  value={multiplicationFactor}
                  onChange={(value) => setMultiplicationFactor(value)}
                  type="number"
                  size="medium"
                />
              </Flex>

              <Flex align="center" justify="center" style={{ alignSelf: 'flex-end', padding: '8px' }}>
                <Text weight="bold">=</Text>
              </Flex>

              <Flex direction="column" gap="small" className="flex-grow">
                <Text weight="bold">Result</Text>
                <TextField placeholder="Result" value={result} readonly size="medium" />
              </Flex>
            </Flex>

            <Flex gap="small">
              <Button onClick={handleCalculate}>Calculate</Button>

              {loading && <Loader size="small" />}
            </Flex>
          </Flex>
        </Box>

        <Divider />

        <Flex direction="column" gap="small">
          <Flex align="center" justify="space-between">
            <Heading type="h2">Calculation History</Heading>
            <Tooltip content="Clear history">
              <IconButton
                icon={Delete}
                onClick={clearHistory}
                kind="tertiary"
                ariaLabel="Clear calculation history"
                disabled={calculationHistory.length === 0}
              />
            </Tooltip>
          </Flex>

          {calculationHistory.length > 0 ? (
            <div style={{ width: '100%' }}>
              <Table
                errorState={<div>Error</div>}
                emptyState={<div>No calculations yet. Enter values and click Calculate to begin.</div>}
                columns={columns}
              >
                <TableHeader>
                  {columns.map((column) => (
                    <TableHeaderCell title={column.title} key={column.title} />
                  ))}
                </TableHeader>
                <TableBody>
                  {calculationHistory.map((calc) => (
                    <TableRow key={calc.id}>
                      <TableCell>{calc.input}</TableCell>
                      <TableCell>{calc.factor}</TableCell>
                      <TableCell>{calc.result}</TableCell>
                      <TableCell>{calc.timestamp}</TableCell>
                      <TableCell>
                        <Tooltip content="Delete record">
                          <IconButton
                            icon={Delete}
                            onClick={() => deleteHistoryItem(calc.id)}
                            kind="tertiary"
                            size="small"
                            ariaLabel="Delete history item"
                          />
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <Box padding="medium">
              <Text align="center">No calculations yet. Enter values and click Calculate to begin.</Text>
            </Box>
          )}
        </Flex>
      </Flex>
    </Box>
  );
}

export default ItemView;
