#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const INSTANTLY_AUTH_TOKEN = 'MzQ0ODcyMDktNGYxNC00NTVhLWI4MDUtNDFhM2M2Y2NiYWNlOlpyaUdsSlpGeWdXeg==';
const GHL_API_KEY = 'pit-4ae0985d-8de0-40e6-b688-4e6805e57c58';
const GHL_LOCATION_ID = '3zMwpehG9y8ETJsZtR3d';
const GHL_PIPELINE_ID = 'oNcLIG8SGY8IKvvVbkDe';
const GHL_STAGE_ID = '0415b950-1b0e-47be-b7c4-65222923b448';
const LEAD_SOURCE_FIELD_ID = 'dLDNSAZYHk5qihoOx5oP';
const CURRENT_PROVIDER_FIELD_ID = 'gziZOwyG3l2wDoxIyFVM';

const STATE_FILE = '/home/kim/.openclaw/workspace/mission-control/data/instantly-sync-state.json';

// Rate limiting delays (ms)
const INSTANTLY_DELAY = 3000; // 3 seconds to avoid rate limits
const GHL_DELAY = 3000; // 3 seconds as specified
const RETRY_DELAY = 90000; // 90 seconds if rate limited
const RATE_LIMIT_RETRY_DELAY = 60000; // 60 seconds for 429 errors

// Parse command line args
const isDryRun = process.argv.includes('--dry-run');

// Load or initialize sync state
function loadSyncState() {
    try {
        // Ensure data directory exists
        const dataDir = path.dirname(STATE_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (error) {
        console.log('⚠️  Error loading sync state, starting fresh:', error.message);
    }
    return { syncedEmails: [] };
}

// Save sync state
function saveSyncState(state) {
    if (isDryRun) {
        console.log('🔍 [DRY RUN] Would save sync state with', state.syncedEmails.length, 'synced emails');
        return;
    }
    
    try {
        const dataDir = path.dirname(STATE_FILE);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
    } catch (error) {
        console.log('⚠️  Error saving sync state:', error.message);
    }
}

// Sleep utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP request utility using built-in https
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = https.request(requestOptions, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        
        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// Rate-limited request for Instantly API
async function makeInstantlyRequest(url, options = {}, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        const response = await makeRequest(url, options);
        
        if (response.status === 429) {
            if (attempt < retries) {
                console.log(`⏳ Rate limited (429), waiting ${RATE_LIMIT_RETRY_DELAY/1000} seconds before retry ${attempt + 1}/${retries}...`);
                await sleep(RATE_LIMIT_RETRY_DELAY);
                continue;
            } else {
                console.log(`❌ Rate limited (429) after ${retries} retries, skipping this request`);
                return { status: 429, data: { items: [] } };
            }
        }
        
        return response;
    }
}

// Instantly API calls using CORRECT endpoints
async function fetchInstantlyCampaigns() {
    const campaigns = [];
    let nextCursor = null;
    
    do {
        console.log('📋 Fetching Instantly campaigns...');
        
        let url = 'https://api.instantly.ai/api/v2/campaigns';
        if (nextCursor) {
            url += `?starting_after=${encodeURIComponent(nextCursor)}`;
        }
        
        const response = await makeInstantlyRequest(url, {
            headers: {
                'Authorization': `Bearer ${INSTANTLY_AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 401) {
            throw new Error(`Instantly API authentication failed: ${response.status} - ${JSON.stringify(response.data)}`);
        }
        
        if (response.status !== 200) {
            throw new Error(`Failed to fetch campaigns: ${response.status} ${JSON.stringify(response.data)}`);
        }
        
        if (response.data.items) {
            campaigns.push(...response.data.items);
        }
        nextCursor = response.data.next_starting_after;
        
        await sleep(INSTANTLY_DELAY);
    } while (nextCursor);
    
    console.log(`✅ Found ${campaigns.length} campaigns`);
    return campaigns;
}

async function fetchReceivedEmails(campaignId) {
    const receivedEmails = [];
    let nextCursor = null;
    
    do {
        console.log(`📧 Fetching received emails for campaign ${campaignId}...`);
        
        let url = `https://api.instantly.ai/api/v2/emails?campaign_id=${campaignId}&email_type=received&limit=100`;
        if (nextCursor) {
            url += `&starting_after=${encodeURIComponent(nextCursor)}`;
        }
        
        const response = await makeInstantlyRequest(url, {
            headers: {
                'Authorization': `Bearer ${INSTANTLY_AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status !== 200) {
            console.log(`⚠️  Failed to fetch received emails for campaign ${campaignId}: ${response.status}`);
            break;
        }
        
        if (response.data.items) {
            receivedEmails.push(...response.data.items);
        }
        nextCursor = response.data.next_starting_after;
        
        await sleep(INSTANTLY_DELAY);
    } while (nextCursor);
    
    console.log(`Found ${receivedEmails.length} received emails (replies from leads)`);
    return receivedEmails;
}

async function fetchAllEmails(campaignId) {
    const allEmails = [];
    let nextCursor = null;
    
    do {
        let url = `https://api.instantly.ai/api/v2/emails?campaign_id=${campaignId}&limit=100`;
        if (nextCursor) {
            url += `&starting_after=${encodeURIComponent(nextCursor)}`;
        }
        
        const response = await makeInstantlyRequest(url, {
            headers: {
                'Authorization': `Bearer ${INSTANTLY_AUTH_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status !== 200) {
            console.log(`⚠️  Failed to fetch all emails for campaign ${campaignId}: ${response.status}`);
            break;
        }
        
        if (response.data.items) {
            allEmails.push(...response.data.items);
        }
        nextCursor = response.data.next_starting_after;
        
        await sleep(INSTANTLY_DELAY);
    } while (nextCursor);
    
    return allEmails;
}

// Extract lead email from received email
function extractLeadEmailFromReceivedEmail(receivedEmail) {
    // Try from_address_email first (this is the correct field)
    if (receivedEmail.from_address_email) {
        return receivedEmail.from_address_email;
    }
    
    // Fallback to from_email if available
    if (receivedEmail.from_email) {
        return receivedEmail.from_email;
    }
    
    // Try to extract from from_address_json if available
    if (receivedEmail.from_address_json && receivedEmail.from_address_json.length > 0) {
        return receivedEmail.from_address_json[0].address;
    }
    
    // Try to extract from headers if available
    if (receivedEmail.headers && receivedEmail.headers.from) {
        const fromMatch = receivedEmail.headers.from.match(/<([^>]+)>/);
        if (fromMatch) {
            return fromMatch[1];
        }
        // If no angle brackets, assume the whole from field is the email
        return receivedEmail.headers.from.split(' ')[0];
    }
    
    // As fallback, try to parse from email content or other fields
    console.log(`⚠️  Could not extract lead email from received email:`, JSON.stringify(receivedEmail, null, 2));
    return null;
}

// GHL API calls
async function checkGHLContactExists(email) {
    const url = `https://services.leadconnectorhq.com/contacts/lookup?locationId=${GHL_LOCATION_ID}&email=${encodeURIComponent(email)}`;
    
    const response = await makeRequest(url, {
        headers: {
            'Authorization': `Bearer ${GHL_API_KEY}`,
            'Version': '2021-07-28',
            'User-Agent': 'Mozilla/5.0'
        }
    });
    
    return response.status === 200 && response.data;
}

async function createGHLContact(contactData) {
    if (isDryRun) {
        console.log('🔍 [DRY RUN] Would create GHL contact:', JSON.stringify(contactData, null, 2));
        return { status: 201, data: { contact: { id: 'dry-run-contact-id' } } };
    }
    
    const response = await makeRequest('https://services.leadconnectorhq.com/contacts/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GHL_API_KEY}`,
            'Version': '2021-07-28',
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactData)
    });
    
    if (response.status === 403) {
        console.log('⏳ Rate limited, waiting 90 seconds...');
        await sleep(RETRY_DELAY);
        return createGHLContact(contactData);
    }
    
    return response;
}

async function createGHLOpportunity(opportunityData) {
    if (isDryRun) {
        console.log('🔍 [DRY RUN] Would create GHL opportunity:', JSON.stringify(opportunityData, null, 2));
        return { status: 201, data: { opportunity: { id: 'dry-run-opp-id' } } };
    }
    
    const response = await makeRequest('https://services.leadconnectorhq.com/opportunities/', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GHL_API_KEY}`,
            'Version': '2021-07-28',
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(opportunityData)
    });
    
    if (response.status === 403) {
        console.log('⏳ Rate limited, waiting 90 seconds...');
        await sleep(RETRY_DELAY);
        return createGHLOpportunity(opportunityData);
    }
    
    return response;
}

async function addGHLNote(contactId, noteData) {
    if (isDryRun) {
        console.log('🔍 [DRY RUN] Would add GHL note to contact', contactId, ':', JSON.stringify(noteData, null, 2));
        return { status: 201, data: { note: { id: 'dry-run-note-id' } } };
    }
    
    const response = await makeRequest(`https://services.leadconnectorhq.com/contacts/${contactId}/notes`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${GHL_API_KEY}`,
            'Version': '2021-07-28',
            'User-Agent': 'Mozilla/5.0',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(noteData)
    });
    
    if (response.status === 403) {
        console.log('⏳ Rate limited, waiting 90 seconds...');
        await sleep(RETRY_DELAY);
        return addGHLNote(contactId, noteData);
    }
    
    return response;
}

// Utility functions
function extractNameFromEmail(email) {
    const localPart = email.split('@')[0];
    const nameParts = localPart.split(/[._-]+/).map(part => 
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    );
    
    return {
        firstName: nameParts[0] || 'Unknown',
        lastName: nameParts.slice(1).join(' ') || 'Lead'
    };
}

function extractBusinessName(email) {
    const domain = email.split('@')[1];
    if (!domain) return 'Unknown Business';
    
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function formatOpportunityName(firstName, lastName, businessName) {
    // Format: "FirstName LastName - BusinessName" in title case
    const fullName = `${firstName} ${lastName}`;
    return `${fullName} - ${businessName}`;
}

function groupEmailsByConversation(emails, leadEmail) {
    // Group emails by conversation thread for a specific lead
    const conversationEmails = emails.filter(email => {
        // Include emails that are to/from the lead
        const isToLead = email.to_address_email_list && email.to_address_email_list.includes(leadEmail);
        const isFromLead = email.from_email === leadEmail;
        return isToLead || isFromLead;
    });
    
    // Sort by timestamp
    return conversationEmails.sort((a, b) => new Date(a.timestamp_email) - new Date(b.timestamp_email));
}

// Main sync function
async function syncInstantlyToGHL() {
    console.log('🚀 Starting Instantly → GHL sync...');
    if (isDryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made to GHL');
    }
    
    const syncState = loadSyncState();
    // Ensure syncedEmails is an array
    if (!syncState.syncedEmails || !Array.isArray(syncState.syncedEmails)) {
        syncState.syncedEmails = [];
    }
    
    let newLeadsCount = 0;
    const foundLeads = [];
    
    try {
        // Fetch all campaigns
        const campaigns = await fetchInstantlyCampaigns();
        
        // Process each campaign
        for (const campaign of campaigns) {
            console.log(`\n📋 Processing campaign: ${campaign.name} (${campaign.id})`);
            
            // Fetch received emails for this campaign (these are replies from leads)
            const receivedEmails = await fetchReceivedEmails(campaign.id);
            
            if (receivedEmails.length === 0) {
                console.log('No received emails (replies) found for this campaign');
                continue;
            }
            
            // Extract unique lead emails from received emails
            const leadEmails = new Set();
            for (const receivedEmail of receivedEmails) {
                const leadEmail = extractLeadEmailFromReceivedEmail(receivedEmail);
                if (leadEmail) {
                    leadEmails.add(leadEmail);
                }
            }
            
            console.log(`Found ${leadEmails.size} unique leads who replied`);
            
            // Fetch ALL emails for this campaign to get conversation history
            const allEmails = await fetchAllEmails(campaign.id);
            console.log(`Fetched ${allEmails.length} total emails for conversation context`);
            
            // Process each unique lead
            for (const leadEmail of leadEmails) {
                console.log(`\n👤 Processing lead: ${leadEmail}`);
                foundLeads.push({ email: leadEmail, campaign: campaign.name });
                
                // Skip if already synced
                if (syncState.syncedEmails.includes(leadEmail)) {
                    console.log(`⏭️  Already synced, skipping`);
                    continue;
                }
                
                // Check if contact exists in GHL
                const existingContact = await checkGHLContactExists(leadEmail);
                if (existingContact) {
                    console.log(`⏭️  Contact already exists in GHL, marking as synced`);
                    syncState.syncedEmails.push(leadEmail);
                    continue;
                }
                
                await sleep(GHL_DELAY);
                
                // Get full conversation for this lead
                const conversationEmails = groupEmailsByConversation(allEmails, leadEmail);
                console.log(`Found ${conversationEmails.length} emails in conversation with this lead`);
                
                // Extract contact info
                const { firstName, lastName } = extractNameFromEmail(leadEmail);
                const businessName = extractBusinessName(leadEmail);
                
                // Create GHL contact
                const contactData = {
                    firstName,
                    lastName,
                    email: leadEmail,
                    companyName: businessName,
                    locationId: GHL_LOCATION_ID,
                    customFields: [
                        {
                            key: LEAD_SOURCE_FIELD_ID,
                            field_value: 'Cold Email'
                        },
                        {
                            key: CURRENT_PROVIDER_FIELD_ID,
                            field_value: leadEmail.split('@')[1]
                        }
                    ]
                };
                
                console.log(`📝 Creating GHL contact: ${firstName} ${lastName} (${leadEmail})`);
                const contactResponse = await createGHLContact(contactData);
                
                if (contactResponse.status !== 200 && contactResponse.status !== 201) {
                    console.log(`❌ Failed to create contact: ${contactResponse.status}`);
                    continue;
                }
                
                const contactId = contactResponse.data.contact.id;
                console.log(`✅ Created contact with ID: ${contactId}`);
                
                await sleep(GHL_DELAY);
                
                // Create opportunity with correct naming format
                const opportunityTitle = formatOpportunityName(firstName, lastName, businessName);
                const opportunityData = {
                    title: opportunityTitle,
                    pipelineId: GHL_PIPELINE_ID,
                    stageId: GHL_STAGE_ID,
                    status: 'open',
                    contactId,
                    locationId: GHL_LOCATION_ID
                };
                
                console.log(`💼 Creating opportunity: ${opportunityTitle}`);
                const oppResponse = await createGHLOpportunity(opportunityData);
                
                if (oppResponse.status === 200 || oppResponse.status === 201) {
                    console.log(`✅ Created opportunity`);
                } else {
                    console.log(`⚠️  Failed to create opportunity: ${oppResponse.status}`);
                }
                
                await sleep(GHL_DELAY);
                
                // Add email conversation as note
                if (conversationEmails.length > 0) {
                    let noteContent = `Email conversation from Instantly campaign: ${campaign.name}\n\n`;
                    
                    conversationEmails.forEach((email, index) => {
                        const timestamp = new Date(email.timestamp_email).toLocaleString();
                        const isFromLead = email.from_email === leadEmail;
                        const direction = isFromLead ? 'FROM lead' : 'TO lead';
                        
                        noteContent += `${index + 1}. [${timestamp}] ${direction}\n`;
                        noteContent += `   Subject: ${email.subject || 'No subject'}\n`;
                        
                        if (email.body) {
                            let content = '';
                            if (email.body.html) {
                                // Strip HTML tags for cleaner notes
                                content = email.body.html.replace(/<[^>]*>/g, '').trim();
                            } else if (email.body.text) {
                                content = email.body.text.trim();
                            }
                            
                            if (content) {
                                noteContent += `   Content: ${content.substring(0, 300)}${content.length > 300 ? '...' : ''}\n\n`;
                            }
                        }
                    });
                    
                    const noteData = {
                        body: noteContent,
                        userId: contactId
                    };
                    
                    console.log(`📝 Adding conversation note (${conversationEmails.length} emails)`);
                    const noteResponse = await addGHLNote(contactId, noteData);
                    
                    if (noteResponse.status === 200 || noteResponse.status === 201) {
                        console.log(`✅ Added conversation note`);
                    } else {
                        console.log(`⚠️  Failed to add note: ${noteResponse.status}`);
                    }
                    
                    await sleep(GHL_DELAY);
                }
                
                // Mark as synced
                syncState.syncedEmails.push(leadEmail);
                newLeadsCount++;
                
                console.log(`✅ Synced: ${leadEmail} → Created contact + opportunity + notes`);
            }
        }
        
        // Save sync state
        saveSyncState(syncState);
        
        console.log(`\n🎉 Sync complete!`);
        console.log(`📊 Stats:`);
        console.log(`   - ${foundLeads.length} total leads found who replied to campaigns`);
        console.log(`   - ${newLeadsCount} new leads ${isDryRun ? 'would be' : ''} pushed to GHL`);
        console.log(`   - ${syncState.syncedEmails.length} total leads in sync state`);
        
        if (foundLeads.length > 0) {
            console.log(`\n📋 Found leads:`);
            foundLeads.forEach(lead => {
                console.log(`   - ${lead.email} (${lead.campaign})`);
            });
        }
        
        return { newLeadsCount, totalFoundLeads: foundLeads.length, foundLeads };
        
    } catch (error) {
        console.log(`❌ Sync failed: ${error.message}`);
        console.error(error);
        throw error;
    }
}

// Run the sync
if (require.main === module) {
    syncInstantlyToGHL()
        .then((results) => {
            if (isDryRun) {
                console.log(`\n✨ DRY RUN complete: Found ${results.totalFoundLeads} leads, would sync ${results.newLeadsCount} new ones`);
            } else {
                console.log(`\n✨ Successfully synced ${results.newLeadsCount} new leads from Instantly to GHL`);
            }
            process.exit(0);
        })
        .catch((error) => {
            console.log(`\n💥 Sync failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { syncInstantlyToGHL };