import express from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { supabaseService } from '../services/supabaseService.js';
import { sheetsService } from '../services/sheetsService.js';
import { config } from '../config.js';

export const apiRouter = express.Router();

// Specific rate limiter for search endpoint
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.security.searchRateLimitMax,
  message: {
    success: false,
    message: 'Too many search requests. Please slow down and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Specific rate limiter for submissions
const submissionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many submission attempts. Please wait a while before trying again.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Health check endpoint
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    mode: config.useMockData ? 'mock_data' : 'production_hybrid',
    readSource: config.supabase.url ? 'Supabase' : 'Local Seed Data',
    writeTarget: config.google.spreadsheetId ? 'Google Sheets' : 'Local Memory'
  });
});

// ========================================================
// PHASE 1: TEAM SEARCH & VERIFICATION (FROM SUPABASE)
// ========================================================

// Search teams by single input query (Name, Leader, USN, Phone)
apiRouter.get('/teams/search', searchLimiter, async (req, res, next) => {
  try {
    const query = req.query.q;
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const sanitizedQuery = query.trim().slice(0, 50);
    const suggestions = await supabaseService.searchTeams(sanitizedQuery);

    return res.json({
      success: true,
      data: suggestions
    });
  } catch (err) {
    next(err);
  }
});

// Get complete verified team details by Team ID
apiRouter.get('/teams/:id', async (req, res, next) => {
  try {
    const teamId = req.params.id;
    if (!teamId || typeof teamId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Team ID format'
      });
    }

    const team = await supabaseService.getTeamById(teamId.trim());
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team record not found in registered records'
      });
    }

    // Source of Truth is Supabase submissions table
    const submittedInSupabase = await supabaseService.hasSubmittedInSupabase(team.usn, team.phone, team.teamLeader);
    
    if (!submittedInSupabase) {
      // If deleted from Supabase, automatically ensure Google Sheets is also cleared
      await sheetsService.clearSubmission(team.teamLeader, team.usn, team.teamName, team.teamId);
      team.hasSubmitted = false;
    } else {
      team.hasSubmitted = true;
    }

    return res.json({
      success: true,
      data: team
    });
  } catch (err) {
    next(err);
  }
});

// ========================================================
// PHASE 2: THEME & PROBLEM STATEMENT ENDPOINTS (SUPABASE)
// ========================================================

// Get all active themes
apiRouter.get('/themes', async (req, res, next) => {
  try {
    const themes = await supabaseService.getThemes();
    return res.json({
      success: true,
      data: themes
    });
  } catch (err) {
    next(err);
  }
});

// Get problem statements filtered by theme
apiRouter.get('/problem-statements', async (req, res, next) => {
  try {
    const theme = req.query.theme;
    if (!theme || typeof theme !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Theme query parameter is required'
      });
    }

    const statements = await supabaseService.getProblemStatementsByTheme(theme.trim());
    return res.json({
      success: true,
      data: statements
    });
  } catch (err) {
    next(err);
  }
});

// Get single problem statement by ID
apiRouter.get('/problem-statements/:id', async (req, res, next) => {
  try {
    const psId = req.params.id;
    if (!psId || typeof psId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid Problem Statement ID'
      });
    }

    const statement = await supabaseService.getProblemStatementById(psId.trim());
    if (!statement) {
      return res.status(404).json({
        success: false,
        message: 'Problem statement not found'
      });
    }

    return res.json({
      success: true,
      data: statement
    });
  } catch (err) {
    next(err);
  }
});

// ========================================================
// PHASE 3: SUBMISSION & SUPABASE / GOOGLE SHEETS STORAGE
// ========================================================

const submissionSchema = z.object({
  teamId: z.string().min(1, 'Team ID is required').max(50),
  psId: z.string().min(1, 'Problem Statement ID is required').max(50)
});

// Final server-side verified submission: writes to Supabase submissions table & Google Sheets
apiRouter.post('/submissions', submissionLimiter, async (req, res, next) => {
  try {
    const parseResult = submissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed: Team ID and Problem Statement ID are required'
      });
    }

    const { teamId, psId } = parseResult.data;

    // 1. Fetch and verify Team from Supabase
    const team = await supabaseService.getTeamById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Team verification failed: Team does not exist in registered records'
      });
    }

    // 2. Check duplicate submission in Supabase (by USN/Phone/Leader) OR Google Sheets
    const alreadyInSupabase = await supabaseService.hasSubmittedInSupabase(team.usn, team.phone, team.teamLeader);
    const alreadyInSheets = await sheetsService.hasTeamSubmitted(team.teamId, team.teamLeader, team.usn, team.teamName);
    
    if (alreadyInSupabase || alreadyInSheets) {
      return res.status(409).json({
        success: false,
        message: `Team '${team.teamName}' / USN '${team.usn}' has already submitted a problem statement`
      });
    }

    // 3. Fetch and verify Problem Statement from Supabase
    const ps = await supabaseService.getProblemStatementById(psId);
    if (!ps) {
      return res.status(404).json({
        success: false,
        message: 'Problem statement selection is invalid or does not exist'
      });
    }

    if ((ps.status || 'Active').toLowerCase() !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Selected problem statement is currently inactive'
      });
    }

    // 4. Construct verified submission record (keeping PS ID and PS Name strictly separate)
    const timestamp = new Date().toISOString();
    const submissionRecord = {
      timestamp,
      teamId: team.teamId,
      teamName: team.teamName,
      leader: team.teamLeader,
      usn: team.usn,
      phone: team.phone,
      psId: ps.psId,
      problemStatement: ps.problemStatement, // PS Name
      psName: ps.problemStatement,
      theme: ps.theme,
      category: ps.category,
      submissionStatus: 'Submitted'
    };

    // 5. Store directly in Supabase submissions table
    await supabaseService.recordSubmissionToSupabase(submissionRecord);

    // 6. Update Google Sheets on the matched team row after column AY (AZ:BE)
    await sheetsService.recordSubmission(submissionRecord);

    return res.status(201).json({
      success: true,
      message: 'Problem statement selection successfully verified and recorded into Google Sheets!',
      data: {
        timestamp: submissionRecord.timestamp,
        teamId: submissionRecord.teamId,
        teamName: submissionRecord.teamName,
        leader: submissionRecord.leader,
        psId: submissionRecord.psId,
        psName: submissionRecord.problemStatement,
        problemStatement: submissionRecord.problemStatement,
        theme: submissionRecord.theme,
        category: submissionRecord.category,
        submissionStatus: submissionRecord.submissionStatus
      }
    });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message
      });
    }
    next(err);
  }
});

// Delete/Reset submission (Synchronously deletes from Supabase & clears Google Sheets)
apiRouter.delete('/submissions/:identifier', async (req, res, next) => {
  try {
    const identifier = req.params.identifier;
    if (!identifier) {
      return res.status(400).json({ success: false, message: 'Identifier (USN/Leader) is required' });
    }

    // 1. Delete from Supabase
    await supabaseService.deleteSubmissionFromSupabase(identifier);

    // 2. Clear from Google Sheets
    await sheetsService.clearSubmission(identifier, identifier, identifier, identifier);

    return res.json({
      success: true,
      message: `Submission for '${identifier}' has been removed from database and Google Sheets. The team can now re-submit.`
    });
  } catch (err) {
    next(err);
  }
});
