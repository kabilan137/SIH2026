import mongoose from 'mongoose';

const financialTransactionSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, index: true },
    schemeMatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchemeMatch', default: null },

    // Transaction type
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense']
    },

    // Category
    category: {
      type: String,
      required: true,
      enum: [
        // Income categories
        'sales', 'other_income',
        // Expense categories
        'rent', 'inventory', 'labour', 'electricity', 'transport',
        'marketing', 'loan_repayment', 'maintenance', 'water',
        'internet', 'licensing', 'emergency', 'other_expense'
      ]
    },

    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, trim: true, default: '' },

    // Denormalized month/year for efficient querying
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true }
  },
  { timestamps: true }
);

financialTransactionSchema.index({ clerkId: 1, year: 1, month: 1 });
financialTransactionSchema.index({ clerkId: 1, date: -1 });

export default mongoose.model('FinancialTransaction', financialTransactionSchema);
