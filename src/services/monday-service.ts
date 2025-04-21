import mondaySdk from 'monday-sdk-js';

interface ColumnValue {
  value: string;
  id: string;
  title: string;
  text?: string;
  type?: string;
}

interface Item {
  id: string;
  board: {
    id: string;
  };
  column_values: ColumnValue[];
}

interface ItemsResponse {
  data: {
    items: Item[];
  };
}

interface ChangeColumnResponse {
  data: {
    change_column_value: {
      id: string;
    };
  };
}

const getColumnValue = async (token: string, itemId: string, columnId: string): Promise<string | undefined> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-04');

    const query = `query($itemId: [ID!], $columnId: [String!]) {
        items (ids: $itemId) {
          column_values(ids:$columnId) {
            value
          }
        }
      }`;
    const variables = { columnId, itemId };

    const response = (await mondayClient.api(query, { variables })) as ItemsResponse;

    if (response?.data?.items?.[0]?.column_values?.[0]?.value) {
      return response.data.items[0].column_values[0].value;
    }

    return undefined;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

const getColumnValueAsNumber = async (token: string, itemId: string, columnId: string): Promise<number | undefined> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-04');

    const query = `query($itemId: [ID!], $columnId: [String!]) {
        items (ids: $itemId) {
          column_values(ids:$columnId) {
            value
            type
            text
          }
        }
      }`;
    const variables = { columnId, itemId };

    const response = (await mondayClient.api(query, { variables })) as ItemsResponse;
    console.log('Raw column value response:', JSON.stringify(response?.data?.items?.[0]?.column_values?.[0], null, 2));

    if (response?.data?.items?.[0]?.column_values?.[0]) {
      const columnValue = response.data.items[0].column_values[0];

      // If text is available, try to parse it directly
      if (columnValue.text) {
        console.log('Using text value for parsing:', columnValue.text);
        const parsedNumber = parseFloat(columnValue.text);
        if (!isNaN(parsedNumber)) {
          return parsedNumber;
        }
      }

      // If value is available, try to parse it from the JSON value
      if (columnValue.value) {
        console.log('Using JSON value for parsing:', columnValue.value);
        try {
          // Monday.com stores numbers as JSON objects with a "value" property
          const parsedJson = JSON.parse(columnValue.value);

          // Handle different column types
          if (typeof parsedJson === 'object') {
            if (parsedJson.hasOwnProperty('value')) {
              console.log('Found value property in JSON:', parsedJson.value);
              return parseFloat(parsedJson.value);
            } else if (parsedJson.hasOwnProperty('number')) {
              console.log('Found number property in JSON:', parsedJson.number);
              return parseFloat(parsedJson.number);
            }
          } else if (typeof parsedJson === 'number') {
            return parsedJson;
          } else if (typeof parsedJson === 'string') {
            return parseFloat(parsedJson);
          }
        } catch (jsonError) {
          // If the value is not valid JSON, try to parse it directly
          console.log('Not valid JSON, trying direct parse:', columnValue.value);
          const directParse = parseFloat(columnValue.value);
          if (!isNaN(directParse)) {
            return directParse;
          }
        }
      }
    }

    console.warn('Could not parse number from column value');
    return undefined;
  } catch (err) {
    console.error('Error in getColumnValueAsNumber:', err);
    return undefined;
  }
};

const changeColumnValue = async (
  token: string,
  boardId: string,
  itemId: string,
  columnId: string,
  value: string
): Promise<ChangeColumnResponse | undefined> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-01');

    // First, get the column type to format the value correctly
    const columnInfo = await getColumnInfo(token, boardId, columnId);
    console.log('Column info for formatting:', columnInfo);

    // Format the value based on column type
    let formattedValue = value;

    if (columnInfo?.type) {
      const columnType = columnInfo.type.toLowerCase();

      // Handle different column types
      if (columnType === 'numeric' || columnType === 'numbers') {
        // For number columns, we need to wrap it in a specific format
        try {
          // If the value is already JSON formatted, use it directly
          JSON.parse(value);
          formattedValue = value;
        } catch (e) {
          // If not, format it as a number value
          formattedValue = JSON.stringify({ value: value.toString() });
        }
      } else if (columnType === 'text') {
        // Plain text doesn't need special formatting
        formattedValue = value;
      }
      // Add more column types as needed
    }

    console.log(`Sending formatted value for column type ${columnInfo?.type}:`, formattedValue);

    const query = `mutation change_column_value($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
          id
        }
      }`;
    const variables = { boardId, columnId, itemId, value: formattedValue };

    const response = (await mondayClient.api(query, { variables })) as ChangeColumnResponse;
    return response;
  } catch (err) {
    console.error('Error in changeColumnValue:', err);
    return undefined;
  }
};

// Helper function to get column information
const getColumnInfo = async (token: string, boardId: string, columnId: string) => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-01');

    const query = `query($boardId: ID!, $columnId: String!) {
      boards(ids: [$boardId]) {
        columns(ids: [$columnId]) {
          id
          title
          type
          settings_str
        }
      }
    }`;

    const variables = { boardId, columnId };
    const response = await mondayClient.api(query, { variables });

    if (response?.data?.boards?.[0]?.columns?.[0]) {
      return response.data.boards[0].columns[0];
    }

    return null;
  } catch (err) {
    console.error('Error fetching column info:', err);
    return null;
  }
};

const getBoardIdForItem = async (token: string, itemId: string): Promise<string | undefined> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-04');

    const query = `query($itemId: [ID!]) {
      items(ids: $itemId) {
        id
        board {
          id
        }
      }
    }`;
    const variables = { itemId };

    const response = await mondayClient.api(query, { variables });

    if (response?.data?.items?.[0]?.board?.id) {
      return response.data.items[0].board.id;
    }

    return undefined;
  } catch (err) {
    console.error('Error getting board ID for item:', err);
    return undefined;
  }
};

const getAllColumnValuesForItem = async (token: string, itemId: string): Promise<ColumnValue[] | undefined> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-04');

    const query = `query($itemId: [ID!]) {
      items(ids: $itemId) {
        column_values {
          id
          title
          text
          type
          value
        }
      }
    }`;
    const variables = { itemId };

    const response = await mondayClient.api(query, { variables });

    if (response?.data?.items?.[0]?.column_values) {
      return response.data.items[0].column_values;
    }

    return undefined;
  } catch (err) {
    console.error('Error getting column values for item:', err);
    return undefined;
  }
};

export { getColumnValue, changeColumnValue, getBoardIdForItem, getAllColumnValuesForItem, getColumnValueAsNumber };
