interface TransformationType {
  title: string;
  value: string;
}

const TRANSFORMATION_TYPES: TransformationType[] = [
  { title: 'to upper case', value: 'TO_UPPER_CASE' },
  { title: 'to lower case', value: 'TO_LOWER_CASE' },
];

export { TRANSFORMATION_TYPES, TransformationType };
