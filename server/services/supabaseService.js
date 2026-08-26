import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { mockTeams, mockProblemStatements } from './mockData.js';

class SupabaseService {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;
    this.cachedTeams = [];
    this.cachedPS = [];
    this.lastCacheTime = 0;
    this.initClient();
  }

  initClient() {
    if (config.useMockData || !config.supabase.url || !config.supabase.key) {
      console.log('ℹ️ SupabaseService: Operating in local mock data mode.');
      return;
    }

    try {
      this.supabase = createClient(config.supabase.url, config.supabase.key, {
        auth: { persistSession: false }
      });
      this.isInitialized = true;
      console.log('✅ SupabaseService: Connected to Live Supabase Database successfully.');
    } catch (err) {
      console.error('❌ Failed to initialize Supabase client:', err.message);
      config.useMockData = true;
    }
  }

  // Maps live Supabase row into normalized team format
  normalizeTeamRow(row, index = 0) {
    if (!row) return null;

    const teamName = (row['Team Name'] || row.team_name || row.name || '').trim();
    const leaderName = (row["Team Leader's Name"] || row.team_leader || row.leader || row.leader_name || '').trim();
    const usn = (row["Team Leader's USN/Registration No"] || row.usn || row.leader_usn || '').trim();
    const phone = (row["Team Leader's Phone No"] || row.phone || row.contact_number || '').trim();
    const college = (row["Team Leader's Branch"] ? `${row["Team Leader's Branch"]} (${row["Team Leader's Batch"] || ''})` : row.college || 'Registered College').trim();
    const track = (row['Project Theme'] || row.track || '').trim();
    
    // Construct team identifier if not explicit
    const teamId = row['Team ID'] || row.team_id || usn || `T${String(index + 1).padStart(3, '0')}`;

    // Collect all member names
    const membersList = [];
    if (leaderName) membersList.push(`${leaderName} (Leader)`);
    for (let i = 1; i <= 6; i++) {
      const mName = row[`Team Member ${i} Name`];
      const mUsn = row[`Team Member ${i} USN/Registration No`];
      if (mName && mName.trim()) {
        membersList.push(`${mName.trim()}${mUsn ? ` (${mUsn.trim()})` : ''}`);
      }
    }

    return {
      teamId,
      teamName,
      teamLeader: leaderName,
      usn,
      phone,
      members: membersList.length > 0 ? membersList.join(', ') : 'Registered Team',
      college,
      track,
      status: 'Verified'
    };
  }

  // Maps live Supabase problem statements row
  normalizePSRow(row) {
    if (!row) return null;

    const psId = (row['PS Number'] || row.ps_id || row.psId || row.id || '').trim();
    const theme = (row['Theme'] || row.theme || '').trim();
    const title = (row['Problem Statement Title'] || row.problem_statement || row.title || '').trim();
    const category = (row['Category'] || row.category || 'General').trim();
    const description = (row['Description'] || row.description || title).trim();

    return {
      psId,
      theme,
      problemStatement: title,
      category,
      description,
      status: 'Active'
    };
  }

  // ========================================================
  // 1. TEAM SEARCH & VERIFICATION (SUPABASE)
  // ========================================================

  async fetchAllTeams() {
    if (config.useMockData || !this.supabase) {
      return mockTeams;
    }

    // Cache teams in memory for 30 seconds for blazing fast autocomplete
    const now = Date.now();
    if (this.cachedTeams.length > 0 && now - this.lastCacheTime < 30000) {
      return this.cachedTeams;
    }

    try {
      const { data, error } = await this.supabase
        .from('teams')
        .select('*');

      if (error) {
        console.error('Supabase teams fetch error:', error.message);
        return this.cachedTeams.length > 0 ? this.cachedTeams : mockTeams;
      }

      this.cachedTeams = (data || []).map((r, i) => this.normalizeTeamRow(r, i));
      this.lastCacheTime = now;
      return this.cachedTeams;
    } catch (err) {
      console.error('Error fetching teams:', err.message);
      return mockTeams;
    }
  }

  async searchTeams(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q || q.length < 2) return [];

    const allTeams = await this.fetchAllTeams();

    const matches = allTeams.filter(t => 
      (t.teamName && t.teamName.toLowerCase().includes(q)) ||
      (t.teamLeader && t.teamLeader.toLowerCase().includes(q)) ||
      (t.usn && t.usn.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.teamId && t.teamId.toLowerCase().includes(q))
    );

    return matches.slice(0, 8).map(t => {
      let matchField = 'Team';
      if (t.usn && t.usn.toLowerCase().includes(q)) matchField = `USN: ${t.usn}`;
      else if (t.phone && t.phone.toLowerCase().includes(q)) matchField = `Phone: ${t.phone}`;
      else if (t.teamLeader && t.teamLeader.toLowerCase().includes(q)) matchField = `Leader: ${t.teamLeader}`;

      return {
        teamId: t.teamId,
        teamName: t.teamName,
        teamLeader: t.teamLeader,
        matchField
      };
    });
  }

  async getTeamById(teamId) {
    if (!teamId) return null;
    const tid = String(teamId).trim().toUpperCase();

    const allTeams = await this.fetchAllTeams();
    const found = allTeams.find(t => 
      (t.teamId && t.teamId.toUpperCase() === tid) ||
      (t.usn && t.usn.toUpperCase() === tid) ||
      (t.teamName && t.teamName.toUpperCase() === tid) ||
      (t.teamLeader && t.teamLeader.toUpperCase() === tid)
    );

    return found ? { ...found } : null;
  }

  // ========================================================
  // 2. THEMES & PROBLEM STATEMENTS (SUPABASE)
  // ========================================================

  async fetchAllPS() {
    if (config.useMockData || !this.supabase) {
      return mockProblemStatements;
    }

    if (this.cachedPS.length > 0) {
      return this.cachedPS;
    }

    try {
      const { data, error } = await this.supabase
        .from('problem_statements')
        .select('*');

      if (error) {
        console.error('Supabase problem_statements fetch error:', error.message);
        return mockProblemStatements;
      }

      this.cachedPS = (data || []).map(r => this.normalizePSRow(r));
      return this.cachedPS;
    } catch (err) {
      console.error('Error fetching problem statements from Supabase:', err.message);
      return mockProblemStatements;
    }
  }

  async getThemes() {
    const allPS = await this.fetchAllPS();
    const themes = [...new Set(allPS.map(ps => ps.theme).filter(Boolean))];
    return themes;
  }

  async getProblemStatementsByTheme(theme) {
    if (!theme) return [];
    const targetTheme = theme.trim().toLowerCase();

    const allPS = await this.fetchAllPS();
    return allPS.filter(ps => ps.theme.toLowerCase() === targetTheme);
  }

  async getProblemStatementById(psId) {
    if (!psId) return null;
    const targetId = String(psId).trim().toUpperCase();

    const allPS = await this.fetchAllPS();
    return allPS.find(ps => ps.psId.toUpperCase() === targetId) || null;
  }

  // ========================================================
  // 3. SUBMISSIONS TRACKING & STORAGE IN SUPABASE
  // ========================================================

  /**
   * Check if a team leader / USN / Phone has already submitted in Supabase
   */
  async hasSubmittedInSupabase(usn = '', phone = '', leaderName = '') {
    if (!this.supabase) return false;

    try {
      const cleanUsn = String(usn || '').trim();
      const cleanPhone = String(phone || '').trim();
      const cleanLeader = String(leaderName || '').trim();

      const conditions = [];
      if (cleanUsn) conditions.push(`usn.eq.${cleanUsn}`);
      if (cleanPhone) conditions.push(`phone.eq.${cleanPhone}`);
      if (cleanLeader) conditions.push(`team_leader.ilike.%${cleanLeader}%`);

      if (conditions.length === 0) return false;

      const { data, error } = await this.supabase
        .from('submissions')
        .select('usn, phone, team_leader, ps_id, submission_status')
        .or(conditions.join(','))
        .limit(1);

      if (error) {
        // If table doesn't exist yet, return false
        console.warn('Note on Supabase submission check:', error.message);
        return false;
      }

      return Boolean(data && data.length > 0);
    } catch (err) {
      console.warn('Supabase submission check error:', err.message);
      return false;
    }
  }

  /**
   * Record verified submission directly into Supabase submissions table
   */
  async recordSubmissionToSupabase(record) {
    if (!this.supabase) return null;

    try {
      const submissionRow = {
        usn: record.usn || record.teamId || '',
        phone: record.phone || '',
        team_name: record.teamName || '',
        team_leader: record.leader || '',
        ps_id: record.psId || '',
        ps_name: record.problemStatement || record.psName || '',
        theme: record.theme || '',
        category: record.category || '',
        submission_status: record.submissionStatus || 'Submitted',
        created_at: record.timestamp || new Date().toISOString()
      };

      const { data, error } = await this.supabase
        .from('submissions')
        .upsert(submissionRow, { onConflict: 'usn' })
        .select();

      if (error) {
        console.error('Supabase submission insert error:', error.message);
        // Try fallback insert if upsert had conflict key mismatch
        const insertRes = await this.supabase.from('submissions').insert([submissionRow]);
        if (insertRes.error) {
          console.error('Supabase fallback insert error:', insertRes.error.message);
        } else {
          console.log(`✅ [SUPABASE] Inserted submission for USN '${record.usn}' -> PS ${record.psId}`);
        }
      } else {
        console.log(`✅ [SUPABASE] Successfully stored submission in Supabase for USN '${record.usn}' / Leader '${record.leader}'`);
      }

      return data;
    } catch (err) {
      console.error('Error writing submission to Supabase:', err.message);
      return null;
    }
  }

  /**
   * Delete a submission from Supabase by USN, Phone, or Team Leader
   */
  async deleteSubmissionFromSupabase(identifier) {
    if (!this.supabase || !identifier) return false;

    try {
      const cleanId = String(identifier).trim();
      const { data, error } = await this.supabase
        .from('submissions')
        .delete()
        .or(`usn.eq.${cleanId},phone.eq.${cleanId},team_leader.ilike.%${cleanId}%`);

      if (error) {
        console.error('Error deleting submission from Supabase:', error.message);
        return false;
      }

      console.log(`🧹 [SUPABASE] Deleted submission record matching '${cleanId}'`);
      return true;
    } catch (err) {
      console.error('Error deleting submission from Supabase:', err.message);
      return false;
    }
  }
}

export const supabaseService = new SupabaseService();
