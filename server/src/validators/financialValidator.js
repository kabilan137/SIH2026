import { z } from 'zod';

export const financialStructuringRequestSchema = z.object({
  analysisId: z.string().optional(),
  location: z.string().min(1, 'Location is required.'),
  businessCategory: z.string().min(1, 'Business category is required.'),
  ownInvestment: z.number().positive('Own Investment (Margin Money) must be greater than 0.'),
  isExistingBusiness: z.boolean().default(false),
  estimatedMonthlyRevenue: z.number().min(0, 'Estimated monthly revenue must be 0 or greater.'),
  estimatedMonthlyExpenses: z.number().min(0, 'Estimated monthly expenses must be 0 or greater.'),
  assetStatus: z.enum(['None', 'Own Shop', 'Own Land', 'Rented Shop']).default('None')
});
