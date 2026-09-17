import { z } from 'zod';

export const financialStructuringRequestSchema = z.object({
  // Module 1 link
  analysisId: z.string().optional(),

  // Location & business (auto-filled from Module 1)
  location: z.string().min(1, 'Location is required.'),
  businessCategory: z.string().min(1, 'Business category is required.'),

  // New wizard Step 1 fields (scheme matching inputs)
  totalProjectCost: z.number().positive('Total project cost must be greater than 0.').optional(),
  requestedLoanAmount: z.number().positive('Requested loan amount must be greater than 0.').optional(),
  ownContribution: z.number().min(0, 'Own contribution cannot be negative.').optional(),

  // Legacy field (kept for backward compatibility)
  ownInvestment: z.number().min(0).optional(),

  // New wizard Step 2: selected scheme
  selectedSchemeId: z.string().optional(),

  // New wizard Step 3: shop expense breakdown
  shopRent: z.number().min(0).default(0),
  productMaintenanceCost: z.number().min(0).default(0),
  numberOfLabours: z.number().int().min(0).default(0),
  labourWagePerPerson: z.number().min(0).default(0),
  otherExpenses: z.number().min(0).default(0),

  // Revenue estimate (from Step 3)
  estimatedMonthlyRevenue: z.number().min(0, 'Estimated monthly revenue must be 0 or greater.').default(0),

  // Legacy fields
  isExistingBusiness: z.boolean().default(false),
  estimatedMonthlyExpenses: z.number().min(0).default(0),
  assetStatus: z.enum(['None', 'Own Shop', 'Own Land', 'Rented Shop']).default('None'),
  language: z.enum(['en', 'ta']).optional().default('en')
});
