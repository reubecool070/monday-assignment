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

    if (response?.data?.items?.[0]?.column_values?.[0]) {
      const columnValue = response.data.items[0].column_values[0];

      // If text is available, try to parse it directly
      if (columnValue.text) {
        const parsedNumber = parseFloat(columnValue.text);
        if (!isNaN(parsedNumber)) {
          return parsedNumber;
        }
      }

      // If value is available, try to parse it from the JSON value
      if (columnValue.value) {
        try {
          // Monday.com stores numbers as JSON objects with a "value" property
          const parsedJson = JSON.parse(columnValue.value);

          // Handle different column types
          if (typeof parsedJson === 'object') {
            if (parsedJson.hasOwnProperty('value')) {
              return parseFloat(parsedJson.value);
            } else if (parsedJson.hasOwnProperty('number')) {
              return parseFloat(parsedJson.number);
            }
          } else if (typeof parsedJson === 'number') {
            return parsedJson;
          } else if (typeof parsedJson === 'string') {
            return parseFloat(parsedJson);
          }
        } catch (jsonError) {
          // If the value is not valid JSON, try to parse it directly
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

// Subscription management methods
const createSubscription = async (
  token: string,
  webhookUrl: string,
  event: string,
  boardId?: number,
  columnId?: string
): Promise<string | null> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-01');

    // Build the subscription config based on provided parameters
    const config: Record<string, any> = {};

    if (boardId) {
      config.board_id = boardId;
    }

    if (columnId) {
      config.column_id = columnId;
    }

    // Monday.com's subscription mutation
    // Note: The query now uses null for board_id parameter since we're using config
    const query = `mutation createSubscription($webhookUrl: String!, $event: String!, $config: JSON) {
      create_webhook(board_id: null, url: $webhookUrl, event: $event, config: $config) {
        id
      }
    }`;

    // Don't stringify the config - Monday SDK handles this
    const variables = {
      webhookUrl,
      event,
      config,
    };

    try {
      const response = await mondayClient.api(query, { variables });

      if (response?.data?.create_webhook?.id) {
        return response.data.create_webhook.id;
      } else if (response?.data?.create_webhook?.error) {
        console.error('Monday.com API returned errors:', JSON.stringify(response.data.create_webhook.error, null, 2));
        return null;
      } else {
        console.error('Unexpected response format:', JSON.stringify(response, null, 2));
        return null;
      }
    } catch (apiError) {
      console.error('Monday.com API error during subscription creation:', apiError);
      if (apiError instanceof Error) {
        console.error('API Error message:', apiError.message);
        console.error('API Error stack:', apiError.stack);
      }
      return null;
    }
  } catch (err) {
    console.error('Error creating subscription:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    return null;
  }
};

const deleteSubscription = async (token: string, subscriptionId: string): Promise<boolean> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-01');

    // Make sure we have a valid subscription ID
    const parsedId = parseInt(subscriptionId, 10);
    if (isNaN(parsedId)) {
      console.error('Invalid subscription ID format:', subscriptionId);
      return false;
    }

    // Monday.com's delete webhook mutation
    const query = `mutation deleteWebhook($id: Int!) {
      delete_webhook(id: $id) {
        id
      }
    }`;

    const variables = { id: parsedId };

    try {
      const response = await mondayClient.api(query, { variables });

      if (response?.data?.delete_webhook?.id) {
        return true;
      } else if (response?.data?.delete_webhook?.error) {
        console.error(
          'Monday.com API returned errors during deletion:',
          JSON.stringify(response.data.delete_webhook.error, null, 2)
        );
        return false;
      } else {
        console.error('Unexpected response format during deletion:', JSON.stringify(response, null, 2));
        return false;
      }
    } catch (apiError) {
      console.error('Monday.com API error during subscription deletion:', apiError);
      if (apiError instanceof Error) {
        console.error('API Error message:', apiError.message);
        console.error('API Error stack:', apiError.stack);
      }
      return false;
    }
  } catch (err) {
    console.error('Error deleting subscription:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    return false;
  }
};

// List all active webhooks
const listSubscriptions = async (token: string): Promise<any[] | null> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-01');

    // Monday.com's query to list webhooks
    const query = `query {
      webhooks {
        id
        board_id
        app_id
        url
        event
        config
      }
    }`;

    const response = await mondayClient.api(query);

    if (response?.data?.webhooks) {
      return response.data.webhooks;
    }

    return null;
  } catch (err) {
    console.error('Error listing subscriptions:', err);
    return null;
  }
};

const getBoardItems = async (token: string, boardId: string): Promise<Item[] | undefined> => {
  try {
    const mondayClient = mondaySdk();
    mondayClient.setToken(token);
    mondayClient.setApiVersion('2024-04');

    const query = `query($boardId: [ID!]) {
      boards(ids: $boardId) {
        items {
          id
          name
          column_values {
            id
            title
            text
            value
          }
        }
      }
    }`;
    const variables = { boardId };

    const response = await mondayClient.api(query, { variables });

    if (response?.data?.boards?.[0]?.items) {
      return response.data.boards[0].items;
    }

    return undefined;
  } catch (err) {
    console.error('Error getting board items:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
    return undefined;
  }
};

export {
  getColumnValue,
  changeColumnValue,
  getBoardIdForItem,
  getAllColumnValuesForItem,
  getColumnValueAsNumber,
  createSubscription,
  deleteSubscription,
  listSubscriptions,
  getBoardItems,
};
