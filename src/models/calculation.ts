import mongoose from 'mongoose';

// Define the Calculation schema
const CalculationSchema = new mongoose.Schema({
  itemId: {
    type: String,
    required: true,
    index: true,
  },
  boardId: {
    type: String,
    required: true,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  sourceColumnId: {
    type: String,
    required: true,
  },
  sourceValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  factorColumnId: {
    type: String,
    required: true,
  },
  factorValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  targetColumnId: {
    type: String,
    required: true,
  },
  result: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  operation: {
    type: String,
    default: 'multiplication',
  },
  accountId: {
    type: String,
    index: true,
  },
});

// Define indexes for common queries
CalculationSchema.index({ itemId: 1, timestamp: -1 });
CalculationSchema.index({ boardId: 1, timestamp: -1 });

// Create and export the model
export const Calculation = mongoose.model('Calculation', CalculationSchema);

export default Calculation;
