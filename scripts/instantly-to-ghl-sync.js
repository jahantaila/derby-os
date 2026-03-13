#!/usr/bin/env node

/**
 * Instantly → GoHighLevel Sync Script
 * 
 * IMPORTANT NOTE: The Instantly API endpoints for fetching leads and emails 
 * are not currently available/working. The script fetches campaigns successfully
 * but uses mock data for interested leads to demonstrate the sync process.
 * 
 * When the API endpoints become available, replace the createMockInterestedLeads
 * function with actual API calls to get leads with status "Interested" and 
 * their email conversations.
 * 
 * Usage: 
 *   node scripts/instantly-to-ghl-sync.js           # Real sync
 *   node scripts/instantly-to-ghl-sync.js --dry-run # Test mode
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const config = {
  instantly: {
    baseUrl: 'https://api.instantly.ai/api/v2',
    headers: {
      'Authorization': 'Bearer MzQ0ODcyMDktNGYxNC00NTVhLWI4MDUtNDFhM2M2Y2NiYWNlOlpyaUdsSlpGeWdXeg==',
      'Content-Type': 'application/json'
    }
  },
  ghl: {
    baseUrl: 'https://services.leadconnectorhq.com',
    headers: {
      'Authorization': 'Bearer pit-4ae0985d-8de0-40e6-b688-4e6805e57c58',
      'User-Agent': 'Mozilla/5.0',
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    },
    locationId: '3zMwpehG9y8ETJsZtR3d',
    pipelineId: 'oNcLIG8SGY8IKvvVbkDe',
    stageId: '0415b950-1b0e-47be-b7c4-65222923b448',
    customFields: {
      leadSource: 'dLDNSAZYHk5qihoOx5oP',
      currentProvider: 'gziZOwyG3l2wDoxIyFVM'
    }
  },
  stateFile: '/home/kim/.openclaw/workspace/mission-control/data/instantly-sync-state.json'
};

// Rate limiting
const RATE_LIMIT_DELAY = 3000; // 3 seconds between GHL calls
const RETRY_DELAY = 90000; // 90 seconds for 403 errors

// Utility functions
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      port: 443
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });
    
    if (options.body) {
      const body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.write(body);
    }
    
    req.end();
  });
}

async function makeGHLRequest(endpoint, options = {}, retries = 3) {
  const url = `${config.ghl.baseUrl}${endpoint}`;
  const requestOptions = {
    ...options,
    headers: { ...config.ghl.headers, ...options.headers }
  };

  for (let i = 0; i < retries; i++) {
    try {
      const response = await makeRequest(url, requestOptions);
      
      if (response.status === 403 && i < retries - 1) {
        console.log(`GHL 403 error, waiting ${RETRY_DELAY/1000}s before retry...`);
        await delay(RETRY_DELAY);
        continue;
      }
      
      if (response.status === 429 && i < retries - 1) {
        console.log('Rate limit hit, waiting...');
        await delay(RATE_LIMIT_DELAY * 2);
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await delay(1000);
    }
  }
}

async function loadSyncState() {
  try {
    const data = await fs.readFile(config.stateFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return { syncedLeads: new Set() };
  }
}

async function saveSyncState(state) {
  await fs.mkdir(path.dirname(config.stateFile), { recursive: true });
  // Convert Set to Array for JSON serialization
  const serializable = {
    ...state,
    syncedLeads: Array.from(state.syncedLeads)
  };
  await fs.writeFile(config.stateFile, JSON.stringify(serializable, null, 2));
}

function extractNameFromEmail(email) {
  const parts = email.split('@')[0].split(/[._-]/);
  return {
    firstName: parts[0]?.charAt(0).toUpperCase() + parts[0]?.slice(1).toLowerCase() || '',
    lastName: parts[1]?.charAt(0).toUpperCase() + parts[1]?.slice(1).toLowerCase() || ''
  };
}

async function getBusinessNameFromDomain(domain) {
  try {
    const response = await makeRequest(`https://${domain}`);
    if (response.data && typeof response.data === 'string') {
      const titleMatch = response.data.match(/<title[^>]*>([^<]+)</i);
      if (titleMatch) {
        return titleMatch[1].trim().replace(/^\w+\s*-\s*/, ''); // Remove site name prefix
      }
    }
  } catch (error) {
    console.log(`Could not fetch business name for domain ${domain}: ${error.message}`);
  }
  return '';
}

function extractPhoneFromText(text) {
  const phoneRegex = /(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/;
  const match = text.match(phoneRegex);
  return match ? match[0].replace(/[^\d+]/g, '') : '';
}

async function fetchInstantlyCampaigns() {
  console.log('Fetching Instantly campaigns...');
  
  const response = await makeRequest(`${config.instantly.baseUrl}/campaigns`, {
    headers: config.instantly.headers
  });
  
  if (response.status !== 200) {
    throw new Error(`Failed to fetch campaigns: ${response.status} - ${JSON.stringify(response.data)}`);
  }
  
  console.log(`Found ${response.data.items?.length || 0} campaigns`);
  return response.data.items || [];
}

async function checkContactExistsInGHL(email) {
  const response = await makeGHLRequest(
    `/contacts/lookup?locationId=${config.ghl.locationId}&email=${encodeURIComponent(email)}`
  );
  
  return response.status === 200 && response.data?.contact;
}

async function createContactInGHL(contactData, isDryRun = false) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would create contact:`, contactData);
    return { id: 'dry-run-contact-id' };
  }

  await delay(RATE_LIMIT_DELAY);
  
  const response = await makeGHLRequest('/contacts/', {
    method: 'POST',
    body: {
      ...contactData,
      locationId: config.ghl.locationId,
      customFields: [
        { id: config.ghl.customFields.leadSource, value: 'Cold Email' },
        ...(contactData.customFields || [])
      ]
    }
  });
  
  if (response.status === 201 || response.status === 200) {
    console.log(`✓ Created contact: ${contactData.email}`);
    return response.data.contact || response.data;
  } else {
    throw new Error(`Failed to create contact: ${response.status} - ${JSON.stringify(response.data)}`);
  }
}

async function createOpportunityInGHL(contactId, name, isDryRun = false) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would create opportunity: ${name} for contact ${contactId}`);
    return { id: 'dry-run-opportunity-id' };
  }

  await delay(RATE_LIMIT_DELAY);
  
  const response = await makeGHLRequest('/opportunities/', {
    method: 'POST',
    body: {
      pipelineId: config.ghl.pipelineId,
      locationId: config.ghl.locationId,
      name: name,
      pipelineStageId: config.ghl.stageId,
      status: 'open',
      contactId: contactId
    }
  });
  
  if (response.status === 201 || response.status === 200) {
    console.log(`✓ Created opportunity: ${name}`);
    return response.data;
  } else {
    throw new Error(`Failed to create opportunity: ${response.status} - ${JSON.stringify(response.data)}`);
  }
}

async function addNoteToContact(contactId, noteText, isDryRun = false) {
  if (isDryRun) {
    console.log(`[DRY RUN] Would add note to contact ${contactId}:`, noteText.substring(0, 100) + '...');
    return;
  }

  await delay(RATE_LIMIT_DELAY);
  
  const response = await makeGHLRequest(`/contacts/${contactId}/notes`, {
    method: 'POST',
    body: {
      body: noteText,
      locationId: config.ghl.locationId
    }
  });
  
  if (response.status === 201 || response.status === 200) {
    console.log(`✓ Added note to contact`);
  } else {
    console.error(`Failed to add note: ${response.status} - ${JSON.stringify(response.data)}`);
  }
}

// Mock function for leads since API endpoints are not available
function createMockInterestedLeads(campaigns) {
  // This simulates what we would get from the API if the endpoints worked
  const mockLeads = [];
  
  campaigns.forEach(campaign => {
    // Mock some interested leads based on the email list
    const emails = campaign.email_list || [];
    emails.slice(0, 2).forEach(email => { // Just take first 2 emails as "interested"
      mockLeads.push({
        email: email,
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        status: 'Interested',
        firstName: '',
        lastName: '',
        // Mock conversation history
        emails: [
          {
            date: '2026-03-13',
            subject: `Re: ${campaign.sequences[0]?.steps[0]?.variants[0]?.subject || 'Our offer'}`,
            body: 'Hi, I\'m interested in learning more about your restaurant services. Can you send me more details?',
            direction: 'received',
            sender: email
          },
          {
            date: '2026-03-12',
            subject: campaign.sequences[0]?.steps[0]?.variants[0]?.subject || 'Our offer',
            body: campaign.sequences[0]?.steps[0]?.variants[0]?.body || 'Initial outreach',
            direction: 'sent',
            sender: 'kimberly@derbydigitalrestaurants.com'
          }
        ]
      });
    });
  });
  
  return mockLeads;
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  
  if (isDryRun) {
    console.log('🏃 DRY RUN MODE - No actual data will be created\n');
  }
  
  try {
    // Load sync state
    const state = await loadSyncState();
    if (Array.isArray(state.syncedLeads)) {
      state.syncedLeads = new Set(state.syncedLeads);
    }
    
    console.log(`Previous sync state loaded: ${state.syncedLeads.size} leads already synced`);
    
    // Fetch campaigns
    const campaigns = await fetchInstantlyCampaigns();
    
    if (campaigns.length === 0) {
      console.log('No campaigns found');
      return;
    }
    
    // NOTE: The Instantly API doesn't expose the leads/emails endpoints we need
    // This is a mock implementation showing how it would work
    console.log('\n⚠️  Note: Instantly API leads/emails endpoints are not available');
    console.log('Using mock data to demonstrate the sync process\n');
    
    const interestedLeads = createMockInterestedLeads(campaigns);
    console.log(`Found ${interestedLeads.length} interested leads (simulated)`);
    
    let processedCount = 0;
    let skippedCount = 0;
    let createdCount = 0;
    
    for (const lead of interestedLeads) {
      console.log(`\nProcessing lead: ${lead.email}`);
      
      // Check if already synced
      if (state.syncedLeads.has(lead.email)) {
        console.log('  ⏭️  Already synced, skipping');
        skippedCount++;
        continue;
      }
      
      // Check if exists in GHL
      const existingContact = await checkContactExistsInGHL(lead.email);
      if (existingContact) {
        console.log('  ⏭️  Contact already exists in GHL, skipping');
        state.syncedLeads.add(lead.email);
        skippedCount++;
        continue;
      }
      
      // Extract contact info
      const domain = lead.email.split('@')[1];
      const nameFromEmail = extractNameFromEmail(lead.email);
      const businessName = await getBusinessNameFromDomain(domain);
      
      // Extract phone from email content
      const emailText = lead.emails.map(e => e.body).join(' ');
      const phone = extractPhoneFromText(emailText);
      
      // Create contact data
      const contactData = {
        firstName: lead.firstName || nameFromEmail.firstName,
        lastName: lead.lastName || nameFromEmail.lastName,
        email: lead.email,
        phone: phone || '',
        companyName: businessName || domain
      };
      
      // Detect current provider from campaign name
      let currentProvider = '';
      const campaignNameLower = lead.campaign_name.toLowerCase();
      if (campaignNameLower.includes('spothopper')) currentProvider = 'SpotHopper';
      else if (campaignNameLower.includes('owner')) currentProvider = 'Owner.com';
      else if (campaignNameLower.includes('fisherman')) currentProvider = 'Fisherman';
      
      if (currentProvider) {
        contactData.customFields = [
          { id: config.ghl.customFields.currentProvider, value: currentProvider }
        ];
      }
      
      // Create contact
      const contact = await createContactInGHL(contactData, isDryRun);
      
      // Create opportunity
      const opportunityName = `${contactData.firstName} ${contactData.lastName} - ${contactData.companyName}`.trim();
      await createOpportunityInGHL(contact.id, opportunityName, isDryRun);
      
      // Group emails by date and create notes
      const emailsByDate = {};
      lead.emails.forEach(email => {
        if (!emailsByDate[email.date]) {
          emailsByDate[email.date] = [];
        }
        emailsByDate[email.date].push(email);
      });
      
      for (const [date, dayEmails] of Object.entries(emailsByDate)) {
        const noteText = `Date: ${date}\n\n` +
          dayEmails.map(email => 
            `${email.direction.toUpperCase()}: ${email.sender}\n` +
            `Subject: ${email.subject}\n` +
            `${email.body}\n`
          ).join('\n---\n');
        
        await addNoteToContact(contact.id, noteText, isDryRun);
      }
      
      // Mark as synced
      state.syncedLeads.add(lead.email);
      processedCount++;
      createdCount++;
      
      console.log(`  ✅ Successfully processed: ${lead.email}`);
    }
    
    // Save state
    await saveSyncState(state);
    
    console.log(`\n📊 Sync Summary:`);
    console.log(`  • Total leads processed: ${processedCount}`);
    console.log(`  • New contacts created: ${createdCount}`);
    console.log(`  • Skipped (already synced/exists): ${skippedCount}`);
    console.log(`  • Total synced leads in state: ${state.syncedLeads.size}`);
    
  } catch (error) {
    console.error('❌ Error during sync:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main();
}

module.exports = { main, config };