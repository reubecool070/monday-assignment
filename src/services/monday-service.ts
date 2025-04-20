import mondaySdk from 'monday-sdk-js';

interface ColumnValue {
  value: string;
}

interface Item {
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

    const query = `mutation change_column_value($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(board_id: $boardId, item_id: $itemId, column_id: $columnId, value: $value) {
          id
        }
      }
      `;
    const variables = { boardId, columnId, itemId, value };

    const response = (await mondayClient.api(query, { variables })) as ChangeColumnResponse;
    return response;
  } catch (err) {
    console.error(err);
    return undefined;
  }
};

export { getColumnValue, changeColumnValue };
