#!/usr/bin/env node

// Test version with simulated API responses to verify logic
const fs = require('fs');

const STATE_FILE = '/home/kim/.openclaw/workspace/mission-control/data/instantly-sync-state.json';

// Simulated test data
const MOCK_CAMPAIGNS = [
    { id: 'camp_123', name: 'Restaurant Outreach Q1' },
    { id: 'camp_456', name: 'Coffee Shop Campaign' }
];

const MOCK_LEADS = [
    {
        id: 'lead_1',
        email: 'john.smith@tastybites.com',
        status: 'interested',
        company_domain: 'tastybites.com',
        status_summary: 'Replied positively'
    },
    {
        id: 'lead_2',
        email: 'mary@coffeeandco.com',
        status: 'interested',
        company_domain: 'mary@coffeeandco.com',  // Sometimes contains email instead
        status_summary: 'Wants to schedule call'
    }
];

const MOCK_EMAILS = [
    {
        subject: 'Re: Better Online Ordering for Tasty Bites',
        to_address_email_list: ['john.smith@tastybites.com'],
        body: { html: '<p>Hi Jordan, this sounds interesting. We are currently using DoorDash and looking for alternatives. When can we chat?</p>' },
        timestamp_email: '2026-03-13T10:30:00Z'
    },
    {
        subject: 'Follow up: Restaurant Software Solution',
        to_address_email_list: ['john.smith@tastybites.com'],
        body: { html: '<p>Thanks for your email yesterday. I discussed with my business partner and we would like to learn more.</p>' },
        timestamp_email: '2026-03-13T14:15:00Z'
    }
];

// Mock GHL API responses
const MOCK_GHL_RESPONSES = {
    contactExists: null, // null = doesn't exist, object = exists
    createContact: { contact: { id: 'contact_123' } },
    createOpportunity: { opportunity: { id: 'opp_123' } },
    addNote: { note: { id: 'note_123' } }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function loadSyncState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (error) {
        console.log('⚠️  Error loading sync state, starting fresh:', error.message);
    }
    return { syncedEmails: [] };
}

function saveSyncState(state) {
    try {
        const dir = '/home/kim/.openclaw/workspace/mission-control/data';
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
        console.log('💾 Sync state saved');
    } catch (error) {
        console.log('⚠️  Error saving sync state:', error.message);
    }
}

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

function extractDomainFromCompanyDomain(companyDomain) {
    if (!companyDomain) return null;
    
    // If company_domain contains an email, extract the domain
    if (companyDomain.includes('@')) {
        return companyDomain.split('@')[1];
    }
    
    // Otherwise, clean up the domain
    return companyDomain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
}

function extractBusinessName(email, companyDomain) {
    const domain = extractDomainFromCompanyDomain(companyDomain) || email.split('@')[1];
    if (!domain) return 'Unknown Business';
    
    const name = domain.split('.')[0];
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

function groupEmailsByDate(emails) {
    const groups = {};
    
    emails.forEach(email => {
        const date = new Date(email.timestamp_email).toISOString().split('T')[0];
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(email);
    });
    
    return groups;
}

async function testSync() {
    console.log('🧪 Running Instantly → GHL sync test with mock data...');
    
    const syncState = loadSyncState();
    // Ensure syncedEmails is an array
    if (!syncState.syncedEmails || !Array.isArray(syncState.syncedEmails)) {
        syncState.syncedEmails = [];
    }
    let newLeadsCount = 0;
    
    try {
        // Process mock campaigns
        for (const campaign of MOCK_CAMPAIGNS) {
            console.log(`\n📋 Processing campaign: ${campaign.name} (${campaign.id})`);
            
            // Process mock leads
            const leads = MOCK_LEADS;
            console.log(`Found ${leads.length} interested leads`);
            
            for (const lead of leads) {
                const email = lead.email;
                console.log(`\n👤 Processing lead: ${email}`);
                
                // Skip if already synced
                if (syncState.syncedEmails && Array.isArray(syncState.syncedEmails) && syncState.syncedEmails.includes(email)) {
                    console.log(`⏭️  Already synced, skipping`);
                    continue;
                }
                
                // Mock: Check if contact exists in GHL
                const existingContact = MOCK_GHL_RESPONSES.contactExists;
                if (existingContact) {
                    console.log(`⏭️  Contact already exists in GHL, skipping`);
                    syncState.syncedEmails.push(email);
                    continue;
                }
                
                await sleep(100); // Shorter delay for test
                
                // Mock: Get email conversations
                const emails = MOCK_EMAILS.filter(mockEmail => 
                    mockEmail.to_address_email_list && 
                    Array.isArray(mockEmail.to_address_email_list) &&
                    mockEmail.to_address_email_list.includes(email)
                );
                console.log(`Found ${emails.length} email conversations`);
                
                // Extract contact info
                const { firstName, lastName } = extractNameFromEmail(email);
                const businessName = extractBusinessName(email, lead.company_domain);
                
                // Mock: Create GHL contact
                const contactData = {
                    firstName,
                    lastName,
                    email,
                    companyName: businessName,
                    locationId: '3zMwpehG9y8ETJsZtR3d',
                    customFields: [
                        {
                            key: 'dLDNSAZYHk5qihoOx5oP',
                            field_value: 'Cold Email'
                        },
                        {
                            key: 'gziZOwyG3l2wDoxIyFVM',
                            field_value: extractDomainFromCompanyDomain(lead.company_domain) || email.split('@')[1]
                        }
                    ]
                };
                
                console.log(`📝 Creating GHL contact: ${firstName} ${lastName} (${email})`);
                console.log(`   Company: ${businessName}`);
                console.log(`   Domain: ${contactData.customFields[1].field_value}`);
                
                const contactId = 'contact_' + Date.now();
                console.log(`✅ Created contact with ID: ${contactId}`);
                
                await sleep(100);
                
                // Mock: Create opportunity
                const opportunityData = {
                    title: `${firstName} ${lastName} - ${businessName}`,
                    pipelineId: 'oNcLIG8SGY8IKvvVbkDe',
                    stageId: '0415b950-1b0e-47be-b7c4-65222923b448',
                    status: 'open',
                    contactId,
                    locationId: '3zMwpehG9y8ETJsZtR3d'
                };
                
                console.log(`💼 Creating opportunity: ${opportunityData.title}`);
                console.log(`✅ Created opportunity`);
                
                await sleep(100);
                
                // Add email conversations as notes grouped by date
                if (emails.length > 0) {
                    const emailsByDate = groupEmailsByDate(emails);
                    
                    for (const [date, dayEmails] of Object.entries(emailsByDate)) {
                        let noteContent = `Email conversations for ${date}:\n\n`;
                        
                        dayEmails.forEach((email, index) => {
                            const fromTo = (email.to_address_email_list && email.to_address_email_list.includes(lead.email)) ? 
                                `To: ${lead.email}` : `From: ${lead.email}`;
                            
                            noteContent += `${index + 1}. ${fromTo}\n`;
                            noteContent += `   Subject: ${email.subject}\n`;
                            if (email.body && email.body.html) {
                                const textContent = email.body.html.replace(/<[^>]*>/g, '').trim();
                                noteContent += `   Content: ${textContent.substring(0, 300)}${textContent.length > 300 ? '...' : ''}\n\n`;
                            }
                        });
                        
                        console.log(`📝 Adding note for ${date} (${dayEmails.length} emails)`);
                        console.log(`   Preview: ${noteContent.substring(0, 100)}...`);
                        await sleep(100);
                    }
                }
                
                // Mark as synced
                syncState.syncedEmails.push(email);
                newLeadsCount++;
                
                console.log(`✅ Synced: ${email} → Created contact + opportunity + ${emails.length} email notes`);
            }
        }
        
        // Save sync state
        saveSyncState(syncState);
        
        console.log(`\n🎉 Test sync complete! ${newLeadsCount} new leads would be pushed to GHL`);
        console.log(`\n📊 Test Results Summary:`);
        console.log(`   - Campaigns processed: ${MOCK_CAMPAIGNS.length}`);
        console.log(`   - Leads processed: ${MOCK_LEADS.length}`);
        console.log(`   - New contacts created: ${newLeadsCount}`);
        console.log(`   - Email notes added: ${MOCK_EMAILS.length}`);
        console.log(`   - Sync state updated: ${syncState.syncedEmails.length} total synced emails`);
        
        return newLeadsCount;
        
    } catch (error) {
        console.log(`❌ Test sync failed: ${error.message}`);
        console.error(error);
        throw error;
    }
}

// Run the test
if (require.main === module) {
    testSync()
        .then((count) => {
            console.log(`\n✨ Test completed successfully - ${count} leads would be synced`);
            console.log(`\n🔧 To run with real APIs, fix the authentication in instantly-to-ghl-sync.js`);
            process.exit(0);
        })
        .catch((error) => {
            console.log(`\n💥 Test failed: ${error.message}`);
            process.exit(1);
        });
}

module.exports = { testSync };