import { google } from 'googleapis';
import { config } from '../config.js';
import { mockSubmissions } from './mockData.js';

class SheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.isInitialized = false;
    this.headersEnsured = false;
    this.initAuth();
  }

  initAuth() {
    if (config.useMockData) {
      console.log('ℹ️ SheetsService: Operating in mock mode.');
      return;
    }

    if (config.google.webhookUrl) {
      console.log('✅ SheetsService: Configured with Google Sheets Webhook URL.');
      this.isInitialized = true;
      return;
    }

    if (!config.google.spreadsheetId || !config.google.serviceAccountEmail || !config.google.privateKey) {
      console.log('ℹ️ SheetsService: Awaiting Google credentials or Webhook URL in .env.');
      return;
    }

    try {
      this.auth = new google.auth.JWT({
        email: config.google.serviceAccountEmail,
        key: config.google.privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.isInitialized = true;
      console.log('✅ SheetsService: Connected to Google Sheets API successfully.');
      this.ensureHeaders();
    } catch (err) {
      console.error('❌ Failed to initialize Google Sheets client:', err.message);
    }
  }

  get sheetName() {
    return config.google.sheetNames.submissions || 'Form Responses 1';
  }

  async ensureHeaders() {
    if (!this.sheets || this.headersEnsured) return;

    try {
      const headerValues = [
        [
          'Selected PS ID',
          'Selected Theme',
          'Problem Statement Name (PS Name)',
          'Category'
        ]
      ];

      await this.sheets.spreadsheets.values.update({
        spreadsheetId: config.google.spreadsheetId,
        range: `'${this.sheetName}'!AZ1:BC1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: headerValues
        }
      });
      this.headersEnsured = true;
    } catch (err) {
      console.warn('Note on ensureHeaders:', err.message);
    }
  }

  async findRowAndStatus(leaderName = '', usn = '', teamName = '', teamId = '') {
    if (!this.sheets) return null;

    try {
      const cleanLeader = String(leaderName || '').trim().toLowerCase();
      const cleanUsn = String(usn || '').trim().toLowerCase();
      const cleanTeam = String(teamName || '').trim().toLowerCase();
      const cleanId = String(teamId || '').trim().toLowerCase();

      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: config.google.spreadsheetId,
        range: `'${this.sheetName}'!A1:BC1000`
      });

      const rows = response.data.values;
      if (!rows || rows.length <= 1) return null;

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rowText = row.slice(0, 51).map(cell => String(cell || '').trim().toLowerCase());
        
        const isMatch = rowText.some(cell => 
          (cleanLeader && cell === cleanLeader) ||
          (cleanUsn && cell === cleanUsn) ||
          (cleanTeam && cell === cleanTeam) ||
          (cleanId && cell === cleanId) ||
          (cleanLeader && cell.includes(cleanLeader))
        );

        if (isMatch) {
          const rowIndex = i + 1;
          const existingPsId = row[51] ? String(row[51]).trim() : '';
          const hasSubmitted = Boolean(existingPsId);

          return {
            rowIndex,
            hasSubmitted,
            existingPsId
          };
        }
      }

      return null;
    } catch (err) {
      console.error('Error finding team row in Google Sheet:', err.message);
      return null;
    }
  }

  /**
   * Clear submitted columns AZ:BC in Google Sheets when a submission is deleted
   */
  async clearSubmission(leaderName = '', usn = '', teamName = '', teamId = '') {
    // Remove from in-memory array
    const cleanUsn = String(usn || '').trim().toUpperCase();
    const cleanLeader = String(leaderName || '').trim().toLowerCase();
    
    const idx = mockSubmissions.findIndex(s => 
      (cleanUsn && (s.usn || s.teamId || '').toUpperCase() === cleanUsn) ||
      (cleanLeader && (s.leader || '').toLowerCase() === cleanLeader)
    );
    if (idx !== -1) {
      mockSubmissions.splice(idx, 1);
    }

    // Clear via Webhook
    if (config.google.webhookUrl) {
      try {
        await fetch(config.google.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'clear',
            leader: leaderName,
            usn: usn,
            teamName: teamName
          })
        });
        console.log(`🧹 [WEBHOOK] Cleared Google Sheets columns for Leader '${leaderName}' / USN '${usn}'`);
      } catch (err) {
        console.warn('Webhook clear error:', err.message);
      }
    }

    // Clear via Google Sheets API
    if (this.sheets) {
      try {
        const rowInfo = await this.findRowAndStatus(leaderName, usn, teamName, teamId);
        if (rowInfo && rowInfo.rowIndex) {
          const clearRange = `'${this.sheetName}'!AZ${rowInfo.rowIndex}:BC${rowInfo.rowIndex}`;
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: config.google.spreadsheetId,
            range: clearRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [['', '', '', '']]
            }
          });
          console.log(`🧹 [GOOGLE SHEETS] Cleared row ${rowInfo.rowIndex} columns AZ:BC for Leader '${leaderName}'`);
        }
      } catch (err) {
        console.warn('Sheets API clear error:', err.message);
      }
    }
  }

  async hasTeamSubmitted(teamId, leaderName = '', usn = '', teamName = '') {
    if (this.sheets) {
      const rowInfo = await this.findRowAndStatus(leaderName, usn, teamName, teamId);
      return Boolean(rowInfo && rowInfo.hasSubmitted);
    }
    return false;
  }

  async recordSubmission(submissionRecord) {
    mockSubmissions.push(submissionRecord);

    // Path 1: Google Apps Script Webhook
    if (config.google.webhookUrl) {
      try {
        const payload = {
          action: 'submit',
          leader: submissionRecord.leader,
          usn: submissionRecord.usn,
          phone: submissionRecord.phone,
          teamName: submissionRecord.teamName,
          psId: submissionRecord.psId,
          theme: submissionRecord.theme,
          problemStatement: submissionRecord.problemStatement,
          psName: submissionRecord.problemStatement,
          category: submissionRecord.category
        };

        await fetch(config.google.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        console.log(`✅ [WEBHOOK] Sent submission for Leader '${submissionRecord.leader}' (PS: ${submissionRecord.psId}) to Google Apps Script.`);
        return submissionRecord;
      } catch (err) {
        console.error('Google Webhook submission error:', err.message);
        throw new Error('Failed to record submission via Google Apps Script Webhook.');
      }
    }

    // Path 2: Google Sheets API v4
    if (this.sheets) {
      try {
        await this.ensureHeaders();

        const rowInfo = await this.findRowAndStatus(
          submissionRecord.leader,
          submissionRecord.usn,
          submissionRecord.teamName,
          submissionRecord.teamId
        );

        const updateValues = [
          [
            submissionRecord.psId,
            submissionRecord.theme,
            submissionRecord.problemStatement,
            submissionRecord.category
          ]
        ];

        if (rowInfo && rowInfo.rowIndex) {
          const updateRange = `'${this.sheetName}'!AZ${rowInfo.rowIndex}:BC${rowInfo.rowIndex}`;
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: config.google.spreadsheetId,
            range: updateRange,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: updateValues
            }
          });
          console.log(`✅ [GOOGLE SHEETS] Updated Row ${rowInfo.rowIndex} in '${this.sheetName}' (Columns AZ:BC) for Leader '${submissionRecord.leader}'`);
        } else {
          await this.sheets.spreadsheets.values.append({
            spreadsheetId: config.google.spreadsheetId,
            range: `'${this.sheetName}'!AZ:BC`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: updateValues
            }
          });
        }

        return submissionRecord;
      } catch (err) {
        console.error('Error writing submission to Google Sheet:', err.message);
        throw new Error('Unable to record submission into Google Sheets.');
      }
    }

    console.log(`✅ [LOCAL RECORD] Submission recorded for '${submissionRecord.leader}' -> PS ${submissionRecord.psId}`);
    return submissionRecord;
  }
}

export const sheetsService = new SheetsService();
