type TransformationType = 'TO_UPPER_CASE' | 'TO_LOWER_CASE';

const transformText = (value: string, type: TransformationType): string => {
  switch (type) {
    case 'TO_UPPER_CASE':
      return value.toUpperCase();
    case 'TO_LOWER_CASE':
      return value.toLowerCase();
    default:
      return value.toUpperCase();
  }
};

export { transformText, TransformationType };
