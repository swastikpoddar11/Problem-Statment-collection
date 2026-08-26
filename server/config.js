import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  useMockData: process.env.USE_MOCK_DATA === 'true',
  
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '',
    tables: {
      teams: process.env.SUPABASE_TEAMS_TABLE || 'teams',
      problemStatements: process.env.SUPABASE_PROBLEM_STATEMENTS_TABLE || 'problem_statements',
      submissions: process.env.SUPABASE_SUBMISSIONS_TABLE || 'submissions',
    }
  },

  // Google Sheets Configuration
  google: {
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
    webhookUrl: process.env.GOOGLE_SHEETS_WEBHOOK_URL || '',
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    privateKey: (() => {
      let key = process.env.GOOGLE_PRIVATE_KEY || '';
      if (key) {
        key = key.replace(/\\n/g, '\n');
        if (!key.includes('BEGIN PRIVATE KEY')) {
          try {
            const decoded = Buffer.from(key.trim(), 'base64').toString('utf8');
            if (decoded.includes('BEGIN PRIVATE KEY')) {
              key = decoded;
            }
          } catch (e) {}
        }
      }
      return key;
    })(),
    sheetNames: {
      submissions: process.env.SHEET_SUBMISSIONS_NAME || 'Form Responses 1',
    }
  },
  
  // Security
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    searchRateLimitMax: parseInt(process.env.SEARCH_RATE_LIMIT_MAX || '60', 10),
  }
};
